import { isCoordinateString, sanitizeAddress } from './addressSanitizer';

describe('addressSanitizer (Mobile UI shielding)', () => {
  describe('isCoordinateString', () => {
    it('detects coordinates formatted as strings', () => {
      expect(isCoordinateString('-38.7359, -72.5904')).toBe(true);
      expect(isCoordinateString('-33.4372, -70.6506')).toBe(true);
      expect(isCoordinateString('-33.4372,-70.6506')).toBe(true);
      expect(isCoordinateString('  -38.735900,  -72.590400  ')).toBe(true);
    });

    it('does not classify real street addresses as coordinates', () => {
      expect(isCoordinateString('Calle Los Alerces 456')).toBe(false);
      expect(isCoordinateString('Av. Alemania 0999, Temuco')).toBe(false);
      expect(isCoordinateString('Plaza de Armas, Santiago')).toBe(false);
      expect(isCoordinateString('')).toBe(false);
      expect(isCoordinateString(null)).toBe(false);
      expect(isCoordinateString(undefined)).toBe(false);
    });
  });

  describe('sanitizeAddress', () => {
    it('returns legitimate addresses untouched', () => {
      expect(sanitizeAddress('Calle Los Alerces 456')).toBe('Calle Los Alerces 456');
      expect(sanitizeAddress('  Av. Providencia 123  ')).toBe('Av. Providencia 123');
    });

    it('replaces coordinate strings with human-readable fallback', () => {
      expect(sanitizeAddress('-38.7359, -72.5904')).toBe('Ubicación del cliente');
      expect(sanitizeAddress('-33.4372, -70.6506', 'Ubicación en mapa')).toBe('Ubicación en mapa');
    });

    it('replaces null or empty strings with fallback', () => {
      expect(sanitizeAddress(null)).toBe('Ubicación del cliente');
      expect(sanitizeAddress('')).toBe('Ubicación del cliente');
      expect(sanitizeAddress(undefined, 'Domicilio del servicio')).toBe('Domicilio del servicio');
    });
  });
});
