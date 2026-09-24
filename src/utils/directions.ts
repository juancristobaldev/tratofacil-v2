import Config from 'react-native-config';
import { DIRECTIONS_ENDPOINT, OSRM_BASE_URL } from '../config/endpoints';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export type RouteProvider = 'google' | 'osrm';

export interface RouteResult {
  coordinates: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  distance: number; // compatibilidad
  duration: number; // compatibilidad
  provider: RouteProvider;
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  calculatedAt: number;
}

export type RouteErrorReason =
  | 'INVALID_COORDINATES'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'INVALID_PAYLOAD'
  | 'NO_ROUTE'
  | 'ABORTED'
  | 'CONFIG_ERROR';

export interface RouteError {
  reason: RouteErrorReason;
  message: string;
  statusCode?: number;
  provider?: RouteProvider;
}

interface CacheEntry {
  result: RouteResult;
  expiresAt: number;
}

const CLIENT_CACHE_TTL_MS = 60 * 1000; // 60 segundos TTL en cliente
const MAX_CLIENT_CACHE_SIZE = 100;
const FETCH_TIMEOUT_MS = 8000; // 8 segundos

const clientRouteCache = new Map<string, CacheEntry>();

// Constantes de política de ruteo inteligente (anti-in-house, anti-dot y anti-vueltas tontas)
export const MIN_ROUTING_PROXIMITY_METERS = 30; // Si están a <= 30m, están en el mismo domicilio/inmueble
export const MIN_RENDERABLE_POLYLINE_METERS = 35; // Distancia mínima para que un trazo vial sea visible (evita puntos o manchas)
export const SHORT_RANGE_GEODESIC_THRESHOLD_METERS = 100; // Umbral donde se evalúa el ratio de desvío
export const MAX_SHORT_RANGE_DETOUR_RATIO = 3.5; // Razón máxima (distanciaVial / distanciaGeodésica) en rango corto
export const MAX_ABSOLUTE_SHORT_RANGE_METERS = 400; // Desvío máximo absoluto cuando están a < 70m en línea recta
export const OSRM_SNAP_RADIUS_METERS = 40; // Radio máximo de snapping para OSRM

export function clearClientRouteCache(): void {
  clientRouteCache.clear();
}

/**
 * Calcula la distancia ortodrómica en metros entre dos puntos geográficos (Haversine).
 */
