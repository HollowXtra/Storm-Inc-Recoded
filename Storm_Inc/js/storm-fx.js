/**
 * storm-fx.js
 * Live operational overlays for the simulator:
 *   - CG lightning strikes (spawned in rainbands/eyewall, animated on canvas)
 *   - Storm-total rainfall accumulation with flood tinting over land
 *   - Hurricane Hunter recon flights (alpha pattern, sonde drops, center fixes)
 *
 * This module is intentionally "pure" with respect to the DOM: everything is
 * driven through the `fx` state object it creates, and rendering happens on a
 * single 2D canvas the caller owns (see renderStormFx).
 */

import {
    getPressureAt,
    windToPressure,
    calculateDistance,
    calculateHollandPressure,
    normalizeLongitude
} from './utils.js';
import { getWindVectorAt } from './cyclone-model.js';
import { getElevationAt, getLandStatus } from './terrain-data.js';

const RAD = Math.PI / 180;
const DEG_PER_KM_LAT = 1 / 111.32;

const RAIN_CELL_DEG = 0.24;          // accumulation grid resolution
const RAIN_MAX_CELLS = 11000;        // hard cap so very long tracks stay fast
const RAIN_BUILD_INTERVAL_MS = 110;  // throttle full pattern rebuilds
const BOLT_MAX = 60;

// Rainfall total -> color stops (mm). Cells below RAIN_MIN_DRAW are skipped.
const RAIN_STOPS = [
    [2, '#3b82f6'],
    [25, '#22d3ee'],
    [60, '#4ade80'],
    [110, '#fde047'],
    [170, '#fb923c'],
    [250, '#ef4444'],
    [380, '#e11d48'],
    [520, '#c026d3']
];

// ---------------------------------------------------------------- helpers

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function colorAt(mm) {
    const t = clamp(mm, RAIN_STOPS[0][0], RAIN_STOPS[RAIN_STOPS.length - 1][0]);
    for (let i = 0; i < RAIN_STOPS.length - 1; i++) {
        const [a, ca] = RAIN_STOPS[i];
        const [b, cb] = RAIN_STOPS[i + 1];
        if (t <= b) {
            const k = (t - a) / (b - a || 1);
            const pa = [parseInt(ca.slice(1, 3), 16), parseInt(ca.slice(3, 5), 16), parseInt(ca.slice(5, 7), 16)];
            const pb = [parseInt(cb.slice(1, 3), 16), parseInt(cb.slice(3, 5), 16), parseInt(cb.slice(5, 7), 16)];
            const mix = pa.map((v, idx) => Math.round(v + (pb[idx] - v) * k));
            return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
        }
    }
    return RAIN_STOPS[RAIN_STOPS.length - 1][1];
}

// Offset a geo coordinate by a distance (km) along a compass bearing.
function offsetPoint(lon, lat, distKm, bearingDeg) {
    const brg = bearingDeg * RAD;
    const latRad = lat * RAD;
    const dLat = distKm * DEG_PER_KM_LAT;
    return [
        lon + (dLat / Math.max(0.2, Math.cos(latRad))) * Math.sin(brg),
        lat + dLat * Math.cos(brg)
    ];
}

// Distance between two offsets of the same cell in px (for rain grid sizing).
function cellScreenSize(projection, lon, lat) {
    const c = projection([lon, lat]);
    const east = projection([lon + RAIN_CELL_DEG, lat]);
    if (!c || !east) return 0;
    return Math.max(1, Math.abs(east[0] - c[0]));
}

// ------------------------------------------------------------- state

export function createStormFxState() {
    return {
        showRainfall: true,
        showLightning: true,
        rain: {
            cells: new Map(),          // key -> { lon, lat, mm, land }
            peakMm: 0,
            version: 0,                // bumped whenever cells change
            _sig: null,
            _lastBuild: 0
        },
        lightning: {
            bolts: [],
            total: 0,
            nextAt: performance.now() + 600,
            lastSfxAt: 0
        },
        recon: {
            aircraft: null,
            fixes: [],                 // drawn markers + operational record
            sondeDrops: [],
            flights: [],
            cooldownUntil: 0
        },
        _lastAdvance: 0
    };
}

export function resetStormFxState(fx) {
    if (!fx) return;
    fx.showRainfall = true;
    fx.showLightning = true;
    const next = createStormFxState();
    next.showRainfall = fx.showRainfall;
    next.showLightning = fx.showLightning;
    Object.assign(fx, next);
}

// ------------------------------------------------------------- rainfall

