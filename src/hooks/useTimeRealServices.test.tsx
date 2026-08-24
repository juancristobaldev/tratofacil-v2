import React from 'react';
import { render, act } from '@testing-library/react-native';
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

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ token: mockToken, user: { id: 42, provider: { id: 99 } } }),
}));

jest.mock('../context/RoleContext', () => ({
  useRole: () => ({ role: mockRole, setRole: jest.fn() }),
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({
    cache: { modify: jest.fn() },
  }),
  useQuery: () => ({
    data: {
      me: { id: 42, activeRealtimeOrder: null, provider: null },
      myRealtimeOrdersAsClient: [],
    },
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
});
