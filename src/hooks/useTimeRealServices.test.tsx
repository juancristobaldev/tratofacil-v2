import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTimeRealServices } from './useTimeRealServices';
import { io } from 'socket.io-client';
import { locationSimulator } from '../dev/joystick/locationSimulator';

const mockSocketOn = jest.fn();
const mockSocketOff = jest.fn();
const mockSocketDisconnect = jest.fn();
const mockSocketEmit = jest.fn();
const mockSocketRemoveAllListeners = jest.fn();

const mockSocketInstance = {
  on: mockSocketOn,
  off: mockSocketOff,
  disconnect: mockSocketDisconnect,
  emit: mockSocketEmit,
  removeAllListeners: mockSocketRemoveAllListeners,
  connected: true,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocketInstance),
}));

let mockRole = 'client';
let mockToken: string | null = 'mock_jwt_token';
const mockShowNotification = jest.fn();
const mockRefetch = jest.fn();
const mockSetRole = jest.fn();
let mockQueryData: any = {
  me: { id: 42, activeRealtimeOrder: null, provider: null },
  myRealtimeOrdersAsClient: [],
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ token: mockToken, isAuthenticated: Boolean(mockToken), user: { id: 42, provider: { id: 99 } } }),
}));

jest.mock('../context/RoleContext', () => ({
  useRole: () => ({ role: mockRole, setRole: mockSetRole }),
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

const mockMutationMap: Record<string, jest.Mock> = {};
const getMockMutation = (operation: any) => {
  const name = operation?.definitions?.[0]?.name?.value || 'unknown';
  if (!mockMutationMap[name]) {
    mockMutationMap[name] = jest.fn().mockResolvedValue({ data: {} });
  }
  return mockMutationMap[name];
};

jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({
    cache: { modify: jest.fn() },
  }),
  useQuery: () => ({
    data: mockQueryData,
    loading: false,
    error: null,
    refetch: mockRefetch,
  }),
  useMutation: (operation: any) => [getMockMutation(operation), { loading: false }],
}));

jest.mock('../native/locationTracker', () => ({
  startLocationTracking: jest.fn(),
  stopLocationTracking: jest.fn(),
}));

const HookConsumer: React.FC = () => {
  const hookResult = useTimeRealServices();
  return <Text testID="socket-status">{hookResult.socketStatus}</Text>;
};

