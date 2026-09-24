import {
  formatPhoneDisplay,
  formatPhoneNational,
  parsePhoneValue,
  formatRut,
  formatDate,
} from './formatters';

describe('formatters - Phone formatting', () => {
  describe('parsePhoneValue', () => {
    it('returns empty string for empty or whitespace-only inputs', () => {
      expect(parsePhoneValue('')).toBe('');
      expect(parsePhoneValue('   ')).toBe('');
    });

    it('does NOT block 9 and recognizes initial mobile prefix', () => {
      // When user types '9' as first digit in an empty field
      expect(parsePhoneValue('9')).toBe('+569');
      // When user continues typing after 9
      expect(parsePhoneValue('91')).toBe('+5691');
      expect(parsePhoneValue('912')).toBe('+56912');
      expect(parsePhoneValue('987654321')).toBe('+56987654321');
    });

    it('handles phone numbers starting with double 9 (e.g. 99...)', () => {
      expect(parsePhoneValue('99')).toBe('+5699');
      expect(parsePhoneValue('991234567')).toBe('+56991234567');
    });

    it('handles international prefix +56 and 56', () => {
      expect(parsePhoneValue('+56912345678')).toBe('+56912345678');
      expect(parsePhoneValue('56912345678')).toBe('+56912345678');
      expect(parsePhoneValue('+56 9 1234 5678')).toBe('+56912345678');
    });

    it('handles subscriber-only 8 digits without leading 9', () => {
      expect(parsePhoneValue('87654321')).toBe('+56987654321');
    });

    it('handles backspacing down to the prefix and clearing', () => {
      // User has +56 9 and backspaces the space/9
      expect(parsePhoneValue('+56 9')).toBe('+569');
      expect(parsePhoneValue('569')).toBe('+569');
      // User deletes the 9 leaving +56 or 56 -> should clear back to empty
      expect(parsePhoneValue('+56')).toBe('');
      expect(parsePhoneValue('+56 ')).toBe('');
      expect(parsePhoneValue('56')).toBe('');
      expect(parsePhoneValue('5')).toBe('');
    });

    it('caps subscriber digits at 8 digits maximum', () => {
      expect(parsePhoneValue('+56912345678999')).toBe('+56912345678');
    });
  });

  describe('formatPhoneDisplay', () => {
    it('formats empty or cleared prefix as empty string', () => {
      expect(formatPhoneDisplay('')).toBe('');
      expect(formatPhoneDisplay('+56')).toBe('');
      expect(formatPhoneDisplay('56')).toBe('');
      expect(formatPhoneDisplay('5')).toBe('');
    });

    it('formats +569 prefix correctly for display', () => {
      expect(formatPhoneDisplay('+569')).toBe('+56 9');
      expect(formatPhoneDisplay('9')).toBe('+56 9');
    });

    it('formats progressive typing with spaces', () => {
      expect(formatPhoneDisplay('+5698')).toBe('+56 9 8');
      expect(formatPhoneDisplay('+5698765')).toBe('+56 9 8765');
      expect(formatPhoneDisplay('+56987654')).toBe('+56 9 8765 4');
      expect(formatPhoneDisplay('+56987654321')).toBe('+56 9 8765 4321');
    });

    it('formats full national numbers with +56 9 prefix', () => {
      expect(formatPhoneDisplay('987654321')).toBe('+56 9 8765 4321');
      expect(formatPhoneDisplay('991234567')).toBe('+56 9 9123 4567');
      expect(formatPhoneDisplay('+56912345678')).toBe('+56 9 1234 5678');
    });
  });

  describe('formatPhoneNational', () => {
    it('formats empty or cleared prefix as empty string', () => {
      expect(formatPhoneNational('')).toBe('');
      expect(formatPhoneNational('+56')).toBe('');
      expect(formatPhoneNational('56')).toBe('');
    });

    it('formats without +56 for inputs that already have a country badge', () => {
      expect(formatPhoneNational('+569')).toBe('9');
      expect(formatPhoneNational('+5691')).toBe('9 1');
      expect(formatPhoneNational('+5691234')).toBe('9 1234');
      expect(formatPhoneNational('+56912345678')).toBe('9 1234 5678');
      expect(formatPhoneNational('912345678')).toBe('9 1234 5678');
    });
  });

  describe('formatRut and formatDate', () => {
    it('formats RUT correctly', () => {
      expect(formatRut('')).toBe('');
      expect(formatRut('1')).toBe('1');
      expect(formatRut('12345678k')).toBe('12345678-K');
      expect(formatRut('12.345.678-9')).toBe('12345678-9');
    });

    it('formats Date correctly', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate('01')).toBe('01');
      expect(formatDate('0102')).toBe('01/02');
      expect(formatDate('01022025')).toBe('01/02/2025');
    });
  });
});
