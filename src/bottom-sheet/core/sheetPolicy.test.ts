import {
  deriveDesiredMapSurface,
  selectClientRealtimeOrder,
  DesiredMapSurface,
} from './sheetPolicy';

describe('Domain: BottomSheet Surface & Map Policy (Flujo 4 & 20)', () => {
  describe('Matriz Table-Driven de Superficie Deseada (Role x Order State)', () => {
    const table: Array<{
      description: string;
      role: string;
      clientOrder?: any;
      providerOrder?: any;
      expected: DesiredMapSurface;
    }> = [
      {
        description: 'Cliente sin orden activa -> muestra categories sheet',
        role: 'client',
        clientOrder: null,
        expected: { kind: 'SHEET', key: 'categories', reason: 'client_default' },
      },
      {
        description: 'Proveedor sin orden activa -> muestra provider_dashboard sheet',
        role: 'provider',
        providerOrder: null,
        expected: { kind: 'SHEET', key: 'provider_dashboard', reason: 'provider_default' },
      },
      {
        description:
          'Cliente en PENDING esperando oferta -> NO_SHEET_BY_DESIGN (Regla 2.20)',
        role: 'client',
        clientOrder: { id: 10, status: 'PENDING', provider: { name: 'Mario' } },
        expected: { kind: 'NO_SHEET_BY_DESIGN', reason: 'client_order_pending_quote' },
      },
      {
        description:
          'Cliente con orden QUOTED -> muestra focus_client para evaluar oferta',
        role: 'client',
        clientOrder: { id: 10, status: 'QUOTED', provider: { name: 'Mario' } },
        expected: {
          kind: 'SHEET',
          key: 'focus_client',
          reason: 'client_domain_order_with_provider',
        },
      },
      {
        description: 'Cliente con orden ACCEPTED -> muestra focus_client (en camino)',
        role: 'client',
        clientOrder: { id: 10, status: 'ACCEPTED', provider: { name: 'Mario' } },
        expected: {
          kind: 'SHEET',
          key: 'focus_client',
          reason: 'client_domain_order_with_provider',
        },
      },
      {
        description: 'Cliente con orden IN_PROGRESS -> muestra focus_client (trabajo activo)',
        role: 'client',
        clientOrder: { id: 10, status: 'IN_PROGRESS', provider: { name: 'Mario' } },
        expected: {
          kind: 'SHEET',
          key: 'focus_client',
          reason: 'client_domain_order_with_provider',
        },
      },
      {
        description:
          'Proveedor con orden PENDING -> muestra focus_provider para responder/ofertar',
        role: 'provider',
        providerOrder: { id: 10, status: 'PENDING' },
        expected: {
          kind: 'SHEET',
          key: 'focus_provider',
          reason: 'provider_domain_order',
        },
      },
      {
        description: 'Proveedor con orden QUOTED -> muestra focus_provider (esperando cliente)',
        role: 'provider',
        providerOrder: { id: 10, status: 'QUOTED' },
        expected: {
          kind: 'SHEET',
          key: 'focus_provider',
          reason: 'provider_domain_order',
        },
      },
      {
        description: 'Proveedor con orden ACCEPTED -> muestra focus_provider (en camino)',
        role: 'provider',
        providerOrder: { id: 10, status: 'ACCEPTED' },
        expected: {
          kind: 'SHEET',
          key: 'focus_provider',
          reason: 'provider_domain_order',
        },
      },
      {
        description:
          'Proveedor con orden IN_PROGRESS -> muestra focus_provider (cronómetro)',
        role: 'provider',
        providerOrder: { id: 10, status: 'IN_PROGRESS' },
        expected: {
          kind: 'SHEET',
          key: 'focus_provider',
          reason: 'provider_domain_order',
        },
      },
      {
        description: 'Proveedor con orden PAYMENT_PENDING -> mantiene focus_provider',
        role: 'provider',
        providerOrder: { id: 10, status: 'PAYMENT_PENDING' },
        expected: {
          kind: 'SHEET',
          key: 'focus_provider',
          reason: 'provider_domain_order',
        },
      },
      {
        description: 'Cliente con orden PAYMENT_PENDING -> muestra focus_client para pagar',
        role: 'client',
        clientOrder: { id: 10, status: 'PAYMENT_PENDING', provider: { name: 'Mario' } },
        expected: {
          kind: 'SHEET',
          key: 'focus_client',
          reason: 'client_domain_order_with_provider',
        },
      },
      {
        description: 'Cliente con orden COMPLETED (terminal) -> regresa a categories',
        role: 'client',
        clientOrder: { id: 10, status: 'COMPLETED' },
        expected: { kind: 'SHEET', key: 'categories', reason: 'client_default' },
      },
      {
        description: 'Cliente con orden CANCELLED (terminal) -> regresa a categories',
        role: 'client',
        clientOrder: { id: 10, status: 'CANCELLED' },
        expected: { kind: 'SHEET', key: 'categories', reason: 'client_default' },
      },
      {
        description:
          'Proveedor con orden COMPLETED (terminal) -> regresa a provider_dashboard',
        role: 'provider',
        providerOrder: { id: 10, status: 'COMPLETED' },
        expected: { kind: 'SHEET', key: 'provider_dashboard', reason: 'provider_default' },
      },
      {
        description:
          'Proveedor con orden CANCELLED (terminal) -> regresa a provider_dashboard',
        role: 'provider',
        providerOrder: { id: 10, status: 'CANCELLED' },
        expected: { kind: 'SHEET', key: 'provider_dashboard', reason: 'provider_default' },
      },
    ];

    table.forEach(({ description, role, clientOrder, providerOrder, expected }) => {
      it(description, () => {
        const result = deriveDesiredMapSurface({
          role,
          clientActiveOrder: clientOrder,
          providerActiveOrder: providerOrder,
        });
        expect(result).toEqual(expected);
      });
    });
  });

  describe('selectClientRealtimeOrder precedence', () => {
    it('prefiere localOrder si tiene mayor rango de progresión (e.g. QUOTED en socket vs PENDING en cache)', () => {
      const local = { id: 1, status: 'QUOTED', quotedPrice: 35000 };
      const domain = { id: 1, status: 'PENDING', provider: { id: 99, name: 'Mario' } };
      const result = selectClientRealtimeOrder(local, domain);
      expect(result?.status).toBe('QUOTED');
      expect(result?.quotedPrice).toBe(35000);
      expect(result?.provider).toEqual({ id: 99, name: 'Mario' });
    });

    it('prefiere domainOrder si tiene mayor rango de progresión (e.g. ACCEPTED vs QUOTED)', () => {
      const local = { id: 1, status: 'QUOTED' };
      const domain = { id: 1, status: 'ACCEPTED' };
      expect(selectClientRealtimeOrder(local, domain)?.status).toEqual('ACCEPTED');
    });

    it('prefiere localOrder si ambos tienen el mismo rango de estado activo (live socket freshest)', () => {
      const local = { id: 1, status: 'QUOTED', quotedPrice: 40000 };
      const domain = { id: 1, status: 'QUOTED', quotedPrice: 35000 };
      expect(selectClientRealtimeOrder(local, domain)?.quotedPrice).toEqual(40000);
    });

    it('ignora domainOrder terminal y cae en localOrder si este sigue activo', () => {
      const local = { id: 1, status: 'QUOTED' };
      const domain = { id: 1, status: 'COMPLETED' };
      expect(selectClientRealtimeOrder(local, domain)?.status).toEqual('QUOTED');
    });

    it('ignora localOrder terminal y cae en domainOrder si este sigue activo', () => {
      const local = { id: 1, status: 'CANCELLED' };
      const domain = { id: 1, status: 'QUOTED' };
      expect(selectClientRealtimeOrder(local, domain)?.status).toEqual('QUOTED');
    });

    it('preserva startedAt del domainOrder cuando localOrder tiene status IN_PROGRESS', () => {
      const local = { id: 101, status: 'IN_PROGRESS' };
      const domain = { id: 101, status: 'IN_PROGRESS', startedAt: '2026-09-08T12:00:00.000Z', clientAddress: 'Calle 123' };
      const result = selectClientRealtimeOrder(local, domain);
      expect(result?.status).toBe('IN_PROGRESS');
      expect(result?.startedAt).toBe('2026-09-08T12:00:00.000Z');
      expect(result?.clientAddress).toBe('Calle 123');
    });
  });
});
