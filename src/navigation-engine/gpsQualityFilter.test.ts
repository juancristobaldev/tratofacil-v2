import {
  classifyGpsQuality,
  isTeleportJump,
  filterGpsPosition,
} from './gpsQualityFilter';
import type { NavigationMotionSample } from './types';

describe('gpsQualityFilter', () => {
  const baseCoord = { latitude: -38.735, longitude: -72.590 };

  describe('classifyGpsQuality', () => {
    it('classifies accuracy <= 10m as EXCELLENT', () => {
      const sample: NavigationMotionSample = {
        coordinate: baseCoord,
        timestamp: 1000,
        accuracy: 5,
        source: 'LOCAL_GPS',
      };
      expect(classifyGpsQuality(sample)).toBe('EXCELLENT');
    });

    it('classifies accuracy 20m as GOOD', () => {
      const sample: NavigationMotionSample = {
        coordinate: baseCoord,
        timestamp: 1000,
        accuracy: 20,
        source: 'LOCAL_GPS',
      };
      expect(classifyGpsQuality(sample)).toBe('GOOD');
    });

    it('classifies accuracy 45m as DEGRADED', () => {
      const sample: NavigationMotionSample = {
        coordinate: baseCoord,
        timestamp: 1000,
        accuracy: 45,
        source: 'LOCAL_GPS',
      };
      expect(classifyGpsQuality(sample)).toBe('DEGRADED');
    });

    it('classifies accuracy 100m as POOR', () => {
      const sample: NavigationMotionSample = {
        coordinate: baseCoord,
        timestamp: 1000,
        accuracy: 100,
        source: 'LOCAL_GPS',
      };
      expect(classifyGpsQuality(sample)).toBe('POOR');
    });

    it('classifies invalid coords as INVALID', () => {
      const sample: NavigationMotionSample = {
        coordinate: { latitude: 999, longitude: -72.590 },
        timestamp: 1000,
        accuracy: 5,
        source: 'LOCAL_GPS',
      };
      expect(classifyGpsQuality(sample)).toBe('INVALID');
    });
  });

  describe('isTeleportJump', () => {
    it('detects improbable 500m jump in 1 second as teleport', () => {
      const s1: NavigationMotionSample = {
        coordinate: baseCoord,
        timestamp: 1000,
        source: 'LOCAL_GPS',
      };
      const s2: NavigationMotionSample = {
        coordinate: { latitude: -38.730, longitude: -72.590 }, // ~550m away
        timestamp: 2000, // 1 sec elapsed
        accuracy: 40,
        source: 'LOCAL_GPS',
      };

      const check = isTeleportJump(s1, s2);
      expect(check.isTeleport).toBe(true);
      expect(check.impliedSpeedMps).toBeGreaterThan(100);
    });

    it('accepts normal vehicular motion (20 m in 1s = 72 km/h)', () => {
      const s1: NavigationMotionSample = {
        coordinate: baseCoord,
        timestamp: 1000,
        source: 'LOCAL_GPS',
      };
      const s2: NavigationMotionSample = {
        coordinate: { latitude: -38.73518, longitude: -72.590 }, // ~20m
        timestamp: 2000,
        accuracy: 5,
        source: 'LOCAL_GPS',
      };

      const check = isTeleportJump(s1, s2);
      expect(check.isTeleport).toBe(false);
      expect(check.impliedSpeedMps).toBeCloseTo(20, 0);
    });
  });

  describe('filterGpsPosition', () => {
    it('freezes coordinate jitter in stationary state (< 0.8 m/s, drift < 3.5m)', () => {
      const s1: NavigationMotionSample = {
        coordinate: baseCoord,
        timestamp: 1000,
        speed: 0,
        accuracy: 8,
        source: 'LOCAL_GPS',
      };
      const res1 = filterGpsPosition(null, s1, null);
      expect(res1.accepted).toBe(true);
      expect(res1.estimate.isStationary).toBe(true);

      // Micro jitter of 1.5m while stationary
      const s2: NavigationMotionSample = {
        coordinate: { latitude: -38.73501, longitude: -72.59001 },
        timestamp: 2000,
        speed: 0.1,
        accuracy: 10,
        source: 'LOCAL_GPS',
      };
      const res2 = filterGpsPosition(res1.estimate, s2, s1);
      expect(res2.accepted).toBe(true);
      expect(res2.reason).toBe('STATIONARY_STABILIZED');
      // Coordinate should remain exact baseCoord without jitter
      expect(res2.estimate.coordinate.latitude).toBe(baseCoord.latitude);
      expect(res2.estimate.coordinate.longitude).toBe(baseCoord.longitude);
    });

    it('rejects teleport jump', () => {
      const s1: NavigationMotionSample = {
        coordinate: baseCoord,
        timestamp: 1000,
        speed: 10,
        accuracy: 5,
        source: 'LOCAL_GPS',
      };
      const res1 = filterGpsPosition(null, s1, null);

      const s2: NavigationMotionSample = {
        coordinate: { latitude: -38.700, longitude: -72.590 }, // ~3.8km away in 1s
        timestamp: 2000,
        accuracy: 50,
        source: 'LOCAL_GPS',
      };
      const res2 = filterGpsPosition(res1.estimate, s2, s1);
      expect(res2.accepted).toBe(false);
      expect(res2.reason).toContain('TELEPORT_REJECTED');
    });
  });
});