export function accumulateStormRainfall(fx, cyclone, env) {
    if (!fx || !cyclone || cyclone.status !== 'active') return;
    const intensity = Number(cyclone.intensity) || 0;
    if (intensity < 16) return;

    const pressureSystems = (env && env.pressureSystems) || { lower: [] };
    const spanHours = (env && env.spanHours) || 3;
    const basin = (env && env.basin) || cyclone.basin || 'WPAC';
    const circulationSize = cyclone.circulationSize || 300;

    // Rain-shield radius (km) scales with circulation size.
    const shieldKm = Math.max(120, 75 + circulationSize * 0.52);
    const shieldDeg = shieldKm * DEG_PER_KM_LAT;
    const latRad = clamp(cyclone.lat, -80, 80) * RAD;
    const lonSpanDeg = shieldDeg / Math.max(0.25, Math.cos(latRad));

    // Peak rainfall rate scales with intensity (mm/h at the core).
    const peakRate = clamp(2.0 + intensity * 0.14, 2.0, 34.0);

    // Motion used for right-of-track asymmetry.
    const motionDeg = Number(cyclone.direction) || 0;
    const nhSign = cyclone.lat >= 0 ? 1 : -1;

    const lon0 = Math.floor((cyclone.lon - lonSpanDeg) / RAIN_CELL_DEG) * RAIN_CELL_DEG;
    const lon1 = cyclone.lon + lonSpanDeg;
    const lat0 = Math.floor((cyclone.lat - shieldDeg) / RAIN_CELL_DEG) * RAIN_CELL_DEG;
    const lat1 = cyclone.lat + shieldDeg;

    const cells = fx.rain.cells;
    let added = 0;

    for (let lat = lat0; lat <= lat1; lat += RAIN_CELL_DEG) {
        const cosLat = Math.max(0.2, Math.cos(lat * RAD));
        for (let lon = lon0; lon <= lon1; lon += RAIN_CELL_DEG) {
            // Unwrap longitude so tracks crossing the dateline accumulate cleanly.
            let dLon = lon - cyclone.lon;
            if (dLon > 180) dLon -= 360;
            else if (dLon < -180) dLon += 360;
            if (Math.abs(dLon) > lonSpanDeg) continue;

            const dLatKm = (lat - cyclone.lat) / DEG_PER_KM_LAT;
            const dLonKm = dLon * 111.32 * cosLat;
            const distKm = Math.hypot(dLatKm, dLonKm);
            if (distKm > shieldKm) continue;

            // Radial falloff: ~peak at the core, ~15% near the shield edge.
            const radial = Math.exp(-Math.pow(distKm / (shieldKm * 0.55), 1.9));
            let rate = peakRate * radial;
            if (rate * spanHours < 0.08) continue;

            // Rain bands are patchy, not a smooth disc.
            const lump = Math.sin(lon * 13.7 + lat * 7.3) * Math.sin(lon * 31.9 - lat * 17.1);
            rate *= 0.55 + 0.45 * clamp(0.5 + lump * 0.7, 0, 1.6);

            // Right-of-track (dangerous semicircle) enhancement.
            const bearingCell = Math.atan2(dLonKm, dLatKm) / RAD;
            let diff = bearingCell - motionDeg;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            const rightBoost = 1 + 0.35 * Math.max(0, Math.cos((diff - 90 * nhSign) * RAD));
            rate *= rightBoost;

            const mm = rate * spanHours;
            const qLon = normalizeLongitude(Math.round(lon / RAIN_CELL_DEG) * RAIN_CELL_DEG);
            const qLat = Math.round(lat / RAIN_CELL_DEG) * RAIN_CELL_DEG;
            const key = `${qLon.toFixed(2)},${qLat.toFixed(2)}`;

            // Terrain enhancement for cells over elevated land. Land coverage
            // and elevation are static, so cache per quantized cell — the same
            // cell is re-visited every sim tick while the rain shield is above
            // it, and repeated pixel lookups were a per-tick hot spot.
            let isLand = false;
            if (fx.showRainfall !== undefined) {
                let terr = null;
                const cache = fx.rain.terrain || (fx.rain.terrain = new Map());
                terr = cache.get(key);
                if (!terr) {
                    try {
                        const landInfo = getLandStatus(lon, lat);
                        const land = Boolean(landInfo && landInfo.isLand);
                        terr = { land, elev: land ? (getElevationAt(lon, lat) || 0) : 0 };
                        cache.set(key, terr);
                        if (cache.size > 20000) {
                            const oldest = cache.keys().next().value;
                            if (oldest !== undefined) cache.delete(oldest);
                        }
                    } catch (e) {
                        terr = { land: false, elev: 0 }; // terrain not ready yet
                    }
                }
                isLand = terr.land;
                if (isLand && terr.elev > 100) {
                    rate *= 1 + Math.min(1.1, (terr.elev - 100) / 1800);
                }
            }

            const existing = cells.get(key);
            if (existing) {
                existing.mm += mm;
                existing.land = existing.land || isLand;
                if (existing.mm > fx.rain.peakMm) fx.rain.peakMm = existing.mm;
            } else {
                cells.set(key, { lon: qLon, lat: qLat, mm, land: isLand });
                added++;
                if (mm > fx.rain.peakMm) fx.rain.peakMm = mm;
            }
        }
    }

    if (added > 0 || fx.rain.cells.size > 0) {
        // Prune the oldest cells first (Map iterates in insertion order).
        while (cells.size > RAIN_MAX_CELLS) {
            const first = cells.keys().next().value;
            if (first === undefined) break;
            const removed = cells.get(first);
            cells.delete(first);
            if (removed && removed.mm >= fx.rain.peakMm) {
                // Recompute the peak lazily; only occasionally needed.
                let peak = 0;
                for (const cell of cells.values()) if (cell.mm > peak) peak = cell.mm;
                fx.rain.peakMm = peak;
            }
        }
        fx.rain.version++;
    }
}

// ------------------------------------------------------------- lightning

