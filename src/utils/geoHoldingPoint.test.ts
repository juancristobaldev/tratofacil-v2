import {
  GeoHoldingPointFilter,
  getHaversineDistanceMeters,
  evaluateGpsQuality,
  DEFAULT_HOLDING_POINT_CONFIG,
} from './geoHoldingPoint';
import type { GeoPosition } from 'react-native-geolocation-service';

function createMockPosition(
  lat: number,
  lng: number,
  accuracy: number = 5,
  speed: number = 0,
  timestamp: number = Date.now(),
): GeoPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      altitude: 100,
      accuracy,
      altitudeAccuracy: 5,
      heading: 0,
      speed,
    },
    timestamp,
  };
}

describe('geoHoldingPoint', () => {
  describe('getHaversineDistanceMeters', () => {
    it('calculates 0 for identical coordinates', () => {
      const dist = getHaversineDistanceMeters(-38.7359, -72.5904, -38.7359, -72.5904);
      expect(dist).toBeCloseTo(0, 1);
    });

    it('calculates exact distance between two known points', () => {
      // Temuco Plaza de Armas to nearby location ~111m
      const dist = getHaversineDistanceMeters(-38.7359, -72.5904, -38.7369, -72.5904);
      expect(dist).toBeGreaterThan(100);
      expect(dist).toBeLessThan(120);
    });

    it('returns 0 if any coordinate is non-finite', () => {
      expect(getHaversineDistanceMeters(NaN, -72.5904, -38.7359, -72.5904)).toBe(0);
      expect(getHaversineDistanceMeters(-38.7359, Infinity, -38.7359, -72.5904)).toBe(0);
    });
  });

  describe('evaluateGpsQuality', () => {
    it('rates quality based on accuracy thresholds', () => {
      expect(evaluateGpsQuality(5)).toBe('EXCELLENT');
      expect(evaluateGpsQuality(10)).toBe('EXCELLENT');
      expect(evaluateGpsQuality(15)).toBe('GOOD');
      expect(evaluateGpsQuality(25)).toBe('GOOD');
      expect(evaluateGpsQuality(40)).toBe('DEGRADED');
      expect(evaluateGpsQuality(65)).toBe('DEGRADED');
      expect(evaluateGpsQuality(100)).toBe('POOR');
      expect(evaluateGpsQuality(null)).toBe('DEGRADED');
      expect(evaluateGpsQuality(-1)).toBe('DEGRADED');
    });
  });

  describe('GeoHoldingPointFilter (Punto de Espera)', () => {
    let filter: GeoHoldingPointFilter;
    const baseLat = -38.7359;
    const baseLng = -72.5904;

    beforeEach(() => {
      filter = new GeoHoldingPointFilter({
        stationaryRadiusMeters: 10,
        stationarySpeedThresholdMps: 0.6,
        maxAcceptableAccuracyMeters: 65,
        consecutiveBreaksToMove: 2,
        maxPhysicalSpeedMps: 50,
        staleTimeoutMs: 25000,
      });
    });

    it('initializes the holding point anchor with first valid coordinate', () => {
      const initialPos = createMockPosition(baseLat, baseLng, 5, 0, 1000);
      const result = filter.process(initialPos);

      expect(result).not.toBeNull();
      expect(result!.isStationary).toBe(true);
      expect(result!.reason).toBe('INITIAL_ANCHOR_ESTABLISHED');
      expect(result!.anchorChanged).toBe(true);
      expect(result!.position.coords.latitude).toBe(baseLat);
      expect(result!.position.coords.longitude).toBe(baseLng);
      expect(filter.getAnchor()).toEqual(initialPos);
    });

    it('holds client coordinate strictly constant during indoor GPS jitter (<10m)', () => {
      const initialPos = createMockPosition(baseLat, baseLng, 8, 0, 1000);
      filter.process(initialPos);

      // Jitter 1: +3 meters north
      const jitter1 = createMockPosition(baseLat + 0.00003, baseLng, 12, 0.1, 2000);
      const res1 = filter.process(jitter1);

      expect(res1!.isStationary).toBe(true);
      expect(res1!.reason).toBe('STATIONARY_HOLDING_POINT');
      expect(res1!.anchorChanged).toBe(false);
      // Exposes EXACT anchor coordinate, eliminating jitter
      expect(res1!.position.coords.latitude).toBe(baseLat);
      expect(res1!.position.coords.longitude).toBe(baseLng);

      // Jitter 2: +6 meters east
      const jitter2 = createMockPosition(baseLat, baseLng + 0.00007, 15, 0.2, 3000);
      const res2 = filter.process(jitter2);

      expect(res2!.isStationary).toBe(true);
      expect(res2!.reason).toBe('STATIONARY_HOLDING_POINT');
      expect(res2!.anchorChanged).toBe(false);
      expect(res2!.position.coords.latitude).toBe(baseLat);
      expect(res2!.position.coords.longitude).toBe(baseLng);
    });

    it('rejects low accuracy fixes (>65m) and maintains previous holding point', () => {
      const initialPos = createMockPosition(baseLat, baseLng, 10, 0, 1000);
      filter.process(initialPos);

      // Low accuracy sample (accuracy = 120m, jumped 30m away)
      const lowAccPos = createMockPosition(baseLat + 0.0003, baseLng, 120, 0, 2000);
      const result = filter.process(lowAccPos);

      expect(result!.isStationary).toBe(true);
      expect(result!.quality).toBe('POOR');
      expect(result!.reason).toContain('LOW_ACCURACY_REJECTED');
      expect(result!.position.coords.latitude).toBe(baseLat);
      expect(result!.position.coords.longitude).toBe(baseLng);
    });

    it('rejects physically impossible teleport jumps', () => {
      const initialPos = createMockPosition(baseLat, baseLng, 10, 0, 1000);
      filter.process(initialPos);

      // Jump of 1000 meters in 1 second (1000 m/s > 50 m/s) with mediocre accuracy
      const teleportPos = createMockPosition(baseLat + 0.01, baseLng, 30, 0, 2000);
      const result = filter.process(teleportPos);

      expect(result!.isStationary).toBe(true);
      expect(result!.reason).toContain('TELEPORT_REJECTED');
      expect(result!.position.coords.latitude).toBe(baseLat);
    });

    it('breaks out of holding point immediately on definite movement (speed >= 1.2 m/s or displacement >= 25m)', () => {
      const initialPos = createMockPosition(baseLat, baseLng, 5, 0, 1000);
      filter.process(initialPos);

      // Fast walking / driving: 30m displacement with speed 3.0 m/s
      const movedPos = createMockPosition(baseLat + 0.0003, baseLng, 5, 3.0, 2000);
      const result = filter.process(movedPos);

      expect(result!.reason).toBe('DEFINITE_MOVEMENT_BREAKOUT');
      expect(result!.anchorChanged).toBe(true);
      expect(result!.position.coords.latitude).toBe(baseLat + 0.0003);
    });

    it('requires consecutive readings outside radius before shifting anchor during slow departure', () => {
      const initialPos = createMockPosition(baseLat, baseLng, 5, 0, 1000);
      filter.process(initialPos);

      // 1st sample outside: 13m away at low speed (0.3 m/s)
      const out1 = createMockPosition(baseLat + 0.00012, baseLng, 8, 0.3, 2000);
      const res1 = filter.process(out1);

      expect(res1!.isStationary).toBe(true);
      expect(res1!.reason).toBe('OUTLIER_PENDING_CONFIRMATION_1');
      expect(res1!.anchorChanged).toBe(false);
      expect(res1!.position.coords.latitude).toBe(baseLat); // Still anchored

      // 2nd consecutive sample outside: 14m away -> confirms breakout!
      const out2 = createMockPosition(baseLat + 0.00013, baseLng, 8, 0.3, 3000);
      const res2 = filter.process(out2);

      expect(res2!.reason).toBe('CONSECUTIVE_READINGS_BREAKOUT');
      expect(res2!.anchorChanged).toBe(true);
      expect(res2!.position.coords.latitude).toBe(baseLat + 0.00013);
    });

    it('detects stale GPS signal after timeout', () => {
      const initialPos = createMockPosition(baseLat, baseLng, 5, 0, 1000);
      filter.process(initialPos);

      expect(filter.isStale(1000 + 10000)).toBe(false); // 10s elapsed
      expect(filter.isStale(1000 + 26000)).toBe(true);  // 26s elapsed (> 25s threshold)
    });

    it('resets cleanly when reset() is called', () => {
      const initialPos = createMockPosition(baseLat, baseLng, 5, 0, 1000);
      filter.process(initialPos);
      expect(filter.getAnchor()).not.toBeNull();

      filter.reset();
      expect(filter.getAnchor()).toBeNull();
      expect(filter.isStale()).toBe(true);
    });
  });
});
