import type {
  NavigationMotionSample,
  MotionEstimate,
  SmartCameraTarget,
  NavigationEngineMetrics,
} from './types';
import { SMART_NAV_CONSTANTS } from './types';
import { filterGpsPosition } from './gpsQualityFilter';
import { analyzeRouteProgress, type RouteAnalysisResult } from './routeAnalyzer';
import { fuseNavigationHeading } from './headingEngine';
import { calculateCameraLookAhead } from './lookAheadEngine';
import { calculateAdaptiveZoom } from './adaptiveZoomEngine';
import { CameraCoalescer, type CameraWriteDecision } from './cameraCoalescer';
import { navigationTelemetry } from './navigationTelemetry';
import type { RouteCoordinate } from '../utils/directions';

export class SmartNavigationEngine {
  private lastSample: NavigationMotionSample | null = null;
  private lastEstimate: MotionEstimate | null = null;
  private lastRouteAnalysis: RouteAnalysisResult | null = null;
  private lastTarget: SmartCameraTarget | null = null;
  private coalescer: CameraCoalescer = new CameraCoalescer();

  private metrics: NavigationEngineMetrics = {
    samplesReceived: 0,
    samplesAccepted: 0,
    samplesRejected: 0,
    cameraTargetsGenerated: 0,
    cameraWrites: 0,
    cameraSkips: 0,
    teleportRejections: 0,
    lastQuality: 'GOOD',
    lastReason: 'INIT',
  };

  /**
   * Procesa una muestra de movimiento (GPS local o tracking remoto)
   * y genera el target de cámara predictivo e invariante.
   */
  public processMotionSample(
    sample: NavigationMotionSample,
    routeCoords?: RouteCoordinate[] | null,
  ): SmartCameraTarget | null {
    this.metrics.samplesReceived++;
    navigationTelemetry.recordRawSample(sample);

    // 1. Filtrado de señal y calidad GPS
    const filterResult = filterGpsPosition(this.lastEstimate, sample, this.lastSample);
    if (!filterResult.accepted) {
      this.metrics.samplesRejected++;
      navigationTelemetry.recordSampleRejected(filterResult.reason);
      if (filterResult.reason.includes('TELEPORT')) {
        this.metrics.teleportRejections++;
      }
      this.metrics.lastReason = filterResult.reason;
      if (__DEV__) {
        console.log(`[NAV:SAMPLE_REJECTED] reason=${filterResult.reason}`);
      }
      return null;
    }

    this.metrics.samplesAccepted++;
    const estimate = filterResult.estimate;
    this.metrics.lastQuality = estimate.quality;

    // 2. Análisis de ruta y detección de curvas/giros
    const routeAnalysis = analyzeRouteProgress(
      estimate.coordinate,
      routeCoords,
      estimate.speedMps,
      this.lastRouteAnalysis?.progress.currentSegmentIndex ?? 0,
    );
    this.lastRouteAnalysis = routeAnalysis;

    // 3. Fusión adaptativa de rumbo
    const lastHeading = this.lastTarget?.heading ?? estimate.heading;
    const headingFusion = fuseNavigationHeading(
      sample,
      estimate,
      routeAnalysis?.progress ?? null,
      routeAnalysis?.turn ?? null,
      lastHeading,
      this.lastSample,
    );

    // 4. Proyección Look-Ahead hacia adelante
    const lookAhead = calculateCameraLookAhead(
      estimate.coordinate,
      headingFusion.targetHeading,
      estimate.speedMps,
      routeAnalysis?.progress ?? null,
      routeAnalysis?.turn ?? null,
      routeCoords,
    );

    // 5. Zoom adaptativo según velocidad y maniobra
    const lastZoom = this.lastTarget?.zoom ?? SMART_NAV_CONSTANTS.BASE_ZOOM;
    const targetZoom = calculateAdaptiveZoom(
      estimate.speedMps,
      routeAnalysis?.turn ?? null,
      lastZoom,
    );

    const target: SmartCameraTarget = {
      center: lookAhead.cameraCenter,
      heading: headingFusion.targetHeading,
      pitch: SMART_NAV_CONSTANTS.CANONICAL_PITCH, // 40° canónico
      zoom: targetZoom,
      altitude: SMART_NAV_CONSTANTS.DEFAULT_ALTITUDE,
      duration: SMART_NAV_CONSTANTS.DEFAULT_ANIM_DURATION_MS,
      reason: `NAV_${headingFusion.source}`,
    };

    navigationTelemetry.recordFilteredSample(
      estimate,
      routeAnalysis?.progress ?? null,
      routeAnalysis?.turn ?? null,
      lookAhead.lookAheadDistanceMeters,
    );
    navigationTelemetry.recordCameraTarget(target);

    this.lastSample = sample;
    this.lastEstimate = estimate;
    this.lastTarget = target;
    this.metrics.cameraTargetsGenerated++;

    if (__DEV__) {
      console.log(
        `[NAV:TARGET] speed=${(estimate.speedMps * 3.6).toFixed(1)}km/h heading=${target.heading.toFixed(1)}° zoom=${target.zoom.toFixed(2)} lookAhead=${lookAhead.lookAheadDistanceMeters.toFixed(1)}m source=${headingFusion.source}`,
      );
    }

    return target;
  }

  /**
   * Evalúa si el target generado debe escribirse nativamente o si puede omitirse/coalescerse.
   */
  public evaluateCameraWrite(
    target: SmartCameraTarget,
    now: number = Date.now(),
    force: boolean = false,
  ): CameraWriteDecision {
    const decision = this.coalescer.evaluateWrite(target, now, force);
    if (decision.shouldWrite) {
      this.metrics.cameraWrites++;
      this.metrics.lastReason = decision.reason;
      navigationTelemetry.recordCameraWrite(decision.reason, decision.durationMs);
    } else {
      this.metrics.cameraSkips++;
      navigationTelemetry.recordCameraSkip(decision.reason);
    }
    return decision;
  }

  public getMetrics(): NavigationEngineMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.lastSample = null;
    this.lastEstimate = null;
    this.lastRouteAnalysis = null;
    this.lastTarget = null;
    this.coalescer.reset();
  }
}

export function createSmartNavigationEngine(): SmartNavigationEngine {
  return new SmartNavigationEngine();
}