function rollBoltSeed(seed, salt) {
    const n = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
    return n - Math.floor(n);
}

/**
 * Advance the strike generator. Returns an array of strike events
 * (each a bare object) so the caller can count/play SFX exactly once.
 */
export function updateLightningFx(fx, cyclone, now) {
    const events = [];
    if (!fx || !fx.showLightning || !cyclone || cyclone.status !== 'active') return events;

    const intensity = Number(cyclone.intensity) || 0;
    if (intensity < 30) return events;
    if (now < fx.lightning.nextAt) return events;

    // Strike rate scales with intensity (roughly one every 0.8–4 s).
    const ratePerSec = intensity >= 45 ? 0.12 + intensity / 170 : 0.03 + intensity / 600;
    const nextDelay = (900 + Math.random() * 1600) / Math.max(0.02, ratePerSec);
    fx.lightning.nextAt = now + nextDelay;

    const circulationSize = cyclone.circulationSize || 300;
    const rmwKm = 8 + circulationSize * 0.12;         // matches cyclone-model RMW
    const shieldKm = Math.max(120, 75 + circulationSize * 0.52);
    const radiusKm = clamp(rmwKm * (0.8 + Math.random() * 3.6), 12, shieldKm * 0.85);
    const bearing = Math.random() * 360;

    // Flare the bolt slightly outward from the eyewall core.
    const latRad = clamp(cyclone.lat, -80, 80) * RAD;
    const dLat = radiusKm * DEG_PER_KM_LAT * Math.cos(bearing * RAD);
    const dLon = (radiusKm * DEG_PER_KM_LAT * Math.sin(bearing * RAD)) / Math.max(0.25, Math.cos(latRad));
    const lon = normalizeLongitude(cyclone.lon + dLon);
    const lat = cyclone.lat + dLat;

    const bolts = fx.lightning.bolts;
    bolts.push({
        lon,
        lat,
        seed: Math.random() * 1000,
        born: now,
        life: 340 + Math.random() * 620,
        flash: Math.random() < 0.8
    });
    while (bolts.length > BOLT_MAX) bolts.shift();

    fx.lightning.total++;
    const canSfx = now - fx.lightning.lastSfxAt > 550 && Math.random() < 0.7;
    if (canSfx) fx.lightning.lastSfxAt = now;
    events.push({ type: 'strike', playSfx: canSfx });
    return events;
}

// ------------------------------------------------------------- recon

const TAIL_NUMBERS = ['ICWC-42', 'ICWC-43', 'ICWC-44'];

export function canLaunchRecon(fx, cyclone) {
    if (!fx || !cyclone || fx.recon.aircraft) return false;
    if (cyclone.status !== 'active') return false;
    if (cyclone.isLand) return false;
    if ((Number(cyclone.intensity) || 0) < 35) return false;
    return performance.now() >= (fx.recon.cooldownUntil || 0);
}

function circlePoint(clon, clat, radiusKm, bearingDeg) {
    return offsetPoint(clon, clat, radiusKm, bearingDeg);
}

// Build an alpha-style flight pattern: legs alternate through the storm center
// and rotate ~46° per leg so the route sweeps all quadrants of the inner core.
function buildMissionPattern(centerLon, centerLat, headingDeg, radiusKm, legs, turnDeg, offsetDeg = null) {
    const points = [];
    const crossFracs = [];   // fraction along the whole flight where the plane is at center
    let segLen = [];         // km per segment
    const jitter = offsetDeg == null ? Math.random() * 20 : offsetDeg;
    let ang = (headingDeg + 180 + jitter) % 360;

    // Start behind the storm a bit farther out.
    points.push(circlePoint(centerLon, centerLat, radiusKm * 1.5, ang));
    points.push(circlePoint(centerLon, centerLat, radiusKm, ang));

    for (let k = 0; k < legs; k++) {
        const cross = circlePoint(centerLon, centerLat, radiusKm, ang + 180);
        points.push(cross);
        // fraction of the *next* segment up to its midpoint (the center crossing)
        crossFracs.push(0);
        const nextAng = (ang + 180 + turnDeg) % 360;
        const entry = circlePoint(centerLon, centerLat, radiusKm, nextAng);
        points.push(entry);
        ang = nextAng;
    }
    // Extra exit leg that pulls the aircraft back out of the core.
    points.push(circlePoint(centerLon, centerLat, radiusKm * 1.35, (ang + 180) % 360));

    // Segment lengths (haversine).
    segLen = [];
    let cum = 0;
    const cumAt = [0];
    for (let i = 0; i < points.length - 1; i++) {
        const [lonA, latA] = points[i];
        const [lonB, latB] = points[i + 1];
        const km = calculateDistance(latA, lonA, latB, lonB);
        segLen.push(km);
        cum += km;
        cumAt.push(cum);
    }
    const totalKm = cum || 1;

    // Each "leg" here is the segment that leads INTO a cross point; the center
    // crossing sits halfway along that segment (entry at radius R -> cross).
    // After replanning the pattern every sim tick the anchors move with the
    // storm, so track by leg index rather than absolute distance.
    return { points, segLen, cumAt, totalKm, legs, turnDeg };
}