export function computeGeodesicDistance(p1: RouteCoordinate, p2: RouteCoordinate): number {
  const R = 6371e3;
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Evalúa si una ruta calculada es cartográfica y físicamente sensata.
 * Descarta rutas en la misma casa, líneas diminutas/puntos y vueltas absurdas a la manzana.
 */
export function isSensibleRoute(
  result: RouteResult | null | undefined,
  origin: RouteCoordinate,
  dest: RouteCoordinate,
): boolean {
  if (!result || !Array.isArray(result.coordinates) || result.coordinates.length < 2) {
    return false;
  }

  const geodesicDist = computeGeodesicDistance(origin, dest);

  // 1. Ambos están en la misma casa / domicilio / parcela (<= 30m)
  if (geodesicDist <= MIN_ROUTING_PROXIMITY_METERS) {
    if (__DEV__) {
      console.log(`[ROUTE:FILTER_IN_HOUSE] distGeodesica=${geodesicDist.toFixed(1)}m <= ${MIN_ROUTING_PROXIMITY_METERS}m. Suprimiendo polyline.`);
    }
    return false;
  }

  const roadDist = result.distanceMeters;

  // 2. Ruta vial insignificante (< 35m) -> evitaría dibujar puntos residuales o manchas
  if (roadDist < MIN_RENDERABLE_POLYLINE_METERS) {
    if (__DEV__) {
      console.log(`[ROUTE:FILTER_TOO_SHORT] distVial=${roadDist}m < ${MIN_RENDERABLE_POLYLINE_METERS}m. Suprimiendo polyline diminuta.`);
    }
    return false;
  }

  // 3. Filtro Anti-Vueltas Tontas:
  // Si están a corta distancia (< 100m) pero la ruta vial es un desvío desmedido (> 3.5x o > 400m para < 70m)
  if (geodesicDist < SHORT_RANGE_GEODESIC_THRESHOLD_METERS) {
    const detourRatio = roadDist / Math.max(1, geodesicDist);
    if (detourRatio > MAX_SHORT_RANGE_DETOUR_RATIO) {
      if (__DEV__) {
        console.warn(`[ROUTE:FILTER_DETOUR_LOOP] Vuelta tonta detectada: distGeodesica=${geodesicDist.toFixed(1)}m, distVial=${roadDist}m, detourRatio=${detourRatio.toFixed(1)} > ${MAX_SHORT_RANGE_DETOUR_RATIO}. Suprimiendo polyline absurda.`);
      }
      return false;
    }

    if (geodesicDist < 70 && roadDist > MAX_ABSOLUTE_SHORT_RANGE_METERS) {
      if (__DEV__) {
        console.warn(`[ROUTE:FILTER_EXCESSIVE_DISTANCE] Vuelta tonta detectada: distGeodesica=${geodesicDist.toFixed(1)}m (<70m), distVial=${roadDist}m > ${MAX_ABSOLUTE_SHORT_RANGE_METERS}m. Suprimiendo polyline absurda.`);
      }
      return false;
    }
  }

  return true;
}

function getCacheKey(origin: RouteCoordinate, dest: RouteCoordinate): string {
  // Discretización a 4 decimales (~11m de precisión)
  const r = (v: number) => v.toFixed(4);
  return `${r(origin.latitude)},${r(origin.longitude)};${r(dest.latitude)},${r(dest.longitude)}`;
}

/**
 * Valida que una coordenada geográfica sea válida (números finitos y dentro de rango).
 */
export function isValidGeoCoordinate(coord: RouteCoordinate | null | undefined): boolean {
  if (!coord) return false;
  return (
    Number.isFinite(coord.latitude) &&
    Number.isFinite(coord.longitude) &&
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180
  );
}

/**
 * Valida que una coordenada sea apta para routing (válida y no (0,0) sentinela).
 */
export function isUsableRoutingCoordinate(coord: RouteCoordinate | null | undefined): boolean {
  if (!isValidGeoCoordinate(coord)) return false;
  if (Math.abs(coord!.latitude) < 1e-4 && Math.abs(coord!.longitude) < 1e-4) {
    return false;
  }
  return true;
}

/**
 * Valida y deduplica puntos consecutivos de una geometría de ruta.
 */
export function sanitizeRouteCoordinates(coords: RouteCoordinate[]): RouteCoordinate[] {
  if (!Array.isArray(coords) || coords.length < 2) return [];

  const result: RouteCoordinate[] = [];
  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    if (!isValidGeoCoordinate(pt)) continue;

    const prev = result[result.length - 1];
    if (!prev || Math.abs(prev.latitude - pt.latitude) > 1e-6 || Math.abs(prev.longitude - pt.longitude) > 1e-6) {
      result.push({ latitude: pt.latitude, longitude: pt.longitude });
    }
  }

  return result.length >= 2 ? result : [];
}

/**
 * Consulta la ruta vial al Backend Proxy (que orquesta Google Maps y OSRM server-side).
 */
