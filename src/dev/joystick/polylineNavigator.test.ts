import { PolylineNavigator } from './polylineNavigator';
import { getDistanceMeters } from './geoMath';

describe('PolylineNavigator', () => {
  let navigator: PolylineNavigator;

  const p1 = { latitude: -33.4489, longitude: -70.6693 }; // Inicio
  const p2 = { latitude: -33.4489, longitude: -70.6593 }; // Este (~920 m)
  const p3 = { latitude: -33.4389, longitude: -70.6593 }; // Norte (~1110 m)

  beforeEach(() => {
    navigator = new PolylineNavigator();
  });

  it('handles empty or single point routes gracefully', () => {
    expect(navigator.hasRoute()).toBe(false);
    navigator.setRoute([p1]);
    expect(navigator.hasRoute()).toBe(false);
    const result = navigator.step(10);
    expect(result.isArrived).toBe(false);
  });

  it('calculates total distance and segment bearings correctly', () => {
    navigator.setRoute([p1, p2, p3]);
    expect(navigator.hasRoute()).toBe(true);
    expect(navigator.getPointCount()).toBe(3);

    const dist1 = getDistanceMeters(p1, p2);
    const dist2 = getDistanceMeters(p2, p3);
    const expectedTotal = dist1 + dist2;

    expect(navigator.getTotalDistance()).toBeCloseTo(expectedTotal, 0);
    expect(navigator.getRemainingDistance()).toBeCloseTo(expectedTotal, 0);
    expect(navigator.getProgressFraction()).toBe(0);
  });

  it('steps forward continuously along polyline and updates heading', () => {
    navigator.setRoute([p1, p2, p3]);

    // Paso 1: Avanzar 200m hacia el Este en el primer tramo
    const step1 = navigator.step(200);
    expect(step1.traveledMeters).toBeCloseTo(200, 0);
    expect(step1.heading).toBeCloseTo(90, 0); // Hacia el Este
    expect(step1.nextPosition.longitude).toBeGreaterThan(p1.longitude);
    expect(step1.nextPosition.latitude).toBeCloseTo(p1.latitude, 4);
    expect(step1.isArrived).toBe(false);

    // Paso 2: Avanzar más allá del vértice p2 hacia el Norte
    const dist1 = getDistanceMeters(p1, p2);
    const step2 = navigator.step(dist1 + 100 - 200); // Supera el vértice en 100m
    expect(step2.heading).toBeCloseTo(0, 0); // Hacia el Norte
    expect(step2.nextPosition.latitude).toBeGreaterThan(p2.latitude);
    expect(step2.nextPosition.longitude).toBeCloseTo(p2.longitude, 4);
  });

  it('handles reverse movement (delta < 0) along the polyline', () => {
    navigator.setRoute([p1, p2, p3]);

    navigator.step(500); // Avanzar 500m
    expect(navigator.getTraveledDistance()).toBeCloseTo(500, 0);

    // Retroceder 200m
    const revStep = navigator.step(-200);
    expect(revStep.traveledMeters).toBeCloseTo(300, 0);
    expect(revStep.isArrived).toBe(false);

    // Retroceder más allá del inicio (debe clampear a 0)
    const clampStep = navigator.step(-500);
    expect(clampStep.traveledMeters).toBe(0);
    expect(clampStep.isStart).toBe(true);
    expect(clampStep.nextPosition.latitude).toBeCloseTo(p1.latitude, 5);
    expect(clampStep.nextPosition.longitude).toBeCloseTo(p1.longitude, 5);
  });

  it('detects arrival when reaching the destination', () => {
    navigator.setRoute([p1, p2]);
    const totalDist = getDistanceMeters(p1, p2);

    const step = navigator.step(totalDist + 100);
    expect(step.isArrived).toBe(true);
    expect(step.remainingMeters).toBe(0);
    expect(step.progressFraction).toBe(1);
    expect(step.nextPosition.latitude).toBeCloseTo(p2.latitude, 5);
    expect(step.nextPosition.longitude).toBeCloseTo(p2.longitude, 5);
  });

  it('projects initial position onto nearest segment without jumping', () => {
    // Posición actual cerca de la mitad del primer segmento
    const nearMidpoint = { latitude: -33.4490, longitude: -70.6643 };
    navigator.setRoute([p1, p2, p3], nearMidpoint);

    const expectedTraveled = getDistanceMeters(p1, { latitude: -33.4489, longitude: -70.6643 });
    expect(navigator.getTraveledDistance()).toBeCloseTo(expectedTraveled, -1);
    expect(navigator.getProgressFraction()).toBeGreaterThan(0.2);
    expect(navigator.getProgressFraction()).toBeLessThan(0.8);
  });

  it('resets to start and jumps to end correctly', () => {
    navigator.setRoute([p1, p2]);
    navigator.jumpToEnd();
    expect(navigator.step(0).isArrived).toBe(true);

    navigator.resetToStart();
    expect(navigator.step(0).isStart).toBe(true);
    expect(navigator.getTraveledDistance()).toBe(0);
  });
});