function interpolateAlong(mission, frac) {
    const pts = mission.points;
    if (pts.length < 2) return pts[0] || [0, 0];
    const target = clamp(frac, 0, 1) * mission.totalKm;
    const cumAt = mission.cumAt;
    let i = 0;
    while (i < cumAt.length - 2 && cumAt[i + 1] < target) i++;
    const a = cumAt[i];
    const b = cumAt[i + 1];
    const k = b > a ? clamp((target - a) / (b - a), 0, 1) : 0;
    const [lonA, latA] = pts[i];
    const [lonB, latB] = pts[i + 1];
    return [lonA + (lonB - lonA) * k, latA + (latB - latA) * k];
}

function missionCrossFractions(mission) {
    // Crossing happens at the midpoint of the segments that end at a cross point:
    // segments 2, 4, 6, ... in the polyline (0-based: seg index 1,3,5... end at center).
    const fracs = [];
    const total = mission.totalKm;
    for (let seg = 1; seg < mission.segLen.length && fracs.length < mission.legs; seg += 2) {
        fracs.push((mission.cumAt[seg] + mission.segLen[seg] * 0.5) / total);
    }
    return fracs;
}

function buildMission(fx, cyclone, sim) {
    const flightIndex = fx.recon.flights.length;
    const tail = TAIL_NUMBERS[flightIndex % TAIL_NUMBERS.length];
    const circulationSize = cyclone.circulationSize || 300;
    const radiusKm = clamp(120 + circulationSize * 0.55, 130, 420);
    const legs = 6;
    const turnDeg = 42 + Math.floor(Math.random() * 10);

    const heading = Number(cyclone.direction) || 0;
    const patternOffset = Math.random() * 20;
    const pattern = buildMissionPattern(cyclone.lon, cyclone.lat, heading, radiusKm, legs, turnDeg, patternOffset);

    // Wall-clock duration keeps the visual legible at any sim speed. Faster
    // sim speeds compress a storm's lifetime, so shorten the sortie to give
    // the aircraft a realistic chance of finishing before the system dies.
    const speedMs = (sim && sim.speed) || 200;
    const durationSec = clamp(3.5 + speedMs / 20, 5, 45);

    return {
        tail,
        status: 'flying',
        radiusKm,
        headingLock: heading,
        patternOffset,
        anchorLon: cyclone.lon,
        anchorLat: cyclone.lat,
        legs,
        turnDeg,
        pattern,
        crossFracs: missionCrossFractions(pattern),
        sondeSeg: null,
        totalKm: pattern.totalKm,
        durationSec,
        frac: 0,
        distFrac: 0,           // distance traveled vs pattern (for fixes)
        legFixed: [],
        sondesDropped: [],
        startedWall: performance.now(),
        fixes: 0,
        sondeCount: 0,
        pos: [pattern.points[0][0], pattern.points[0][1]],
        flightPath: [[pattern.points[0][0], pattern.points[0][1]]],
        // Anchor-tracking: the pattern follows the live storm center, but its
        // position is interpolated across each sim-tick interval (see
        // anchorForFrame) so the storm's discrete per-tick center steps never
        // teleport the aircraft sideways.
        _aFromLon: cyclone.lon,
        _aFromLat: cyclone.lat,
        _aToLon: cyclone.lon,
        _aToLat: cyclone.lat,
        _replanAt: performance.now(),
        _tickMs: clamp(speedMs, 50, 4000)
    };
}

function replanMission(fx, mission, cyclone, tickMs) {
    if (!mission || mission.status !== 'flying') return;
    // Record the anchor transition (previous live center -> current live
    // center). anchorForFrame() eases across it over the tick interval, so a
    // storm that moves 100+ km per sim tick produces a smooth glide instead of
    // a visible sideways snap on every tick.
    mission._aFromLon = mission._aToLon;
    mission._aFromLat = mission._aToLat;
    mission._aToLon = cyclone.lon;
    mission._aToLat = cyclone.lat;
    mission._replanAt = performance.now();
    if (tickMs) mission._tickMs = clamp(Number(tickMs) || 200, 50, 4000);
}

// Smoothly interpolated storm center for this wall-clock moment (dateline-safe
// on the longitude). Between sim ticks the aircraft tracks this center instead
// of the raw cyclone position, which only changes in discrete per-tick steps.
function anchorForFrame(mission, now) {
    let dLon = mission._aToLon - mission._aFromLon;
    if (dLon > 180) dLon -= 360;
    else if (dLon < -180) dLon += 360;
    const span = Math.max(1, mission._tickMs || 200);
    const t = clamp((now - (mission._replanAt || 0)) / span, 0, 1);
    return [
        normalizeLongitude(mission._aFromLon + dLon * t),
        mission._aFromLat + (mission._aToLat - mission._aFromLat) * t
    ];
}

// The alpha shape is constant; only its center moves, so rebuilding it on a
// fresh anchor keeps the same progress fractions valid.
function patternAtAnchor(mission, lon, lat) {
    return buildMissionPattern(
        lon, lat, mission.headingLock, mission.radiusKm,
        mission.legs, mission.turnDeg, mission.patternOffset
    );
}

/**
 * Advance an active recon mission by wall-clock time. Returns events the
 * caller should surface (fixes, sondes, launch/completion/abort).
 */
