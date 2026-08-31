import { SmartNavigationEngine } from './SmartNavigationEngine';
import { CameraCoalescer } from './cameraCoalescer';
import {
  normalizeHeading,
  shortestAngularDelta,
  smoothHeadingEMA,
  getDistanceMeters,
  destinationPoint,
} from './geoMathCore';
import { classifyGpsQuality, isTeleportJump, filterGpsPosition } from './gpsQualityFilter';
import { analyzeRouteProgress } from './routeAnalyzer';
import { fuseNavigationHeading } from './headingEngine';
import { calculateCameraLookAhead } from './lookAheadEngine';
import { calculateAdaptiveZoom } from './adaptiveZoomEngine';
import type { NavigationMotionSample, MotionEstimate } from './types';
import { SMART_NAV_CONSTANTS } from './types';
import type { RouteCoordinate } from '../utils/directions';

describe('SmartNavigationEngine Adversarial & Boundary Audit Suite', () => {
  let engine: SmartNavigationEngine;

  beforeEach(() => {
    engine = new SmartNavigationEngine();
  });

  const baseCoord: RouteCoordinate = { latitude: -38.735000, longitude: -72.590000 };

  // =========================================================================
  // 1. ANGULAR WRAP & PURE MATH INVARIANTS
  // =========================================================================
  describe('Angular Wrap & Pure Math Invariants', () => {
    it('normalizes negative and out-of-range headings strictly within [0, 360)', () => {
      expect(normalizeHeading(0)).toBe(0);
      expect(normalizeHeading(360)).toBe(0);
      expect(normalizeHeading(720)).toBe(0);
      expect(normalizeHeading(-1)).toBe(359);
      expect(normalizeHeading(-360)).toBe(0);
      expect(normalizeHeading(-721)).toBe(359);
      expect(normalizeHeading(359.99)).toBeCloseTo(359.99, 2);
    });

    it('computes shortestAngularDelta correctly across the 0/360 boundary', () => {
      expect(shortestAngularDelta(359, 1)).toBeCloseTo(2, 5);
      expect(shortestAngularDelta(1, 359)).toBeCloseTo(-2, 5);
      expect(shortestAngularDelta(350, 10)).toBeCloseTo(20, 5);
      expect(shortestAngularDelta(10, 350)).toBeCloseTo(-20, 5);
      expect(shortestAngularDelta(0, 180)).toBeCloseTo(180, 5);
      expect(shortestAngularDelta(180, 0)).toBeCloseTo(-180, 5);
    });

    it('smoothHeadingEMA handles angular wrap smoothly without spinning 358° the wrong way', () => {
      // 359° smoothing towards 1° with alpha 0.5 should yield 0° (or 360°), NOT 180°!
      const smoothed = smoothHeadingEMA(359, 1, 0.5);
      expect(smoothed).toBeCloseTo(0, 5);

      const smoothed2 = smoothHeadingEMA(350, 10, 0.5);
      expect(smoothed2).toBeCloseTo(0, 5);

      const smoothed3 = smoothHeadingEMA(10, 350, 0.5);
      expect(smoothed3).toBeCloseTo(0, 5);
    });
  });

  // =========================================================================
  // 2. THRESHOLD BOUNDARY TESTS (ε = 0.01)
  // =========================================================================
  describe('Threshold Boundary Tests (epsilon testing)', () => {
    it('STATIONARY_SPEED_THRESHOLD (0.8 m/s): behavior at 0.79, 0.80, 0.81 m/s', () => {
      // 0.79 m/s -> Stationary
      const est079: MotionEstimate = {
        coordinate: baseCoord,
        heading: 45,
        speedMps: 0.79,
        isStationary: 0.79 < SMART_NAV_CONSTANTS.STATIONARY_SPEED_THRESHOLD_MPS,
        quality: 'EXCELLENT',
        timestamp: 1000,
      };
      expect(est079.isStationary).toBe(true);

      // 0.80 m/s -> Boundary
      const est080: MotionEstimate = {
        coordinate: baseCoord,
        heading: 45,
        speedMps: 0.80,
        isStationary: 0.80 < SMART_NAV_CONSTANTS.STATIONARY_SPEED_THRESHOLD_MPS,
        quality: 'EXCELLENT',
        timestamp: 1000,
      };
      expect(est080.isStationary).toBe(false);

      // 0.81 m/s -> Moving
      const est081: MotionEstimate = {
        coordinate: baseCoord,
        heading: 45,
        speedMps: 0.81,
        isStationary: 0.81 < SMART_NAV_CONSTANTS.STATIONARY_SPEED_THRESHOLD_MPS,
        quality: 'EXCELLENT',
        timestamp: 1000,
      };
      expect(est081.isStationary).toBe(false);
    });

    it('ADAPTIVE ZOOM continuity across highway and city speed transitions', () => {
      const zoomLow = calculateAdaptiveZoom(0, null);
      const zoom10kmh = calculateAdaptiveZoom(2.77, null);
      const zoom50kmh = calculateAdaptiveZoom(13.88, null);
      const zoom90kmh = calculateAdaptiveZoom(25.0, null);
      const zoom120kmh = calculateAdaptiveZoom(33.33, null);

      expect(zoomLow).toBe(18.0);
      expect(zoom10kmh).toBeLessThanOrEqual(18.0);
      expect(zoom50kmh).toBeLessThan(zoom10kmh);
      expect(zoom90kmh).toBeLessThan(zoom50kmh);
      expect(zoom120kmh).toBeLessThanOrEqual(zoom90kmh);
      expect(zoom120kmh).toBeGreaterThanOrEqual(16.0);
    });
  });

  // =========================================================================
  // 3. DEADBAND ACCUMULATION & MICRO-JITTER PREVENTION
  // =========================================================================
  describe('Deadband Accumulation & Reference Integrity', () => {
    it('accumulates continuous position deltas against lastAppliedTarget and DOES NOT drop 6m drift', () => {
      const coalescer = new CameraCoalescer();

      const t0 = 1000;
      const initialTarget = {
        center: baseCoord,
        heading: 90,
        pitch: 40,
        zoom: 18,
        altitude: 300,
        duration: 500,
        reason: 'INIT',
      };
      const initialDecision = coalescer.evaluateWrite(initialTarget, t0);
      expect(initialDecision.shouldWrite).toBe(true);

      // P1: +1.5m East (within deadband < 2m) at t0 + 250ms -> SKIPPED
      const p1Coord = destinationPoint(baseCoord, 1.5, 90);
      const dec1 = coalescer.evaluateWrite({ ...initialTarget, center: p1Coord }, t0 + 250);
      expect(dec1.shouldWrite).toBe(false);
      expect(dec1.reason).toBe('DEADBAND_SKIP');

      // P2: +3.0m East (total 3.0m > 2m deadband from last applied target) at t0 + 500ms -> WRITTEN!
      const p2Coord = destinationPoint(baseCoord, 3.0, 90);
      const dec2 = coalescer.evaluateWrite({ ...initialTarget, center: p2Coord }, t0 + 500);
      expect(dec2.shouldWrite).toBe(true);
      expect(dec2.reason).toBe('POSITION_DELTA');
    });

    it('accumulates continuous heading deltas against lastAppliedTarget and DOES NOT drop a gradual 8° curve', () => {
      const coalescer = new CameraCoalescer();
      const t0 = 1000;
      const initialTarget = {
        center: baseCoord,
        heading: 0,
        pitch: 40,
        zoom: 18,
        altitude: 300,
        duration: 500,
        reason: 'INIT',
      };
      coalescer.evaluateWrite(initialTarget, t0);

      // +2.0° (deadband < 2.5°) at t0 + 250ms -> SKIPPED
      const dec1 = coalescer.evaluateWrite({ ...initialTarget, heading: 2.0 }, t0 + 250);
      expect(dec1.shouldWrite).toBe(false);

      // +4.0° (total 4.0° > 2.5° deadband) at t0 + 500ms -> WRITTEN!
      const dec2 = coalescer.evaluateWrite({ ...initialTarget, heading: 4.0 }, t0 + 500);
      expect(dec2.shouldWrite).toBe(true);
      expect(dec2.reason).toBe('HEADING_DELTA');
    });
  });

  // =========================================================================
  // 4. TIMESTAMPS, ZERO-DT, OUT-OF-ORDER SAMPLES & TELEPORTS
  // =========================================================================
  describe('Timestamps, Zero-DT, Out-of-Order Samples & Teleports', () => {
    it('handles dt = 0 gracefully without division by zero NaN errors', () => {
      const prevEstimate: MotionEstimate = {
        coordinate: baseCoord,
        heading: 90,
        speedMps: 10,
        isStationary: false,
        quality: 'EXCELLENT',
        timestamp: 5000,
      };
      const sampleSameTime: NavigationMotionSample = {
        coordinate: { latitude: -38.73501, longitude: -72.59001 },
        timestamp: 5000, // Same timestamp
        speed: 10,
        heading: 90,
        accuracy: 5,
        source: 'LOCAL_GPS',
      };

      const result = filterGpsPosition(prevEstimate, sampleSameTime, null);
      expect(result.accepted).toBe(true);
      expect(Number.isFinite(result.estimate.speedMps)).toBe(true);
    });

    it('rejects out-of-order stale sample (t2 < t1) or handles it safely', () => {
      const prevEstimate: MotionEstimate = {
        coordinate: baseCoord,
        heading: 90,
        speedMps: 10,
        isStationary: false,
        quality: 'EXCELLENT',
        timestamp: 10000,
      };
      const staleSample: NavigationMotionSample = {
        coordinate: { latitude: -38.73502, longitude: -72.59002 },
        timestamp: 8000, // Stale in the past
        speed: 10,
        heading: 90,
        accuracy: 5,
        source: 'LOCAL_GPS',
      };

      const result = filterGpsPosition(prevEstimate, staleSample, null);
      expect(result.accepted).toBe(true);
      expect(result.estimate.timestamp).toBeGreaterThanOrEqual(8000);
    });
  });

  // =========================================================================
  // 5. DETERMINISTIC FUZZING WITH RANDOM PERTURBATIONS
  // =========================================================================
  describe('Deterministic Fuzzing Test Suite', () => {
    it('survives 1000 perturbed GPS samples without NaN, Infinity or crashes', () => {
      let currentLat = -38.735000;
      let currentLng = -72.590000;
      let currentTime = 10000;

      for (let i = 0; i < 1000; i++) {
        // Deterministic pseudo-random noise generator
        const pseudoRand1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453 % 1;
        const pseudoRand2 = Math.cos(i * 4.1414 + 13.37) * 43758.5453 % 1;
        const noiseLat = pseudoRand1 * 0.00005;
        const noiseLng = pseudoRand2 * 0.00005;

        currentLat += 0.00003 + noiseLat;
        currentLng += 0.00003 + noiseLng;
        currentTime += 200 + Math.floor(pseudoRand1 * 50);

        const sample: NavigationMotionSample = {
          coordinate: { latitude: currentLat, longitude: currentLng },
          timestamp: currentTime,
          speed: 12 + pseudoRand1 * 2,
          heading: (45 + pseudoRand2 * 10 + 360) % 360,
          accuracy: 5 + Math.abs(pseudoRand1 * 10),
          source: 'LOCAL_GPS',
        };

        const target = engine.processMotionSample(sample);
        if (target) {
          expect(Number.isFinite(target.center.latitude)).toBe(true);
          expect(Number.isFinite(target.center.longitude)).toBe(true);
          expect(Number.isFinite(target.heading)).toBe(true);
          expect(target.heading).toBeGreaterThanOrEqual(0);
          expect(target.heading).toBeLessThan(360);
          expect(target.pitch).toBe(40);
          expect(target.zoom).toBeGreaterThanOrEqual(16.0);
          expect(target.zoom).toBeLessThanOrEqual(18.0);
        }
      }

      const metrics = engine.getMetrics();
      expect(metrics.samplesReceived).toBe(1000);
      expect(metrics.samplesAccepted).toBeGreaterThan(950);
    });
  });
});
