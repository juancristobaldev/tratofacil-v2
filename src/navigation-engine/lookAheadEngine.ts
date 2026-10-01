import type { RouteCoordinate } from '../utils/directions';
import type { RouteProgress, TurnAnalysis } from './types';
import { destinationPoint, getDistanceMeters } from './geoMathCore';

export interface LookAheadResult {
  cameraCenter: RouteCoordinate;
  lookAheadDistanceMeters: number;
}

/**
 * Calcula el punto focal de la cámara proyectado hacia adelante (Look-Ahead)
 * para mostrar mayor porción de calzada en la dirección de avance vehicular.
 */
export function calculateCameraLookAhead(
  currentCoord: RouteCoordinate,
  heading: number,
  speedMps: number,
  routeProgress: RouteProgress | null,
  turnAnalysis: TurnAnalysis | null,
  routeCoords?: RouteCoordinate[] | null,
): LookAheadResult {
  // 1. Distancia base de proyección según velocidad (m/s) para perspectiva 65°
  // 0 km/h (0 m/s) -> 18m (despeje óptimo sobre panel inferior)
  // 36 km/h (10 m/s) -> 31.5m
  // 72 km/h (20 m/s) -> 45m
  // 108 km/h (30 m/s) -> 55m
  let baseDistance = 18 + Math.min(37, speedMps * 1.35);

  // 2. Si hay un giro inminente cercano (< 30m), contraer la proyección para mantener el cruce centrado
  if (turnAnalysis && turnAnalysis.turnDetected && turnAnalysis.distanceToTurn < 30) {
    const turnProximityFactor = Math.max(0.4, turnAnalysis.distanceToTurn / 30);
    baseDistance *= turnProximityFactor;
  }

  // 3. Proyección a lo largo de la polyline si estamos en ruta
  if (
    routeProgress &&
    !routeProgress.isOffRoute &&
    routeCoords &&
    routeCoords.length >= 2
  ) {
    let remainingToProject = baseDistance;
    let currIndex = routeProgress.currentSegmentIndex;
    let currPoint = currentCoord;

    while (remainingToProject > 0 && currIndex < routeCoords.length - 1) {
      const segEnd = routeCoords[currIndex + 1];
      const distToEnd = getDistanceMeters(currPoint, segEnd);

      if (remainingToProject <= distToEnd) {
        // El punto cae en este segmento
        const fraction = remainingToProject / Math.max(0.1, distToEnd);
        const lat = currPoint.latitude + fraction * (segEnd.latitude - currPoint.latitude);
        const lng = currPoint.longitude + fraction * (segEnd.longitude - currPoint.longitude);
        return {
          cameraCenter: { latitude: lat, longitude: lng },
          lookAheadDistanceMeters: baseDistance,
        };
      }

      remainingToProject -= distToEnd;
      currIndex++;
      currPoint = segEnd;
    }

    return {
      cameraCenter: currPoint,
      lookAheadDistanceMeters: baseDistance,
    };
  }

  // 4. Proyección ortodrómica directa basada en heading cuando no hay ruta o estamos off-route
  const cameraCenter = destinationPoint(currentCoord, baseDistance, heading);
  return {
    cameraCenter,
    lookAheadDistanceMeters: baseDistance,
  };
}
