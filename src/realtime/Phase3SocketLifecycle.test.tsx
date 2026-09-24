import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useTimeRealServices } from '../hooks/useTimeRealServices';
import { FocusChatOverlay } from '../screens/client/components/FocusChatOverlay';
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
const mockRefetchClientOrders = jest.fn();
const mockSetRole = jest.fn();
const mockCacheModify = jest.fn();
let mockQueryData: any = {
  me: { id: 42, activeRealtimeOrder: null, provider: null },
  myRealtimeOrdersAsClient: [],
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    token: mockToken,
    isAuthenticated: Boolean(mockToken),
    user: { id: 42, provider: { id: 99 } },
  }),
}));

jest.mock('../context/RoleContext', () => ({
  useRole: () => ({ role: mockRole, setRole: mockSetRole }),
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({
    cache: { modify: mockCacheModify },
    refetchQueries: jest.fn(),
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

describe('Phase 3 — Socket Lifecycle, Subscription Registry & Chat Rejoin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'client';
    mockToken = 'mock_jwt_token';
  });

  describe('RT-1: Role Switch Resilience', () => {
    it('switching between client and provider roles does NOT disconnect or re-instantiate socket', async () => {
      mockRole = 'client';
      let hookData: any;
      const TestConsumer: React.FC = () => {
        hookData = useTimeRealServices();
        return <Text testID="socket-status">{hookData.socketStatus}</Text>;
      };

      const view = await render(<TestConsumer />);

      expect(io).toHaveBeenCalledTimes(1);
      expect(mockSocketDisconnect).not.toHaveBeenCalled();

      // Switch to provider
      mockRole = 'provider';
      await act(async () => {
        view.rerender(<TestConsumer />);
      });

      expect(io).toHaveBeenCalledTimes(1);
      expect(mockSocketDisconnect).not.toHaveBeenCalled();

      // Switch back to client
      mockRole = 'client';
      await act(async () => {
        view.rerender(<TestConsumer />);
      });

      expect(io).toHaveBeenCalledTimes(1);
      expect(mockSocketDisconnect).not.toHaveBeenCalled();

      await act(async () => {
        view.unmount();
      });
      expect(mockSocketDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('RT-2 & RT-3: Subscription Registry & Isolation', () => {
    it('supports multiple independent subscribers without duplicate socket listeners', async () => {
      let hookData: any;
      const TestConsumer: React.FC = () => {
        hookData = useTimeRealServices();
        return <Text testID="sub-test">test</Text>;
      };

      const view = await render(<TestConsumer />);

      const sub1 = jest.fn();
      const sub2 = jest.fn();
      const sub3 = jest.fn();

      const unsub1 = hookData.subscribe('provider:realtime:status', sub1);
      const unsub2 = hookData.subscribe('provider:realtime:status', sub2);
      const unsub3 = hookData.subscribe('chat:received', sub3);

      const statusCall = mockSocketOn.mock.calls.find((c) => c[0] === 'provider:realtime:status');
      const chatCall = mockSocketOn.mock.calls.find((c) => c[0] === 'chat:received');

      expect(statusCall).toBeDefined();
      expect(chatCall).toBeDefined();

      // Dispatch provider:realtime:status
      await act(async () => {
        statusCall[1]({ providerId: 101, isRealtimeActive: true });
      });

      expect(sub1).toHaveBeenCalledWith({ providerId: 101, isRealtimeActive: true });
      expect(sub2).toHaveBeenCalledWith({ providerId: 101, isRealtimeActive: true });
      expect(sub3).not.toHaveBeenCalled();

      // Dispatch chat:received
      await act(async () => {
        chatCall[1]({ orderRealtimeId: 50, message: 'Hola' });
      });

      expect(sub3).toHaveBeenCalledWith({ orderRealtimeId: 50, message: 'Hola' });

      // Unsubscribe sub1 only
      unsub1();
      sub1.mockClear();
      sub2.mockClear();

      await act(async () => {
        statusCall[1]({ providerId: 102, isRealtimeActive: false });
      });

      expect(sub1).not.toHaveBeenCalled();
      expect(sub2).toHaveBeenCalledWith({ providerId: 102, isRealtimeActive: false });

      unsub2();
      unsub3();
      view.unmount();
    });

    it('catches and logs subscriber errors without breaking other subscribers or socket handler', async () => {
      let hookData: any;
      const TestConsumer: React.FC = () => {
        hookData = useTimeRealServices();
        return <Text testID="sub-error-test">test</Text>;
      };

      const view = await render(<TestConsumer />);

      const faultySub = jest.fn(() => {
        throw new Error('Explosion in subscriber');
      });
      const healthySub = jest.fn();

      hookData.subscribe('provider:connect-requested', faultySub);
      hookData.subscribe('provider:connect-requested', healthySub);

      const connectReqCall = mockSocketOn.mock.calls.find((c) => c[0] === 'provider:connect-requested');
      expect(connectReqCall).toBeDefined();

      await act(async () => {
        connectReqCall[1]({ serviceProviderId: 1, clientName: 'Ana' });
      });

      expect(faultySub).toHaveBeenCalled();
      expect(healthySub).toHaveBeenCalledWith({ serviceProviderId: 1, clientName: 'Ana' });

      view.unmount();
    });
  });

  describe('RT-4 & RT-5: Chat Auto-Rejoin & Reconnection Generation', () => {
    it('increments connectionGeneration on socket connect and automatically re-joins active chat room', async () => {
      let hookData: any;
      const TestConsumer: React.FC = () => {
        hookData = useTimeRealServices();
        return <Text testID="gen-test">{hookData.connectionGeneration}</Text>;
      };

      const view = await render(<TestConsumer />);

      const initialGen = hookData.connectionGeneration;

      // Join chat room 999
      await act(async () => {
        hookData.joinChat(999);
      });

      expect(mockSocketEmit).toHaveBeenCalledWith('chat:join', { orderRealtimeId: 999 });
      mockSocketEmit.mockClear();

      // Simulate reconnect
      const connectCall = mockSocketOn.mock.calls.find((c) => c[0] === 'connect');
      expect(connectCall).toBeDefined();

      await act(async () => {
        connectCall[1]();
      });

      expect(hookData.connectionGeneration).toBe(initialGen + 1);
      expect(mockSocketEmit).toHaveBeenCalledWith('chat:join', { orderRealtimeId: 999 });

      // Leave chat room
      await act(async () => {
        hookData.leaveChat(999);
      });

      expect(mockSocketEmit).toHaveBeenCalledWith('chat:leave', { orderRealtimeId: 999 });
      mockSocketEmit.mockClear();

      // Another reconnect should NOT re-join 999
      await act(async () => {
        connectCall[1]();
      });

      expect(hookData.connectionGeneration).toBe(initialGen + 2);
      expect(mockSocketEmit).not.toHaveBeenCalledWith('chat:join', { orderRealtimeId: 999 });

      view.unmount();
    });

    it('FocusChatOverlay integrates cleanly via realtime.subscribe and joinChat/leaveChat', async () => {
      const mockRealtime = {
        clientId: 42,
        subscribe: jest.fn((event: string, handler: Function) => {
          return () => {};
        }),
        joinChat: jest.fn(),
        leaveChat: jest.fn(),
        sendMessage: jest.fn().mockResolvedValue({}),
      };

      const activeOrder = { id: 707, status: 'IN_PROGRESS' };
      const chatUser = { name: 'Pedro' };

      let view: any;
      await act(async () => {
        view = await render(
          <FocusChatOverlay
            chatUser={chatUser}
            activeOrder={activeOrder}
            realtime={mockRealtime}
            role="client"
            onClose={jest.fn()}
          />,
        );
      });

      expect(mockRealtime.joinChat).toHaveBeenCalledWith(707);
      expect(mockRealtime.subscribe).toHaveBeenCalledWith('chat:received', expect.any(Function));

      await act(async () => {
        view.unmount();
      });

      expect(mockRealtime.leaveChat).toHaveBeenCalledWith(707);
    });
  });

  describe('RT-6: Invariant & Core Domain Preservation', () => {
    it('domain events update Apollo cache and trigger local refetches while dispatching to subscribers', async () => {
      let hookData: any;
      const TestConsumer: React.FC = () => {
        hookData = useTimeRealServices();
        return <Text testID="domain-test">test</Text>;
      };

      const view = await render(<TestConsumer />);

      const subscriber = jest.fn();
      hookData.subscribe('order-realtime:updated', subscriber);

      const updateCall = mockSocketOn.mock.calls.find((c) => c[0] === 'order-realtime:updated');
      expect(updateCall).toBeDefined();

      await act(async () => {
        updateCall[1]({
          orderRealtimeId: 1234,
          status: 'ACCEPTED',
          quotedPrice: 20000,
        });
      });

      // 1. Apollo cache was modified
      expect(mockCacheModify).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'OrderRealTime:1234',
        }),
      );

      // 2. Subscriber received the payload
      expect(subscriber).toHaveBeenCalledWith({
        orderRealtimeId: 1234,
        status: 'ACCEPTED',
        quotedPrice: 20000,
      });

      view.unmount();
    });
  });
});
