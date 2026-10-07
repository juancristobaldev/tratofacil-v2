import type { RouteCoordinate } from '../utils/directions';
import type { RouteProgress, TurnAnalysis } from './types';
import { SMART_NAV_CONSTANTS } from './types';
import {
  getDistanceMeters,
  calculateBearing,
  projectPointOnSegment,
} from './geoMathCore';
import {
  buildRouteNavigationPlan,
  type RouteNavigationPlan,
} from './routeManeuverGraph';
import {
  ManeuverGuidanceStateMachine,
} from './maneuverGuidanceStateMachine';

export interface RouteAnalysisResult {
  progress: RouteProgress;
  turn: TurnAnalysis;
}

/**
 * Analiza la posición del vehículo en relación a la polyline de ruta.
 * Encuentra el segmento más cercano, mide el progreso, calcula el rumbo de la calzada
 * y evalúa la maniobra activa a través de la máquina de estados de guía.
 */
export function analyzeRouteProgress(
  coordinate: RouteCoordinate,
  routeCoords: RouteCoordinate[] | null | undefined,
  speedMps: number,
  lastSegmentIndex: number = 0,
  plan?: RouteNavigationPlan | null,
  guidanceStateMachine?: ManeuverGuidanceStateMachine | null,
): RouteAnalysisResult | null {
  if (!routeCoords || routeCoords.length < 2) {
    return null;
  }

  const numSegments = routeCoords.length - 1;

  // 1. Búsqueda con ventana acotada para O(K) en rutas largas
  let bestDist = Infinity;
  let bestIndex = 0;
  let bestFraction = 0;
  let bestBearing = 0;
  let bestClosestPoint: RouteCoordinate | null = null;

  // Busca en una ventana de +/- 4 segmentos alrededor del último índice conocido
  const startIdx = Math.max(0, lastSegmentIndex - 2);
  const endIdx = Math.min(numSegments, lastSegmentIndex + 5);

  for (let i = startIdx; i < endIdx; i++) {
    const proj = projectPointOnSegment(coordinate, routeCoords[i], routeCoords[i + 1]);
    if (proj.distanceMeters < bestDist) {
      bestDist = proj.distanceMeters;
      bestIndex = i;
      bestFraction = proj.fraction;
      bestBearing = proj.segmentBearing;
      bestClosestPoint = proj.closestPoint;
    }
  }

  // Si la distancia es alta (> 25m) o si el lastSegmentIndex está fuera de rango, realiza un barrido completo
  if (bestDist > 25 || lastSegmentIndex >= numSegments) {
    for (let i = 0; i < numSegments; i++) {
      if (i >= startIdx && i < endIdx && bestDist <= 25) continue;
      const proj = projectPointOnSegment(coordinate, routeCoords[i], routeCoords[i + 1]);
      if (proj.distanceMeters < bestDist) {
        bestDist = proj.distanceMeters;
        bestIndex = i;
        bestFraction = proj.fraction;
        bestBearing = proj.segmentBearing;
        bestClosestPoint = proj.closestPoint;
      }
    }
  }

  const isOffRoute = bestDist > SMART_NAV_CONSTANTS.OFF_ROUTE_DISTANCE_THRESHOLD_METERS;

  // 2. Calcular distancia restante y distancia acumulada a lo largo de la polyline
  const currentSegLength = getDistanceMeters(routeCoords[bestIndex], routeCoords[bestIndex + 1]);
  let remainingDist = (1 - bestFraction) * currentSegLength;

  for (let i = bestIndex + 1; i < numSegments; i++) {
    remainingDist += getDistanceMeters(routeCoords[i], routeCoords[i + 1]);
  }

  let distanceAlongRoute = bestFraction * currentSegLength;
  for (let i = 0; i < bestIndex; i++) {
    distanceAlongRoute += getDistanceMeters(routeCoords[i], routeCoords[i + 1]);
  }

  // 3. Look-Ahead Bearing a lo largo de la polyline (15m a 35m adelante)
  const lookAheadDistance = Math.min(35, Math.max(12, speedMps * 2.5));
  let lookAheadBearing = bestBearing;
  let accDist = (1 - bestFraction) * currentSegLength;
  let futureSegIdx = bestIndex;

  while (accDist < lookAheadDistance && futureSegIdx < numSegments - 1) {
    futureSegIdx++;
    const segLen = getDistanceMeters(routeCoords[futureSegIdx], routeCoords[futureSegIdx + 1]);
    accDist += segLen;
    lookAheadBearing = calculateBearing(routeCoords[futureSegIdx], routeCoords[futureSegIdx + 1]);
  }

  // 4. Guía de maniobras a través del Grafo y la Máquina de Estados (Maneuver Guidance GSM)
  const effectivePlan = plan ?? buildRouteNavigationPlan(routeCoords);
  const effectiveGsm = guidanceStateMachine ?? new ManeuverGuidanceStateMachine();

  const turn = effectiveGsm.updateProgress(
    effectivePlan,
    distanceAlongRoute,
    speedMps,
    bestBearing,
    isOffRoute,
  );

  const progress: RouteProgress = {
    currentSegmentIndex: bestIndex,
    progressAlongSegment: bestFraction,
    distanceAlongRoute,
    distanceFromRoute: bestDist,
    isOffRoute,
    remainingDistance: remainingDist,
    routeBearing: bestBearing,
    lookAheadBearing,
    closestPoint: bestClosestPoint ?? routeCoords[bestIndex],
  };

  return { progress, turn };
}
