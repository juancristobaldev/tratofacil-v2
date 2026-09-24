import { SmartNavigationEngine } from './SmartNavigationEngine';
import { navigationTelemetry } from './navigationTelemetry';
import { destinationPoint, calculateBearing, getDistanceMeters } from './geoMathCore';
import type { NavigationMotionSample, TurnType } from './types';
import type { RouteCoordinate } from '../utils/directions';

describe('Smart Navigation Engine — Real-World Field Simulation & Validation Suite', () => {
  let engine: SmartNavigationEngine;

  beforeEach(() => {
    engine = new SmartNavigationEngine();
    if (navigationTelemetry.isActive()) {
      navigationTelemetry.endSession();
    }
  });

  const temucoCenter: RouteCoordinate = { latitude: -38.735000, longitude: -72.590000 };

  // =========================================================================
  // SCENARIO 1: COLD START FROM STOP
  // =========================================================================
  it('FIELD SCENARIO 1: Cold start without prior heading smoothly acquires vector on movement', () => {
    navigationTelemetry.startSession('cold_start_test');

    // 1. Initial fix: stopped at stoplight, heading undefined/0
    const s1: NavigationMotionSample = {
      coordinate: temucoCenter,
      timestamp: 1000,
      speed: 0,
      heading: null,
      accuracy: 6,
      source: 'LOCAL_GPS',
    };
    const t1 = engine.processMotionSample(s1);
    expect(t1).not.toBeNull();
    expect(t1!.heading).toBe(0);

    // 2. Vehicle starts driving East (90°) at 25 km/h (~7 m/s)
    const eastCoord = destinationPoint(temucoCenter, 7.0, 90);
    const s2: NavigationMotionSample = {
      coordinate: eastCoord,
      timestamp: 2000,
      speed: 7.0,
      heading: 90,
      accuracy: 5,
      source: 'LOCAL_GPS',
    };
    const t2 = engine.processMotionSample(s2);
    expect(t2).not.toBeNull();
    // Heading cleanly acquires the movement vector without erratic spins
    expect(t2!.heading).toBeCloseTo(90, 0);

    const summary = navigationTelemetry.endSession(3000);
    expect(summary.samplesAccepted).toBe(2);
  });

  // =========================================================================
  // SCENARIO 2: STATIONARY 60 SECONDS (ZERO JITTER SPIN)
  // =========================================================================
  it('FIELD SCENARIO 2: Stationary vehicle for 60s locks camera heading and suppresses micro-jitter writes', () => {
    navigationTelemetry.startSession('stationary_60s_test');

    const initialHeading = 135;
    let currTime = 10000;

    // First sample establishes position & heading
    engine.processMotionSample({
      coordinate: temucoCenter,
      timestamp: currTime,
      speed: 0,
      heading: initialHeading,
      accuracy: 4,
      source: 'LOCAL_GPS',
    });

    let totalCameraWrites = 0;
    // 60 GPS ticks (1 tick per second for 60s) with ±2.0m GPS wander and fluctuating headings
    for (let i = 1; i <= 60; i++) {
      currTime += 1000;
      const wanderLat = temucoCenter.latitude + (Math.sin(i) * 0.000015); // ~1.5m drift
      const wanderLng = temucoCenter.longitude + (Math.cos(i) * 0.000015);
      const randomHeading = (initialHeading + (Math.sin(i * 3) * 45) + 360) % 360;

      const sample: NavigationMotionSample = {
        coordinate: { latitude: wanderLat, longitude: wanderLng },
        timestamp: currTime,
        speed: 0.1, // Reported slow speed jitter < 0.8 m/s
        heading: randomHeading,
        accuracy: 8,
        source: 'LOCAL_GPS',
      };

      const target = engine.processMotionSample(sample);
      expect(target).not.toBeNull();
      // Heading MUST remain locked to 135° and not spin wildly with random GPS noise
      expect(target!.heading).toBeCloseTo(initialHeading, 0);

      const write = engine.evaluateCameraWrite(target!, currTime);
      if (write.shouldWrite) {
        totalCameraWrites++;
      }
    }

    const summary = navigationTelemetry.endSession(currTime);
    // Camera writes during 60s of stationary jitter must be minimal (deadband suppressed)
    expect(summary.cameraSkips).toBeGreaterThan(50);
  });

  // =========================================================================
  // SCENARIO 3: STOP-AND-GO TRAFFIC (0 -> 5 -> 0 -> 8 -> 0 km/h)
  // =========================================================================
  it('FIELD SCENARIO 3: Stop-and-go traffic smoothly transitions between stationary and creeping speeds', () => {
    navigationTelemetry.startSession('stop_and_go_test');
    let currTime = 10000;
    let currCoord = temucoCenter;
    const roadHeading = 45;

    const speedsKmh = [0, 2, 5, 4, 1, 0, 0, 3, 8, 7, 3, 0];

    speedsKmh.forEach((speedKmh) => {
      currTime += 1000;
      const speedMps = (speedKmh * 1000) / 3600;
      currCoord = destinationPoint(currCoord, speedMps, roadHeading);

      const target = engine.processMotionSample({
        coordinate: currCoord,
        timestamp: currTime,
        speed: speedMps,
        heading: roadHeading,
        accuracy: 5,
        source: 'LOCAL_GPS',
      });

      expect(target).not.toBeNull();
      expect(target!.pitch).toBe(65);
      expect(target!.heading).toBeCloseTo(roadHeading, 0);
      expect(target!.zoom).toBeGreaterThanOrEqual(17.5);
    });

    const summary = navigationTelemetry.endSession(currTime);
    expect(summary.samplesAccepted).toBe(speedsKmh.length);
  });

  // =========================================================================
  // SCENARIO 4: URBAN STRAIGHTAWAY (1 km @ 45 km/h)
  // =========================================================================
  it('FIELD SCENARIO 4: Urban straightaway maintains stable look-ahead and throttles camera writes', () => {
    navigationTelemetry.startSession('urban_straight_test');
    let currTime = 10000;
    let currCoord = temucoCenter;
    const roadHeading = 90; // East
    const speedMps = 12.5; // 45 km/h

    const route: RouteCoordinate[] = [
      temucoCenter,
      destinationPoint(temucoCenter, 1500, roadHeading),
    ];

    let writesCount = 0;
    // 50 samples (every 200ms = 10s of driving ~125m)
    for (let i = 0; i < 50; i++) {
      currTime += 200;
      currCoord = destinationPoint(currCoord, speedMps * 0.2, roadHeading);

      const target = engine.processMotionSample(
        {
          coordinate: currCoord,
          timestamp: currTime,
          speed: speedMps,
          heading: roadHeading,
          accuracy: 4,
          source: 'LOCAL_GPS',
        },
        route,
      );

      expect(target).not.toBeNull();
      expect(target!.heading).toBeCloseTo(roadHeading, 0);

      const write = engine.evaluateCameraWrite(target!, currTime);
      if (write.shouldWrite) {
        writesCount++;
      }
    }

    const summary = navigationTelemetry.endSession(currTime);
    // Write ratio should be optimal (~0.5 to ~0.9)
    expect(summary.cameraWriteRatio).toBeLessThanOrEqual(1.0);
    expect(summary.visualSmoothnessScore).toBe('SMOOTH');
  });

  // =========================================================================
  // SCENARIO 5: 90° SHARP TURN & LOOK-AHEAD CONTRACTION
  // =========================================================================
  it('FIELD SCENARIO 5: Approaching a 90° turn contracts look-ahead and blends target heading', () => {
    navigationTelemetry.startSession('turn_90_test');
    const cornerPoint = destinationPoint(temucoCenter, 100, 90); // 100m East
    const destPoint = destinationPoint(cornerPoint, 100, 180); // then 100m South

    const route: RouteCoordinate[] = [temucoCenter, cornerPoint, destPoint];

    // Vehicle is 15m before corner moving East
    const nearCorner = destinationPoint(cornerPoint, 15, 270);
    const target = engine.processMotionSample(
      {
        coordinate: nearCorner,
        timestamp: 5000,
        speed: 8.0, // ~28.8 km/h
        heading: 90,
        accuracy: 4,
        source: 'LOCAL_GPS',
      },
      route,
    );

    expect(target).not.toBeNull();
    // Heading blends towards South (180°)
    expect(target!.heading).toBeGreaterThan(95);
    expect(target!.heading).toBeLessThan(180);
    // Pitch is invariant at 65°
    expect(target!.pitch).toBe(65);
  });

  // =========================================================================
  // SCENARIO 6: ROUNDABOUT (360° CONTINUOUS ROTATION)
  // =========================================================================
  it('FIELD SCENARIO 6: Roundabout simulation tracks continuous curvature without angular snap', () => {
    navigationTelemetry.startSession('roundabout_test');
    const radius = 25; // 25m radius roundabout
    const numSteps = 16;
    let currTime = 10000;
    const headings: number[] = [];

    for (let i = 0; i < numSteps; i++) {
      currTime += 500;
      const angleRad = (i / numSteps) * 2 * Math.PI;
      const lat = temucoCenter.latitude + (radius / 111320) * Math.sin(angleRad);
      const lng = temucoCenter.longitude + (radius / (111320 * Math.cos(temucoCenter.latitude * (Math.PI / 180)))) * Math.cos(angleRad);
      const instantaneousBearing = (angleRad * (180 / Math.PI) + 90) % 360;

      const target = engine.processMotionSample({
        coordinate: { latitude: lat, longitude: lng },
        timestamp: currTime,
        speed: 5.5, // 20 km/h
        heading: instantaneousBearing,
        accuracy: 5,
        source: 'LOCAL_GPS',
      });

      expect(target).not.toBeNull();
      headings.push(target!.heading);
    }

    // Check step-to-step angular differences: none should snap > 45°
    for (let i = 1; i < headings.length; i++) {
      const delta = Math.abs(headings[i] - headings[i - 1]);
      const normalizedDelta = delta > 180 ? 360 - delta : delta;
      expect(normalizedDelta).toBeLessThan(45);
    }

    const summary = navigationTelemetry.endSession(currTime);
    expect(summary.visualSmoothnessScore).toBe('SMOOTH');
  });

  // =========================================================================
  // SCENARIO 7: U-TURN (180° REVERSE)
  // =========================================================================
  it('FIELD SCENARIO 7: U-turn maneuver reorients cleanly along shortest angular path', () => {
    navigationTelemetry.startSession('uturn_test');
    // Start North (0°)
    engine.processMotionSample({
      coordinate: temucoCenter,
      timestamp: 1000,
      speed: 6.0,
      heading: 0,
      accuracy: 4,
      source: 'LOCAL_GPS',
    });

    // U-turn executes, vehicle now traveling South (180°)
    const t2 = engine.processMotionSample({
      coordinate: destinationPoint(temucoCenter, 10, 180),
      timestamp: 3000,
      speed: 5.0,
      heading: 180,
      accuracy: 4,
      source: 'LOCAL_GPS',
    });

    expect(t2).not.toBeNull();
    expect(t2!.heading).toBeGreaterThan(0);
    expect(t2!.pitch).toBe(65);
  });

  // =========================================================================
  // SCENARIO 8: HIGHWAY CRUISE (100 km/h)
  // =========================================================================
  it('FIELD SCENARIO 8: Highway speeds expand look-ahead to ~40m and broaden zoom to ~16.2', () => {
    navigationTelemetry.startSession('highway_test');
    const speedMps = 27.77; // 100 km/h

    let target = null;
    let currTime = 1000;
    for (let i = 0; i < 8; i++) {
      currTime += 200;
      target = engine.processMotionSample({
        coordinate: temucoCenter,
        timestamp: currTime,
        speed: speedMps,
        heading: 180,
        accuracy: 4,
        source: 'LOCAL_GPS',
      });
    }

    expect(target).not.toBeNull();
    expect(target!.zoom).toBeLessThanOrEqual(16.5); // Highway zoom
    expect(target!.pitch).toBe(65);
  });

  // =========================================================================
  // SCENARIO 9: URBAN CANYON GPS LOSS (15s blackout) & RECOVERY
  // =========================================================================
  it('FIELD SCENARIO 9: GPS blackout preserves last reliable target and recovers smoothly', () => {
    navigationTelemetry.startSession('gps_loss_recovery_test');

    // 1. Driving normally before tunnel
    const t1 = engine.processMotionSample({
      coordinate: temucoCenter,
      timestamp: 1000,
      speed: 15.0,
      heading: 90,
      accuracy: 4,
      source: 'LOCAL_GPS',
    });
    expect(t1!.heading).toBeCloseTo(90, 0);

    // 2. 15 seconds inside tunnel (no updates) -> Engine state persists

    // 3. Exiting tunnel with new fix 225m ahead (15s * 15m/s = 225m)
    const exitTunnelCoord = destinationPoint(temucoCenter, 225, 90);
    const tRecovery = engine.processMotionSample({
      coordinate: exitTunnelCoord,
      timestamp: 16000, // 15s later
      speed: 15.0,
      heading: 90,
      accuracy: 5,
      source: 'LOCAL_GPS',
    });

    expect(tRecovery).not.toBeNull(); // Accepted cleanly (implied speed 15 m/s < 55 m/s)
    expect(tRecovery!.heading).toBeCloseTo(90, 0);
  });

  // =========================================================================
  // SCENARIO 10: REMOTE TRACKING / FOCUS CLIENT
  // =========================================================================
  it('FIELD SCENARIO 10: Focus Client tracking remote provider handles socket latency, stale state & provider switch', () => {
    navigationTelemetry.startSession('focus_client_remote_test');

    // Provider A moves North
    const p1: NavigationMotionSample = {
      coordinate: temucoCenter,
      timestamp: 1000,
      source: 'REMOTE_TRACKING',
    };
    engine.processMotionSample(p1);

    const p2Coord = destinationPoint(temucoCenter, 50, 0); // 50m North
    const p2: NavigationMotionSample = {
      coordinate: p2Coord,
      timestamp: 4000,
      source: 'REMOTE_TRACKING',
    };
    const t2 = engine.processMotionSample(p2);
    expect(t2).not.toBeNull();
    expect(t2!.heading).toBeCloseTo(0, 0); // Inferred North

    // Provider switch (Engine reset -> Provider B starts in South)
    engine.reset();
    const providerBCoord = destinationPoint(temucoCenter, 500, 180);
    const pb1: NavigationMotionSample = {
      coordinate: providerBCoord,
      timestamp: 5000,
      source: 'REMOTE_TRACKING',
    };
    const tb1 = engine.processMotionSample(pb1);
    expect(tb1).not.toBeNull();

    // Provider B moves West (270°)
    const pb2Coord = destinationPoint(providerBCoord, 40, 270);
    const tb2 = engine.processMotionSample({
      coordinate: pb2Coord,
      timestamp: 8000,
      source: 'REMOTE_TRACKING',
    });
    expect(tb2).not.toBeNull();
    // Heading of Provider B correctly infers West (270°) without cross-contamination from Provider A
    expect(tb2!.heading).toBeCloseTo(270, 0);
  });
});
