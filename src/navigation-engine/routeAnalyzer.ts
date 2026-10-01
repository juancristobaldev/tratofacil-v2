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
  const MAX_TURN_HORIZON_METERS = 500;

  for (let i = bestIndex + 1; i < numSegments; i++) {
    const prevSegBearing = calculateBearing(routeCoords[i - 1], routeCoords[i]);
    const nextSegBearing = calculateBearing(routeCoords[i], routeCoords[i + 1]);
    const turnAngle = shortestAngularDelta(prevSegBearing, nextSegBearing);

    let effectiveAngle = turnAngle;

    // Si el giro individual no alcanza 20°, verificar si es una curva continua subdividida
    // agregando los deltas angulares sucesivos dentro de una ventana corta (<= 35m)
    if (Math.abs(effectiveAngle) < 20 && Math.abs(effectiveAngle) >= 8) {
      let cumulativeDelta = turnAngle;
      let clusterDist = 0;
      for (let j = i + 1; j < numSegments && clusterDist < 35; j++) {
        const segLen = getDistanceMeters(routeCoords[j], routeCoords[j + 1]);
        clusterDist += segLen;
        const b1 = calculateBearing(routeCoords[j - 1], routeCoords[j]);
        const b2 = calculateBearing(routeCoords[j], routeCoords[j + 1]);
        const subDelta = shortestAngularDelta(b1, b2);
        if (Math.sign(subDelta) === Math.sign(cumulativeDelta)) {
          cumulativeDelta += subDelta;
        } else {
          break;
        }
      }
      if (Math.abs(cumulativeDelta) >= 20) {
        effectiveAngle = cumulativeDelta;
      }
    }

    if (Math.abs(effectiveAngle) >= 20) {
      turnDetected = true;
      deltaAngle = effectiveAngle;
      distanceToTurn = Math.max(0, accumulatedDistToTurn);
      const safeSpeed = Math.max(2.0, speedMps);
      timeToTurnSec = distanceToTurn / safeSpeed;

      const absAngle = Math.abs(effectiveAngle);
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
      // Si está a < 40 metros o < 3.5 segundos del giro, comienza la anticipación suave
      if (distanceToTurn < 40 || timeToTurnSec < 3.5) {
        const proximityWeight = Math.max(0, Math.min(0.65, 1 - distanceToTurn / 40));
        blendedHeading = smoothHeadingEMA(bestBearing, nextSegBearing, proximityWeight);
      }
      break;
    }

    accumulatedDistToTurn += getDistanceMeters(routeCoords[i], routeCoords[i + 1]);
    if (accumulatedDistToTurn > MAX_TURN_HORIZON_METERS) break; // Horizonte amplio de 500m
  }

  let distanceAlongRoute = bestFraction * currentSegLength;
  for (let i = 0; i < bestIndex; i++) {
    distanceAlongRoute += getDistanceMeters(routeCoords[i], routeCoords[i + 1]);
  }

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
