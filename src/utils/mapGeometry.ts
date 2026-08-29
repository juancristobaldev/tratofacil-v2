import type { RouteCoordinate } from './directions';
import { isValidGeoCoordinate } from './directions';

export interface BoundingBox {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  centerLatitude: number;
  centerLongitude: number;
}

export interface UsableMapRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface SafeMapRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface DynamicPaddingParams {
  windowWidth: number;
  windowHeight: number;
  headerBottom: number;
  sheetTop: number | null;
  bottomNavHeight?: number;
  topSafety?: number;
  bottomSafety?: number;
  horizontalPadding?: number;
}

export interface DynamicEdgePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface UsableMapRectParams {
  windowWidth: number;
  windowHeight: number;
  headerBottom: number;
  sheetTop: number | null;
  bottomNavHeight?: number;
  horizontalSafety?: number;
  verticalSafety?: number;
}

export const DEFAULT_TEMUCO_PLC_REGION = {
  latitude: -38.7530,
  longitude: -72.5950,
  latitudeDelta: 0.098,
  longitudeDelta: 0.098,
};

export const NAVIGATION_LATITUDE_DELTA = 0.0035;
export const NAVIGATION_LONGITUDE_DELTA = 0.0035;
export const NAVIGATION_PITCH = 60;
export const NAVIGATION_ZOOM_LEVEL = 18;
export const NAVIGATION_ALTITUDE = 300;

export const MIN_LATITUDE_DELTA = 0.003;
export const MIN_LONGITUDE_DELTA = 0.003;
export const DEFAULT_HORIZONTAL_PADDING = 24;
export const DEFAULT_VERTICAL_PADDING = 16;
export const ROUTE_FIT_HORIZONTAL_PADDING = 36;
export const ROUTE_FIT_VERTICAL_PADDING = 48;
export const PROVIDER_PIN_CARD_WIDTH = 180;
export const PROVIDER_PIN_CARD_HEIGHT = 58;
export const FLOATING_CONTROL_CLEARANCE = 20;
export const ROUTE_FIT_TOP_CLEARANCE = 55;
export const ROUTE_FIT_BOTTOM_CLEARANCE = 28;
export const ROUTE_FIT_HORIZONTAL_CLEARANCE = 28;
export const ROUTE_FIT_ZOOM_SCALE = 1.15;
export const ROUTE_CHANGE_ENDPOINT_THRESHOLD_METERS = 20;

export interface AdaptivePolylineWidth {
  strokeWidth: number;
  glowWidth: number;
}

/**
 * Calcula el ancho adaptativo del trazo y halo de la Polyline según el nivel de zoom (latitudeDelta).
 *
 * Niveles:
 * - Zoom muy cercano / calle (latitudeDelta <= 0.003): strokeWidth: 10-11px, glowWidth: 16-17px (cubre la calzada)
 * - Zoom barrio / medio (0.003 < latitudeDelta <= 0.015): strokeWidth: 7-9px, glowWidth: 12-14px
 * - Zoom ciudad / intermedio (0.015 < latitudeDelta <= 0.04): strokeWidth: 5-6px, glowWidth: 9-10px
 * - Zoom amplio / general (latitudeDelta > 0.04): strokeWidth: 4px, glowWidth: 7px
 */
export function getAdaptivePolylineWidth(latitudeDelta?: number | null): AdaptivePolylineWidth {
  if (latitudeDelta == null || !Number.isFinite(latitudeDelta) || latitudeDelta <= 0) {
    return { strokeWidth: 6, glowWidth: 11 };
  }

  if (latitudeDelta <= 0.0025) {
    return { strokeWidth: 11, glowWidth: 17 };
  }
  if (latitudeDelta <= 0.006) {
    return { strokeWidth: 9, glowWidth: 14 };
  }
  if (latitudeDelta <= 0.015) {
    return { strokeWidth: 7, glowWidth: 12 };
  }
  if (latitudeDelta <= 0.04) {
    return { strokeWidth: 5, glowWidth: 9 };
  }
  return { strokeWidth: 4, glowWidth: 7 };
}

