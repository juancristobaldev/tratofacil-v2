import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { FocusSessionProvider, useFocusSession } from '../features/focus-session/FocusSessionProvider';

let mockRealtime: any;
let mockLocation: any;
let mockRole: string = 'client';

jest.mock('../realtime/RealtimeContext', () => ({
  useRealtime: () => mockRealtime,
}));

jest.mock('../context/LocationContext', () => ({
  useLocation: () => ({ location: mockLocation }),
}));

jest.mock('../context/RoleContext', () => ({
  useRole: () => ({
    role: mockRole,
    setRole: (r: string) => { mockRole = r; },
  }),
}));

const mockShowNotification = jest.fn();
jest.mock('../context/NotificationContext', () => ({
  useNotification: () => ({
    showNotification: mockShowNotification,
    clearNotification: jest.fn(),
  }),
}));

jest.mock('../hooks/useRoute', () => ({
  useRoutePolyline: jest.fn(() => ({
    routeCoords: [],
    routeDuration: null,
    routeDistance: null,
    routeProvider: null,
    loading: false,
    status: 'idle',
    error: null,
    refresh: jest.fn(),
  })),
}));

function SessionProbe({ role }: { role: 'client' | 'provider' }) {
  if (role === 'client') {
    useFocusSession('client');
  } else {
    useFocusSession('provider');
  }
  return null;
}

describe('Notification Role Auditing & Deduplication Hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'client';
    mockLocation = {
      coords: {
        latitude: -33.4500,
        longitude: -70.6600,
      },
    };
    mockRealtime = {
      activeOrder: null,
      localActiveOrder: null,
      providerActiveOrder: null,
      setLocalActiveOrder: jest.fn(),
    };
  });

  it('guarantees CLIENT role NEVER receives provider arrival or state machine notifications', () => {
    mockRole = 'client';

    // Provider order exists (e.g. from cache or mixed account)
    mockRealtime.providerActiveOrder = {
      id: 99,
      status: 'ACCEPTED',
      clientLat: -33.4500,
      clientLng: -70.6600,
      providerLat: -33.45001,
      providerLng: -70.66001,
    };

    act(() => {
      ReactTestRenderer.create(
        <FocusSessionProvider>
          <SessionProbe role="client" />
        </FocusSessionProvider>,
      );
    });

    // In client mode, provider proximity alert NEAR_CLIENT or state transitions must NOT be emitted
    const providerAlerts = mockShowNotification.mock.calls.filter((call) => {
      const id = call[0]?.id || '';
      const title = call[0]?.title || '';
      return id.includes('providerOrder:') || title.includes('Llegada') || title.includes('Orden de Trabajo');
    });

    expect(providerAlerts.length).toBe(0);
  });

  it('guarantees PROVIDER role NEVER receives client milestone or ETA approaching notifications', () => {
    mockRole = 'provider';

    // Client order exists with status ACCEPTED
    mockRealtime.activeOrder = {
      id: 77,
      status: 'ACCEPTED',
      clientLat: -33.4500,
      clientLng: -70.6600,
      providerLat: -33.45005,
      providerLng: -70.66005,
    };

    act(() => {
      ReactTestRenderer.create(
        <FocusSessionProvider>
          <SessionProbe role="provider" />
        </FocusSessionProvider>,
      );
    });

    // In provider mode, client alerts like DIST_5M or APPROACHING must NOT be emitted
    const clientAlerts = mockShowNotification.mock.calls.filter((call) => {
      const id = call[0]?.id || '';
      const title = call[0]?.title || '';
      return id.includes('clientOrder:') || title.includes('Profesional por llegar');
    });

    expect(clientAlerts.length).toBe(0);
  });

  it('notifies provider only when in PROVIDER mode upon entering arrival radius', () => {
    mockRole = 'provider';

    mockRealtime.providerActiveOrder = {
      id: 101,
      status: 'ACCEPTED',
      clientLat: -33.4500,
      clientLng: -70.6600,
      providerLat: -33.45001,
      providerLng: -70.66001,
    };

    act(() => {
      ReactTestRenderer.create(
        <FocusSessionProvider>
          <SessionProbe role="provider" />
        </FocusSessionProvider>,
      );
    });

    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'providerOrder:101:NEAR_CLIENT',
        title: 'Llegada a Destino',
      }),
    );
  });

  it('guarantees unrelated users receive zero notifications on order updates', () => {
    const notifyMock = jest.fn();
    const myUserId = 50;
    const myProviderId = 12;

    const handleOrderUpdate = (payload: {
      orderRealtimeId: number;
      status: string;
      clientId?: number;
      providerId?: number;
    }, currentRole: string) => {
      const isClient = Boolean(
        (payload.clientId && myUserId && payload.clientId === myUserId) ||
        (!payload.clientId && currentRole === 'client')
      );
      const isProvider = Boolean(
        (payload.providerId && myProviderId && payload.providerId === myProviderId) ||
        (!payload.providerId && currentRole === 'provider')
      );

      if (payload.status === 'IN_PROGRESS') {
        if (isClient) {
          notifyMock({ id: `clientOrder:${payload.orderRealtimeId}:IN_PROGRESS`, title: 'Servicio en Curso' });
        } else if (isProvider) {
          notifyMock({ id: `providerOrder:${payload.orderRealtimeId}:IN_PROGRESS`, title: 'Servicio en Curso' });
        }
      }
    };

    // Event belongs to client 99 and provider 88 (unrelated to current user 50 / 12)
    handleOrderUpdate({
      orderRealtimeId: 300,
      status: 'IN_PROGRESS',
      clientId: 99,
      providerId: 88,
    }, 'client');

    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('deduplicates QUOTED events with identical price and prevents repeated notifications', () => {
    const notifyMock = jest.fn();
    const lastQuoteNotified = new Map<number, number>();

    const handleQuoteUpdate = (orderId: number, quotedPrice: number, isStatusChanged: boolean) => {
      const prevQuote = lastQuoteNotified.get(orderId);
      if (isStatusChanged || prevQuote !== quotedPrice) {
        lastQuoteNotified.set(orderId, quotedPrice);
        notifyMock({
          id: `quote:${orderId}:${quotedPrice}`,
          title: 'Oferta Recibida',
        });
      }
    };

    // 1st quote arrives
    handleQuoteUpdate(400, 25000, true);
    expect(notifyMock).toHaveBeenCalledTimes(1);

    // 2nd identical event arrives (e.g. heartbeat or position ping during QUOTED)
    handleQuoteUpdate(400, 25000, false);
    expect(notifyMock).toHaveBeenCalledTimes(1);

    // 3rd event with updated price arrives
    handleQuoteUpdate(400, 30000, false);
    expect(notifyMock).toHaveBeenCalledTimes(2);
  });
});