describe('useTimeRealServices Hook (Flujos 17, 18, 28, 29)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockMutationMap).forEach((m) => m.mockClear());
    mockRole = 'client';
    mockToken = 'mock_jwt_token';
  });

  it('LIFECYCLE: conecta Socket.IO con token JWT y registra listeners requeridos', async () => {
    const view = await render(<HookConsumer />);

    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('/find'),
      expect.objectContaining({
        auth: { token: 'mock_jwt_token' },
      }),
    );

    const registeredEvents = mockSocketOn.mock.calls.map((c) => c[0]);
    expect(registeredEvents).toContain('order-realtime:created');
    expect(registeredEvents).toContain('order-realtime:updated');
    expect(registeredEvents).toContain('order-realtime:location-updated');
    expect(registeredEvents).toContain('chat:received');
    expect(registeredEvents).toContain('provider:realtime:status');

    view.unmount();
  });

  it('CLEANUP: al desmontar el hook desconecta el socket y remueve listeners', async () => {
    const view = await render(<HookConsumer />);
    await act(async () => {
      view.unmount();
    });

    expect(mockSocketRemoveAllListeners).toHaveBeenCalled();
    expect(mockSocketDisconnect).toHaveBeenCalled();
  });

  it('EVENT HANDLING: al recibir order-realtime:created dispara refetch', async () => {
    const view = await render(<HookConsumer />);

    const createdHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'order-realtime:created',
    );
    expect(createdHandlerCall).toBeDefined();

    const createdHandler = createdHandlerCall[1];
    await act(async () => {
      createdHandler({ orderRealtimeId: 101, status: 'PENDING' });
    });

    expect(mockRefetch).toHaveBeenCalled();
    view.unmount();
  });

  it('P0-A: PROVIDER RN inicia tracking de orden cuando providerActiveOrder pasa a ACCEPTED / IN_PROGRESS', async () => {
    mockRole = 'provider';
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: {
          id: 99,
          isRealtimeActive: true,
          activeRealtimeOrder: {
            id: 777,
            status: 'ACCEPTED',
            clientLat: -33.45,
            clientLng: -70.66,
            providerLat: -33.46,
            providerLng: -70.67,
          },
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    const Geolocation = require('react-native-geolocation-service');
    const { startLocationTracking } = require('../native/locationTracker');

    let hookData: any;
    const ProviderHookConsumer: React.FC = () => {
      hookData = useTimeRealServices();
      return <Text testID="order-id">{hookData.providerActiveOrder?.id ?? 'none'}</Text>;
    };

    const view = await render(<ProviderHookConsumer />);

    expect(hookData.providerActiveOrder?.id).toBe(777);
    expect(startLocationTracking).toHaveBeenCalled();
    expect(Geolocation.watchPosition).toHaveBeenCalled();
    view.unmount();
  });

  it('P0-B & P0-C: actualiza estado de proveedor y cliente con guard de recencia independiente por actor', async () => {
    mockRole = 'client';
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: {
          id: 888,
          status: 'IN_PROGRESS',
          clientLat: -33.40,
          clientLng: -70.60,
          providerLat: -33.50,
          providerLng: -70.70,
        },
        provider: {
          id: 99,
          isRealtimeActive: true,
          activeRealtimeOrder: {
            id: 888,
            status: 'IN_PROGRESS',
            clientLat: -33.40,
            clientLng: -70.60,
            providerLat: -33.50,
            providerLng: -70.70,
          },
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    let hookData: any;
    const DualHookConsumer: React.FC = () => {
      hookData = useTimeRealServices();
      return (
        <Text testID="client-coords">
          {hookData.localActiveOrder?.clientLat ?? 'null'},{hookData.localActiveOrder?.providerLat ?? 'null'}
        </Text>
      );
    };

    const view = await render(<DualHookConsumer />);

    const locationHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'order-realtime:location-updated',
    );
    expect(locationHandlerCall).toBeDefined();
    const locationHandler = locationHandlerCall[1];

    // 1. Proveedor envía ubicación con timestamp alto (105000)
    await act(async () => {
      locationHandler({
        orderRealtimeId: 888,
        clientLat: -33.40,
        clientLng: -70.60,
        providerLat: -33.51,
        providerLng: -70.71,
        timestamp: 105000,
        source: 'provider',
      });
    });

    expect(hookData.localActiveOrder.providerLat).toBe(-33.51);
    expect(hookData.providerActiveOrder.providerLat).toBe(-33.51);

    // 2. Cliente envía ubicación con timestamp menor (101000) debido a clock skew
    // NO debe ser descartado porque source='client' tiene su propia key de recencia
    await act(async () => {
      locationHandler({
        orderRealtimeId: 888,
        clientLat: -33.42,
        clientLng: -70.62,
        providerLat: -33.51,
        providerLng: -70.71,
        timestamp: 101000,
        source: 'client',
      });
    });

    expect(hookData.localActiveOrder.clientLat).toBe(-33.42);
    expect(hookData.providerActiveOrder.clientLat).toBe(-33.42);

    // 3. Evento para orden distinta (999) NO debe mutar la orden 888
    await act(async () => {
      locationHandler({
        orderRealtimeId: 999,
        clientLat: 0,
        clientLng: 0,
        providerLat: 0,
        providerLng: 0,
        timestamp: 106000,
        source: 'provider',
      });
    });

    expect(hookData.localActiveOrder.id).toBe(888);
    expect(hookData.localActiveOrder.clientLat).toBe(-33.42);
    expect(hookData.localActiveOrder.providerLat).toBe(-33.51);
    expect(hookData.providerActiveOrder.id).toBe(888);
    expect(hookData.providerActiveOrder.clientLat).toBe(-33.42);
    expect(hookData.providerActiveOrder.providerLat).toBe(-33.51);

    view.unmount();
  });

  it('TERMINAL: does NOT revert to client mode if provider has isRealtimeActive=true when order completes', async () => {
    mockRole = 'client';
    mockSetRole.mockClear();
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: {
          id: 99,
          isRealtimeActive: true,
          activeRealtimeOrder: {
            id: 555,
            status: 'ACCEPTED',
          },
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    const TestConsumer1: React.FC = () => {
      useTimeRealServices();
      return <Text>test1</Text>;
    };

    const view1 = await render(<TestConsumer1 />);
    await waitFor(() => {
      expect(mockSetRole).toHaveBeenCalledWith('provider');
    });
    mockRole = 'provider';
    mockSetRole.mockClear();

    // Now order completes, but provider is still active in realtime
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: {
          id: 99,
          isRealtimeActive: true,
          activeRealtimeOrder: {
            id: 555,
            status: 'COMPLETED',
          },
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    await act(async () => {
      view1.rerender(<TestConsumer1 />);
    });

    // Should NOT revert to client because isRealtimeActive is true
    expect(mockSetRole).not.toHaveBeenCalledWith('client');
    view1.unmount();
  });

  it('TERMINAL: reverts to client mode if provider has isRealtimeActive=false when auto-switched order completes', async () => {
    mockRole = 'client';
    mockSetRole.mockClear();
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: {
          id: 99,
          isRealtimeActive: false,
          activeRealtimeOrder: {
            id: 666,
            status: 'ACCEPTED',
          },
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    const TestConsumer2: React.FC = () => {
      useTimeRealServices();
      return <Text>test2</Text>;
    };

    const view2 = await render(<TestConsumer2 />);
    await waitFor(() => {
      expect(mockSetRole).toHaveBeenCalledWith('provider');
    });
    mockRole = 'provider';
    mockSetRole.mockClear();

    // Order completes and provider is offline
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: {
          id: 99,
          isRealtimeActive: false,
          activeRealtimeOrder: {
            id: 666,
            status: 'COMPLETED',
          },
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    await act(async () => {
      view2.rerender(<TestConsumer2 />);
    });

    // Reverts to client because isRealtimeActive is false
    await waitFor(() => {
      expect(mockSetRole).toHaveBeenCalledWith('client');
    });
    view2.unmount();
  });

  it('QUOTATION & COUNTER-OFFER: actualiza datos enriquecidos localmente al recibir order-realtime:updated', async () => {
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: {
          id: 555,
          status: 'PENDING',
          quotedPrice: null,
          counterOfferPrice: null,
        },
        provider: null,
      },
      myRealtimeOrdersAsClient: [],
    };

    let hookData: any;
    const QuotedHookConsumer: React.FC = () => {
      hookData = useTimeRealServices();
      return <Text testID="quote-test">{hookData.localActiveOrder?.status ?? 'none'}</Text>;
    };

    const view = await render(<QuotedHookConsumer />);

    const updateHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'order-realtime:updated',
    );
    expect(updateHandlerCall).toBeDefined();
    const updateHandler = updateHandlerCall[1];

    // Simula recepción de cotización enriquecida
    await act(async () => {
      updateHandler({
        orderRealtimeId: 555,
        status: 'QUOTED',
        quotedPrice: 15000,
        quotedHours: 1,
        quotedTransport: 0,
      });
    });

    expect(hookData.localActiveOrder.status).toBe('QUOTED');
    expect(hookData.localActiveOrder.quotedPrice).toBe(15000);
    expect(hookData.localActiveOrder.quotedHours).toBe(1);

    // Simula recepción de contraoferta enriquecida
    await act(async () => {
      updateHandler({
        orderRealtimeId: 555,
        status: 'QUOTED',
        quotedPrice: 15000,
        counterOfferPrice: 12000,
        counterOfferHours: 1,
        counterOfferTransport: 0,
      });
    });

    expect(hookData.localActiveOrder.counterOfferPrice).toBe(12000);

    // Verifica que al recibir resolución de contraoferta (null), limpia counterOfferPrice y actualiza precio
    await act(async () => {
      updateHandler({
        orderRealtimeId: 555,
        status: 'QUOTED',
        quotedPrice: 12000,
        counterOfferPrice: null,
      });
    });

    expect(hookData.localActiveOrder.counterOfferPrice).toBeNull();
    expect(hookData.localActiveOrder.quotedPrice).toBe(12000);

    view.unmount();
  });

  it('HARDENING: review:received maneja ratings no numéricos sin RangeError', async () => {
    const view = await render(<HookConsumer />);

    const reviewHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'review:received',
    );
    expect(reviewHandlerCall).toBeDefined();
    const reviewHandler = reviewHandlerCall[1];

    // Payload con rating inválido/NaN no debe crashear
    await act(async () => {
      reviewHandler({
        id: 1,
        rating: 'invalid' as any,
        comment: 'Excelente servicio',
        orderRealtimeId: 555,
        type: 'CLIENT_REVIEW',
        authorName: 'Juan',
        createdAt: new Date().toISOString(),
      });
    });

    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nueva reseña recibida',
        type: 'success',
      }),
    );

    view.unmount();
  });

  it('ROLE FILTER: review:received con PROVIDER_REVIEW no muestra notificacion a usuario con rol client', async () => {
    mockRole = 'client';
    const view = await render(<HookConsumer />);

    const reviewHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'review:received',
    );
    expect(reviewHandlerCall).toBeDefined();
    const reviewHandler = reviewHandlerCall[1];

    mockShowNotification.mockClear();

    await act(async () => {
      reviewHandler({
        id: 2,
        rating: 5,
        comment: 'Gran profesional',
        orderRealtimeId: 556,
        type: 'PROVIDER_REVIEW',
        authorName: 'Cliente Juan',
        createdAt: new Date().toISOString(),
      });
    });

    expect(mockShowNotification).not.toHaveBeenCalled();

    view.unmount();
  });

  it('ROLE FILTER: review:received con PROVIDER_REVIEW si muestra notificacion a rol provider', async () => {
    mockRole = 'provider';
    const view = await render(<HookConsumer />);

    const reviewHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'review:received',
    );
    expect(reviewHandlerCall).toBeDefined();
    const reviewHandler = reviewHandlerCall[1];

    mockShowNotification.mockClear();

    await act(async () => {
      reviewHandler({
        id: 3,
        rating: 5,
        comment: 'Excelente trabajo',
        orderRealtimeId: 557,
        type: 'PROVIDER_REVIEW',
        authorName: 'Cliente Juan',
        createdAt: new Date().toISOString(),
      });
    });

    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nueva reseña recibida',
        type: 'success',
      }),
    );

    view.unmount();
  });

  it('ROLE FILTER: review:received con CLIENT_REVIEW no muestra notificacion a rol provider', async () => {
    mockRole = 'provider';
    const view = await render(<HookConsumer />);

    const reviewHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'review:received',
    );
    expect(reviewHandlerCall).toBeDefined();
    const reviewHandler = reviewHandlerCall[1];

    mockShowNotification.mockClear();

    await act(async () => {
      reviewHandler({
        id: 4,
        rating: 5,
        comment: 'Gran cliente',
        orderRealtimeId: 558,
        type: 'CLIENT_REVIEW',
        authorName: 'Proveedor Mario',
        createdAt: new Date().toISOString(),
      });
    });

    expect(mockShowNotification).not.toHaveBeenCalled();

    view.unmount();
  });

  it('PHASE 3 - RT-1: role switch (client <-> provider) preserves single socket instance without recreation', async () => {
    mockRole = 'client';
    let hookData: any;
    const TestConsumer: React.FC = () => {
      hookData = useTimeRealServices();
      return <Text testID="socket-status">{hookData.socketStatus}</Text>;
    };

    const view = await render(<TestConsumer />);
    expect(io).toHaveBeenCalledTimes(1);

    // Switch role to provider
    mockRole = 'provider';
    await act(async () => {
      view.rerender(<TestConsumer />);
    });

    // Must NOT create a new socket
    expect(io).toHaveBeenCalledTimes(1);

    // Switch role back to client
    mockRole = 'client';
    await act(async () => {
      view.rerender(<TestConsumer />);
    });

    expect(io).toHaveBeenCalledTimes(1);
    await act(async () => {
      view.unmount();
    });
  });

  it('PHASE 3 - RT-2 & RT-3: subscribe allows components to listen to events and cleanup properly', async () => {
    let hookResult: any;
    const TestConsumer: React.FC = () => {
      hookResult = useTimeRealServices();
      return <Text testID="test-sub">test</Text>;
    };

    const view = await render(<TestConsumer />);

    const subscriberA = jest.fn();
    const subscriberB = jest.fn();

    const unsubA = hookResult.subscribe('provider:realtime:status', subscriberA);
    const unsubB = hookResult.subscribe('provider:realtime:status', subscriberB);

    const providerStatusHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'provider:realtime:status',
    );
    expect(providerStatusHandlerCall).toBeDefined();
    const providerStatusHandler = providerStatusHandlerCall[1];

    await act(async () => {
      providerStatusHandler({ providerId: 10, isRealtimeActive: true });
    });

    expect(subscriberA).toHaveBeenCalledWith({ providerId: 10, isRealtimeActive: true });
    expect(subscriberB).toHaveBeenCalledWith({ providerId: 10, isRealtimeActive: true });

    // Unsubscribe A only
    unsubA();
    subscriberA.mockClear();
    subscriberB.mockClear();

    await act(async () => {
      providerStatusHandler({ providerId: 20, isRealtimeActive: false });
    });

    expect(subscriberA).not.toHaveBeenCalled();
    expect(subscriberB).toHaveBeenCalledWith({ providerId: 20, isRealtimeActive: false });

    unsubB();
    view.unmount();
  });

  it('PHASE 3 - RT-4: joinChat emits chat:join and auto-rejoins on socket connect event', async () => {
    let hookResult: any;
    const TestConsumer: React.FC = () => {
      hookResult = useTimeRealServices();
      return <Text testID="test-chat">chat</Text>;
    };

    const view = await render(<TestConsumer />);

    await act(async () => {
      hookResult.joinChat(789);
    });

    expect(mockSocketEmit).toHaveBeenCalledWith('chat:join', { orderRealtimeId: 789 });

    mockSocketEmit.mockClear();

    // Trigger connect event (simulating socket reconnect)
    const connectHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'connect',
    );
    expect(connectHandlerCall).toBeDefined();
    const connectHandler = connectHandlerCall[1];

    await act(async () => {
      connectHandler();
    });

    // Active room 789 must be re-joined automatically
    expect(mockSocketEmit).toHaveBeenCalledWith('chat:join', { orderRealtimeId: 789 });

    // Leave chat room
    mockSocketEmit.mockClear();
    await act(async () => {
      hookResult.leaveChat(789);
    });

    expect(mockSocketEmit).toHaveBeenCalledWith('chat:leave', { orderRealtimeId: 789 });

    // On next reconnect, should NOT rejoin room 789
    mockSocketEmit.mockClear();
    await act(async () => {
      connectHandler();
    });

    expect(mockSocketEmit).not.toHaveBeenCalledWith('chat:join', { orderRealtimeId: 789 });

    view.unmount();
  });

  it('REGRESSION: receiving quote or counteroffer as client does NOT corrupt providerActiveOrder and NEVER switches role to provider', async () => {
    mockRole = 'client';
    mockSetRole.mockClear();
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: {
          id: 777,
          status: 'PENDING',
          quotedPrice: null,
          counterOfferPrice: null,
        },
        provider: null,
      },
      myRealtimeOrdersAsClient: [],
    };

    let hookResult: any;
    const ClientQuoteConsumer: React.FC = () => {
      hookResult = useTimeRealServices();
      return <Text testID="quote-status">{hookResult.localActiveOrder?.status ?? 'none'}</Text>;
    };

    const view = await render(<ClientQuoteConsumer />);

    const updateHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'order-realtime:updated',
    );
    expect(updateHandlerCall).toBeDefined();
    const updateHandler = updateHandlerCall[1];

    // 1. Cotización recibida del profesional
    await act(async () => {
      updateHandler({
        orderRealtimeId: 777,
        status: 'QUOTED',
        quotedPrice: 20000,
        quotedHours: 2,
        quotedTransport: 3000,
      });
    });

    expect(hookResult.localActiveOrder.status).toBe('QUOTED');
    expect(hookResult.localActiveOrder.quotedPrice).toBe(20000);
    expect(hookResult.providerActiveOrder).toBeNull();
    expect(mockSetRole).not.toHaveBeenCalledWith('provider');

    // 2. Contraoferta del cliente enviada / recibida (status real: QUOTED con counterOffer)
    await act(async () => {
      updateHandler({
        orderRealtimeId: 777,
        status: 'QUOTED',
        quotedPrice: 20000,
        counterOfferPrice: 18000,
        counterOfferHours: 2,
        counterOfferTransport: 3000,
      });
    });

    expect(hookResult.localActiveOrder.status).toBe('QUOTED');
    expect(hookResult.localActiveOrder.counterOfferPrice).toBe(18000);
    expect(hookResult.providerActiveOrder).toBeNull();
    expect(mockSetRole).not.toHaveBeenCalledWith('provider');

    view.unmount();
  });

  it('REGRESSION: user with provider profile does NOT auto-switch to provider for their own client order', async () => {
    mockRole = 'client';
    mockSetRole.mockClear();
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: {
          id: 888,
          status: 'PENDING',
        },
        provider: {
          id: 99,
          isRealtimeActive: true,
          activeRealtimeOrder: null,
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    let hookResult: any;
    const DualRoleConsumer: React.FC = () => {
      hookResult = useTimeRealServices();
      return <Text testID="dual-status">{hookResult.localActiveOrder?.status ?? 'none'}</Text>;
    };

    const view = await render(<DualRoleConsumer />);

    const updateHandlerCall = mockSocketOn.mock.calls.find(
      (c) => c[0] === 'order-realtime:updated',
    );
    expect(updateHandlerCall).toBeDefined();
    const updateHandler = updateHandlerCall[1];

    await act(async () => {
      updateHandler({
        orderRealtimeId: 888,
        status: 'QUOTED',
        quotedPrice: 25000,
      });
    });

    expect(hookResult.localActiveOrder.status).toBe('QUOTED');
    expect(hookResult.providerActiveOrder).toBeNull();
    expect(mockSetRole).not.toHaveBeenCalledWith('provider');

    view.unmount();
  });

  it('NOTIFICATIONS: triggers notifications for ARRIVED, QUOTED, and counter-offer', async () => {
    mockRole = 'client';
    mockShowNotification.mockClear();

    let hookResult: any;
    const NotificationConsumer: React.FC = () => {
      hookResult = useTimeRealServices();
      return <Text testID="notification-status">{hookResult.localActiveOrder?.status ?? 'none'}</Text>;
    };

    const view = await render(<NotificationConsumer />);
    const updateHandler = mockSocketOn.mock.calls.find((c) => c[0] === 'order-realtime:updated')?.[1];
    expect(updateHandler).toBeDefined();

    // 1. ARRIVED for client
    await act(async () => {
      updateHandler({
        orderRealtimeId: 101,
        status: 'ARRIVED',
      });
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Proveedor ha llegado', type: 'success' })
    );

    // 2. QUOTED for client
    mockShowNotification.mockClear();
    await act(async () => {
      updateHandler({
        orderRealtimeId: 101,
        status: 'QUOTED',
        quotedPrice: 15000,
      });
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Oferta Recibida', type: 'info' })
    );

    // 3. APPROACHING via order-realtime:approaching socket event
    mockShowNotification.mockClear();
    const approachingHandler = mockSocketOn.mock.calls.find((c) => c[0] === 'order-realtime:approaching')?.[1];
    expect(approachingHandler).toBeDefined();
    await act(async () => {
      approachingHandler({
        orderRealtimeId: 101,
        distanceMeters: 350,
      });
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'clientOrder:101:APPROACHING',
        title: 'Profesional por llegar',
        type: 'info',
      })
    );

    view.unmount();
  });

  it('DEV SIMULATION: emite updateRealtimeOrderLocation cuando locationSimulator genera movimiento en orden activa', async () => {
    mockRole = 'provider';
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: {
          id: 99,
          isRealtimeActive: true,
          activeRealtimeOrder: {
            id: 901,
            status: 'ACCEPTED',
            providerLat: -38.74,
            providerLng: -72.59,
          },
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    const ProviderTestConsumer: React.FC = () => {
      useTimeRealServices();
      return <Text>test-sim</Text>;
    };

    const view = await render(<ProviderTestConsumer />);
    const updateLocMock = mockMutationMap['UpdateRealtimeOrderLocation'];
    expect(updateLocMock).toBeDefined();
    updateLocMock.mockClear();

    // Activar simulador en nueva posición
    await act(async () => {
      locationSimulator.enableSimulation({ latitude: -38.741, longitude: -72.591 });
    });

    // Debe invocar la mutación con las coordenadas simuladas
    expect(updateLocMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          orderRealtimeId: 901,
          lat: -38.741,
          lng: -72.591,
        }),
      })
    );

    // Desactivar simulador
    await act(async () => {
      locationSimulator.disableSimulation();
    });

    view.unmount();
  });

  it('DEV SIMULATION: descarta lecturas de GPS fisico si locationSimulator.isSimulating() es true', async () => {
    mockRole = 'provider';
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: {
          id: 99,
          isRealtimeActive: true,
          activeRealtimeOrder: {
            id: 902,
            status: 'ACCEPTED',
            providerLat: -38.74,
            providerLng: -72.59,
          },
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    const Geolocation = require('react-native-geolocation-service');
    let watchSuccessCallback: any = null;
    (Geolocation.watchPosition as jest.Mock).mockImplementation((success: any) => {
      watchSuccessCallback = success;
      return 1;
    });

    const ProviderTestConsumer: React.FC = () => {
      useTimeRealServices();
      return <Text>test-sim-mutex</Text>;
    };

    const view = await render(<ProviderTestConsumer />);
    const updateLocMock = mockMutationMap['UpdateRealtimeOrderLocation'];
    expect(updateLocMock).toBeDefined();

    // Activar simulación
    await act(async () => {
      locationSimulator.enableSimulation({ latitude: -38.745, longitude: -72.595 });
    });
    updateLocMock.mockClear();

    // Simular que el chip GPS nativo emite una coordenada física diferente
    await act(async () => {
      watchSuccessCallback?.({
        coords: { latitude: -38.800, longitude: -72.800 },
        timestamp: Date.now() + 5000,
      });
    });

    // La lectura física debe ser descartada y NO llamar a la mutación
    expect(updateLocMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          lat: -38.800,
          lng: -72.800,
        }),
      })
    );

    await act(async () => {
      locationSimulator.disableSimulation();
    });
    view.unmount();
  });

  it('DEV SIMULATION: emite updateProviderLocation cuando el proveedor en mapa abierto se mueve', async () => {
    mockRole = 'provider';
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: {
          id: 99,
          isRealtimeActive: true,
          activeRealtimeOrder: null, // Sin orden activa, solo disponible
        },
      },
      myRealtimeOrdersAsClient: [],
    };

    const AvailableProviderConsumer: React.FC = () => {
      useTimeRealServices();
      return <Text>test-avail-sim</Text>;
    };

    const view = await render(<AvailableProviderConsumer />);
    const updateProvLocMock = mockMutationMap['UpdateProviderLocation'];
    expect(updateProvLocMock).toBeDefined();
    updateProvLocMock.mockClear();

    // Simular movimiento con el joystick
    await act(async () => {
      locationSimulator.enableSimulation({ latitude: -38.730, longitude: -72.580 });
    });

    expect(updateProvLocMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          lat: -38.730,
          lng: -72.580,
        }),
      })
    );

    await act(async () => {
      locationSimulator.disableSimulation();
    });
    view.unmount();
  });

  it('START_ORDER: mutación exitosa actualiza el estado a IN_PROGRESS', async () => {
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: null,
      },
      myRealtimeOrdersAsClient: [],
    };

    let hookMethods: any = null;
    const Consumer: React.FC = () => {
      hookMethods = useTimeRealServices();
      return <Text testID="order-status">{hookMethods.localActiveOrder?.status || 'NONE'}</Text>;
    };

    const view = await render(<Consumer />);
    await act(async () => {
      hookMethods.setLocalActiveOrder({ id: 501, status: 'ARRIVED' });
    });

    const startOrderMock = mockMutationMap['StartRealtimeOrder'];
    startOrderMock.mockResolvedValueOnce({
      data: {
        startRealtimeOrder: {
          id: 501,
          status: 'IN_PROGRESS',
          startedAt: '2026-09-24T00:00:00.000Z',
          arrivedAt: '2026-09-23T23:55:00.000Z',
        },
      },
    });

    await act(async () => {
      await hookMethods.startOrder(501);
    });

    expect(startOrderMock).toHaveBeenCalledWith({
      variables: { orderRealtimeId: 501 },
    });
    expect(hookMethods.localActiveOrder?.status).toBe('IN_PROGRESS');
    view.unmount();
  });

  it('START_ORDER: mutación rechazada restaura el estado previo (rollback) y relanza el error', async () => {
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: null,
        provider: null,
      },
      myRealtimeOrdersAsClient: [],
    };

    let hookMethods: any = null;
    const Consumer: React.FC = () => {
      hookMethods = useTimeRealServices();
      return <Text testID="order-status">{hookMethods.localActiveOrder?.status || 'NONE'}</Text>;
    };

    const view = await render(<Consumer />);
    await act(async () => {
      hookMethods.setLocalActiveOrder({ id: 502, status: 'ARRIVED' });
    });

    const startOrderMock = mockMutationMap['StartRealtimeOrder'];
    startOrderMock.mockRejectedValueOnce(new Error('Geofence validation failed'));

    await act(async () => {
      await expect(hookMethods.startOrder(502)).rejects.toThrow('Geofence validation failed');
    });

    expect(startOrderMock).toHaveBeenCalledWith({
      variables: { orderRealtimeId: 502 },
    });
    expect(hookMethods.localActiveOrder?.status).toBe('ARRIVED');
    view.unmount();
  });
});


