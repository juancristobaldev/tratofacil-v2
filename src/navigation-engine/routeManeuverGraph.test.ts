import {
  buildRouteNavigationPlan,
  classifyTurnType,
  getManeuverInstruction,
} from './routeManeuverGraph';
import type { RouteCoordinate } from '../utils/directions';

describe('RouteManeuverGraph', () => {
  describe('classifyTurnType', () => {
    it('classifies U_TURN for >= 150 deg', () => {
      expect(classifyTurnType(150)).toBe('U_TURN');
      expect(classifyTurnType(-170)).toBe('U_TURN');
    });

    it('classifies SHARP_TURN for >= 75 and < 150 deg', () => {
      expect(classifyTurnType(90)).toBe('SHARP_TURN');
      expect(classifyTurnType(-80)).toBe('SHARP_TURN');
    });

    it('classifies TURN for >= 45 and < 75 deg', () => {
      expect(classifyTurnType(50)).toBe('TURN');
      expect(classifyTurnType(-60)).toBe('TURN');
    });

    it('classifies SOFT_CURVE for >= 20 and < 45 deg', () => {
      expect(classifyTurnType(25)).toBe('SOFT_CURVE');
      expect(classifyTurnType(-30)).toBe('SOFT_CURVE');
    });

    it('classifies STRAIGHT for < 20 deg', () => {
      expect(classifyTurnType(15)).toBe('STRAIGHT');
      expect(classifyTurnType(-10)).toBe('STRAIGHT');
    });
  });

  describe('buildRouteNavigationPlan', () => {
    it('returns null for empty or single-point routes', () => {
      expect(buildRouteNavigationPlan(null)).toBeNull();
      expect(buildRouteNavigationPlan([])).toBeNull();
      expect(buildRouteNavigationPlan([{ latitude: 0, longitude: 0 }])).toBeNull();
    });

    it('indexes a straight 3-point route with zero maneuvers and strictly monotonic cumulative distances', () => {
      const coords: RouteCoordinate[] = [
        { latitude: -38.7350, longitude: -72.5900 },
        { latitude: -38.7350, longitude: -72.5890 },
        { latitude: -38.7350, longitude: -72.5880 },
      ];

      const plan = buildRouteNavigationPlan(coords);
      expect(plan).not.toBeNull();
      expect(plan!.maneuvers.length).toBe(0);
      expect(plan!.cumulativeDistances.length).toBe(3);
      expect(plan!.cumulativeDistances[0]).toBe(0);
      expect(plan!.cumulativeDistances[1]).toBeGreaterThan(0);
      expect(plan!.cumulativeDistances[2]).toBeGreaterThan(plan!.cumulativeDistances[1]);
      expect(plan!.totalDistanceMeters).toBe(plan!.cumulativeDistances[2]);
    });

    it('detects a clear 90 degree right turn and stores its exact position along the route', () => {
      // Norte -> gira al Este
      const coords: RouteCoordinate[] = [
        { latitude: -38.7400, longitude: -72.5900 },
        { latitude: -38.7350, longitude: -72.5900 }, // Vértice 1 (Giro al Este)
        { latitude: -38.7350, longitude: -72.5850 },
      ];

      const plan = buildRouteNavigationPlan(coords);
      expect(plan).not.toBeNull();
      expect(plan!.maneuvers.length).toBe(1);

      const m = plan!.maneuvers[0];
      expect(m.vertexIndex).toBe(1);
      expect(m.turnType).toBe('SHARP_TURN');
      expect(m.deltaAngle).toBeCloseTo(90, 0);
      expect(m.instruction).toBe('Curva cerrada a la derecha');
      expect(m.distanceAlongRoute).toBe(plan!.cumulativeDistances[1]);
    });
  });
});
