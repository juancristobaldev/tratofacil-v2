import { StreetEngine } from './streetEngine';
import { getDistanceMeters } from './geoMath';

describe('StreetEngine', () => {
  let engine: StreetEngine;
  const p1 = { latitude: -33.4489, longitude: -70.6693 };
  const p2 = { latitude: -33.4489, longitude: -70.6593 }; // Este
  const p3 = { latitude: -33.4389, longitude: -70.6593 }; // Norte (intersección en p2)

  beforeEach(() => {
    engine = new StreetEngine();
    engine.addRoadPolyline([p1, p2, p3], 'test-street');
  });

  it('adds road polyline and calculates segments', () => {
    expect(engine.getSegmentCount()).toBe(2);
  });

  it('clears road cache correctly', () => {
    engine.clearRoadCache();
    expect(engine.getSegmentCount()).toBe(0);
  });

  it('snaps position to street when moving along street bearing', () => {
    // Usuario cerca de p1 moviéndose al Este (bearing 90°)
    const startNearP1 = { latitude: -33.4490, longitude: -70.6690 };
    const step = engine.stepMovement(startNearP1, 90, 50, true);

    expect(step.isSnapped).toBe(true);
    expect(step.heading).toBeCloseTo(90, 0);
    expect(step.nextPosition.longitude).toBeGreaterThan(startNearP1.longitude);
  });

  it('navigates through intersection when joystick direction turns', () => {
    // Usuario llegando al vértice p2 moviéndose al Norte (bearing 0°)
    const nearP2 = { latitude: -33.4489, longitude: -70.6595 };
    const step = engine.stepMovement(nearP2, 0, 50, true);

    expect(step.isSnapped).toBe(true);
    expect(step.nextPosition.latitude).toBeGreaterThan(-33.4489);
  });

  it('falls back to free movement when streetMode is false', () => {
    const start = { latitude: -33.4489, longitude: -70.6693 };
    const step = engine.stepMovement(start, 45, 100, false);

    expect(step.isSnapped).toBe(false);
    expect(step.heading).toBe(45);
    const dist = getDistanceMeters(start, step.nextPosition);
    expect(dist).toBeCloseTo(100, -1);
  });
});
