import type { TurnAnalysis } from './types';
import { SMART_NAV_CONSTANTS } from './types';

/**
 * Calcula el nivel de zoom adaptativo continuo en función de la velocidad y giros próximos.
 */
export function calculateAdaptiveZoom(
  speedMps: number,
  turnAnalysis: TurnAnalysis | null,
  lastAppliedZoom: number = SMART_NAV_CONSTANTS.BASE_ZOOM,
): number {
  let targetZoom = SMART_NAV_CONSTANTS.BASE_ZOOM; // 18.0

  if (speedMps > SMART_NAV_CONSTANTS.HIGHWAY_SPEED_THRESHOLD_MPS) {
    // Autopista (> 90 km/h) -> zoom más amplio ~16.2
    targetZoom = 16.2;
  } else if (speedMps > SMART_NAV_CONSTANTS.CITY_SPEED_THRESHOLD_MPS) {
    // Vía rápida urbana (50 - 90 km/h) -> ~16.8 - 17.2
    const factor = (speedMps - SMART_NAV_CONSTANTS.CITY_SPEED_THRESHOLD_MPS) /
      (SMART_NAV_CONSTANTS.HIGHWAY_SPEED_THRESHOLD_MPS - SMART_NAV_CONSTANTS.CITY_SPEED_THRESHOLD_MPS);
    targetZoom = 17.3 - factor * 0.8;
  } else if (speedMps > SMART_NAV_CONSTANTS.STATIONARY_SPEED_THRESHOLD_MPS) {
    // Tráfico urbano lento (< 50 km/h) -> ~17.5 - 18.0
    const factor = speedMps / SMART_NAV_CONSTANTS.CITY_SPEED_THRESHOLD_MPS;
    targetZoom = 18.0 - factor * 0.7;
  } else {
    // Detenido -> 18.0
    targetZoom = 18.0;
  }

  // Si hay un giro inminente cercano (< 35m), acercar levemente el zoom para clarificar la maniobra
  if (turnAnalysis && turnAnalysis.turnDetected && turnAnalysis.distanceToTurn < 35) {
    targetZoom = Math.min(18.0, targetZoom + 0.35);
  }

  // Histeresis y suavizado para evitar zoom pumping
  const zoomDelta = targetZoom - lastAppliedZoom;
  if (Math.abs(zoomDelta) < SMART_NAV_CONSTANTS.ZOOM_DEADBAND) {
    return lastAppliedZoom; // Mantiene el zoom actual dentro de la banda muerta
  }

  // Interpola suavemente con un factor de 0.2
  return lastAppliedZoom + zoomDelta * 0.25;
}