function getDistanceMeters(p1: RouteCoordinate, p2: RouteCoordinate): number {
  const R = 6371e3;
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.latitude * Math.PI) / 180) * Math.cos((p2.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Valida y sanitiza una lista de coordenadas geográficas.
 * Descarta valores nulos, indefinidos, NaN, Infinity y coordenadas fuera de los rangos válidos.
 * Elimina duplicados consecutivos idénticos.
 */
export function validateAndSanitizeCoordinates(
  coords: RouteCoordinate[] | null | undefined,
): RouteCoordinate[] {
  if (!Array.isArray(coords) || coords.length === 0) return [];

  const result: RouteCoordinate[] = [];
  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    if (!pt || !isValidGeoCoordinate(pt)) continue;

    const prev = result[result.length - 1];
    if (
      !prev ||
      Math.abs(prev.latitude - pt.latitude) > 1e-6 ||
      Math.abs(prev.longitude - pt.longitude) > 1e-6
    ) {
      result.push({ latitude: pt.latitude, longitude: pt.longitude });
    }
  }

  return result;
}

/**
 * Calcula el BoundingBox geodésico exacto que contiene todos los puntos de la ruta y los pins.
 * Garantiza un delta mínimo para evitar zooms extremos en distancias muy cortas.
 */
export function calculateBoundingBox(
  points: RouteCoordinate[] | null | undefined,
  minDelta?: { latitudeDelta?: number; longitudeDelta?: number },
): BoundingBox | null {
  const sanitized = validateAndSanitizeCoordinates(points);
  if (sanitized.length === 0) return null;

  let minLat = sanitized[0].latitude;
  let maxLat = sanitized[0].latitude;
  let minLng = sanitized[0].longitude;
  let maxLng = sanitized[0].longitude;

  for (let i = 1; i < sanitized.length; i++) {
    const p = sanitized[i];
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }

  const rawLatDelta = maxLat - minLat;
  const rawLngDelta = maxLng - minLng;

  const minLatDelta = minDelta?.latitudeDelta ?? MIN_LATITUDE_DELTA;
  const minLngDelta = minDelta?.longitudeDelta ?? MIN_LONGITUDE_DELTA;

  const latitudeDelta = Math.max(rawLatDelta, minLatDelta);
  const longitudeDelta = Math.max(rawLngDelta, minLngDelta);

  const centerLatitude = (minLat + maxLat) / 2;
  const centerLongitude = (minLng + maxLng) / 2;

  return {
    minLatitude: minLat,
    maxLatitude: maxLat,
    minLongitude: minLng,
    maxLongitude: maxLng,
    latitudeDelta,
    longitudeDelta,
    centerLatitude,
    centerLongitude,
  };
}

/**
 * Evalúa semánticamente si una ruta ha cambiado de forma material
 * (para evitar re-renders o fits innecesarios ante recreaciones de arrays idénticos).
 */
export function isMaterialRouteChange(
  oldPoints: RouteCoordinate[] | null | undefined,
  newPoints: RouteCoordinate[] | null | undefined,
  thresholdMeters: number = ROUTE_CHANGE_ENDPOINT_THRESHOLD_METERS,
): boolean {
  const oldSanitized = validateAndSanitizeCoordinates(oldPoints);
  const newSanitized = validateAndSanitizeCoordinates(newPoints);

  if (oldSanitized.length === 0 && newSanitized.length === 0) return false;
  if (oldSanitized.length === 0 || newSanitized.length === 0) return true;
  if (oldSanitized.length !== newSanitized.length) {
    // Si la cantidad de puntos difiere, comprobar si los extremos se movieron significativamente
    const originMoved = getDistanceMeters(oldSanitized[0], newSanitized[0]) > thresholdMeters;
    const destMoved = getDistanceMeters(
      oldSanitized[oldSanitized.length - 1],
      newSanitized[newSanitized.length - 1],
    ) > thresholdMeters;
    return originMoved || destMoved;
  }

  // Misma longitud: comparar origen, destino y punto medio
  const originDist = getDistanceMeters(oldSanitized[0], newSanitized[0]);
  const destDist = getDistanceMeters(
    oldSanitized[oldSanitized.length - 1],
    newSanitized[newSanitized.length - 1],
  );

  if (originDist > thresholdMeters || destDist > thresholdMeters) {
    return true;
  }

  // Comparar bounding boxes para detectar desvíos intermedios
  const oldBox = calculateBoundingBox(oldSanitized);
  const newBox = calculateBoundingBox(newSanitized);
  if (!oldBox || !newBox) return true;

  const latDrift = Math.abs(oldBox.centerLatitude - newBox.centerLatitude);
  const lngDrift = Math.abs(oldBox.centerLongitude - newBox.centerLongitude);

  return latDrift > 0.001 || lngDrift > 0.001;
}

/**
 * Calcula el rectángulo físico útil (usableMapRect) en coordenadas de pantalla del MapView
 * delimitado por headerBottom en la parte superior y sheetTop (o bottomNavTop) en la inferior.
 */
export function calculateUsableMapRect(params: UsableMapRectParams): UsableMapRect {
  const {
    windowWidth,
    windowHeight,
    headerBottom,
    sheetTop,
    bottomNavHeight = 0,
    horizontalSafety = DEFAULT_HORIZONTAL_PADDING,
    verticalSafety = DEFAULT_VERTICAL_PADDING,
  } = params;

  const top = headerBottom + verticalSafety;

  let physicalBottomLimit: number;
  if (typeof sheetTop === 'number' && Number.isFinite(sheetTop) && sheetTop > 0 && sheetTop < windowHeight) {
    physicalBottomLimit = sheetTop;
  } else {
    physicalBottomLimit = windowHeight - bottomNavHeight;
  }

  const bottom = Math.max(top + 50, physicalBottomLimit - verticalSafety);
  const left = horizontalSafety;
  const right = Math.max(left + 50, windowWidth - horizontalSafety);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Calcula el safeMapRect como una dead-zone interior dentro del usableMapRect.
 * Mientras el marker permanezca dentro de esta zona segura, la cámara omite movimientos innecesarios.
 */
export function calculateSafeMapRect(
  usableRect: UsableMapRect,
  horizontalMarginRatio: number = 0.15,
  verticalMarginRatio: number = 0.15,
): SafeMapRect {
  const horizontalMargin = usableRect.width * horizontalMarginRatio;
  const verticalMargin = usableRect.height * verticalMarginRatio;

  const left = usableRect.left + horizontalMargin;
  const right = usableRect.right - horizontalMargin;
  const top = usableRect.top + verticalMargin;
  const bottom = usableRect.bottom - verticalMargin;

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * Proyecta matemáticamente una coordenada geográfica a píxeles de pantalla (x, y)
 * basada en la región actual visible del mapa y las dimensiones de la ventana.
 */
export function projectCoordinateToScreen(
  coord: RouteCoordinate,
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  windowDimensions: { width: number; height: number },
): { x: number; y: number } {
  if (!region || region.latitudeDelta <= 0 || region.longitudeDelta <= 0) {
    return { x: windowDimensions.width / 2, y: windowDimensions.height / 2 };
  }
  const leftLng = region.longitude - region.longitudeDelta / 2;
  const topLat = region.latitude + region.latitudeDelta / 2;
  const x = ((coord.longitude - leftLng) / region.longitudeDelta) * windowDimensions.width;
  const y = ((topLat - coord.latitude) / region.latitudeDelta) * windowDimensions.height;
  return { x, y };
}

/**
 * Comprueba si un punto en pantalla (x, y) está dentro del safeMapRect.
 */
export function isPointInSafeRect(
  point: { x: number; y: number } | null | undefined,
  safeRect: SafeMapRect,
): boolean {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  return (
    point.x >= safeRect.left &&
    point.x <= safeRect.right &&
    point.y >= safeRect.top &&
    point.y <= safeRect.bottom
  );
}

/**
 * Calcula la latitud desplazada visualmente para que la coordenada geográfica
 * aparezca centrada exactamente en el punto medio del área útil (usableMapRect)
 * entre el header/controles superiores y el sheetTop/bottomNav.
 */
export function calculateShiftedLatitude(
  latitude: number,
  latitudeDelta: number,
  padding: { top: number; bottom: number },
  windowHeight: number,
): number {
  if (!windowHeight || windowHeight <= 0 || !Number.isFinite(latitude) || !Number.isFinite(latitudeDelta)) {
    return latitude;
  }
  const verticalOffsetRatio = (padding.bottom - padding.top) / windowHeight;
  return latitude - (verticalOffsetRatio * latitudeDelta * 0.5);
}

/**
 * Calcula dinámicamente el edgePadding para MapView.fitToCoordinates
 * considerando la altura no visible del Header y del BottomSheet.
 */
export function calculateDynamicEdgePadding(params: DynamicPaddingParams): DynamicEdgePadding {
  const {
    windowWidth: _windowWidth,
    windowHeight,
    headerBottom,
    sheetTop,
    bottomNavHeight = 0,
    topSafety = DEFAULT_VERTICAL_PADDING,
    bottomSafety = DEFAULT_VERTICAL_PADDING,
    horizontalPadding = DEFAULT_HORIZONTAL_PADDING,
  } = params;

  let top = Math.max(0, headerBottom + topSafety);

  let bottomSpaceBlocked: number;
  if (typeof sheetTop === 'number' && Number.isFinite(sheetTop) && sheetTop > 0 && sheetTop < windowHeight) {
    bottomSpaceBlocked = windowHeight - sheetTop;
  } else {
    bottomSpaceBlocked = bottomNavHeight;
  }

  let bottom = Math.max(0, bottomSpaceBlocked + bottomSafety);

  // Clamping de seguridad para evitar que la suma de padding vertical consuma toda la pantalla
  const maxTotalVertical = windowHeight * 0.68;
  if (top + bottom > maxTotalVertical && windowHeight > 0) {
    const scale = maxTotalVertical / (top + bottom);
    top = Math.round(top * scale);
    bottom = Math.round(bottom * scale);
  }

  return {
    top,
    right: horizontalPadding,
    bottom,
    left: horizontalPadding,
  };
}
