import type { RouteCoordinate } from '../utils/directions';
import type { TurnType } from './types';
import {
  getDistanceMeters,
  calculateBearing,
  shortestAngularDelta,
} from './geoMathCore';

export interface RouteManeuver {
  id: string;
  vertexIndex: number; // Índice en routeCoords donde se ubica el vértice
  coordinate: RouteCoordinate;
  turnType: TurnType;
  deltaAngle: number; // Grados con signo [-180, 180]
  entryBearing: number;
  exitBearing: number;
  distanceAlongRoute: number; // Metros acumulados desde el inicio de la ruta hasta este vértice
  instruction: string;
}

export interface RouteNavigationPlan {
  routeCoords: RouteCoordinate[];
  totalDistanceMeters: number;
  maneuvers: RouteManeuver[];
  cumulativeDistances: number[]; // Distancia acumulada desde el inicio hasta cada vértice i [0..N-1]
}

export function classifyTurnType(deltaAngle: number): TurnType {
  const absAngle = Math.abs(deltaAngle);
  if (absAngle >= 150) return 'U_TURN';
  if (absAngle >= 75) return 'SHARP_TURN';
  if (absAngle >= 45) return 'TURN';
  if (absAngle >= 20) return 'SOFT_CURVE';
  return 'STRAIGHT';
}

export function getManeuverInstruction(turnType: TurnType, deltaAngle: number): string {
  const isRight = deltaAngle > 0;
  switch (turnType) {
    case 'U_TURN':
      return 'Retorno en U';
    case 'SHARP_TURN':
      return isRight ? 'Curva cerrada a la derecha' : 'Curva cerrada a la izquierda';
    case 'TURN':
      return isRight ? 'Gire a la derecha' : 'Gire a la izquierda';
    case 'SOFT_CURVE':
      return isRight ? 'Curva suave a la derecha' : 'Curva suave a la izquierda';
    case 'STRAIGHT':
    default:
      return 'Continúe recto';
  }
}

/**
 * Pre-indexa una polyline de ruta en un grafo inmutable de maniobras y distancias acumuladas.
 * Se ejecuta una sola vez cuando la ruta es cargada o actualizada por el motor de routing.
 */
export function buildRouteNavigationPlan(
  routeCoords: RouteCoordinate[] | null | undefined,
): RouteNavigationPlan | null {
  if (!routeCoords || routeCoords.length < 2) {
    return null;
  }

  const numPoints = routeCoords.length;
  const cumulativeDistances: number[] = new Array(numPoints).fill(0);
  let totalDist = 0;

  for (let i = 1; i < numPoints; i++) {
    const segDist = getDistanceMeters(routeCoords[i - 1], routeCoords[i]);
    totalDist += segDist;
    cumulativeDistances[i] = totalDist;
  }

  const maneuvers: RouteManeuver[] = [];
  const numSegments = numPoints - 1;

  // Analiza vértices intermedios [1 .. numPoints - 2] para detectar cambios de calzada y giros
  for (let i = 1; i < numSegments; i++) {
    const prevSegBearing = calculateBearing(routeCoords[i - 1], routeCoords[i]);
    const nextSegBearing = calculateBearing(routeCoords[i], routeCoords[i + 1]);
    const turnAngle = shortestAngularDelta(prevSegBearing, nextSegBearing);

    let effectiveAngle = turnAngle;

    // Manejo de curvas continuas subdivididas (clustering en ventana corta <= 35m)
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
      const turnType = classifyTurnType(effectiveAngle);
      const instruction = getManeuverInstruction(turnType, effectiveAngle);

      maneuvers.push({
        id: `maneuver_${i}_${Math.round(effectiveAngle)}`,
        vertexIndex: i,
        coordinate: routeCoords[i],
        turnType,
        deltaAngle: effectiveAngle,
        entryBearing: prevSegBearing,
        exitBearing: nextSegBearing,
        distanceAlongRoute: cumulativeDistances[i],
        instruction,
      });

      // Si la maniobra involucró una curva subdividida, salta vértices redundantes
      // que formen parte de la misma curvatura inmediata
      let skipDist = 0;
      while (i + 1 < numSegments && skipDist < 25) {
        const nextDist = getDistanceMeters(routeCoords[i], routeCoords[i + 1]);
        skipDist += nextDist;
        const bNext1 = calculateBearing(routeCoords[i], routeCoords[i + 1]);
        const bNext2 = calculateBearing(routeCoords[i + 1], routeCoords[i + 2]);
        const nextDelta = shortestAngularDelta(bNext1, bNext2);
        if (Math.abs(nextDelta) < 15 && Math.sign(nextDelta) === Math.sign(effectiveAngle)) {
          i++;
        } else {
          break;
        }
      }
    }
  }

  return {
    routeCoords,
    totalDistanceMeters: totalDist,
    maneuvers,
    cumulativeDistances,
  };
}
