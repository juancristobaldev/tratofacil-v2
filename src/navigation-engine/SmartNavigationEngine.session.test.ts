import { SmartNavigationEngine } from './SmartNavigationEngine';
import type { RouteCoordinate } from '../utils/directions';
import type { NavigationMotionSample } from './types';

describe('SmartNavigationEngine Session Authority & Immunity', () => {
  let engine: SmartNavigationEngine;

  const routeCoords: RouteCoordinate[] = [
    { latitude: -38.7400, longitude: -72.5900 },
    { latitude: -38.7391, longitude: -72.5900 }, // ~100m Norte (vértice con giro a la derecha)
    { latitude: -38.7391, longitude: -72.5888 }, // ~100m Este
  ];

  beforeEach(() => {
    engine = new SmartNavigationEngine();
  });

  it('preserves route and active maneuver when incoming samples omit routeCoords (routeCoords: undefined)', () => {
    // 1. Muestra 1: Inicializa con la ruta activa
    const sample1: NavigationMotionSample = {
      coordinate: { latitude: -38.7400, longitude: -72.5900 },
      timestamp: 1000,
      heading: 0,
      speed: 10,
      accuracy: 5,
      source: 'LOCAL_GPS',
    };

    const target1 = engine.processMotionSample(sample1, routeCoords);
    expect(target1).not.toBeNull();
    expect(target1!.turn).not.toBeNull();
    expect(target1!.turn!.turnDetected).toBe(true);
    expect(target1!.turn!.distanceToTurn).toBeCloseTo(100, 0);

    // 2. Muestras 2 a 10: OMITEN routeCoords (ej. desde joystick o watchPosition secundario)
    // El motor NO debe perder la ruta ni degradar turn a null / false
    for (let i = 1; i <= 9; i++) {
      const sampleDist = i * 8; // Avanza 8m por tick hacia el norte
      const sampleI: NavigationMotionSample = {
        coordinate: { latitude: -38.7400 + i * 0.00007, longitude: -72.5900 },
        timestamp: 1000 + i * 200,
        heading: 0,
        speed: 10,
        accuracy: 5,
        source: 'LOCAL_GPS',
      };

      // Invocación SIN routeCoords (undefined)
      const targetI = engine.processMotionSample(sampleI);
      expect(targetI).not.toBeNull();
      expect(targetI!.turn).not.toBeNull();
      expect(targetI!.turn!.turnDetected).toBe(true);
      expect(targetI!.turn!.turnType).toBe('SHARP_TURN');
      // La distancia debe ir decreciendo suavemente hacia el giro
      expect(targetI!.turn!.distanceToTurn).toBeLessThan(100);
      expect(targetI!.turn!.distanceToTurn).toBeGreaterThan(0);
    }
  });

  it('supports explicit setRoute to pre-load geometry before first motion sample', () => {
    engine.setRoute(routeCoords);
    expect(engine.getNavigationPlan()).not.toBeNull();
    expect(engine.getNavigationPlan()!.maneuvers.length).toBe(1);

    // Primera muestra llega sin routeCoords pero consume el plan precargado
    const sample: NavigationMotionSample = {
      coordinate: { latitude: -38.7400, longitude: -72.5900 },
      timestamp: 2000,
      heading: 0,
      speed: 8,
      accuracy: 4,
      source: 'LOCAL_GPS',
    };

    const target = engine.processMotionSample(sample);
    expect(target).not.toBeNull();
    expect(target!.turn?.turnDetected).toBe(true);
  });
});