export function updateReconMission(fx, cyclone, sim, now, dtMs = 16.7) {
    const events = [];
    const mission = fx && fx.recon && fx.recon.aircraft;
    if (!mission) return events;

    if (mission.status !== 'flying') {
        fx.recon.aircraft = null;
        return events;
    }

    if (!cyclone || cyclone.status !== 'active') {
        mission.status = 'aborted';
        events.push({
            type: 'abort',
            tail: mission.tail,
            message: `${mission.tail} recon mission aborted as the system lost its circulation.`
        });
        fx.recon.aircraft = null;
        fx.recon.cooldownUntil = now + 4000;
        return events;
    }

    mission.frac = clamp(mission.frac + (dtMs / 1000) / mission.durationSec, 0, 1.02);

    // Rebuild the pattern each frame on the smoothly-tracked center so the
    // aircraft rides the moving storm without per-tick teleports.
    const [aLon, aLat] = anchorForFrame(mission, now);
    mission.anchorLon = aLon;
    mission.anchorLat = aLat;
    mission.pattern = patternAtAnchor(mission, aLon, aLat);
    mission.totalKm = mission.pattern.totalKm;
    mission.crossFracs = missionCrossFractions(mission.pattern);

    const pressureSystems = (sim && sim.pressureSystems) || { lower: [] };
    const basin = (sim && sim.basin) || cyclone.basin || 'WPAC';

    const centerLat = clamp(cyclone.lat, -80, 80);
    const envP = getPressureAt(cyclone.lon, centerLat, pressureSystems);
    const centerP = windToPressure(Number(cyclone.intensity) || 0, cyclone.circulationSize || 300, basin, envP);

    const crossFracs = mission.crossFracs || [];
    const fixed = mission.legFixed || [];
    for (let k = 0; k < crossFracs.length; k++) {
        if (!fixed[k] && mission.frac >= crossFracs[k]) {
            fixed[k] = true;
            mission.fixes++;
            const mslp = Math.round(centerP + (Math.random() - 0.5) * 6);
            const windKt = Math.round((Number(cyclone.intensity) || 0) * (0.9 + Math.random() * 0.12));
            const age = Number(cyclone.age) || 0;
            // The fix is reported at the anchor the aircraft actually crossed
            // (the pattern's center at that moment) so the marker sits exactly
            // on the flight track instead of floating off it by a storm step.
            const fix = {
                type: 'fix',
                tail: mission.tail,
                mslp,
                windKt,
                lon: aLon,
                lat: aLat,
                age,
                wall: now,
                label: `${mslp}`
            };
            fx.recon.fixes.push(fix);
            mission.lastFix = fix;
            events.push({
                type: 'fix',
                tail: mission.tail,
                mslp,
                windKt,
                lon: aLon,
                lat: aLat,
                age,
                message: `${mission.tail} center fix: MSLP ${mslp} mb, peak flight-level wind ${windKt} kt near the center.`
            });
        }
    }

    // A sonde drops at each outer turn point (segments 0, 2, 4, ...).
    const segLen = mission.pattern ? mission.pattern.segLen : [];
    const cumAt = mission.pattern ? mission.pattern.cumAt : [];
    const totalKm = mission.totalKm || 1;
    const sondeFracs = mission.sondeSeg || [];
    for (let seg = 0; seg < segLen.length; seg += 2) {
        const fracCenter = (cumAt[seg] + segLen[seg] * 0.5) / totalKm;
        if (!mission.sondesDropped[seg] && mission.frac >= fracCenter) {
            mission.sondesDropped[seg] = true;
            const pos = interpolateAlong(mission.pattern, fracCenter);
            mission.sondeCount++;
            const distToCenter = calculateDistance(cyclone.lat, cyclone.lon, pos[1], pos[0]);
            const rmwKm = 8 + (cyclone.circulationSize || 300) * 0.12;
            const sondeP = Math.round(calculateHollandPressure(Math.max(1, distToCenter), rmwKm, centerP, envP));
            const windVec = getWindVectorAt(pos[0], pos[1], sim && sim.month, cyclone, pressureSystems);
            const windKt = Math.max(0, Math.round((windVec && windVec.magnitude) || 0));
            const drop = {
                type: 'sonde',
                tail: mission.tail,
                lon: pos[0],
                lat: pos[1],
                pressure: sondeP,
                windKt,
                wall: now,
                label: `${windKt}KT ${sondeP}MB`
            };
            fx.recon.sondeDrops.push(drop);
            events.push({
                type: 'sonde',
                message: `${mission.tail} dropsonde #${mission.sondeCount}: ${sondeP} mb, ${windKt} kt surface wind.`
            });
        }
    }

    // Advance the drawn flight path.
    mission.pos = interpolateAlong(mission.pattern, mission.frac);
    mission.flightPath.push([mission.pos[0], mission.pos[1]]);
    if (mission.flightPath.length > 800) mission.flightPath.splice(0, mission.flightPath.length - 800);

    if (mission.frac >= 1) {
        mission.status = 'complete';
        fx.recon.aircraft = null;
        fx.recon.cooldownUntil = now + 9000;
        fx.recon.flights.push({
            tail: mission.tail,
            fixes: mission.fixes,
            sondeCount: mission.sondeCount,
            endedWall: now
        });
        events.push({
            type: 'complete',
            tail: mission.tail,
            fixes: mission.fixes,
            sondeCount: mission.sondeCount,
            message: `${mission.tail} recon complete: ${mission.fixes} center fixes, ${mission.sondeCount} dropsondes.`
        });
    }

    return events;
}

