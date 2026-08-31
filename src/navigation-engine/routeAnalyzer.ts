import type { RouteCoordinate } from '../utils/directions';
import type { RouteProgress, TurnAnalysis, TurnType } from './types';
import { SMART_NAV_CONSTANTS } from './types';
import {
  getDistanceMeters,
  calculateBearing,
  projectPointOnSegment,
  shortestAngularDelta,
  normalizeHeading,
  smoothHeadingEMA,
} from './geoMathCore';

export interface RouteAnalysisResult {
  progress: RouteProgress;
  turn: TurnAnalysis;
}

/**
 * Analiza la posición del vehículo en relación a la polyline de ruta.
 * Encuentra el segmento más cercano, mide el progreso, calcula el rumbo de la calzada
 * y detecta giros futuros con anticipación continua.
 */
export function analyzeRouteProgress(
  coordinate: RouteCoordinate,
  routeCoords: RouteCoordinate[] | null | undefined,
  speedMps: number,
  lastSegmentIndex: number = 0,
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
    }
  }

  // Si la distancia es alta (> 40m), realiza un barrido completo por seguridad
  if (bestDist > 40) {
    for (let i = 0; i < numSegments; i++) {
      if (i >= startIdx && i < endIdx) continue;
      const proj = projectPointOnSegment(coordinate, routeCoords[i], routeCoords[i + 1]);
      if (proj.distanceMeters < bestDist) {
        bestDist = proj.distanceMeters;
        bestIndex = i;
        bestFraction = proj.fraction;
        bestBearing = proj.segmentBearing;
      }
    }
  }

  const isOffRoute = bestDist > SMART_NAV_CONSTANTS.OFF_ROUTE_DISTANCE_THRESHOLD_METERS;

  // 2. Calcular distancia restante a lo largo de la polyline
  let remainingDist = 0;
  const currentSegLength = getDistanceMeters(routeCoords[bestIndex], routeCoords[bestIndex + 1]);
  remainingDist += (1 - bestFraction) * currentSegLength;

  for (let i = bestIndex + 1; i < numSegments; i++) {
    remainingDist += getDistanceMeters(routeCoords[i], routeCoords[i + 1]);
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

  // 4. Detección de giros próximos (Turn Detection & Anticipation)
  let turnDetected = false;
  let turnType: TurnType = 'STRAIGHT';
  let deltaAngle = 0;
  let distanceToTurn = Infinity;
  let timeToTurnSec = Infinity;
  let blendedHeading = bestBearing;

  let accumulatedDistToTurn = (1 - bestFraction) * currentSegLength;

  for (let i = bestIndex + 1; i < numSegments; i++) {
    const prevSegBearing = calculateBearing(routeCoords[i - 1], routeCoords[i]);
    const nextSegBearing = calculateBearing(routeCoords[i], routeCoords[i + 1]);
    const turnAngle = shortestAngularDelta(prevSegBearing, nextSegBearing);

    if (Math.abs(turnAngle) >= 20) {
      turnDetected = true;
      deltaAngle = turnAngle;
      distanceToTurn = accumulatedDistToTurn;
      const safeSpeed = Math.max(2.0, speedMps);
      timeToTurnSec = distanceToTurn / safeSpeed;

      const absAngle = Math.abs(turnAngle);
      if (absAngle >= 150) {
        turnType = 'U_TURN';
      } else if (absAngle >= 75) {
        turnType = 'SHARP_TURN';
      } else if (absAngle >= 45) {
        turnType = 'TURN';
      } else {
        turnType = 'SOFT_CURVE';
      }

      // Blending progresivo de rumbo según proximidad al giro
      // Si está a < 35 metros o < 3.5 segundos del giro, comienza la anticipación suave
      if (distanceToTurn < 40 || timeToTurnSec < 3.5) {
        const proximityWeight = Math.max(0, Math.min(0.65, 1 - distanceToTurn / 40));
        blendedHeading = smoothHeadingEMA(bestBearing, nextSegBearing, proximityWeight);
      }
      break;
    }

    accumulatedDistToTurn += getDistanceMeters(routeCoords[i], routeCoords[i + 1]);
    if (accumulatedDistToTurn > 150) break; // Límite de horizonte de anticipación
  }

  const progress: RouteProgress = {
    currentSegmentIndex: bestIndex,
    progressAlongSegment: bestFraction,
    distanceAlongRoute: 0,
    distanceFromRoute: bestDist,
    isOffRoute,
    remainingDistance: remainingDist,
    routeBearing: bestBearing,
    lookAheadBearing,
  };

  const turn: TurnAnalysis = {
    turnDetected,
    turnType,
    deltaAngle,
    distanceToTurn,
    timeToTurnSec,
    blendedHeading,
  };

  return { progress, turn };
}
