import type { RouteCoordinate } from '../utils/directions';

const EARTH_RADIUS_METERS = 6371000;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Normaliza cualquier ángulo a [0, 360) grados.
 */
export function normalizeHeading(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let normalized = deg % 360;
  if (normalized < 0) normalized += 360;
  if (normalized >= 359.9999 || Math.abs(normalized - 360) < 0.0001 || Object.is(normalized, -0) || normalized === 0) {
    return 0;
  }
  return normalized;
}

/**
 * Retorna la diferencia angular más corta en [-180, 180] entre dos rumbos.
 * Positivo = giro horario (derecha), Negativo = giro antihorario (izquierda).
 */
export function shortestAngularDelta(from: number, to: number): number {
  const normFrom = normalizeHeading(from);
  const normTo = normalizeHeading(to);
  let diff = ((normTo - normFrom) % 360 + 540) % 360 - 180;
  if (diff === -180 && normTo >= normFrom) diff = 180;
  return diff;
}

/**
 * Calcula la distancia ortodrómica exacta (Haversine) en metros entre dos coordenadas.
 */
export function getDistanceMeters(p1: RouteCoordinate, p2: RouteCoordinate): number {
  const lat1Rad = toRadians(p1.latitude);
  const lat2Rad = toRadians(p2.latitude);
  const dLat = toRadians(p2.latitude - p1.latitude);
  const dLon = toRadians(p2.longitude - p1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calcula el rumbo geográfico (bearing) en grados [0, 360) desde p1 hacia p2.
 */
export function calculateBearing(from: RouteCoordinate, to: RouteCoordinate): number {
  const lat1Rad = toRadians(from.latitude);
  const lat2Rad = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const brngRad = Math.atan2(y, x);
  return normalizeHeading(toDegrees(brngRad));
}

/**
 * Calcula un punto proyectado a partir de un origen, distancia en metros y rumbo.
 */
export function destinationPoint(
  origin: RouteCoordinate,
  distanceMeters: number,
  bearingDegrees: number,
): RouteCoordinate {
  if (distanceMeters === 0) {
    return { latitude: origin.latitude, longitude: origin.longitude };
  }

  const angularDist = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRad = toRadians(bearingDegrees);
  const lat1Rad = toRadians(origin.latitude);
  const lon1Rad = toRadians(origin.longitude);

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDist) +
      Math.cos(lat1Rad) * Math.sin(angularDist) * Math.cos(bearingRad),
  );

  const lon2Rad =
    lon1Rad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(lat1Rad),
      Math.cos(angularDist) - Math.sin(lat1Rad) * Math.sin(lat2Rad),
    );

  const lat2 = toDegrees(lat2Rad);
  const lon2 = ((toDegrees(lon2Rad) + 540) % 360) - 180;

  return {
    latitude: lat2,
    longitude: lon2,
  };
}

export interface SegmentProjection {
  closestPoint: RouteCoordinate;
  distanceMeters: number;
  fraction: number; // 0..1
  segmentBearing: number;
}

/**
 * Proyecta un punto sobre un segmento de calle (segStart -> segEnd).
 */
export function projectPointOnSegment(
  point: RouteCoordinate,
  segStart: RouteCoordinate,
  segEnd: RouteCoordinate,
): SegmentProjection {
  const segLength = getDistanceMeters(segStart, segEnd);
  const segmentBearing = calculateBearing(segStart, segEnd);

  if (segLength < 0.1) {
    return {
      closestPoint: { ...segStart },
      distanceMeters: getDistanceMeters(point, segStart),
      fraction: 0,
      segmentBearing,
    };
  }

  const midLatRad = toRadians((segStart.latitude + segEnd.latitude) / 2);
  const metersPerDegreeLat = 111132.954;
  const metersPerDegreeLng = 111412.84 * Math.cos(midLatRad);

  const ax = segStart.longitude * metersPerDegreeLng;
  const ay = segStart.latitude * metersPerDegreeLat;
  const bx = segEnd.longitude * metersPerDegreeLng;
  const by = segEnd.latitude * metersPerDegreeLat;
  const px = point.longitude * metersPerDegreeLng;
  const py = point.latitude * metersPerDegreeLat;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const abSq = abx * abx + aby * aby;
  let t = (apx * abx + apy * aby) / abSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = segStart.latitude + t * (segEnd.latitude - segStart.latitude);
  const projLng = segStart.longitude + t * (segEnd.longitude - segStart.longitude);

  const closestPoint: RouteCoordinate = { latitude: projLat, longitude: projLng };
  const distanceMeters = getDistanceMeters(point, closestPoint);

  return {
    closestPoint,
    distanceMeters,
    fraction: t,
    segmentBearing,
  };
}

/**
 * Suavizado exponencial (EMA) a través de la ruta angular más corta.
 * alpha: 0 = conserva prev, 1 = usa target instantáneamente.
 */
export function smoothHeadingEMA(
  prevHeading: number,
  targetHeading: number,
  alpha: number = 0.25,
): number {
  const delta = shortestAngularDelta(prevHeading, targetHeading);
  return normalizeHeading(prevHeading + delta * Math.min(1, Math.max(0, alpha)));
}
