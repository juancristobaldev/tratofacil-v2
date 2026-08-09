import Config from 'react-native-config';
import { DIRECTIONS_ENDPOINT, OSRM_BASE_URL } from '../config/endpoints';

export interface RouteResult {
  coordinates: { latitude: number; longitude: number }[];
  distance: number;
  duration: number;
}

/**
 * Ruta por carretera.
 *
 * Por defecto usa el proxy del backend (Google Maps Directions API, key
 * server-side). El proveedor puede cambiarse vía env `DIRECTIONS_PROVIDER=osrm`
 * para desarrollo si se desea el servidor público de OSRM.
 */
export async function getDirections(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  try {
    if (Config.DIRECTIONS_PROVIDER === 'osrm') {
      return await fromOsrm(origin, dest, signal);
    }
    return await fromBackendProxy(origin, dest, signal);
  } catch {
    return null;
  }
}

async function fromBackendProxy(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const url = `${DIRECTIONS_ENDPOINT}?originLat=${origin.latitude}&originLng=${origin.longitude}&destLat=${dest.latitude}&destLng=${dest.longitude}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data.coordinates) || data.coordinates.length === 0) {
    return null;
  }
  return {
    coordinates: data.coordinates,
    distance: Number(data.distance) || 0,
    duration: Number(data.duration) || 0,
  };
}

async function fromOsrm(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const url = `${OSRM_BASE_URL}/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.routes?.length) return null;

  const route = data.routes[0];
  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]: number[]) => ({
      latitude: lat,
      longitude: lng,
    })),
    distance: route.distance,
    duration: route.duration,
  };
}
