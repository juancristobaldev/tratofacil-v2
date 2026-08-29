export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calcula la distancia en metros entre dos coordenadas geográficas (Haversine).
 */
export function getDistanceMeters(p1: GeoPoint, p2: GeoPoint): number {
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
 * 0° = Norte, 90° = Este, 180° = Sur, 270° = Oeste.
 */
export function calculateBearing(from: GeoPoint, to: GeoPoint): number {
  const lat1Rad = toRadians(from.latitude);
  const lat2Rad = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const brngRad = Math.atan2(y, x);
  return (toDegrees(brngRad) + 360) % 360;
}

/**
 * Calcula la coordenada destino a partir de un punto de origen, una distancia en metros
 * y un rumbo (bearing) en grados.
 */
export function destinationPoint(
  origin: GeoPoint,
  distanceMeters: number,
  bearingDegrees: number,
): GeoPoint {
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
  const lon2 = ((toDegrees(lon2Rad) + 540) % 360) - 180; // Normaliza a [-180, 180]

  return {
    latitude: lat2,
    longitude: lon2,
  };
}

/**
 * Retorna la diferencia angular más corta en grados [-180, 180] entre dos rumbos.
 */
export function normalizeAngleDiff(angle1: number, angle2: number): number {
  let diff = (angle1 - angle2 + 180) % 360 - 180;
  if (diff < -180) diff += 360;
  return diff;
}

export interface SegmentProjection {
  closestPoint: GeoPoint;
  distanceMeters: number;
  fraction: number; // 0..1 a lo largo del segmento
  segmentBearing: number;
}

/**
 * Proyecta un punto sobre un segmento de calle definido por segStart y segEnd.
 * Retorna el punto más cercano en el segmento y la distancia en metros.
 */
export function projectPointOnSegment(
  point: GeoPoint,
  segStart: GeoPoint,
  segEnd: GeoPoint,
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

  // Conversión plana local para alta precisión en distancias cortas (< 5km)
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

  const closestPoint: GeoPoint = { latitude: projLat, longitude: projLng };
  const distanceMeters = getDistanceMeters(point, closestPoint);

  return {
    closestPoint,
    distanceMeters,
    fraction: t,
    segmentBearing,
  };
}
