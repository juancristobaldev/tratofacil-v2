import {
  normalizeHeading,
  shortestAngularDelta,
  getDistanceMeters,
  calculateBearing,
  destinationPoint,
  projectPointOnSegment,
  smoothHeadingEMA,
} from './geoMathCore';

describe('geoMathCore Pure Mathematics', () => {
  describe('normalizeHeading', () => {
    it('normalizes negative angles', () => {
      expect(normalizeHeading(-10)).toBe(350);
      expect(normalizeHeading(-360)).toBe(0);
      expect(normalizeHeading(-720)).toBe(0);
    });

    it('normalizes angles >= 360', () => {
      expect(normalizeHeading(360)).toBe(0);
      expect(normalizeHeading(370)).toBe(10);
      expect(normalizeHeading(720)).toBe(0);
    });

    it('preserves valid angles [0, 360)', () => {
      expect(normalizeHeading(0)).toBe(0);
      expect(normalizeHeading(180)).toBe(180);
      expect(normalizeHeading(359.9)).toBeCloseTo(359.9);
    });

    it('handles NaN and Infinity safely', () => {
      expect(normalizeHeading(NaN)).toBe(0);
      expect(normalizeHeading(Infinity)).toBe(0);
    });
  });

  describe('shortestAngularDelta', () => {
    it('calculates wrap-around positive clockwise deltas', () => {
      // 359° -> 1° = +2°
      expect(shortestAngularDelta(359, 1)).toBe(2);
      // 350° -> 10° = +20°
      expect(shortestAngularDelta(350, 10)).toBe(20);
    });

    it('calculates wrap-around negative counter-clockwise deltas', () => {
      // 1° -> 359° = -2°
      expect(shortestAngularDelta(1, 359)).toBe(-2);
      // 10° -> 350° = -20°
      expect(shortestAngularDelta(10, 350)).toBe(-20);
    });

    it('calculates standard deltas without wrap-around', () => {
      expect(shortestAngularDelta(45, 90)).toBe(45);
      expect(shortestAngularDelta(90, 45)).toBe(-45);
    });

    it('handles exact 180° opposite boundary', () => {
      const delta = Math.abs(shortestAngularDelta(0, 180));
      expect(delta).toBe(180);
    });
  });

  describe('getDistanceMeters and destinationPoint', () => {
    const temucoCenter = { latitude: -38.7359, longitude: -72.5904 };

    it('computes distance between identical points as 0', () => {
      expect(getDistanceMeters(temucoCenter, temucoCenter)).toBe(0);
    });

    it('projects destinationPoint North and matches distance', () => {
      const projected = destinationPoint(temucoCenter, 500, 0); // 500m North
      const dist = getDistanceMeters(temucoCenter, projected);
      expect(dist).toBeCloseTo(500, 0);
      expect(calculateBearing(temucoCenter, projected)).toBeCloseTo(0, 1);
    });

    it('projects destinationPoint East and matches distance', () => {
      const projected = destinationPoint(temucoCenter, 250, 90); // 250m East
      const dist = getDistanceMeters(temucoCenter, projected);
      expect(dist).toBeCloseTo(250, 0);
      expect(calculateBearing(temucoCenter, projected)).toBeCloseTo(90, 1);
    });
  });

  describe('projectPointOnSegment', () => {
    const start = { latitude: -38.735, longitude: -72.590 };
    const end = { latitude: -38.735, longitude: -72.580 }; // horizontal East segment

    it('projects point directly on midpoint', () => {
      const midPoint = { latitude: -38.735, longitude: -72.585 };
      const proj = projectPointOnSegment(midPoint, start, end);
      expect(proj.distanceMeters).toBeCloseTo(0, 1);
      expect(proj.fraction).toBeCloseTo(0.5, 2);
      expect(proj.segmentBearing).toBeCloseTo(90, 1);
    });

    it('projects point offset to the North onto segment', () => {
      const pointNorth = destinationPoint({ latitude: -38.735, longitude: -72.585 }, 20, 0);
      const proj = projectPointOnSegment(pointNorth, start, end);
      expect(proj.distanceMeters).toBeCloseTo(20, 0);
      expect(proj.fraction).toBeCloseTo(0.5, 2);
    });
  });

  describe('smoothHeadingEMA', () => {
    it('smooths across 360°/0° boundary correctly', () => {
      // Current 355°, target 5° (delta +10°). With alpha 0.5 -> 355 + 5 = 360 = 0°
      const smoothed = smoothHeadingEMA(355, 5, 0.5);
      expect(smoothed).toBe(0);
    });

    it('smooths standard positive change', () => {
      const smoothed = smoothHeadingEMA(0, 90, 0.2);
      expect(smoothed).toBeCloseTo(18, 1);
    });
  });
});