export function startReconMission(fx, cyclone, sim) {
    const events = [];
    if (!fx || !cyclone) return events;
    if (fx.recon.aircraft || !canLaunchRecon(fx, cyclone)) return events;
    const mission = buildMission(fx, cyclone, sim || {});
    mission.legFixed = [];
    mission.sondesDropped = [];
    fx.recon.aircraft = mission;
    fx.recon.lastMission = mission;
    events.push({
        type: 'launch',
        tail: mission.tail,
        message: `${mission.tail} recon sortie launched — alpha pattern into ${cyclone.named ? cyclone.name.toUpperCase() : 'the disturbance'}.`
    });
    return events;
}

export function replanReconMission(fx, cyclone, tickMs) {
    replanMission(fx, fx.recon && fx.recon.aircraft, cyclone, tickMs);
}

/**
 * Wall-clock driver shared by the rAF loop and the simulation tick. The tick
 * path acts as a fallback so effects keep moving even if requestAnimationFrame
 * is throttled (background tab / preview) — the rAF loop normally wins because
 * it calls first within the same frame budget.
 */
export function advanceFxWall(fx, cyclone, sim, now, paused = false) {
    const events = [];
    if (!fx) return events;
    if (paused) {
        // Frozen sim: allow already-spawned bolts to fade visually but do not
        // spawn anything new or move the aircraft.
        fx._lastAdvance = now;
        pruneFxMarkers(fx, now);
        return events;
    }
    const last = fx._lastAdvance || now;
    if (now - last < 4) return events; // already handled by rAF this frame
    const dtMs = Math.min(1000, now - last);
    fx._lastAdvance = now;

    if (cyclone && cyclone.status === 'active') {
        events.push(...updateLightningFx(fx, cyclone, now));
    }
    if (fx.recon && fx.recon.aircraft) {
        events.push(...updateReconMission(fx, cyclone, sim, now, dtMs));
    }
    pruneFxMarkers(fx, now);
    return events;
}

export function pruneFxMarkers(fx, now) {
    if (!fx) return;
    const recon = fx.recon;
    if (recon.fixes && recon.fixes.length) {
        recon.fixes = recon.fixes.filter(f => now - (f.wall || 0) < 22000);
    }
    if (recon.sondeDrops && recon.sondeDrops.length) {
        recon.sondeDrops = recon.sondeDrops.filter(d => now - (d.wall || 0) < 9000);
    }
    if (fx.lightning && fx.lightning.bolts.length) {
        fx.lightning.bolts = fx.lightning.bolts.filter(b => now - (b.born || 0) < (b.life || 400));
    }
}

// ------------------------------------------------------------- rendering

// Offscreen canvas that caches the accumulated-rain mosaic. Rebuilt only when
// the projection or the rain field changes, then blitted each frame.
let patternCanvas = null;
let patternCtx = null;
let patternW = 0;
let patternH = 0;

function ensurePatternCanvas(w, h) {
    if (!patternCanvas) {
        patternCanvas = document.createElement('canvas');
        patternCtx = patternCanvas.getContext('2d');
    }
    if (patternW !== w || patternH !== h) {
        patternCanvas.width = w;
        patternCanvas.height = h;
        patternW = w;
        patternH = h;
    }
}

function projectionKey(projection, w, h) {
    try {
        const center = projection.center() || [0, 0];
        const scale = projection.scale() || 1;
        const translate = projection.translate() || [0, 0];
        return `${w}x${h}|${center[0].toFixed(2)},${center[1].toFixed(2)}|${scale.toFixed(1)}|${Math.round(translate[0])},${Math.round(translate[1])}`;
    } catch (e) {
        return 'none';
    }
}

function rebuildRainPattern(fx, projection, w, h, now) {
    const rain = fx.rain;
    const sig = projectionKey(projection, w, h);
    if (rain._sig === sig && rain.version === rain._version && now - rain._lastBuild < RAIN_BUILD_INTERVAL_MS) return false;
    rain._sig = sig;
    rain._version = rain.version;
    rain._lastBuild = now;

    ensurePatternCanvas(w, h);
    patternCtx.clearRect(0, 0, w, h);

    const cells = rain.cells;
    if (!cells || cells.size === 0) return true;

    const center = projection.center() || [0, 0];
    const pxPerDeg = cellScreenSize(projection, center[0], center[1]);

    // Only cells near the current viewport matter; skip the rest quickly by
    // checking the geo distance to the projection center.
    const viewSpanDeg = Math.max(8, (h / Math.max(1, pxPerDeg)) * 1.15);
    let floodCells = 0;

    patternCtx.save();
    for (const cell of cells.values()) {
        let dLon = cell.lon - center[0];
        if (dLon > 180) dLon -= 360;
        else if (dLon < -180) dLon += 360;
        if (Math.abs(dLon) > viewSpanDeg || Math.abs(cell.lat - center[1]) > viewSpanDeg) continue;

        const p = projection([normalizeLongitude(cell.lon), cell.lat]);
        if (!p) continue;
        const size = pxPerDeg * RAIN_CELL_DEG * 1.35;
        if (cell.mm < 2) continue;

        const alpha = clamp(0.30 + cell.mm / 900, 0.30, 0.78);
        patternCtx.globalAlpha = alpha;
        patternCtx.fillStyle = colorAt(cell.mm);
        patternCtx.fillRect(p[0] - size / 2, p[1] - size / 2, size, size);

        // Flood tinting: once a land cell has soaked up a lot of rain it
        // reads as standing water.
        if (cell.land && cell.mm > 150) {
            patternCtx.globalAlpha = clamp((cell.mm - 150) / 900, 0.10, 0.34);
            patternCtx.fillStyle = '#38bdf8';
            patternCtx.fillRect(p[0] - size / 2, p[1] - size / 2, size, size);
            floodCells++;
        }
    }
    patternCtx.restore();
    return true;
}

