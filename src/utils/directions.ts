const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export interface RouteResult {
  coordinates: { latitude: number; longitude: number }[];
  distance: number;
  duration: number;
}

export async function getDirections(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  try {
    const url = `${OSRM_BASE}/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;
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
  } catch {
    return null;
  }
}
