import type { NavigationMotionSample, MotionEstimate, RouteProgress, TurnAnalysis } from './types';
import {
  calculateBearing,
  getDistanceMeters,
  smoothHeadingEMA,
  shortestAngularDelta,
  normalizeHeading,
} from './geoMathCore';

export interface HeadingFusionResult {
  targetHeading: number;
  confidence: number;
  source: 'GPS_COURSE' | 'ROUTE_BEARING' | 'TURN_ANTICIPATION' | 'REMOTE_MOTION' | 'LAST_RELIABLE';
}

/**
 * Motor de fusión adaptativa de rumbo.
 * Combina señales de GPS, rumbo vehicular, geometría de ruta y anticipación de giros.
 */
export function fuseNavigationHeading(
  sample: NavigationMotionSample,
  estimate: MotionEstimate,
  routeProgress: RouteProgress | null,
  turnAnalysis: TurnAnalysis | null,
  lastReliableHeading: number,
  lastSample: NavigationMotionSample | null,
): HeadingFusionResult {
  // 1. Caso Estacionario: Si el vehículo está detenido, congela la orientación en lastReliableHeading
  if (estimate.isStationary) {
    return {
      targetHeading: lastReliableHeading,
      confidence: 0.8,
      source: 'LAST_RELIABLE',
    };
  }

  // 2. Caso Seguimiento Remoto (Remote Vehicle Tracking / Focus Client)
  if (sample.source === 'REMOTE_TRACKING') {
    if (lastSample) {
      const movedDist = getDistanceMeters(lastSample.coordinate, sample.coordinate);
      if (movedDist >= 2.5) {
        const motionBearing = calculateBearing(lastSample.coordinate, sample.coordinate);
        const alpha = lastReliableHeading === 0 ? 1.0 : 0.45;
        const smoothed = smoothHeadingEMA(lastReliableHeading, motionBearing, alpha);
        return {
          targetHeading: smoothed,
          confidence: 0.75,
          source: 'REMOTE_MOTION',
        };
      }
    }
    // Si el desplazamiento remoto es insignificante (< 2.5m), mantiene el rumbo previo
    return {
      targetHeading: lastReliableHeading,
      confidence: 0.7,
      source: 'LAST_RELIABLE',
    };
  }

  // 3. Caso Giro Próximo Detectado (Turn Anticipation)
  if (
    turnAnalysis &&
    turnAnalysis.turnDetected &&
    (turnAnalysis.distanceToTurn < 35 || turnAnalysis.timeToTurnSec < 3.0) &&
    routeProgress &&
    !routeProgress.isOffRoute
  ) {
    const smoothed = smoothHeadingEMA(lastReliableHeading, turnAnalysis.blendedHeading, 0.4);
    return {
      targetHeading: smoothed,
      confidence: 0.9,
      source: 'TURN_ANTICIPATION',
    };
  }

  // 4. Caso En Ruta a velocidad normal (Combina rumbo de calzada con rumbo GPS)
  if (routeProgress && !routeProgress.isOffRoute) {
    const rawHeading = sample.heading;
    const hasGpsHeading = rawHeading != null && Number.isFinite(rawHeading) && rawHeading >= 0;

    if (hasGpsHeading && estimate.speedMps > 4.0 && (estimate.quality === 'EXCELLENT' || estimate.quality === 'GOOD')) {
      // A velocidad rápida, el rumbo GPS tiene alta fiabilidad, pero se mezcla con la calzada para eliminar micro-oscilaciones
      const roadDiff = shortestAngularDelta(routeProgress.routeBearing, rawHeading);
      if (Math.abs(roadDiff) < 30) {
        const fused = smoothHeadingEMA(routeProgress.routeBearing, rawHeading, 0.5);
        const smoothed = smoothHeadingEMA(lastReliableHeading, fused, 0.3);
        return {
          targetHeading: smoothed,
          confidence: 0.95,
          source: 'GPS_COURSE',
        };
      }
    }

    // A velocidad media/baja en ruta, el rumbo de la calzada es la señal más limpia
    const smoothed = smoothHeadingEMA(lastReliableHeading, routeProgress.routeBearing, 0.35);
    return {
      targetHeading: smoothed,
      confidence: 0.9,
      source: 'ROUTE_BEARING',
    };
  }

  // 5. Caso Fuera de Ruta / Navegación Libre (Off-Route / No Route)
  const rawHeading = sample.heading;
  if (rawHeading != null && Number.isFinite(rawHeading) && rawHeading >= 0) {
    const alpha = (lastReliableHeading === 0 && estimate.speedMps > 2.0) ? 1.0 : 0.35;
    const smoothed = smoothHeadingEMA(lastReliableHeading, rawHeading, alpha);
    return {
      targetHeading: smoothed,
      confidence: estimate.quality === 'EXCELLENT' ? 0.9 : 0.6,
      source: 'GPS_COURSE',
    };
  }

  // Fallback si no hay rumbo válido
  return {
    targetHeading: lastReliableHeading,
    confidence: 0.4,
    source: 'LAST_RELIABLE',
  };
}
