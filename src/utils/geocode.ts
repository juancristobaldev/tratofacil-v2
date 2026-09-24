const CITY_CACHE: Record<string, { lat: number; lng: number }> = {
  temuco: { lat: -38.7359, lng: -72.5904 },
  'padre las casas': { lat: -38.7612, lng: -72.6021 },
  santiago: { lat: -33.4489, lng: -70.6693 },
  'santiago centro': { lat: -33.4489, lng: -70.6693 },
  'las condes': { lat: -33.4117, lng: -70.5804 },
  providencia: { lat: -33.4314, lng: -70.6093 },
  ñuñoa: { lat: -33.4569, lng: -70.5980 },
  concepcion: { lat: -36.8201, lng: -73.0444 },
  concepción: { lat: -36.8201, lng: -73.0444 },
  valparaiso: { lat: -33.0472, lng: -71.6127 },
  valparaíso: { lat: -33.0472, lng: -71.6127 },
  vina: { lat: -33.0245, lng: -71.5518 },
  'vina del mar': { lat: -33.0245, lng: -71.5518 },
  'viña del mar': { lat: -33.0245, lng: -71.5518 },
  antofagasta: { lat: -23.6509, lng: -70.3975 },
  laserena: { lat: -29.9027, lng: -71.2519 },
  'la serena': { lat: -29.9027, lng: -71.2519 },
  coquimbo: { lat: -29.9533, lng: -71.3436 },
  puertomontt: { lat: -41.4693, lng: -72.9424 },
  'puerto montt': { lat: -41.4693, lng: -72.9424 },
  valdivia: { lat: -39.8196, lng: -73.2452 },
  osorno: { lat: -40.5739, lng: -73.1335 },
  talca: { lat: -35.4264, lng: -71.6554 },
  rancagua: { lat: -34.1708, lng: -70.7444 },
  chillan: { lat: -36.6063, lng: -72.1023 },
  chillán: { lat: -36.6063, lng: -72.1023 },
  iquique: { lat: -20.2133, lng: -70.1503 },
  arica: { lat: -18.4783, lng: -70.3126 },
  copiapo: { lat: -27.3668, lng: -70.3323 },
  copiapó: { lat: -27.3668, lng: -70.3323 },
  puntaarenas: { lat: -53.1638, lng: -70.9171 },
  'punta arenas': { lat: -53.1638, lng: -70.9171 },
};

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
