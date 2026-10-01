import type {
  NavigationMotionSample,
  MotionEstimate,
  SmartCameraTarget,
  NavigationEngineMetrics,
  TurnAnalysis,
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
  private lastRoutePointsLength: number = 0;
  private lastRouteStartCoord: RouteCoordinate | null = null;
  private latchedTurn: TurnAnalysis | null = null;
  private consecutiveNoTurnCount: number = 0;

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

    if (__DEV__) {
      console.log(
        `[NAV:GPS] source=${sample.source} lat=${sample.coordinate.latitude.toFixed(6)} lng=${sample.coordinate.longitude.toFixed(6)} ts=${sample.timestamp} accuracy=${sample.accuracy ?? 'n/a'} speed=${sample.speed ?? 'n/a'} heading=${sample.heading ?? 'n/a'}`,
      );
    }

    // 2. Detección de cambio de geometría de ruta y reseteo de índice
    if (routeCoords && routeCoords.length >= 2) {
      const isRouteGeometryChanged =
        routeCoords.length !== this.lastRoutePointsLength ||
        !this.lastRouteStartCoord ||
        Math.abs(routeCoords[0].latitude - this.lastRouteStartCoord.latitude) > 0.00015 ||
        Math.abs(routeCoords[0].longitude - this.lastRouteStartCoord.longitude) > 0.00015;

      if (isRouteGeometryChanged) {
        this.lastRouteAnalysis = null;
        this.latchedTurn = null;
        this.consecutiveNoTurnCount = 0;
        this.lastRoutePointsLength = routeCoords.length;
        this.lastRouteStartCoord = { latitude: routeCoords[0].latitude, longitude: routeCoords[0].longitude };
      }
    }

    // Análisis de ruta y detección de curvas/giros
    const routeAnalysis = analyzeRouteProgress(
      estimate.coordinate,
      routeCoords,
      estimate.speedMps,
      this.lastRouteAnalysis?.progress.currentSegmentIndex ?? 0,
    );
    this.lastRouteAnalysis = routeAnalysis;

    // Estabilización temporal anti-parpadeo del giro (Latching & Hysteresis)
    let effectiveTurn = routeAnalysis?.turn ?? null;
    if (effectiveTurn?.turnDetected) {
      this.latchedTurn = effectiveTurn;
      this.consecutiveNoTurnCount = 0;
    } else if (this.latchedTurn) {
      this.consecutiveNoTurnCount++;
      const isStillOnRoute = routeAnalysis && !routeAnalysis.progress.isOffRoute;
      if (this.consecutiveNoTurnCount < 3 && isStillOnRoute && this.latchedTurn.distanceToTurn > 0) {
        effectiveTurn = this.latchedTurn;
      } else {
        this.latchedTurn = null;
      }
    }

    const snappedPosition =
      routeAnalysis &&
      !routeAnalysis.progress.isOffRoute &&
      routeAnalysis.progress.distanceFromRoute <= Math.min(18, Math.max(8, sample.accuracy ?? 12))
        ? routeAnalysis.progress.closestPoint ?? null
        : null;
    const navigationPosition = snappedPosition ?? estimate.coordinate;

    if (__DEV__ && routeAnalysis) {
      console.log(
        `[NAV:ROUTE_MATCH] segment=${routeAnalysis.progress.currentSegmentIndex} distanceFromRoute=${routeAnalysis.progress.distanceFromRoute.toFixed(1)} routeBearing=${routeAnalysis.progress.routeBearing.toFixed(1)} lookAheadBearing=${routeAnalysis.progress.lookAheadBearing.toFixed(1)} distanceToTurn=${effectiveTurn && Number.isFinite(effectiveTurn.distanceToTurn) ? effectiveTurn.distanceToTurn.toFixed(1) : 'inf'} turnType=${effectiveTurn?.turnType ?? 'STRAIGHT'} isOffRoute=${routeAnalysis.progress.isOffRoute}`,
      );
    }

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

    if (__DEV__) {
      console.log(
        `[NAV:HEADING] gps=${sample.heading ?? 'n/a'} route=${routeAnalysis?.progress.routeBearing.toFixed(1) ?? 'n/a'} lookAhead=${routeAnalysis?.progress.lookAheadBearing.toFixed(1) ?? 'n/a'} target=${headingFusion.targetHeading.toFixed(1)} source=${headingFusion.source}`,
      );
    }

    // 4. Proyección Look-Ahead hacia adelante
    const lookAhead = calculateCameraLookAhead(
      estimate.coordinate,
      headingFusion.targetHeading,
      estimate.speedMps,
      routeAnalysis?.progress ?? null,
      effectiveTurn,
      routeCoords,
    );

    // 5. Zoom adaptativo según velocidad y maniobra
    const lastZoom = this.lastTarget?.zoom ?? SMART_NAV_CONSTANTS.BASE_ZOOM;
    const targetZoom = calculateAdaptiveZoom(
      estimate.speedMps,
      effectiveTurn,
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
      rawPosition: sample.coordinate,
      filteredPosition: estimate.coordinate,
      snappedPosition,
      navigationPosition,
      routeProgress: routeAnalysis?.progress ?? null,
      turn: effectiveTurn,
    };

    navigationTelemetry.recordFilteredSample(
      estimate,
      routeAnalysis?.progress ?? null,
      effectiveTurn,
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
    this.latchedTurn = null;
    this.consecutiveNoTurnCount = 0;
    this.lastRoutePointsLength = 0;
    this.lastRouteStartCoord = null;
    this.coalescer.reset();
  }
}

export function createSmartNavigationEngine(): SmartNavigationEngine {
  return new SmartNavigationEngine();
}
