import { describe, it, expect } from 'vitest';
import {
  NAME_LISTS,
  calculateAtmosphericNoise,
  normalizeLongitude,
  shortestLongitudeDistance,
  calculateDistance,
  unwrapLongitude,
  calculateHollandPressure,
  createGeoCircle,
  getCategory,
  knotsToKph,
  knotsToMph,
  windToPressure,
  getPressureAt,
  directionToCompass,
  getSST,
} from '../Storm_Inc/js/utils.js';

describe('NAME_LISTS', () => {
  it('contains all expected basins as non-empty string arrays', () => {
    for (const basin of ['WPAC', 'NATL', 'EPAC', 'NIO', 'SIO', 'SHEM', 'SATL']) {
      expect(Array.isArray(NAME_LISTS[basin])).toBe(true);
      expect(NAME_LISTS[basin].length).toBeGreaterThan(0);
      for (const name of NAME_LISTS[basin]) {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('normalizeLongitude', () => {
  it('leaves values already in range unchanged', () => {
    expect(normalizeLongitude(0)).toBe(0);
    expect(normalizeLongitude(90)).toBe(90);
    expect(normalizeLongitude(-90)).toBe(-90);
  });

  it('wraps values outside [-180, 180]', () => {
    expect(normalizeLongitude(190)).toBe(-170);
    expect(normalizeLongitude(-190)).toBe(170);
    expect(normalizeLongitude(360)).toBe(0);
    expect(normalizeLongitude(540)).toBe(-180);
  });

  it('maps the +/-180 boundary to -180', () => {
    expect(normalizeLongitude(180)).toBe(-180);
    expect(normalizeLongitude(-180)).toBe(-180);
  });

  it('always returns a value within [-180, 180)', () => {
    for (let lon = -1000; lon <= 1000; lon += 7.3) {
      const r = normalizeLongitude(lon);
      expect(r).toBeGreaterThanOrEqual(-180);
      expect(r).toBeLessThan(180);
    }
  });
});

describe('shortestLongitudeDistance', () => {
  it('returns the plain difference when within +/-180', () => {
    expect(shortestLongitudeDistance(10, 20)).toBe(-10);
    expect(shortestLongitudeDistance(20, 10)).toBe(10);
  });

  it('takes the short way around the antimeridian', () => {
    expect(shortestLongitudeDistance(10, 350)).toBe(20);
    expect(shortestLongitudeDistance(350, 10)).toBe(-20);
    expect(shortestLongitudeDistance(170, -170)).toBe(-20);
  });
});

describe('calculateDistance (haversine)', () => {
  it('is zero for identical points', () => {
    expect(calculateDistance(22.5, 114.0, 22.5, 114.0)).toBe(0);
  });

  it('is ~111.19 km for one degree of latitude at the equator', () => {
    expect(calculateDistance(0, 0, 0, 1)).toBeCloseTo(111.19, 1);
    expect(calculateDistance(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });

  it('is symmetric', () => {
    const a = calculateDistance(10, 20, 30, 40);
    const b = calculateDistance(30, 40, 10, 20);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('unwrapLongitude', () => {
  it('returns the longitude unchanged when reference is NaN', () => {
    expect(unwrapLongitude(120, NaN)).toBe(120);
  });

  it('does not adjust when within 180 of the reference', () => {
    expect(unwrapLongitude(10, 20)).toBe(10);
  });

  it('adds/subtracts 360 to stay near the reference across the antimeridian', () => {
    expect(unwrapLongitude(-170, 170)).toBe(190);
    expect(unwrapLongitude(170, -170)).toBe(-190);
  });
});

describe('calculateHollandPressure', () => {
  it('returns central pressure very close to the center', () => {
    expect(calculateHollandPressure(3, 30, 950, 1010)).toBe(950);
    expect(calculateHollandPressure(5, 30, 950, 1010)).toBe(950);
  });

  it('interpolates toward ambient pressure with distance', () => {
    expect(calculateHollandPressure(30, 30, 950, 1010)).toBeCloseTo(972.07, 1);
  });

  it('rises monotonically with radius toward ambient pressure', () => {
    const near = calculateHollandPressure(10, 30, 950, 1010);
    const far = calculateHollandPressure(200, 30, 950, 1010);
    expect(far).toBeGreaterThan(near);
    expect(far).toBeLessThan(1010);
  });
});

describe('createGeoCircle', () => {
  it('returns a closed LineString with numPoints+1 coordinates', () => {
    const circle = createGeoCircle(114, 22, 100, 32);
    expect(circle.type).toBe('LineString');
    expect(circle.coordinates.length).toBe(33);
    const first = circle.coordinates[0];
    const last = circle.coordinates[circle.coordinates.length - 1];
    expect(first[0]).toBeCloseTo(last[0], 6);
    expect(first[1]).toBeCloseTo(last[1], 6);
  });

  it('defaults to 64 segments (65 coordinates)', () => {
    expect(createGeoCircle(0, 0, 50).coordinates.length).toBe(65);
  });

  it('places every point approximately radiusKm from the center', () => {
    const centerLon = 140;
    const centerLat = 15;
    const radiusKm = 200;
    const circle = createGeoCircle(centerLon, centerLat, radiusKm, 16);
    for (const [lon, lat] of circle.coordinates) {
      const d = calculateDistance(centerLat, centerLon, lat, lon);
      expect(d).toBeCloseTo(radiusKm, 0);
    }
  });
});

describe('getCategory', () => {
  it('classifies tropical intensities by wind speed', () => {
    expect(getCategory(20).shortName).toBe('LPA');
    expect(getCategory(30).shortName).toBe('TD');
    expect(getCategory(50).shortName).toBe('TS');
    expect(getCategory(70).shortName).toBe('Cat 1');
    expect(getCategory(90).shortName).toBe('Cat 2');
    expect(getCategory(100).shortName).toBe('Cat 3');
    expect(getCategory(120).shortName).toBe('Cat 4');
    expect(getCategory(160).shortName).toBe('Cat 5');
  });

  it('respects category boundaries', () => {
    expect(getCategory(23).shortName).toBe('LPA');
    expect(getCategory(24).shortName).toBe('TD');
    expect(getCategory(64).shortName).toBe('Cat 1');
    expect(getCategory(137).shortName).toBe('Cat 5');
  });

  it('prioritizes subtropical classification', () => {
    expect(getCategory(20, false, false, true).shortName).toBe('SD');
    expect(getCategory(50, false, false, true).shortName).toBe('SS');
  });

  it('handles extratropical and transitioning states', () => {
    expect(getCategory(80, false, true).shortName).toBe('EXT');
    expect(getCategory(80, true).shortName).toBe('ET');
  });

  it('gives subtropical precedence over extratropical and transitioning', () => {
    expect(getCategory(50, true, true, true).shortName).toBe('SS');
  });

  it('returns a name and color for every category', () => {
    const cat = getCategory(100);
    expect(typeof cat.name).toBe('string');
    expect(cat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('knot conversions', () => {
  it('converts knots to kph (rounded)', () => {
    expect(knotsToKph(0)).toBe(0);
    expect(knotsToKph(100)).toBe(185);
    expect(knotsToKph(1)).toBe(2);
  });

  it('converts knots to mph (rounded)', () => {
    expect(knotsToMph(0)).toBe(0);
    expect(knotsToMph(100)).toBe(115);
  });
});

describe('windToPressure', () => {
  it('returns roughly the background pressure for calm winds', () => {
    expect(windToPressure(0, 300, 'WPAC')).toBe(1010 - Math.round(0));
  });

  it('produces lower pressure for stronger winds', () => {
    const weak = windToPressure(40);
    const strong = windToPressure(120);
    expect(strong).toBeLessThan(weak);
  });

  it('uses basin-specific background pressure defaults', () => {
    const wpac = windToPressure(50, 300, 'WPAC');
    const natl = windToPressure(50, 300, 'NATL');
    expect(natl).toBeGreaterThan(wpac);
  });

  it('honors an explicit environmental pressure override', () => {
    const custom = windToPressure(50, 300, 'WPAC', 1005);
    const dflt = windToPressure(50, 300, 'WPAC');
    expect(custom).toBeLessThan(dflt);
  });

  it('never returns below the 640 hPa floor', () => {
    expect(windToPressure(500, 800, 'WPAC')).toBeGreaterThanOrEqual(640);
  });

  it('returns an integer', () => {
    expect(Number.isInteger(windToPressure(75))).toBe(true);
  });
});

describe('getPressureAt', () => {
  it('returns the base pressure with no systems and noise disabled', () => {
    expect(getPressureAt(120, 20, [], false)).toBe(1010);
  });

  it('accepts a layered object with a lower array', () => {
    expect(getPressureAt(120, 20, { lower: [] }, false)).toBe(1010);
  });

  it('falls back to an empty layer when lower is missing', () => {
    expect(getPressureAt(120, 20, {}, false)).toBe(1010);
  });

  it('applies a gaussian pressure offset from a system', () => {
    const system = { x: 120, y: 20, sigmaX: 5, sigmaY: 5, strength: 30 };
    const atCenter = getPressureAt(120, 20, [system], false);
    const away = getPressureAt(150, 20, [system], false);
    expect(atCenter).toBeCloseTo(1040, 5);
    expect(away).toBeLessThan(atCenter);
  });

  it('adds per-system noise layers when present', () => {
    const base = { x: 120, y: 20, sigmaX: 5, sigmaY: 5, strength: 30 };
    const noisy = {
      ...base,
      noiseLayers: [{ offsetX: 0, offsetY: 0, freqX: 10, freqY: 10, amplitude: 5 }],
    };
    const plain = getPressureAt(140, 25, [base], false);
    const withNoise = getPressureAt(140, 25, [noisy], false);
    expect(withNoise).not.toBe(plain);
    expect(Number.isFinite(withNoise)).toBe(true);
  });

  it('is deterministic when noise is enabled', () => {
    const a = getPressureAt(130, 25, [], true);
    const b = getPressureAt(130, 25, [], true);
    expect(a).toBe(b);
  });
});

describe('directionToCompass', () => {
  it('maps cardinal directions', () => {
    expect(directionToCompass(0)).toBe('N');
    expect(directionToCompass(90)).toBe('E');
    expect(directionToCompass(180)).toBe('S');
    expect(directionToCompass(270)).toBe('W');
  });

  it('wraps 360 back to N', () => {
    expect(directionToCompass(360)).toBe('N');
  });

  it('maps intercardinal directions', () => {
    expect(directionToCompass(45)).toBe('NE');
    expect(directionToCompass(135)).toBe('SE');
    expect(directionToCompass(225)).toBe('SW');
    expect(directionToCompass(315)).toBe('NW');
  });
});

describe('calculateAtmosphericNoise', () => {
  it('is deterministic for the same coordinates', () => {
    expect(calculateAtmosphericNoise(120, 20)).toBe(calculateAtmosphericNoise(120, 20));
  });

  it('returns a finite number within a bounded range', () => {
    for (let lon = -180; lon <= 180; lon += 37) {
      for (let lat = -80; lat <= 80; lat += 31) {
        const n = calculateAtmosphericNoise(lon, lat);
        expect(Number.isFinite(n)).toBe(true);
        expect(Math.abs(n)).toBeLessThan(10);
      }
    }
  });
});

describe('getSST', () => {
  it('is bounded within [0, 60] degrees', () => {
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let month = 1; month <= 12; month += 3) {
        const sst = getSST(lat, 180, month);
        expect(sst).toBeGreaterThanOrEqual(0);
        expect(sst).toBeLessThanOrEqual(60);
      }
    }
  });

  it('is warmer near the equator than near the poles', () => {
    const equator = getSST(2, 180, 8);
    const highLat = getSST(70, 180, 8);
    expect(equator).toBeGreaterThan(highLat);
  });

  it('is deterministic', () => {
    expect(getSST(15, 130, 8)).toBe(getSST(15, 130, 8));
  });

  it('rises with a warmer global temperature anomaly', () => {
    const cool = getSST(15, 130, 8, 288);
    const warm = getSST(15, 130, 8, 291);
    expect(warm).toBeGreaterThan(cool);
  });
});