async function fetchFromBackendProxy(
  origin: RouteCoordinate,
  dest: RouteCoordinate,
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const startTs = Date.now();
  const url = `${DIRECTIONS_ENDPOINT}?originLat=${origin.latitude}&originLng=${origin.longitude}&destLat=${dest.latitude}&destLng=${dest.longitude}`;

  try {
    const timeoutSignal =
      typeof (AbortSignal as any).timeout === 'function'
        ? (AbortSignal as any).timeout(FETCH_TIMEOUT_MS)
        : undefined;
    const combinedSignal = signal || timeoutSignal;

    const res = await fetch(url, { signal: combinedSignal });
    if (!res.ok) {
      if (__DEV__) console.warn(`[ROUTE:BACKEND_PROXY_ERROR] httpStatus=${res.status} durationMs=${Date.now() - startTs}`);
      return null;
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.coordinates) || data.coordinates.length < 2) {
      if (__DEV__) console.warn(`[ROUTE:BACKEND_PROXY_EMPTY] durationMs=${Date.now() - startTs}`);
      return null;
    }

    const rawCoords: RouteCoordinate[] = data.coordinates.map((c: any) => ({
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
    }));

    const sanitized = sanitizeRouteCoordinates(rawCoords);
    if (sanitized.length < 2) return null;

    const dist = Number(data.distanceMeters ?? data.distance) || 0;
    const dur = Number(data.durationSeconds ?? data.duration) || 0;
    const provider: RouteProvider = data.provider === 'osrm' ? 'osrm' : 'google';

    return {
      coordinates: sanitized,
      distanceMeters: dist,
      durationSeconds: dur,
      distance: dist,
      duration: dur,
      provider,
      origin: { latitude: origin.latitude, longitude: origin.longitude },
      destination: { latitude: dest.latitude, longitude: dest.longitude },
      calculatedAt: Date.now(),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      if (__DEV__) console.log('[ROUTE:ABORT] backend_proxy_fetch_aborted');
      throw err;
    }
    if (__DEV__) console.warn(`[ROUTE:BACKEND_PROXY_FAILED] error=${err?.message || err} durationMs=${Date.now() - startTs}`);
    return null;
  }
}

/**
 * Consulta de contingencia directa a OSRM desde el cliente si el backend está caído o inaccesible.
 */
async function fetchFromClientOsrm(
  origin: RouteCoordinate,
  dest: RouteCoordinate,
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const startTs = Date.now();
  const baseUrl = OSRM_BASE_URL || 'https://router.project-osrm.org/route/v1/driving';
  const url = `${baseUrl}/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson&radiuses=${OSRM_SNAP_RADIUS_METERS};${OSRM_SNAP_RADIUS_METERS}`;

  try {
    const timeoutSignal =
      typeof (AbortSignal as any).timeout === 'function'
        ? (AbortSignal as any).timeout(FETCH_TIMEOUT_MS)
        : undefined;
    const combinedSignal = signal || timeoutSignal;

    const res = await fetch(url, { signal: combinedSignal });
    if (!res.ok) {
      if (__DEV__) console.warn(`[ROUTE:CLIENT_OSRM_ERROR] httpStatus=${res.status} durationMs=${Date.now() - startTs}`);
      return null;
    }

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) {
      if (__DEV__) console.warn(`[ROUTE:CLIENT_OSRM_NO_ROUTE] code=${data.code} durationMs=${Date.now() - startTs}`);
      return null;
    }

    const route = data.routes[0];
    const rawCoords: RouteCoordinate[] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
      latitude: lat,
      longitude: lng,
    }));

    const sanitized = sanitizeRouteCoordinates(rawCoords);
    if (sanitized.length < 2) return null;

    const dist = Math.round(route.distance || 0);
    const dur = Math.round(route.duration || 0);

    return {
      coordinates: sanitized,
      distanceMeters: dist,
      durationSeconds: dur,
      distance: dist,
      duration: dur,
      provider: 'osrm',
      origin: { latitude: origin.latitude, longitude: origin.longitude },
      destination: { latitude: dest.latitude, longitude: dest.longitude },
      calculatedAt: Date.now(),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      if (__DEV__) console.log('[ROUTE:ABORT] client_osrm_fetch_aborted');
      throw err;
    }
    if (__DEV__) console.warn(`[ROUTE:CLIENT_OSRM_FAILED] error=${err?.message || err} durationMs=${Date.now() - startTs}`);
    return null;
  }
}

/**
 * Obtiene la ruta vial por carretera entre origin y destination.
 * Implementa cache local, backend proxy principal con Google/OSRM server-side,
 * y fallback directo de cliente en caso de desconexión del backend.
 */
