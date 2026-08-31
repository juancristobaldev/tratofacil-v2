import type { NavigationMotionSample, MotionEstimate, GpsQuality } from './types';
import { SMART_NAV_CONSTANTS } from './types';
import { getDistanceMeters } from './geoMathCore';
import { isValidGeoCoordinate } from '../utils/directions';

/**
 * Clasifica la calidad del sample de GPS según precisión y validez física.
 */
export function classifyGpsQuality(sample: NavigationMotionSample): GpsQuality {
  if (
    !sample ||
    !sample.coordinate ||
    !isValidGeoCoordinate(sample.coordinate) ||
    !Number.isFinite(sample.timestamp) ||
    sample.timestamp <= 0
  ) {
    return 'INVALID';
  }

  const accuracy = sample.accuracy;
  if (accuracy == null || !Number.isFinite(accuracy)) {
    return sample.source === 'REMOTE_TRACKING' ? 'GOOD' : 'DEGRADED';
  }

  if (accuracy < 0) return 'INVALID';
  if (accuracy <= 10) return 'EXCELLENT';
  if (accuracy <= 25) return 'GOOD';
  if (accuracy <= 50) return 'DEGRADED';
  return 'POOR';
}

/**
 * Evalúa si una muestra representa un salto de teleport físicamente improbable.
 */
export function isTeleportJump(
  prevSample: NavigationMotionSample | null,
  currentSample: NavigationMotionSample,
): { isTeleport: boolean; impliedSpeedMps: number; distanceMeters: number } {
  if (!prevSample) {
    return { isTeleport: false, impliedSpeedMps: 0, distanceMeters: 0 };
  }

  const dtSec = Math.max(0.1, (currentSample.timestamp - prevSample.timestamp) / 1000);
  const distanceMeters = getDistanceMeters(prevSample.coordinate, currentSample.coordinate);
  const impliedSpeedMps = distanceMeters / dtSec;

  // Si la velocidad implícita supera 55 m/s (~198 km/h) y no hay reporte explícito de alta velocidad con excelente precisión
  const isTeleport =
    impliedSpeedMps > SMART_NAV_CONSTANTS.MAX_PHYSICAL_SPEED_MPS &&
    (currentSample.accuracy == null || currentSample.accuracy > 15);

  return { isTeleport, impliedSpeedMps, distanceMeters };
}

export interface PositionFilterResult {
  accepted: boolean;
  estimate: MotionEstimate;
  reason: string;
}

/**
 * Filtra el ruido de GPS, rechaza teleports y estabiliza la coordenada cuando el vehículo está detenido.
 */
export function filterGpsPosition(
  lastEstimate: MotionEstimate | null,
  currentSample: NavigationMotionSample,
  lastSample: NavigationMotionSample | null,
): PositionFilterResult {
  const quality = classifyGpsQuality(currentSample);
  if (quality === 'INVALID') {
    return {
      accepted: false,
      estimate: lastEstimate ?? {
        coordinate: currentSample.coordinate,
        speedMps: 0,
        isStationary: true,
        quality: 'INVALID',
        heading: 0,
        headingConfidence: 0,
        timestamp: currentSample.timestamp,
      },
      reason: 'INVALID_COORDINATES',
    };
  }

  // 1. Detección de Teleport
  const teleportCheck = isTeleportJump(lastSample, currentSample);
  if (teleportCheck.isTeleport && lastEstimate) {
    // Rechaza el salto brusco pero actualiza métricas
    return {
      accepted: false,
      estimate: {
        ...lastEstimate,
        quality: 'POOR',
        headingConfidence: Math.max(0, lastEstimate.headingConfidence - 0.3),
        timestamp: currentSample.timestamp,
      },
      reason: `TELEPORT_REJECTED_SPEED_${teleportCheck.impliedSpeedMps.toFixed(1)}MPS`,
    };
  }

  // 2. Estimación de velocidad
  let speedMps = 0;
  if (currentSample.speed != null && Number.isFinite(currentSample.speed) && currentSample.speed >= 0) {
    speedMps = currentSample.speed;
  } else if (lastSample) {
    const dtSec = Math.max(0.1, (currentSample.timestamp - lastSample.timestamp) / 1000);
    const dist = getDistanceMeters(lastSample.coordinate, currentSample.coordinate);
    speedMps = dist / dtSec;
  }

  const isStationary = speedMps < SMART_NAV_CONSTANTS.STATIONARY_SPEED_THRESHOLD_MPS;

  // 3. Estabilización en modo estacionario (evita que el jitter de +/-3m mueva la cámara)
  if (isStationary && lastEstimate) {
    const distFromLast = getDistanceMeters(lastEstimate.coordinate, currentSample.coordinate);
    if (distFromLast < 3.5) {
      return {
        accepted: true,
        estimate: {
          coordinate: lastEstimate.coordinate, // conserva posición previa fija
          speedMps: 0,
          isStationary: true,
          quality,
          heading: lastEstimate.heading,
          headingConfidence: lastEstimate.headingConfidence,
          timestamp: currentSample.timestamp,
        },
        reason: 'STATIONARY_STABILIZED',
      };
    }
  }

  // 4. Suavizado adaptativo de posición cuando está en movimiento
  let filteredLat = currentSample.coordinate.latitude;
  let filteredLng = currentSample.coordinate.longitude;

  if (lastEstimate && !isStationary) {
    const alpha = quality === 'EXCELLENT' ? 0.85 : quality === 'GOOD' ? 0.70 : 0.45;
    filteredLat = lastEstimate.coordinate.latitude + alpha * (currentSample.coordinate.latitude - lastEstimate.coordinate.latitude);
    filteredLng = lastEstimate.coordinate.longitude + alpha * (currentSample.coordinate.longitude - lastEstimate.coordinate.longitude);
  }

  const rawHeading = currentSample.heading;
  const hasValidRawHeading = rawHeading != null && Number.isFinite(rawHeading) && rawHeading >= 0;
  const heading = hasValidRawHeading ? rawHeading : (lastEstimate?.heading ?? 0);
  const headingConfidence = hasValidRawHeading ? (isStationary ? 0.4 : 0.9) : (lastEstimate?.headingConfidence ?? 0.2);

  return {
    accepted: true,
    estimate: {
      coordinate: { latitude: filteredLat, longitude: filteredLng },
      speedMps,
      isStationary,
      quality,
      heading,
      headingConfidence,
      timestamp: currentSample.timestamp,
    },
    reason: 'POSITION_ACCEPTED',
  };
}
