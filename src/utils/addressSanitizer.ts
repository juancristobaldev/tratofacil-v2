/**
 * Utilidades para sanitización y blindaje de direcciones en React Native.
 * Garantiza que ninguna coordenada geográfica numérica (ej: "-38.7359, -72.5904")
 * se renderice en pantalla ante el usuario.
 */

const COORDINATE_REGEX = /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/;

/**
 * Retorna true si la cadena de texto coincide con el patrón de coordenadas numéricas "lat, lng".
 */
export function isCoordinateString(val?: string | null): boolean {
  if (!val) return false;
  return COORDINATE_REGEX.test(val.trim());
}

/**
 * Sanitiza una dirección para asegurar que sea apta para lectura humana.
 * Si es nula, vacía o un par de coordenadas numéricas, retorna el fallback legible.
 */
export function sanitizeAddress(
  address?: string | null,
  fallback: string = 'Ubicación del cliente',
): string {
  if (!address || isCoordinateString(address)) {
    return fallback;
  }
  return address.trim();
}