export async function getDirections(
  origin: RouteCoordinate | null | undefined,
  dest: RouteCoordinate | null | undefined,
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  if (!isUsableRoutingCoordinate(origin) || !isUsableRoutingCoordinate(dest)) {
    if (__DEV__) console.warn(`[ROUTE:INVALID_COORDINATES] origin=(${origin?.latitude},${origin?.longitude}) dest=(${dest?.latitude},${dest?.longitude})`);
    return null;
  }

  const origCoord: RouteCoordinate = { latitude: origin!.latitude, longitude: origin!.longitude };
  const destCoord: RouteCoordinate = { latitude: dest!.latitude, longitude: dest!.longitude };

  // 0. Supresión In-House: Si ambos puntos están dentro del mismo domicilio / parcela (<= 30m)
  if (computeGeodesicDistance(origCoord, destCoord) <= MIN_ROUTING_PROXIMITY_METERS) {
    if (__DEV__) {
      console.log(`[ROUTE:IN_HOUSE_PROXIMITY] Ambos en el mismo inmueble (<= ${MIN_ROUTING_PROXIMITY_METERS}m). Sin necesidad de ruteo.`);
    }
    return null;
  }

  const cacheKey = getCacheKey(origCoord, destCoord);
  const cached = clientRouteCache.get(cacheKey);
  if (cached && Date.now() <= cached.expiresAt) {
    if (__DEV__) console.log(`[ROUTE:CACHE_HIT] provider=${cached.result.provider} points=${cached.result.coordinates.length}`);
    return cached.result;
  }

  if (signal?.aborted) {
    return null;
  }

  const startTs = Date.now();
  if (__DEV__) console.log(`[ROUTE:REQUEST] origin=(${origCoord.latitude.toFixed(4)},${origCoord.longitude.toFixed(4)}) dest=(${destCoord.latitude.toFixed(4)},${destCoord.longitude.toFixed(4)})`);

  // 1. Proveedor Primario: Backend Proxy (Google Maps o OSRM server-side)
  try {
    const backendResult = await fetchFromBackendProxy(origCoord, destCoord, signal);
    if (backendResult && backendResult.coordinates.length >= 2) {
      if (!isSensibleRoute(backendResult, origCoord, destCoord)) {
        if (__DEV__) console.warn('[ROUTE:BACKEND_PROXY_INSENSIBLE] Ruta del backend descartada por no ser sensata cartográficamente.');
        return null;
      }
      if (clientRouteCache.size >= MAX_CLIENT_CACHE_SIZE) {
        const oldestKey = clientRouteCache.keys().next().value;
        if (oldestKey) clientRouteCache.delete(oldestKey);
      }
      clientRouteCache.set(cacheKey, { result: backendResult, expiresAt: Date.now() + CLIENT_CACHE_TTL_MS });
      if (__DEV__) console.log(`[ROUTE:SUCCESS] provider=${backendResult.provider} points=${backendResult.coordinates.length} distance=${backendResult.distanceMeters}m duration=${backendResult.durationSeconds}s durationMs=${Date.now() - startTs}`);
      return backendResult;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      return null;
    }
  }

  // 2. Fallback Secundario: OSRM directo en cliente si el backend falló o no devolvió ruta
  if (signal?.aborted) return null;
  if (__DEV__) console.warn('[ROUTE:FALLBACK] Intentando fallback directo a OSRM cliente...');

  try {
    const osrmResult = await fetchFromClientOsrm(origCoord, destCoord, signal);
    if (osrmResult && osrmResult.coordinates.length >= 2) {
      if (!isSensibleRoute(osrmResult, origCoord, destCoord)) {
        if (__DEV__) console.warn('[ROUTE:CLIENT_OSRM_INSENSIBLE] Ruta de OSRM cliente descartada por no ser sensata cartográficamente.');
        return null;
      }
      if (clientRouteCache.size >= MAX_CLIENT_CACHE_SIZE) {
        const oldestKey = clientRouteCache.keys().next().value;
        if (oldestKey) clientRouteCache.delete(oldestKey);
      }
      clientRouteCache.set(cacheKey, { result: osrmResult, expiresAt: Date.now() + CLIENT_CACHE_TTL_MS });
      if (__DEV__) console.log(`[ROUTE:SUCCESS] provider=osrm (client fallback) points=${osrmResult.coordinates.length} distance=${osrmResult.distanceMeters}m durationMs=${Date.now() - startTs}`);
      return osrmResult;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      return null;
    }
  }

  if (__DEV__) console.warn(`[ROUTE:NO_ROUTE] No se pudo obtener ruta de ningún proveedor. durationMs=${Date.now() - startTs}`);
  return null;
}
