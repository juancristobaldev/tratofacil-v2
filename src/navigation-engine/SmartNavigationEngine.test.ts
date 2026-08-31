import { SmartNavigationEngine } from './SmartNavigationEngine';
import type { NavigationMotionSample } from './types';
import type { RouteCoordinate } from '../utils/directions';

describe('SmartNavigationEngine Comprehensive Test Suite', () => {
  let engine: SmartNavigationEngine;

  beforeEach(() => {
    engine = new SmartNavigationEngine();
  });

  const baseCoord: RouteCoordinate = { latitude: -38.735, longitude: -72.590 };
  const route: RouteCoordinate[] = [
    { latitude: -38.735, longitude: -72.590 },
    { latitude: -38.735, longitude: -72.580 }, // Segment 0: East (90°)
    { latitude: -38.740, longitude: -72.580 }, // Segment 1: South (180°) -> 90° Right Turn
  ];

  it('generates predictable 40° pitch target for moving vehicle', () => {
    const s1: NavigationMotionSample = {
      coordinate: baseCoord,
      timestamp: 1000,
      speed: 10, // ~36 km/h
      heading: 90,
      accuracy: 8,
      source: 'LOCAL_GPS',
    };

    const target = engine.processMotionSample(s1, route);
    expect(target).not.toBeNull();
    expect(target?.pitch).toBe(40);
    expect(target?.heading).toBeCloseTo(90, 1);
    expect(target?.zoom).toBeGreaterThanOrEqual(17.0);
  });

  it('stabilizes heading and position when vehicle is stationary (< 0.8 m/s)', () => {
    const s1: NavigationMotionSample = {
      coordinate: baseCoord,
      timestamp: 1000,
      speed: 0,
      heading: 45,
      accuracy: 6,
      source: 'LOCAL_GPS',
    };
    const t1 = engine.processMotionSample(s1, route);
    expect(t1).not.toBeNull();

    // Minor GPS jitter while stationary (reported heading fluctuates randomly to 180)
    const s2: NavigationMotionSample = {
      coordinate: { latitude: -38.73501, longitude: -72.59001 },
      timestamp: 2000,
      speed: 0.1,
      heading: 180,
      accuracy: 8,
      source: 'LOCAL_GPS',
    };
    const t2 = engine.processMotionSample(s2, route);
    expect(t2).not.toBeNull();
    // Heading must remain locked to last reliable heading (45°) and not spin wildly
    expect(t2?.heading).toBeCloseTo(45, 1);
  });

  it('anticipates upcoming 90° right turn along polyline', () => {
    // Vehicle approaching the end of segment 0 (near the corner at longitude -72.5802)
    const nearCorner: RouteCoordinate = { latitude: -38.735, longitude: -72.5802 }; // ~17m from turn
    const sample: NavigationMotionSample = {
      coordinate: nearCorner,
      timestamp: 5000,
      speed: 8, // ~28 km/h
      heading: 90,
      accuracy: 5,
      source: 'LOCAL_GPS',
    };

    const target = engine.processMotionSample(sample, route);
    expect(target).not.toBeNull();
    // Heading should be blended towards South (180°) due to turn anticipation
    expect(target!.heading).toBeGreaterThan(95);
    expect(target!.heading).toBeLessThan(180);
  });

  it('rejects teleport jumps without moving camera', () => {
    const s1: NavigationMotionSample = {
      coordinate: baseCoord,
      timestamp: 1000,
      speed: 10,
      heading: 90,
      accuracy: 5,
      source: 'LOCAL_GPS',
    };
    engine.processMotionSample(s1, route);

    const teleportSample: NavigationMotionSample = {
      coordinate: { latitude: -38.700, longitude: -72.590 }, // ~3.8 km away
      timestamp: 2000, // 1s later
      accuracy: 45,
      source: 'LOCAL_GPS',
    };

    const target = engine.processMotionSample(teleportSample, route);
    expect(target).toBeNull(); // Rejected
    expect(engine.getMetrics().teleportRejections).toBe(1);
  });

  it('infers remote vehicle heading for Focus Client from motion vector', () => {
    const p1: NavigationMotionSample = {
      coordinate: { latitude: -38.735, longitude: -72.590 },
      timestamp: 1000,
      source: 'REMOTE_TRACKING',
    };
    const t1 = engine.processMotionSample(p1);
    expect(t1).not.toBeNull();

    // Provider moved East
    const p2: NavigationMotionSample = {
      coordinate: { latitude: -38.735, longitude: -72.588 }, // ~150m East
      timestamp: 5000,
      source: 'REMOTE_TRACKING',
    };
    const t2 = engine.processMotionSample(p2);
    expect(t2).not.toBeNull();
    // Inferred motion bearing should be East (90°)
    expect(t2?.heading).toBeCloseTo(90, 0);
  });

  it('coalesces camera writes and skips micro-jitter', () => {
    const s1: NavigationMotionSample = {
      coordinate: baseCoord,
      timestamp: 1000,
      speed: 10,
      heading: 90,
      accuracy: 5,
      source: 'LOCAL_GPS',
    };
    const target1 = engine.processMotionSample(s1)!;
    const write1 = engine.evaluateCameraWrite(target1, 1000);
    expect(write1.shouldWrite).toBe(true);

    // Micro jitter < 1m and < 1° within 300ms
    const s2: NavigationMotionSample = {
      coordinate: { latitude: -38.735002, longitude: -72.590002 },
      timestamp: 1300,
      speed: 10,
      heading: 90.2,
      accuracy: 5,
      source: 'LOCAL_GPS',
    };
    const target2 = engine.processMotionSample(s2)!;
    const write2 = engine.evaluateCameraWrite(target2, 1300);
    expect(write2.shouldWrite).toBe(false); // Skipped via deadband
    expect(write2.reason).toBe('DEADBAND_SKIP');
  });
});
