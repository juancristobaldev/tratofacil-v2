const CITY_CACHE: Record<string, { lat: number; lng: number }> = {};

export async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  const key = city.trim().toLowerCase();
  if (CITY_CACHE[key]) return CITY_CACHE[key];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search` +
        `?format=json&q=${encodeURIComponent(city + ', Chile')}&limit=1`,
      { headers: { 'User-Agent': 'TratoFacil/1.0' } },
    );
    const data = await res.json();
    if (data?.[0]?.lat && data?.[0]?.lon) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      CITY_CACHE[key] = coords;
      return coords;
    }
  } catch {}

  return null;
}

export function getCachedCoords(city: string): { lat: number; lng: number } | null {
  return CITY_CACHE[city.trim().toLowerCase()] ?? null;
}
