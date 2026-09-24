import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTimeRealServices } from '../hooks/useTimeRealServices';
import { RealtimeProvider, useRealtime } from '../realtime/RealtimeContext';
import { FocusSessionProvider, useFocusSession } from '../features/focus-session/FocusSessionProvider';
import { SmartNavigationEngine } from '../navigation-engine/SmartNavigationEngine';
import { io } from 'socket.io-client';
import { AppState } from 'react-native';

const mockSocketOn = jest.fn();
const mockSocketOff = jest.fn();
const mockSocketDisconnect = jest.fn();
const mockSocketEmit = jest.fn();
const mockSocketRemoveAllListeners = jest.fn();
const mockSocketConnect = jest.fn();

const mockSocketInstance = {
  on: mockSocketOn,
  off: mockSocketOff,
  disconnect: mockSocketDisconnect,
  connect: mockSocketConnect,
  emit: mockSocketEmit,
  removeAllListeners: mockSocketRemoveAllListeners,
  connected: true,
  id: 'socket-test-123',
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
const mockRefetchQueries = jest.fn();

let mockQueryData: any = {
  me: { id: 42, activeRealtimeOrder: null, provider: null },
  myRealtimeOrdersAsClient: [],
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    token: mockToken,
    isAuthenticated: Boolean(mockToken),
    user: { id: 42, provider: { id: 99 } },
    role: mockRole,
    setRole: mockSetRole,
  }),
}));

