import {
  deriveDesiredMapSurface,
  selectClientRealtimeOrder,
  TERMINAL_REALTIME_STATUSES,
  PROVIDER_FOCUS_STATUSES,
  type DesiredMapSurface,
} from './sheetPolicy';
import { isSheetAllowedForRole, registry } from './bottomSheet.registry';
import type { SheetKey } from './bottomSheet.types';
import type { AppRole } from '../../types/graphql';

describe('BottomSheet State Machine & Policy Layer (Layer 1)', () => {
  describe('Suite 1: Client Default Policy', () => {
    it('client without active order derives desiredSheet=categories', () => {
      const surface = deriveDesiredMapSurface({
        role: 'client',
        clientActiveOrder: null,
        providerActiveOrder: null,
      });

      expect(surface).toEqual({
        kind: 'SHEET',
        key: 'categories',
        reason: 'client_default',
      });
    });
  });

  describe('Suite 2: Provider Default Policy', () => {
    it('provider without active order derives desiredSheet=provider_dashboard', () => {
      const surface = deriveDesiredMapSurface({
        role: 'provider',
        clientActiveOrder: null,
        providerActiveOrder: null,
      });

      expect(surface).toEqual({
        kind: 'SHEET',
        key: 'provider_dashboard',
        reason: 'provider_default',
      });
    });
  });

  describe('Suite 6 & 24: Client PENDING Realtime & NO_SHEET_BY_DESIGN Contract', () => {
    it('client PENDING order keeps realtime focus active without presenting a sheet (NO_SHEET_BY_DESIGN)', () => {
      const surface = deriveDesiredMapSurface({
        role: 'client',
        clientActiveOrder: { id: 101, status: 'PENDING' },
      });

      expect(surface).toEqual({
        kind: 'NO_SHEET_BY_DESIGN',
        reason: 'WAITING_PROVIDER_QUOTE',
      });
    });

    it('distinguishes NO_SHEET_BY_DESIGN from NO TARGET (categories bootstrap)', () => {
      const pendingSurface = deriveDesiredMapSurface({
        role: 'client',
        clientActiveOrder: { id: 101, status: 'PENDING' },
      });
      const emptySurface = deriveDesiredMapSurface({
        role: 'client',
        clientActiveOrder: null,
      });

      expect(pendingSurface.kind).toBe('NO_SHEET_BY_DESIGN');
      expect(emptySurface.kind).toBe('SHEET');
      expect((emptySurface as any).key).toBe('categories');
    });
  });

  describe('Suite 7: Client Active Realtime Quotes', () => {
    it('client QUOTED order derives focus_client without falling back to categories', () => {
      const surface = deriveDesiredMapSurface({
        role: 'client',
        clientActiveOrder: { id: 101, status: 'QUOTED', provider: { id: 99 } },
      });

      expect(surface).toEqual({
        kind: 'SHEET',
        key: 'focus_client',
        reason: 'client_domain_order_with_provider',
      });
    });

    it('client ACCEPTED order derives focus_client', () => {
      const surface = deriveDesiredMapSurface({
        role: 'client',
        clientActiveOrder: { id: 101, status: 'ACCEPTED', provider: { id: 99 } },
      });

      expect(surface).toEqual({
        kind: 'SHEET',
        key: 'focus_client',
        reason: 'client_domain_order_with_provider',
      });
    });

    it('client IN_PROGRESS order derives focus_client', () => {
      const surface = deriveDesiredMapSurface({
        role: 'client',
        clientActiveOrder: { id: 101, status: 'IN_PROGRESS', provider: { id: 99 } },
      });

      expect(surface).toEqual({
        kind: 'SHEET',
        key: 'focus_client',
        reason: 'client_domain_order_with_provider',
      });
    });
  });

  describe('Suite 8, 9, 10: Provider Negotiation Phases', () => {
    it('provider PENDING order derives focus_provider for VIEW_REQUEST phase', () => {
      const surface = deriveDesiredMapSurface({
        role: 'provider',
        providerActiveOrder: { id: 201, status: 'PENDING' },
      });

      expect(surface).toEqual({
        kind: 'SHEET',
        key: 'focus_provider',
        reason: 'provider_domain_order',
      });
    });

    it('provider QUOTED order derives focus_provider for WAITING_CLIENT_RESPONSE phase', () => {
      const surface = deriveDesiredMapSurface({
        role: 'provider',
        providerActiveOrder: { id: 201, status: 'QUOTED' },
      });

      expect(surface).toEqual({
        kind: 'SHEET',
        key: 'focus_provider',
        reason: 'provider_domain_order',
      });
    });

    it('provider ACCEPTED and IN_PROGRESS orders derive focus_provider', () => {
      expect(
        deriveDesiredMapSurface({
          role: 'provider',
          providerActiveOrder: { id: 201, status: 'ACCEPTED' },
        }),
      ).toEqual({
        kind: 'SHEET',
        key: 'focus_provider',
        reason: 'provider_domain_order',
      });

      expect(
        deriveDesiredMapSurface({
          role: 'provider',
          providerActiveOrder: { id: 201, status: 'IN_PROGRESS' },
        }),
      ).toEqual({
        kind: 'SHEET',
        key: 'focus_provider',
        reason: 'provider_domain_order',
      });
    });
  });

  describe('Suite 11, 12, 13: Role Switching & Reconciliation', () => {
    it('role switch CLIENT -> PROVIDER (without active order) switches categories to provider_dashboard', () => {
      const clientSurface = deriveDesiredMapSurface({ role: 'client' });
      const providerSurface = deriveDesiredMapSurface({ role: 'provider' });

      expect(clientSurface).toEqual({ kind: 'SHEET', key: 'categories', reason: 'client_default' });
      expect(providerSurface).toEqual({ kind: 'SHEET', key: 'provider_dashboard', reason: 'provider_default' });
    });

    it('role switch PROVIDER -> CLIENT (without active order) switches provider_dashboard to categories', () => {
      const providerSurface = deriveDesiredMapSurface({ role: 'provider' });
      const clientSurface = deriveDesiredMapSurface({ role: 'client' });

      expect(providerSurface).toEqual({ kind: 'SHEET', key: 'provider_dashboard', reason: 'provider_default' });
      expect(clientSurface).toEqual({ kind: 'SHEET', key: 'categories', reason: 'client_default' });
    });

    it('role switch with active realtime order respects the active role domain order', () => {
      const clientWithOrder = deriveDesiredMapSurface({
        role: 'client',
        clientActiveOrder: { id: 101, status: 'QUOTED' },
        providerActiveOrder: { id: 201, status: 'PENDING' },
      });
      const providerWithOrder = deriveDesiredMapSurface({
        role: 'provider',
        clientActiveOrder: { id: 101, status: 'QUOTED' },
        providerActiveOrder: { id: 201, status: 'PENDING' },
      });

      expect(clientWithOrder).toEqual({ kind: 'SHEET', key: 'focus_client', reason: 'client_domain_order_missing_provider' });
      expect(providerWithOrder).toEqual({ kind: 'SHEET', key: 'focus_provider', reason: 'provider_domain_order' });
    });
  });

  describe('Suite 20 & 36: Pure Role Guards (isSheetAllowedForRole)', () => {
    const roles: AppRole[] = ['client', 'provider', 'guest'];
    const sheets: SheetKey[] = [
      'categories',
      'provider_preview',
      'focus_client',
      'focus_provider',
      'provider_dashboard',
    ];

    it('CLIENT role allows categories, provider_preview, focus_client and forbids provider sheets', () => {
      expect(isSheetAllowedForRole('categories', 'client')).toBe(true);
      expect(isSheetAllowedForRole('provider_preview', 'client')).toBe(true);
      expect(isSheetAllowedForRole('focus_client', 'client')).toBe(true);
      expect(isSheetAllowedForRole('focus_provider', 'client')).toBe(false);
      expect(isSheetAllowedForRole('provider_dashboard', 'client')).toBe(false);
    });

    it('PROVIDER role allows focus_provider, provider_dashboard and forbids client sheets', () => {
      expect(isSheetAllowedForRole('categories', 'provider')).toBe(false);
      expect(isSheetAllowedForRole('provider_preview', 'provider')).toBe(false);
      expect(isSheetAllowedForRole('focus_client', 'provider')).toBe(false);
      expect(isSheetAllowedForRole('focus_provider', 'provider')).toBe(true);
      expect(isSheetAllowedForRole('provider_dashboard', 'provider')).toBe(true);
    });

    it('GUEST role matches client browsing sheets', () => {
      expect(isSheetAllowedForRole('categories', 'guest')).toBe(true);
      expect(isSheetAllowedForRole('provider_preview', 'guest')).toBe(true);
      expect(isSheetAllowedForRole('focus_client', 'guest')).toBe(true);
      expect(isSheetAllowedForRole('focus_provider', 'guest')).toBe(false);
      expect(isSheetAllowedForRole('provider_dashboard', 'guest')).toBe(false);
    });
  });

  describe('Suite 21: Terminal Realtime Status Transitions', () => {
    const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

    terminalStatuses.forEach((status) => {
      it(`CLIENT with terminal status ${status} releases focus sheet and reverts to categories`, () => {
        const surface = deriveDesiredMapSurface({
          role: 'client',
          clientActiveOrder: { id: 101, status },
        });

        expect(surface).toEqual({
          kind: 'SHEET',
          key: 'categories',
          reason: 'client_default',
        });
      });

      it(`PROVIDER with terminal status ${status} releases focus sheet and reverts to provider_dashboard`, () => {
        const surface = deriveDesiredMapSurface({
          role: 'provider',
          providerActiveOrder: { id: 201, status },
        });

        expect(surface).toEqual({
          kind: 'SHEET',
          key: 'provider_dashboard',
          reason: 'provider_default',
        });
      });
    });
  });

  describe('Suite 29: Sheet Registry Integrity Contract', () => {
    const registeredKeys: SheetKey[] = [
      'categories',
      'provider_preview',
      'focus_client',
      'focus_provider',
      'provider_dashboard',
    ];

    it('registers exactly the 5 official sheet keys without duplicates or extras', () => {
      expect(Object.keys(registry).sort()).toEqual(registeredKeys.sort());
    });

    it('all descriptors define valid React component content and requiresMapFlow=true', () => {
      registeredKeys.forEach((key) => {
        const descriptor = registry[key];
        expect(descriptor.content).toBeDefined();
        expect(typeof descriptor.content).toMatch(/function|object/);
        expect(descriptor.requiresMapFlow).toBe(true);
        expect(descriptor.enableDynamicSizing).toBe(true);
        expect(descriptor.replaceSameKey).toBe(true);
      });
    });

    it('replaces between categories and provider_preview without dismiss flickers', () => {
      expect(registry.categories.replaceFrom).toContain('provider_preview');
      expect(registry.provider_preview.replaceFrom).toContain('categories');
    });
  });

  describe('Suite 34 & 35: Central Master State Matrix', () => {
    interface TestCase {
      name: string;
      role: AppRole | string;
      clientOrder?: { id: number; status: string } | null;
      providerOrder?: { id: number; status: string } | null;
      expectedKind: 'SHEET' | 'NO_SHEET_BY_DESIGN';
      expectedKey?: SheetKey;
    }

    const testMatrix: TestCase[] = [
      {
        name: 'Client idle bootstrap',
        role: 'client',
        clientOrder: null,
        expectedKind: 'SHEET',
        expectedKey: 'categories',
      },
      {
        name: 'Provider idle bootstrap',
        role: 'provider',
        providerOrder: null,
        expectedKind: 'SHEET',
        expectedKey: 'provider_dashboard',
      },
      {
        name: 'Client PENDING waiting quote',
        role: 'client',
        clientOrder: { id: 1, status: 'PENDING' },
        expectedKind: 'NO_SHEET_BY_DESIGN',
      },
      {
        name: 'Client QUOTED',
        role: 'client',
        clientOrder: { id: 1, status: 'QUOTED' },
        expectedKind: 'SHEET',
        expectedKey: 'focus_client',
      },
      {
        name: 'Client ACCEPTED',
        role: 'client',
        clientOrder: { id: 1, status: 'ACCEPTED' },
        expectedKind: 'SHEET',
        expectedKey: 'focus_client',
      },
      {
        name: 'Client IN_PROGRESS',
        role: 'client',
        clientOrder: { id: 1, status: 'IN_PROGRESS' },
        expectedKind: 'SHEET',
        expectedKey: 'focus_client',
      },
      {
        name: 'Client COMPLETED',
        role: 'client',
        clientOrder: { id: 1, status: 'COMPLETED' },
        expectedKind: 'SHEET',
        expectedKey: 'categories',
      },
      {
        name: 'Client CANCELLED',
        role: 'client',
        clientOrder: { id: 1, status: 'CANCELLED' },
        expectedKind: 'SHEET',
        expectedKey: 'categories',
      },
      {
        name: 'Provider PENDING new request',
        role: 'provider',
        providerOrder: { id: 2, status: 'PENDING' },
        expectedKind: 'SHEET',
        expectedKey: 'focus_provider',
      },
      {
        name: 'Provider QUOTED waiting client',
        role: 'provider',
        providerOrder: { id: 2, status: 'QUOTED' },
        expectedKind: 'SHEET',
        expectedKey: 'focus_provider',
      },
      {
        name: 'Provider ACCEPTED in route',
        role: 'provider',
        providerOrder: { id: 2, status: 'ACCEPTED' },
        expectedKind: 'SHEET',
        expectedKey: 'focus_provider',
      },
      {
        name: 'Provider IN_PROGRESS executing',
        role: 'provider',
        providerOrder: { id: 2, status: 'IN_PROGRESS' },
        expectedKind: 'SHEET',
        expectedKey: 'focus_provider',
      },
      {
        name: 'Provider COMPLETED terminal',
        role: 'provider',
        providerOrder: { id: 2, status: 'COMPLETED' },
        expectedKind: 'SHEET',
        expectedKey: 'provider_dashboard',
      },
      {
        name: 'Provider CANCELLED terminal',
        role: 'provider',
        providerOrder: { id: 2, status: 'CANCELLED' },
        expectedKind: 'SHEET',
        expectedKey: 'provider_dashboard',
      },
    ];

    testMatrix.forEach((tc) => {
      it(`Matrix: ${tc.name}`, () => {
        const result = deriveDesiredMapSurface({
          role: tc.role,
          clientActiveOrder: tc.clientOrder,
          providerActiveOrder: tc.providerOrder,
        });

        expect(result.kind).toBe(tc.expectedKind);
        if (tc.expectedKind === 'SHEET') {
          expect((result as any).key).toBe(tc.expectedKey);
        }
      });
    });
  });

  describe('Suite 37 & 38: Order Selector & Priority Invariants', () => {
    it('selectClientRealtimeOrder prefers active non-terminal order over terminal cached order', () => {
      const activeDomain = { id: 10, status: 'QUOTED' };
      const terminalLocal = { id: 9, status: 'CANCELLED' };

      expect(selectClientRealtimeOrder(terminalLocal, activeDomain)).toBe(activeDomain);
    });

    it('selectClientRealtimeOrder prefers active local order over terminal domain order', () => {
      const terminalDomain = { id: 8, status: 'COMPLETED' };
      const activeLocal = { id: 11, status: 'ACCEPTED' };

      expect(selectClientRealtimeOrder(activeLocal, terminalDomain)).toBe(activeLocal);
    });
  });
});
