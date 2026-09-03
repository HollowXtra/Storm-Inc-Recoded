/**
 * radar-view.js
 * 全屏雷达画面 (按 R 键显示, 跟随气旋):
 *  - WebGL 着色器渲染反射率 (复用 RadarRenderer 的 NEXRAD 风格回波)
 *  - 2D 覆盖层: 真实海岸/地形底图、真实雷达站点、真实城市、距离环与扫描线
 */
import { RadarRenderer } from './radar-system.js';
import { calculateBackgroundHumidity } from './visualization.js';
import { RADAR_SITES, CITIES, findNearestRadarSite, haversineKm } from './radar-sites.js';

const RANGE_KM = 460;        // 雷达显示半径 (与 RadarRenderer 的 u_radar_radius_km 一致)
const ECHO_RES = 512;        // WebGL 回波画布分辨率
const KM_PER_DEG = 111.32;

// ---------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------
function unrollDlon(dLon) {
    while (dLon > 180) dLon -= 360;
    while (dLon < -180) dLon += 360;
    return dLon;
}

export function initRadarScreen(container, worldGetter) {
    if (!container || initRadarScreen._created) return null;
    initRadarScreen._created = true;

    // --- DOM ---
    const root = document.createElement('div');
    root.id = 'radar-screen';
    root.className = 'radar-screen hidden';
    root.innerHTML = `
        <div class="rs-header">
            <div class="rs-left">
                <span class="rs-dot"></span>
                <span class="rs-kicker">GROUND-BASED WEATHER RADAR</span>
                <span class="rs-title">REFLECTIVITY&nbsp;MOSAIC</span>
                <span class="rs-station" id="rs-station">—</span>
            </div>
            <div class="rs-meta">
                <span id="rs-center"></span>
                <span id="rs-storm"></span>
            </div>
            <button type="button" class="rs-close" id="rs-close" title="Close radar (R)">✕&nbsp;EXIT&nbsp;<kbd>R</kbd></button>
        </div>
        <div class="rs-scope-wrap">
            <div class="rs-scope" id="rs-scope">
                <canvas id="rs-base"></canvas>
                <canvas id="rs-echo"></canvas>
                <canvas id="rs-ui"></canvas>
                <div class="rs-hud" id="rs-hud">
                    <span class="rs-hud-tl" id="rs-hud-tl">RNG 460 KM</span>
                    <span class="rs-hud-tr" id="rs-hud-tr">MODE&nbsp;·&nbsp;REFLECTIVITY</span>
                    <span class="rs-hud-bl" id="rs-hud-bl">dBZ COLOR SCALE BELOW</span>
                    <span class="rs-hud-br" id="rs-hud-br">TRACK RADAR</span>
                    <span class="rs-hud-n">N</span>
                </div>
            </div>
        </div>`;
    container.appendChild(root);

    const baseCanvas = root.querySelector('#rs-base');
    const echoCanvas = root.querySelector('#rs-echo');
    const uiCanvas = root.querySelector('#rs-ui');
    const scopeEl = root.querySelector('#rs-scope');
    const stationEl = root.querySelector('#rs-station');
    const centerEl = root.querySelector('#rs-center');
    const stormEl = root.querySelector('#rs-storm');

    echoCanvas.width = ECHO_RES;
    echoCanvas.height = ECHO_RES;

    // WebGL 回波渲染器 (独立上下文; preserveDrawingBuffer 便于截图/取色校验)
    let echoRenderer = null;
    try {
        const glCtx = echoCanvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: true }) || echoCanvas.getContext('experimental-webgl', { preserveDrawingBuffer: true, alpha: true });
        if (!glCtx) throw new Error('webgl unavailable');
        echoRenderer = new RadarRenderer(echoCanvas);
    } catch (e) {
        console.warn('Radar screen WebGL init failed:', e);
    }

    const base = baseCanvas.getContext('2d');
    const ui = uiCanvas.getContext('2d');
    const dpr = () => window.devicePixelRatio || 1;

    // 缓存状态
    let scopeCss = 0;                 // 作用域 CSS 边长 (px)
    let geoCache = null;              // 地理底图缓存 (离屏 canvas)
    let geoKey = '';                  // 缓存键
    let humidityCache = { key: '', value: 0.7 };
    let lastState = null;

    // 把经纬度映射到作用域内 CSS 坐标 (x 向东, y 向北)
    function project(lat, lon, cLat, cLon, pxPerKm, centerPx) {
        const dLon = unrollDlon(lon - cLon);
        const dxKm = dLon * KM_PER_DEG * Math.cos(cLat * Math.PI / 180);
        const dyKm = (lat - cLat) * KM_PER_DEG;
        return [centerPx + dxKm * pxPerKm, centerPx - dyKm * pxPerKm];
    }

    // 逐段绘制世界陆地矢量 (裁剪到雷达圆内)
    function buildGeo(world, cLat, cLon, pxPerKm, size) {
        const off = document.createElement('canvas');
        off.width = size;
        off.height = size;
        const o = off.getContext('2d');
        o.setTransform(1, 0, 0, 1, 0, 0);

        o.beginPath();
        o.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
        o.fillStyle = '#04080d';
        o.fill();

        const minLat = cLat - RANGE_KM / KM_PER_DEG - 0.6;
        const maxLat = cLat + RANGE_KM / KM_PER_DEG + 0.6;
        const halfLon = (RANGE_KM / (KM_PER_DEG * Math.cos(cLat * Math.PI / 180))) + 0.6;
        const minLon = cLon - halfLon;
        const maxLon = cLon + halfLon;

        if (!world || !world.features) return off;
        o.save();
        o.beginPath();
        o.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
        o.clip();

        o.fillStyle = '#0d2033';
        o.strokeStyle = 'rgba(120, 165, 205, 0.5)';
        o.lineWidth = 0.8;
        o.lineJoin = 'round';

        const trace = (rings, fillFirst) => {
            rings.forEach((ring, ri) => {
                if (!ring || ring.length < 3) return;
                let rMinY = Infinity, rMaxY = -Infinity;
                for (const p of ring) {
                    if (p[1] < rMinY) rMinY = p[1];
                    if (p[1] > rMaxY) rMaxY = p[1];
                }
                if (rMaxY < minLat || rMinY > maxLat) return;
                o.beginPath();
                let started = false;
                let prevLon = null;
                for (const p of ring) {
                    const lon = p[0], lat = p[1];
                    const dLonC = unrollDlon(lon - cLon);
                    // 跨日界线等大跳变时断开线段
                    if (prevLon !== null && Math.abs(unrollDlon(lon - prevLon)) > 90) { started = false; }
                    const [x, y] = project(lat, lon, cLat, cLon, pxPerKm, size / 2);
                    if (!started) { o.moveTo(x, y); started = true; }
                    else o.lineTo(x, y);
                    prevLon = lon;
                }
                if (fillFirst && ri === 0) { o.closePath(); o.fill(); }
                if (started) o.stroke();
            });
        };

        for (const f of world.features) {
            const g = f.geometry;
            if (!g) continue;
            if (g.type === 'Polygon') trace([g.coordinates], true);
            else if (g.type === 'MultiPolygon') for (const poly of g.coordinates) trace(poly, true);
        }
        o.restore();
        return off;
    }

    // 大气湿度 (缓存到中心坐标变化为止)
    function humidityFor(state, cLat, cLon) {
        const key = `${cLat.toFixed(3)}|${cLon.toFixed(3)}`;
        if (humidityCache.key === key) return humidityCache.value;
        let h = 0.7;
        try {
            const raw = calculateBackgroundHumidity(cLon, cLat, state.pressureSystems, state.currentMonth, state.cyclone, state.GlobalTemp);
            h = raw / 100;
        } catch (e) { /* keep default */ }
        humidityCache.key = key;
        humidityCache.value = Math.max(0, Math.min(1, h));
        return humidityCache.value;
    }

    function drawText(ctx, text, x, y, opts = {}) {
        const { size = 10, color = 'rgba(220,240,255,0.92)', halo = 'rgba(0,0,0,0.85)', bold = false, align = 'left' } = opts;
        ctx.font = `${bold ? 'bold ' : ''}${size}px Rajdhani, 'Segoe UI', monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = align;
        ctx.lineWidth = Math.max(2, size * 0.28);
        ctx.strokeStyle = halo;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    // ---------------------------------------------------------------
    // 主入口: 每帧调用 (radarMode 开启时)
    // state: 完整 app state; cyclone: 聚焦气旋 (跟随其位置)
    // ---------------------------------------------------------------
    function frame(state, cyclone) {
        if (!root.classList.contains('radar-screen-on')) return;

        // 1. 布局
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const headerH = 46;
        const avail = Math.min(cw, ch - headerH - 20) - 20;
        const size = Math.max(280, Math.floor(avail));
        if (scopeCss !== size) {
            scopeCss = size;
            scopeEl.style.width = size + 'px';
            scopeEl.style.height = size + 'px';
            baseCanvas.width = Math.round(size * dpr());
            baseCanvas.height = Math.round(size * dpr());
            baseCanvas.style.width = size + 'px';
            baseCanvas.style.height = size + 'px';
            uiCanvas.width = Math.round(size * dpr());
            uiCanvas.height = Math.round(size * dpr());
            uiCanvas.style.width = size + 'px';
            uiCanvas.style.height = size + 'px';
            echoCanvas.style.width = size + 'px';
            echoCanvas.style.height = size + 'px';
            geoKey = '';
        }

        // 2. 中心 = 气旋位置
        const cLat = cyclone ? cyclone.lat : (state.siteLat ?? 0);
        const cLon = cyclone ? cyclone.lon : (state.siteLon ?? 0);
        if (!isFinite(cLat) || !isFinite(cLon)) return;

        const pxPerKm = (size / 2 - 4) / RANGE_KM;
        const centerPx = size / 2;

        // 3. 头部信息
        const nearest = findNearestRadarSite(cLat, cLon, 1600);
        stationEl.textContent = nearest
            ? `${nearest.site.name}  ·  ${Math.round(nearest.km)} km`
            : 'NO GROUND SITE IN RANGE';
        centerEl.textContent = `CENTER ${Math.abs(cLat).toFixed(2)}°${cLat >= 0 ? 'N' : 'S'}  ${Math.abs(cLon).toFixed(2)}°${cLon >= 0 ? 'E' : 'W'} · ${RANGE_KM} KM RANGE`;
        let stormTxt = 'STANDBY · NO ACTIVE SYSTEM';
        if (!cyclone) stormTxt = 'SITE OBSERVATION';
        else if (cyclone.status === 'active') {
            const nm = cyclone.named ? (cyclone.name ? cyclone.name.toUpperCase() : 'NAMED SYSTEM') : 'SYSTEM';
            stormTxt = `TRACKING ${nm} · ${Math.round(cyclone.intensity || 0)} KT`;
        } else if (cyclone.status === 'dissipated') {
            stormTxt = `FINAL POSITION · ${(cyclone.name || '').toUpperCase() || 'SYSTEM'}`;
        }
        stormEl.textContent = stormTxt;

        // 4. 地理底图缓存
        const gKey = `${size}|${cLat.toFixed(2)}|${cLon.toFixed(2)}`;
        if (gKey !== geoKey || !geoCache) {
            geoKey = gKey;
            geoCache = buildGeo(worldGetter ? worldGetter() : null, cLat, cLon, pxPerKm, size);
        }

        // 5. 地理底图 (最底层, 在回波之下)
        base.setTransform(dpr(), 0, 0, dpr(), 0, 0);
        base.clearRect(0, 0, size, size);
        if (geoCache) base.drawImage(geoCache, 0, 0, size, size);

        // 6. WebGL 回波 (覆盖在地理底图之上)
        if (echoRenderer && cyclone && cyclone.status === 'active') {
            try {
                const proxy = Object.assign({}, state, { siteLon: cLon, siteLat: cLat });
                echoRenderer.render(proxy, ECHO_RES, ECHO_RES, humidityFor(state, cLat, cLon), cyclone.age);
            } catch (e) {
                // 静默降级: 不绘制回波
            }
        }

        // 7. UI 覆盖层 (距离环/城市/站点/扫描线)
        ui.setTransform(dpr(), 0, 0, dpr(), 0, 0);
        ui.clearRect(0, 0, size, size);

        // 6b. 距离环与方位刻度
        ui.save();
        ui.beginPath();
        ui.arc(centerPx, centerPx, size / 2 - 4, 0, Math.PI * 2);
        ui.clip();

        ui.strokeStyle = 'rgba(90, 150, 175, 0.35)';
        ui.lineWidth = 1;
        for (const km of [50, 100, 150, 200, 300, 400]) {
            const r = km * pxPerKm;
            ui.beginPath();
            ui.arc(centerPx, centerPx, r, 0, Math.PI * 2);
            ui.stroke();
            if (km % 100 === 0 || km === 50) {
                drawText(ui, `${km}`, centerPx + r + 3, centerPx, { size: 9, color: 'rgba(120,190,215,0.8)' });
            }
        }
        // 十字
        ui.strokeStyle = 'rgba(90,150,175,0.18)';
        ui.beginPath(); ui.moveTo(centerPx - size / 2 + 4, centerPx); ui.lineTo(centerPx + size / 2 - 4, centerPx); ui.stroke();
        ui.beginPath(); ui.moveTo(centerPx, centerPx - size / 2 + 4); ui.lineTo(centerPx, centerPx + size / 2 - 4); ui.stroke();

        // 方位刻度 (0-360 每 30 度)
        ui.strokeStyle = 'rgba(150,210,230,0.55)';
        ui.lineWidth = 1.4;
        for (let a = 0; a < 360; a += 30) {
            const rad = (a - 90) * Math.PI / 180;
            const r0 = size / 2 - 4;
            const dx = Math.cos(rad), dy = Math.sin(rad);
            ui.beginPath();
            ui.moveTo(centerPx + dx * (r0 - 8), centerPx + dy * (r0 - 8));
            ui.lineTo(centerPx + dx * r0, centerPx + dy * r0);
            ui.stroke();
        }
        ui.restore();

        // 6c. 城市标注 + 6d. 雷达站点 (圆形裁剪内)
        ui.save();
        ui.beginPath();
        ui.arc(centerPx, centerPx, size / 2 - 4, 0, Math.PI * 2);
        ui.clip();
        const placedBoxes = [];
        const cityRanks = [...CITIES].sort((a, b) => a.rank - b.rank);
        for (const city of cityRanks) {
            const d = haversineKm(cLat, cLon, city.lat, city.lon);
            if (d > RANGE_KM * 0.94) continue;
            const [x, y] = project(city.lat, city.lon, cLat, cLon, pxPerKm, centerPx);
            // 简单防重叠 (只检查已放置标签的包围盒)
            const w = city.name.length * (city.rank === 1 ? 6.4 : 5.2) + 8;
            let collide = false;
            for (const b of placedBoxes) {
                if (x + w > b.x && x < b.x + b.w && y + 8 > b.y && y - 8 < b.y + b.h) { collide = true; break; }
            }
            if (collide) continue;
            ui.fillStyle = 'rgba(255,255,255,0.55)';
            ui.beginPath();
            ui.arc(x, y, city.rank === 1 ? 2 : 1.4, 0, Math.PI * 2);
            ui.fill();
            drawText(ui, city.name.toUpperCase(), x + 4, y, {
                size: city.rank === 1 ? 10 : 8.4,
                color: 'rgba(255,255,255,0.85)',
                bold: city.rank === 1,
                align: 'left'
            });
            placedBoxes.push({ x, y, w, h: 16 });
        }

        // 6d. 真实雷达站点标注
        for (const site of RADAR_SITES) {
            const d = haversineKm(cLat, cLon, site.lat, site.lon);
            if (d > RANGE_KM * 0.98) continue;
            const [x, y] = project(site.lat, site.lon, cLat, cLon, pxPerKm, centerPx);
            // 小雷达塔标
            ui.save();
            ui.translate(x, y);
            ui.rotate(Math.PI / 4);
            ui.fillStyle = '#3fd0ff';
            ui.fillRect(-3, -3, 6, 6);
            ui.restore();
            drawText(ui, site.id, x + 6, y - 6, { size: 8.6, color: 'rgba(90,220,255,0.95)', bold: true, align: 'left' });
        }
        ui.restore();

        // 6e. 扫描线
        const now = performance.now() / 1000;
        const sweepA = now * 0.9; // rad/s
        ui.save();
        ui.beginPath();
        ui.arc(centerPx, centerPx, size / 2 - 4, 0, Math.PI * 2);
        ui.clip();
        const wx0 = centerPx + Math.cos(sweepA - 0.14) * (size / 2 - 4);
        const wy0 = centerPx + Math.sin(sweepA - 0.14) * (size / 2 - 4);
        const wx1 = centerPx + Math.cos(sweepA + 0.14) * (size / 2 - 4);
        const wy1 = centerPx + Math.sin(sweepA + 0.14) * (size / 2 - 4);
        const wg = ui.createRadialGradient(centerPx, centerPx, 0, centerPx, centerPx, size / 2);
        wg.addColorStop(0, 'rgba(120,255,255,0.10)');
        wg.addColorStop(1, 'rgba(120,255,255,0.00)');
        ui.fillStyle = wg;
        ui.beginPath();
        ui.moveTo(centerPx, centerPx);
        ui.lineTo(wx0, wy0);
        ui.arc(centerPx, centerPx, size / 2 - 4, sweepA - 0.14, sweepA + 0.14);
        ui.lineTo(centerPx, centerPx);
        ui.fill();
        ui.strokeStyle = 'rgba(140,255,235,0.85)';
        ui.lineWidth = 1.6;
        ui.beginPath();
        ui.moveTo(centerPx, centerPx);
        ui.lineTo(wx1, wy1);
        ui.stroke();
        ui.restore();

        // 6f. 中心 (气旋) 标记 - 仅真实气旋 (非待机中心)
        if (cyclone && cyclone.status === 'active') {
            const pulse = 1 + 0.25 * Math.sin(now * 5);
            ui.strokeStyle = 'rgba(255,80,110,0.95)';
            ui.lineWidth = 1.6;
            ui.beginPath();
            ui.arc(centerPx, centerPx, 5 * pulse, 0, Math.PI * 2);
            ui.stroke();
            ui.fillStyle = 'rgba(255,90,120,0.9)';
            ui.beginPath();
            ui.arc(centerPx, centerPx, 2.2, 0, Math.PI * 2);
            ui.fill();
            drawText(ui, 'STORM CENTER', centerPx + 9, centerPx - 10, {
                size: 9, color: 'rgba(255,150,170,0.95)', bold: true, align: 'left'
            });
        }

        lastState = state;
    }

    // 显隐
    function show() {
        root.classList.remove('hidden');
        root.classList.add('radar-screen-on');
        geoKey = '';
        humidityCache.key = '';
    }
    function hide() {
        root.classList.add('hidden');
        root.classList.remove('radar-screen-on');
    }
    function isVisible() {
        return root.classList.contains('radar-screen-on');
    }

    root.querySelector('#rs-close').addEventListener('click', () => {
        if (root._onExit) root._onExit();
    });

    return {
        el: root,
        isVisible,
        show,
        hide,
        frame,
        setOnExit: (fn) => { root._onExit = fn; },
        loadTerrainTexture: (img) => {
            if (echoRenderer) echoRenderer.loadTerrainTexture(img);
        }
    };
}