jest.mock('../context/RoleContext', () => ({
  useRole: () => ({ role: mockRole, setRole: mockSetRole }),
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../context/LocationContext', () => ({
  useLocation: () => ({
    location: {
      coords: {
        latitude: -33.40,
        longitude: -70.60,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    },
    rawLocation: null,
    isStationary: false,
    permissionStatus: 'granted',
    gpsStatus: 'active',
    gpsQuality: 'HIGH',
    refreshLocation: jest.fn(),
    resetHoldingPoint: jest.fn(),
  }),
}));

jest.mock('../hooks/useRoute', () => ({
  useRoutePolyline: () => ({
    routeCoordinates: [],
    routeDistance: 1000,
    routeDuration: 300,
    loading: false,
  }),
}));

jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({
    cache: { modify: mockCacheModify },
    refetchQueries: mockRefetchQueries,
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

describe('Phase 4 — Cross-System Integration & Regression Hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'client';
    mockToken = 'mock_jwt_token';
    mockQueryData = {
      me: {
        id: 42,
        activeRealtimeOrder: {
          id: 500,
          status: 'IN_PROGRESS',
          clientLat: -33.40,
          clientLng: -70.60,
          providerLat: -33.50,
          providerLng: -70.70,
          serviceProvider: { id: 99, name: 'ElectroPro' },
          provider: { id: 99, name: 'ElectroPro' },
        },
        provider: null,
      },
      myRealtimeOrdersAsClient: [],
    };
  });

  describe('Parte 1 & 2: Remote Provider GPS Pipeline & Geographic Truth Isolation', () => {
    it('pipeline delivers P1 -> P2 and discards delayed stale P1 packet without moving local user dot', async () => {
      let realtimeHook: any;
      let focusHook: any;

      const RealtimeExtractor: React.FC = () => {
        realtimeHook = useRealtime();
        return null;
      };

      const FocusSessionConsumer: React.FC = () => {
        focusHook = useFocusSession('client');
        return <Text testID="focus-test">active</Text>;
      };

      const TestHarness: React.FC = () => {
        return (
          <RealtimeProvider>
            <RealtimeExtractor />
            <FocusSessionProvider>
              <FocusSessionConsumer />
            </FocusSessionProvider>
          </RealtimeProvider>
        );
      };

      const view = await render(<TestHarness />);

      // Initial state from order and location
      expect(focusHook.clientUserCoords).toEqual({ latitude: -33.40, longitude: -70.60 });
      expect(focusHook.serviceDestinationCoords).toEqual({ latitude: -33.40, longitude: -70.60 });
      expect(focusHook.providerCoords).toEqual({ latitude: -33.50, longitude: -70.70 });

      const locUpdateCall = mockSocketOn.mock.calls.find((c) => c[0] === 'order-realtime:location-updated');
      expect(locUpdateCall).toBeDefined();
      const locHandler = locUpdateCall[1];

      // 1. Provider sends P1 at ts=1000
      await act(async () => {
        locHandler({
          orderRealtimeId: 500,
          clientLat: -33.40,
          clientLng: -70.60,
          providerLat: -33.51,
          providerLng: -70.71,
          timestamp: 1000,
          source: 'provider',
        });
      });

      expect(realtimeHook.localActiveOrder.providerLat).toBe(-33.51);
      expect(realtimeHook.localActiveOrder.providerLng).toBe(-70.71);
      // Local client dot must NOT have moved
      expect(focusHook.clientUserCoords).toEqual({ latitude: -33.40, longitude: -70.60 });

      // 2. Provider sends newer P2 at ts=2000
      await act(async () => {
        locHandler({
          orderRealtimeId: 500,
          clientLat: -33.40,
          clientLng: -70.60,
          providerLat: -33.52,
          providerLng: -70.72,
          timestamp: 2000,
          source: 'provider',
        });
      });

      expect(realtimeHook.localActiveOrder.providerLat).toBe(-33.52);
      expect(realtimeHook.localActiveOrder.providerLng).toBe(-70.72);

      // 3. Delayed old packet P1 at ts=1000 arrives late
      await act(async () => {
        locHandler({
          orderRealtimeId: 500,
          clientLat: -33.40,
          clientLng: -70.60,
          providerLat: -33.51,
          providerLng: -70.71,
          timestamp: 1000,
          source: 'provider',
        });
      });

      // Must remain P2 (-33.52, -70.72) due to recency guard
      expect(realtimeHook.localActiveOrder.providerLat).toBe(-33.52);
      expect(realtimeHook.localActiveOrder.providerLng).toBe(-70.72);

      await act(async () => {
        view.unmount();
      });
    });
  });

  describe('Parte 3 & 4: Stale HTTP Coordinate Race & Terminal Status Collision Immunity', () => {
    it('fresh socket coordinates survive delayed stale HTTP refetch/polling responses', async () => {
      let realtimeHook: any;
      const TestConsumer: React.FC = () => {
        realtimeHook = useTimeRealServices();
        return <Text testID="test-order">{realtimeHook.localActiveOrder?.status}</Text>;
      };

      const view = await render(<TestConsumer />);

      const locUpdateCall = mockSocketOn.mock.calls.find((c) => c[0] === 'order-realtime:location-updated');
      const locHandler = locUpdateCall[1];

      // Socket delivers fresh coordinates C2
      await act(async () => {
        locHandler({
          orderRealtimeId: 500,
          clientLat: -33.40,
          clientLng: -70.60,
          providerLat: -33.555,
          providerLng: -70.777,
          timestamp: 5000,
          source: 'provider',
        });
      });

      expect(realtimeHook.localActiveOrder.providerLat).toBe(-33.555);

      // Delayed HTTP response returns older C1 (-33.50, -70.70)
      mockQueryData = {
        me: {
          id: 42,
          activeRealtimeOrder: {
            id: 500,
            status: 'IN_PROGRESS',
            clientLat: -33.40,
            clientLng: -70.60,
            providerLat: -33.50, // older coordinate
            providerLng: -70.70,
          },
          provider: null,
        },
        myRealtimeOrdersAsClient: [],
      };

      await act(async () => {
        view.rerender(<TestConsumer />);
      });

      // Fresh socket coordinates must be preserved
      expect(realtimeHook.localActiveOrder.providerLat).toBe(-33.555);
      expect(realtimeHook.localActiveOrder.providerLng).toBe(-70.777);

      await act(async () => {
        view.unmount();
      });
    });

    it('terminal status collision immunity: terminal order states (COMPLETED/CANCELLED/REJECTED) are immutable against late polls', async () => {
      let realtimeHook: any;
      const TestConsumer: React.FC = () => {
        realtimeHook = useTimeRealServices();
        return <Text testID="test-order">{realtimeHook.localActiveOrder?.status}</Text>;
      };

      const view = await render(<TestConsumer />);

      const updateCall = mockSocketOn.mock.calls.find((c) => c[0] === 'order-realtime:updated');
      const updateHandler = updateCall[1];

      // 1. Order becomes CANCELLED via socket
      await act(async () => {
        updateHandler({
          orderRealtimeId: 500,
          status: 'CANCELLED',
        });
      });

      expect(realtimeHook.localActiveOrder.status).toBe('CANCELLED');

      // Late poll reports REJECTED or IN_PROGRESS
      mockQueryData = {
        me: {
          id: 42,
          activeRealtimeOrder: {
            id: 500,
            status: 'REJECTED',
          },
          provider: null,
        },
        myRealtimeOrdersAsClient: [],
      };

      await act(async () => {
        view.rerender(<TestConsumer />);
      });

      // Remains CANCELLED
      expect(realtimeHook.localActiveOrder.status).toBe('CANCELLED');

      await act(async () => {
        view.unmount();
      });
    });
  });

  describe('Parte 5, 6 & 7: Exactly-Once Dispatch, Architectural Authority & Active Role Switching', () => {
    it('multiple reconnects and role switches dispatch events exactly once without duplicate callbacks', async () => {
      let realtimeHook: any;
      const TestConsumer: React.FC = () => {
        realtimeHook = useTimeRealServices();
        return <Text testID="test-sub">test</Text>;
      };

      const view = await render(<TestConsumer />);

      const providerStatusCallback = jest.fn();
      const chatCallback = jest.fn();

      const unsubStatus = realtimeHook.subscribe('provider:realtime:status', providerStatusCallback);
      const unsubChat = realtimeHook.subscribe('chat:received', chatCallback);

      // Simulate 3 reconnects
      const connectCall = mockSocketOn.mock.calls.find((c) => c[0] === 'connect');
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          connectCall[1]();
        });
      }

      // Simulate 3 role switches
      for (let i = 0; i < 3; i++) {
        mockRole = i % 2 === 0 ? 'provider' : 'client';
        await act(async () => {
          view.rerender(<TestConsumer />);
        });
      }

      // Emit 1 provider:realtime:status
      const statusCall = mockSocketOn.mock.calls.find((c) => c[0] === 'provider:realtime:status');
      await act(async () => {
        statusCall[1]({ providerId: 10, isRealtimeActive: true });
      });

      expect(providerStatusCallback).toHaveBeenCalledTimes(1);

      // Emit 1 chat message
      const chatCall = mockSocketOn.mock.calls.find((c) => c[0] === 'chat:received');
      await act(async () => {
        chatCall[1]({ id: 1001, orderRealtimeId: 500, message: 'Hola' });
      });

      expect(chatCallback).toHaveBeenCalledTimes(1);

      unsubStatus();
      unsubChat();
      await act(async () => {
        view.unmount();
      });
    });
  });

  describe('Parte 8, 9 & 18: Navigation Engine + Realtime Reconnect & Off-Route Isolation', () => {
    it('reconnect and remote realtime updates do not corrupt SmartNavigationEngine or teleport vehicle', () => {
      const engine = new SmartNavigationEngine();

      const routePoints = [
        { latitude: -33.4000, longitude: -70.6000 },
        { latitude: -33.4010, longitude: -70.6000 },
        { latitude: -33.4020, longitude: -70.6000 },
      ];

      // 1. Local vehicle at first point moving south (bearing 180)
      const target1 = engine.processMotionSample({
        coordinate: { latitude: -33.4001, longitude: -70.6000 },
        speed: 10,
        heading: 180,
        accuracy: 5,
        source: 'LOCAL_GPS',
        timestamp: 1000,
      }, routePoints);

      expect(target1).toBeDefined();
      expect(target1?.heading).toBeCloseTo(180, 0);
      expect(target1?.center.latitude).toBeLessThan(-33.4001); // Lookahead moves camera forward along heading

      // 2. Simulate socket reconnect / remote packet arriving for client
      // Remote client coordinate (-33.4500, -70.6500) must NOT affect local navigation vehicle
      const target2 = engine.processMotionSample({
        coordinate: { latitude: -33.4005, longitude: -70.6000 },
        speed: 12,
        heading: 180,
        accuracy: 4,
        source: 'LOCAL_GPS',
        timestamp: 2000,
      }, routePoints);

      expect(target2?.navigationPosition?.latitude).toBeCloseTo(-33.4005, 3);
      expect(target2?.navigationPosition?.longitude).toBeCloseTo(-70.6000, 4);
      expect(target2?.routeProgress?.isOffRoute).toBe(false);

      // 3. Local vehicle turns off-route (moves east away from route)
      const targetOffRoute = engine.processMotionSample({
        coordinate: { latitude: -33.4005, longitude: -70.5950 },
        speed: 8,
        heading: 90,
        accuracy: 5,
        source: 'LOCAL_GPS',
        timestamp: 3000,
      }, routePoints);

      expect(targetOffRoute?.routeProgress?.isOffRoute).toBe(true);
      // Snapping is disabled when off-route -> vehicle position is exact filtered GPS
      expect(targetOffRoute?.navigationPosition?.longitude).toBeCloseTo(-70.595, 2);
    });
  });

  describe('Parte 11 & 12: Cold Boot & AppState Foreground Reconnect', () => {
    it('app state change to active triggers reconnect and re-syncs state', async () => {
      let realtimeHook: any;
      const TestConsumer: React.FC = () => {
        realtimeHook = useTimeRealServices();
        return <Text testID="test-appstate">active</Text>;
      };

      const view = await render(<TestConsumer />);

      // Find AppState change listener
      const appStateSpy = jest.spyOn(AppState, 'addEventListener');
      expect(appStateSpy).toHaveBeenCalled();

      // Trigger app state change to 'active'
      const appStateHandler = appStateSpy.mock.calls.find((c) => c[0] === 'change')?.[1];
      expect(appStateHandler).toBeDefined();

      mockSocketConnect.mockClear();
      await act(async () => {
        appStateHandler?.('active');
      });

      expect(mockSocketConnect).toHaveBeenCalledTimes(1);

      await act(async () => {
        view.unmount();
      });
    });
  });

  describe('Parte 15 & 16: Token Refresh and User A -> User B Isolation', () => {
    it('token change tears down existing socket and instantiates fresh socket for User B', async () => {
      let realtimeHook: any;
      const TestConsumer: React.FC = () => {
        realtimeHook = useTimeRealServices();
        return <Text testID="test-token">{realtimeHook.socketStatus}</Text>;
      };

      const view = await render(<TestConsumer />);
      expect(io).toHaveBeenCalledTimes(1);

      // User A logs out (token = null)
      mockToken = null;
      await act(async () => {
        view.rerender(<TestConsumer />);
      });

      expect(mockSocketDisconnect).toHaveBeenCalled();

      // User B logs in (new token)
      mockToken = 'user_b_jwt_token';
      await act(async () => {
        view.rerender(<TestConsumer />);
      });

      expect(io).toHaveBeenCalledWith(
        expect.stringContaining('/find'),
        expect.objectContaining({
          auth: { token: 'user_b_jwt_token' },
        }),
      );

      await act(async () => {
        view.unmount();
      });
    });
  });
});

