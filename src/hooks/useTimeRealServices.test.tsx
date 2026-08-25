import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTimeRealServices } from './useTimeRealServices';
import { io } from 'socket.io-client';

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
  useAuth: () => ({ token: mockToken, user: { id: 42, provider: { id: 99 } } }),
}));

jest.mock('../context/RoleContext', () => ({
  useRole: () => ({ role: mockRole, setRole: mockSetRole }),
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

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
  useMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { loading: false }],
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
    view.unmount();

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
});
