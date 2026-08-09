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

/**
 * Reverse-geocodifica coordenadas a un nombre de lugar ("Ciudad, Región").
 * Devuelve null si no se puede resolver.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TratoFacilApp/1.0',
          'Accept-Language': 'es',
        },
      },
    );
    const data = await response.json();

    if (data?.address) {
      const city =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.county;
      const state = data.address.state || data.address.region;
      if (city && state) return `${city}, ${state}`;
      if (city) return city;
    }
    if (data?.display_name) {
      return data.display_name.split(',').slice(0, 2).join(', ');
    }
  } catch {
    // fall through
  }

  return null;
}
