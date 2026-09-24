import {
  isTerminalOrderStatus,
  isNonTerminalOrderStatus,
  canUseProviderNavigation,
  TERMINAL_ORDER_STATUSES,
  NON_TERMINAL_ORDER_STATUSES,
} from './orderStatus';

describe('orderStatus & canUseProviderNavigation rules', () => {
  describe('isTerminalOrderStatus', () => {
    it('returns true for all terminal statuses', () => {
      TERMINAL_ORDER_STATUSES.forEach((status) => {
        expect(isTerminalOrderStatus(status)).toBe(true);
      });
    });

    it('returns false for non-terminal statuses', () => {
      NON_TERMINAL_ORDER_STATUSES.forEach((status) => {
        expect(isTerminalOrderStatus(status)).toBe(false);
      });
    });

    it('returns true for null/undefined/empty status for safety', () => {
      expect(isTerminalOrderStatus(null)).toBe(true);
      expect(isTerminalOrderStatus(undefined)).toBe(true);
      expect(isTerminalOrderStatus('')).toBe(true);
    });
  });

  describe('isNonTerminalOrderStatus', () => {
    it('returns true for non-terminal active statuses', () => {
      NON_TERMINAL_ORDER_STATUSES.forEach((status) => {
        expect(isNonTerminalOrderStatus(status)).toBe(true);
      });
    });

    it('returns false for terminal statuses', () => {
      TERMINAL_ORDER_STATUSES.forEach((status) => {
        expect(isNonTerminalOrderStatus(status)).toBe(false);
      });
    });
  });

  describe('canUseProviderNavigation contract', () => {
    it('returns true ONLY for provider + active non-terminal order + inside FocusModeProvider', () => {
      const allowed = canUseProviderNavigation({
        role: 'provider',
        isFocusModeProviderActive: true,
        activeOrder: { status: 'ACCEPTED' },
        orderState: 'ACTIVE',
      });
      expect(allowed).toBe(true);
    });

    it('returns false if role is client or guest', () => {
      expect(
        canUseProviderNavigation({
          role: 'client',
          isFocusModeProviderActive: true,
          activeOrder: { status: 'ACCEPTED' },
        }),
      ).toBe(false);

      expect(
        canUseProviderNavigation({
          role: 'guest',
          isFocusModeProviderActive: true,
          activeOrder: { status: 'ACCEPTED' },
        }),
      ).toBe(false);
    });

    it('returns false if not in FocusModeProviderScreen', () => {
      expect(
        canUseProviderNavigation({
          role: 'provider',
          isFocusModeProviderActive: false,
          activeOrder: { status: 'ACCEPTED' },
        }),
      ).toBe(false);
    });

    it('returns false if there is no active order', () => {
      expect(
        canUseProviderNavigation({
          role: 'provider',
          isFocusModeProviderActive: true,
          activeOrder: null,
        }),
      ).toBe(false);
    });

    it('returns false for all terminal order statuses', () => {
      TERMINAL_ORDER_STATUSES.forEach((status) => {
        expect(
          canUseProviderNavigation({
            role: 'provider',
            isFocusModeProviderActive: true,
            activeOrder: { status },
          }),
        ).toBe(false);
      });
    });

    it('returns false if orderState is COMPLETED or CANCELLED', () => {
      expect(
        canUseProviderNavigation({
          role: 'provider',
          isFocusModeProviderActive: true,
          activeOrder: { status: 'ACCEPTED' },
          orderState: 'COMPLETED',
        }),
      ).toBe(false);

      expect(
        canUseProviderNavigation({
          role: 'provider',
          isFocusModeProviderActive: true,
          activeOrder: { status: 'ACCEPTED' },
          orderState: 'CANCELLED',
        }),
      ).toBe(false);
    });
  });
});
