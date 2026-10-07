import { ManeuverGuidanceStateMachine } from './maneuverGuidanceStateMachine';
import { buildRouteNavigationPlan } from './routeManeuverGraph';
import type { RouteCoordinate } from '../utils/directions';

describe('ManeuverGuidanceStateMachine', () => {
  let gsm: ManeuverGuidanceStateMachine;

  // Ruta con un giro a 90° a la derecha en el vértice 1
  // Vértice 0 (0m) -> Vértice 1 (100m) -> Vértice 2 (200m)
  const routeCoords: RouteCoordinate[] = [
    { latitude: -38.7400, longitude: -72.5900 },
    { latitude: -38.7391, longitude: -72.5900 }, // ~100m Norte
    { latitude: -38.7391, longitude: -72.5888 }, // ~100m Este (Giro a la derecha)
  ];

  const plan = buildRouteNavigationPlan(routeCoords)!;

  beforeEach(() => {
    gsm = new ManeuverGuidanceStateMachine();
  });

  it('correctly tracks upcoming maneuver while approaching (150m -> 50m -> 20m)', () => {
    // A 20m del origen (a 80m del giro que está en 100m)
    const turn1 = gsm.updateProgress(plan, 20, 10, 0, false, 1000);
    expect(turn1.turnDetected).toBe(true);
    expect(turn1.turnType).toBe('SHARP_TURN');
    expect(turn1.distanceToTurn).toBeCloseTo(80, 0);
    expect(gsm.getCurrentPhase()).toBe('APPROACHING');

    // A 85m del origen (a 15m del giro) -> Fase IMMINENT
    const turn2 = gsm.updateProgress(plan, 85, 10, 0, false, 2000);
    expect(turn2.turnDetected).toBe(true);
    expect(turn2.distanceToTurn).toBeCloseTo(15, 0);
    expect(gsm.getCurrentPhase()).toBe('IMMINENT');
  });

  it('guarantees INTERSECTION RETENTION: retains active maneuver and distanceToTurn = 0 at and past vertex (+10m)', () => {
    const maneuverDist = plan.maneuvers[0].distanceAlongRoute;

    // Exactamente en el vértice (100m)
    const turnVertex = gsm.updateProgress(plan, maneuverDist, 5, 0, false, 3000);
    expect(turnVertex.turnDetected).toBe(true);
    expect(turnVertex.distanceToTurn).toBe(0);
    expect(gsm.getCurrentPhase()).toBe('EXECUTING_IN_INTERSECTION');

    // 10 metros pasada la esquina (110m) -> DENTRO DEL ÁREA DE INTERSECCIÓN
    // NO debe caer a "En ruta" (turnDetected: false)
    const turnInIntersection = gsm.updateProgress(plan, maneuverDist + 10, 5, 90, false, 4000);
    expect(turnInIntersection.turnDetected).toBe(true);
    expect(turnInIntersection.distanceToTurn).toBe(0);
    expect(gsm.getCurrentPhase()).toBe('EXECUTING_IN_INTERSECTION');
  });

  it('eliminates corner jitter: 30 noisy GPS samples near the corner vertex NEVER drop to turnDetected = false', () => {
    const maneuverDist = plan.maneuvers[0].distanceAlongRoute;

    for (let i = 0; i < 30; i++) {
      // Simula jitter de ±3m alrededor de la esquina (98m a 103m)
      const noise = (Math.sin(i) * 3);
      const sampleDist = maneuverDist + noise;

      const turn = gsm.updateProgress(plan, sampleDist, 4, 45, false, 5000 + i * 100);
      expect(turn.turnDetected).toBe(true);
      expect(turn.turnType).toBe('SHARP_TURN');
      // En ningún momento puede caer a turnDetected: false ("En ruta")
    }
  });

  it('transitions to COMPLETED or next maneuver cleanly once vehicle exits intersection (+25m)', () => {
    const maneuverDist = plan.maneuvers[0].distanceAlongRoute;

    // Vehículo avanza 25m después de la esquina (sale de la zona de 20m)
    const turnAfterExit = gsm.updateProgress(plan, maneuverDist + 25, 10, 90, false, 10000);
    expect(gsm.getCurrentPhase()).toBe('COMPLETED');
    expect(turnAfterExit.turnDetected).toBe(false);
    expect(turnAfterExit.turnType).toBe('STRAIGHT');
  });
});
