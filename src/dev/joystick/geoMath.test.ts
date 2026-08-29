import {
  getDistanceMeters,
  calculateBearing,
  destinationPoint,
  normalizeAngleDiff,
  projectPointOnSegment,
} from './geoMath';

describe('geoMath', () => {
  const santiagoCenter = { latitude: -33.4489, longitude: -70.6693 };
  const northOfSantiago = { latitude: -33.4389, longitude: -70.6693 };
  const eastOfSantiago = { latitude: -33.4489, longitude: -70.6593 };

  describe('getDistanceMeters', () => {
    it('returns 0 for identical points', () => {
      expect(getDistanceMeters(santiagoCenter, santiagoCenter)).toBe(0);
    });

    it('calculates realistic distance between coordinates', () => {
      const dist = getDistanceMeters(santiagoCenter, northOfSantiago);
      // 0.01 grados de latitud ~ 1.11 km = 1111 metros
      expect(dist).toBeGreaterThan(1100);
      expect(dist).toBeLessThan(1130);
    });
  });

  describe('calculateBearing', () => {
    it('calculates North bearing (approx 0°)', () => {
      const bearing = calculateBearing(santiagoCenter, northOfSantiago);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('calculates East bearing (approx 90°)', () => {
      const bearing = calculateBearing(santiagoCenter, eastOfSantiago);
      expect(bearing).toBeCloseTo(90, 0);
    });

    it('calculates South bearing (approx 180°)', () => {
      const bearing = calculateBearing(northOfSantiago, santiagoCenter);
      expect(bearing).toBeCloseTo(180, 0);
    });

    it('calculates West bearing (approx 270°)', () => {
      const bearing = calculateBearing(eastOfSantiago, santiagoCenter);
      expect(bearing).toBeCloseTo(270, 0);
    });
  });

  describe('destinationPoint', () => {
    it('returns identical coordinate when distance is 0', () => {
      const dest = destinationPoint(santiagoCenter, 0, 90);
      expect(dest.latitude).toBe(santiagoCenter.latitude);
      expect(dest.longitude).toBe(santiagoCenter.longitude);
    });

    it('moves North accurately when bearing is 0°', () => {
      const dest = destinationPoint(santiagoCenter, 1000, 0);
      expect(dest.latitude).toBeGreaterThan(santiagoCenter.latitude);
      expect(dest.longitude).toBeCloseTo(santiagoCenter.longitude, 4);
      expect(getDistanceMeters(santiagoCenter, dest)).toBeCloseTo(1000, -1);
    });

    it('moves East accurately when bearing is 90°', () => {
      const dest = destinationPoint(santiagoCenter, 1000, 90);
      expect(dest.latitude).toBeCloseTo(santiagoCenter.latitude, 4);
      expect(dest.longitude).toBeGreaterThan(santiagoCenter.longitude);
      expect(getDistanceMeters(santiagoCenter, dest)).toBeCloseTo(1000, -1);
    });
  });

  describe('normalizeAngleDiff', () => {
    it('computes direct angle difference', () => {
      expect(normalizeAngleDiff(90, 45)).toBe(45);
      expect(normalizeAngleDiff(45, 90)).toBe(-45);
    });

    it('handles wrap-around across 0°/360°', () => {
      expect(normalizeAngleDiff(10, 350)).toBe(20);
      expect(normalizeAngleDiff(350, 10)).toBe(-20);
    });
  });

  describe('projectPointOnSegment', () => {
    it('projects point perpendicularly onto segment', () => {
      const start = { latitude: -33.4489, longitude: -70.6693 };
      const end = { latitude: -33.4489, longitude: -70.6593 }; // Segmento este-oeste
      const point = { latitude: -33.4479, longitude: -70.6643 }; // Punto al norte del centro del segmento

      const proj = projectPointOnSegment(point, start, end);
      expect(proj.fraction).toBeCloseTo(0.5, 1);
      expect(proj.closestPoint.latitude).toBeCloseTo(-33.4489, 4);
      expect(proj.distanceMeters).toBeGreaterThan(0);
    });

    it('clamps to segment endpoints if point is beyond the segment', () => {
      const start = { latitude: -33.4489, longitude: -70.6693 };
      const end = { latitude: -33.4489, longitude: -70.6593 };
      const point = { latitude: -33.4489, longitude: -70.6750 }; // Al oeste de start

      const proj = projectPointOnSegment(point, start, end);
      expect(proj.fraction).toBe(0);
      expect(proj.closestPoint.latitude).toBe(start.latitude);
      expect(proj.closestPoint.longitude).toBe(start.longitude);
    });
  });
});
