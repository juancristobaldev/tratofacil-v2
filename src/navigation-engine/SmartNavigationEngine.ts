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
import {
  buildRouteNavigationPlan,
  type RouteNavigationPlan,
} from './routeManeuverGraph';
import { ManeuverGuidanceStateMachine } from './maneuverGuidanceStateMachine';
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

  // Grafo de maniobras pre-indexado y máquina de estados con retención de intersección
  private navigationPlan: RouteNavigationPlan | null = null;
  private guidanceStateMachine: ManeuverGuidanceStateMachine = new ManeuverGuidanceStateMachine();

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
   * Registra y pre-indexa de forma atómica la polyline de navegación.
   * La sesión de ruta queda retenida en el motor; las muestras de movimiento subsiguientes
   * que omitan routeCoords seguirán operando sobre este plan sin resetearse.
   */
  public setRoute(routeCoords: RouteCoordinate[] | null | undefined): void {
    if (!routeCoords || routeCoords.length < 2) {
      this.navigationPlan = null;
      this.guidanceStateMachine.reset();
      this.lastRouteAnalysis = null;
      this.lastRoutePointsLength = 0;
      this.lastRouteStartCoord = null;
      return;
    }

    const isRouteGeometryChanged =
      routeCoords.length !== this.lastRoutePointsLength ||
      !this.lastRouteStartCoord ||
      Math.abs(routeCoords[0].latitude - this.lastRouteStartCoord.latitude) > 0.00015 ||
      Math.abs(routeCoords[0].longitude - this.lastRouteStartCoord.longitude) > 0.00015;

    if (isRouteGeometryChanged) {
      this.navigationPlan = buildRouteNavigationPlan(routeCoords);
      this.guidanceStateMachine.reset();
      this.lastRouteAnalysis = null;
      this.lastRoutePointsLength = routeCoords.length;
      this.lastRouteStartCoord = { latitude: routeCoords[0].latitude, longitude: routeCoords[0].longitude };
      if (__DEV__) {
        console.log(
          `[NAV:ROUTE_SET] Maneuvers pre-indexed: count=${this.navigationPlan?.maneuvers.length ?? 0} totalDist=${this.navigationPlan?.totalDistanceMeters.toFixed(1) ?? 0}m points=${routeCoords.length}`,
        );
      }
    }
  }

  /**
   * Retorna el plan de navegación pre-indexado actual.
   */
  public getNavigationPlan(): RouteNavigationPlan | null {
    return this.navigationPlan;
  }

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

    // 2. Gestión atómica de ruta: si routeCoords es provisto explícitamente, actualizar plan.
    // Si routeCoords es undefined, el motor conserva fielmente su navegación activa sin destruir la ruta.
    if (routeCoords !== undefined) {
      if (routeCoords && routeCoords.length >= 2) {
        this.setRoute(routeCoords);
      } else if (routeCoords === null) {
        this.setRoute(null);
      }
    }

    const activeRouteCoords = this.navigationPlan?.routeCoords ?? null;

    // 3. Análisis de ruta y progresión de maniobras respaldado por la máquina de estados
    const routeAnalysis = analyzeRouteProgress(
      estimate.coordinate,
      activeRouteCoords,
      estimate.speedMps,
      this.lastRouteAnalysis?.progress.currentSegmentIndex ?? 0,
      this.navigationPlan,
      this.guidanceStateMachine,
    );
    this.lastRouteAnalysis = routeAnalysis;

    const effectiveTurn = routeAnalysis?.turn ?? null;

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

    // 4. Fusión adaptativa de rumbo
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

    // 5. Proyección Look-Ahead hacia adelante
    const lookAhead = calculateCameraLookAhead(
      estimate.coordinate,
      headingFusion.targetHeading,
      estimate.speedMps,
      routeAnalysis?.progress ?? null,
      effectiveTurn,
      activeRouteCoords,
    );

    // 6. Zoom adaptativo según velocidad y maniobra
    const lastZoom = this.lastTarget?.zoom ?? SMART_NAV_CONSTANTS.BASE_ZOOM;
    const targetZoom = calculateAdaptiveZoom(
      estimate.speedMps,
      effectiveTurn,
      lastZoom,
    );

    const target: SmartCameraTarget = {
      center: lookAhead.cameraCenter,
      heading: headingFusion.targetHeading,
      pitch: SMART_NAV_CONSTANTS.CANONICAL_PITCH, // 65° canónico
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
    this.navigationPlan = null;
    this.guidanceStateMachine.reset();
    this.lastRoutePointsLength = 0;
    this.lastRouteStartCoord = null;
    this.coalescer.reset();
  }
}

export function createSmartNavigationEngine(): SmartNavigationEngine {
  return new SmartNavigationEngine();
}