function drawRainLayer(ctx, fx, projection, w, h, now) {
    if (!fx.showRainfall || !fx.rain.cells || fx.rain.cells.size === 0) return;
    if (rebuildRainPattern(fx, projection, w, h, now)) {
        ctx.drawImage(patternCanvas, 0, 0, w, h);
    } else {
        ctx.drawImage(patternCanvas, 0, 0, w, h);
    }
}

function drawBolts(ctx, fx, projection, now) {
    if (!fx.showLightning || !fx.lightning.bolts.length) return;
    const bolts = fx.lightning.bolts;
    for (let i = 0; i < bolts.length; i++) {
        const bolt = bolts[i];
        const age = now - (bolt.born || 0);
        if (age >= bolt.life) continue;
        const p = projection([bolt.lon, bolt.lat]);
        if (!p) continue;
        const t = age / bolt.life;
        const alpha = 1 - t;

        // Brief cloud flash at the strike origin.
        if (bolt.flash && t < 0.35) {
            const flashAlpha = (0.35 - t) / 0.35;
            const r = 14 + 40 * t;
            const grad = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
            grad.addColorStop(0, `rgba(190,225,255,${0.55 * flashAlpha})`);
            grad.addColorStop(1, 'rgba(190,225,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Main bolt — jagged channel pointing up from the strike point.
        const seg = 6 + Math.floor(rollBoltSeed(bolt.seed, 1) * 5);
        const height = 26 + rollBoltSeed(bolt.seed, 2) * 58;
        let x = p[0];
        let y = p[1];
        ctx.beginPath();
        ctx.moveTo(x, y);
        let branch = null;
        for (let s = 1; s <= seg; s++) {
            const drift = (rollBoltSeed(bolt.seed, s * 3 + 1) - 0.5) * 22;
            x += drift * (s % 2 === 0 ? 1 : -1) * 0.6;
            y -= height / seg;
            ctx.lineTo(x, y);
            if (s === Math.floor(seg * 0.5) && rollBoltSeed(bolt.seed, 9) > 0.35) {
                branch = [x, y];
            }
        }
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = `rgba(165,205,255,${0.5 * alpha})`;
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = `rgba(248,250,252,${0.95 * alpha})`;
        ctx.stroke();

        if (branch) {
            let bx = branch[0];
            let by = branch[1];
            ctx.beginPath();
            ctx.moveTo(bx, by);
            for (let s = 1; s <= 3; s++) {
                bx += (rollBoltSeed(bolt.seed, s * 17 + 5) - 0.5) * 14;
                by -= 8;
                ctx.lineTo(bx, by);
            }
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(203,228,255,${0.6 * alpha})`;
            ctx.stroke();
        }
    }
}

function projectSafe(projection, lon, lat) {
    try {
        return projection([lon, lat]);
    } catch (e) {
        return null;
    }
}

function drawRecon(ctx, fx, projection, now) {
    const recon = fx.recon;
    const mission = recon.aircraft;
    if (!mission && !recon.fixes.length && !recon.sondeDrops.length) return;

    // 1. Planned alpha pattern + orbit ring (dashed).
    if (mission && mission.pattern && mission.pattern.points) {
        const pts = mission.pattern.points;
        ctx.save();
        ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(125,211,252,0.5)';
        ctx.beginPath();
        let started = false;
        for (const [lon, lat] of pts) {
            const p = projectSafe(projection, lon, lat);
            if (!p) continue;
            if (!started) { ctx.moveTo(p[0], p[1]); started = true; }
            else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
        ctx.restore();

        // Orbit ring at pattern radius around the anchored center.
        const centerP = projectSafe(projection, mission.anchorLon, mission.anchorLat);
        if (centerP) {
            const edge = projectSafe(projection,
                mission.anchorLon + (mission.radiusKm * DEG_PER_KM_LAT) / Math.max(0.3, Math.cos(clamp(mission.anchorLat, -80, 80) * RAD)),
                mission.anchorLat);
            const ringR = edge ? Math.hypot(edge[0] - centerP[0], edge[1] - centerP[1]) : 40;
            ctx.save();
            ctx.setLineDash([2, 6]);
            ctx.strokeStyle = 'rgba(34,211,238,0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerP[0], centerP[1], ringR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // 2. Flown path.
    if (mission && mission.flightPath && mission.flightPath.length > 1) {
        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(224,242,254,0.8)';
        ctx.beginPath();
        let started = false;
        for (const [lon, lat] of mission.flightPath) {
            const p = projectSafe(projection, lon, lat);
            if (!p) continue;
            if (!started) { ctx.moveTo(p[0], p[1]); started = true; }
            else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
        ctx.restore();
    }

    // 3. Center-fix stars with pressure labels.
    const font = '700 9px "JetBrains Mono", monospace';
    for (const fix of recon.fixes) {
        const age = now - (fix.wall || 0);
        if (age > 20000) continue;
        const p = projectSafe(projection, fix.lon, fix.lat);
        if (!p) continue;
        const fade = age < 20000 ? 1 : 0;
        const pulse = 4 + Math.sin(now / 180 + fix.wall) * 1.4;
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.globalAlpha = clamp(1 - age / 20000, 0, 1) * fade;
        // 5-point star
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let s = 0; s < 10; s++) {
            const rr = s % 2 === 0 ? 7 : 3;
            const a = (s / 10) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a) * rr;
            const y = Math.sin(a) * rr;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = font;
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = 'rgba(2,6,23,0.9)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(`FIX ${fix.label}`, p[0], p[1] + 20);
        ctx.fillText(`FIX ${fix.label}`, p[0], p[1] + 20);
        ctx.restore();

        // Expanding ring pulse at the fix.
        ctx.save();
        const ringT = (age % 2600) / 2600;
        ctx.globalAlpha = (1 - ringT) * 0.7;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 4 + ringT * 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 4. Dropsondes.
    ctx.font = font;
    for (const drop of recon.sondeDrops) {
        const age = now - (drop.wall || 0);
        if (age > 9000) continue;
        const p = projectSafe(projection, drop.lon, drop.lat);
        if (!p) continue;
        ctx.save();
        ctx.globalAlpha = clamp(1 - age / 9000, 0, 1);
        ctx.strokeStyle = '#a5f3fc';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1] - 12);
        ctx.lineTo(p[0], p[1] + 4);
        ctx.stroke();
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(p[0] - 1.5, p[1] - 3, 3, 3);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#a5f3fc';
        ctx.strokeStyle = 'rgba(2,6,23,0.85)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'left';
        ctx.strokeText(`SND ${drop.label}`, p[0] + 8, p[1] - 4);
        ctx.fillText(`SND ${drop.label}`, p[0] + 8, p[1] - 4);
        ctx.restore();
    }

    // 5. The aircraft itself.
    if (mission && mission.status === 'flying') {
        const p = projectSafe(projection, mission.pos[0], mission.pos[1]);
        if (p) {
            // Heading from the last two flown positions.
            const path = mission.flightPath;
            let headingPx = -90; // up by default
            if (path.length > 3) {
                const a = projectSafe(projection, path[path.length - 3][0], path[path.length - 3][1]);
                const b = projectSafe(projection, path[path.length - 1][0], path[path.length - 1][1]);
                if (a && b) headingPx = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
            }
            ctx.save();
            ctx.translate(p[0], p[1]);
            ctx.rotate(((headingPx + 90) * Math.PI) / 180);

            // Fuselage + wings pointing along travel direction.
            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = '#0369a1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(3.5, 0);
            ctx.lineTo(0, -1.5);
            ctx.lineTo(-3.5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.font = font;
            ctx.fillStyle = '#7dd3fc';
            ctx.strokeStyle = 'rgba(2,6,23,0.9)';
            ctx.lineWidth = 3;
            ctx.textAlign = 'left';
            const tx = p[0] + 9;
            const ty = p[1] - 8;
            const tag = `${mission.tail} ● ${Math.round((mission.frac || 0) * 100)}%`;
            ctx.strokeText(tag, tx, ty);
            ctx.fillText(tag, tx, ty);
            ctx.restore();
        }
    }
}

/**
 * Draw all storm FX onto the caller's 2D context (CSS-pixel coordinate space).
 */
export function renderStormFx(ctx, canvas, fx, cyclone, projection, now) {
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    if (!fx || !projection) return;

    if (fx.rain && fx.rain.cells && fx.rain.cells.size > 0) {
        drawRainLayer(ctx, fx, projection, w, h, now);
    }
    drawBolts(ctx, fx, projection, now);
    drawRecon(ctx, fx, projection, now);
}

/** Keep the FX canvas sized to its container (CSS pixel resolution). */
export function resizeStormFxCanvas(width, height) {
    if (patternCanvas) {
        if (patternW !== width || patternH !== height) {
            patternCanvas.width = width;
            patternCanvas.height = height;
            patternW = width;
            patternH = height;
        }
    }
    // pattern cache signature is keyed by w/h so a rebuild happens naturally.
}

export function hasFxContent(fx) {
    if (!fx) return false;
    if (fx.rain && fx.rain.cells && fx.rain.cells.size > 0) return true;
    if (fx.showLightning && fx.lightning && fx.lightning.bolts.length > 0) return true;
    const recon = fx.recon || {};
    if (recon.aircraft || (recon.fixes && recon.fixes.length) || (recon.sondeDrops && recon.sondeDrops.length)) return true;
    return false;
}
