import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FocusModeProviderScreen } from './provider/FocusModeProviderScreen';
import { FocusModeClientScreen } from './client/FocusModeClientScreen';

let mockLocation: any = {
  coords: {
    latitude: -38.745,
    longitude: -72.595,
    heading: 90,
  },
};

let mockProviderSession: any = {
  activeOrder: { id: 1, status: 'ACCEPTED', client: { name: 'Cliente Test' } },
  orderState: 'ACCEPTED',
  providerCoords: { latitude: -38.745, longitude: -72.595 },
  clientCoords: { latitude: -38.750, longitude: -72.600 },
  routeCoords: [
    { latitude: -38.745, longitude: -72.595 },
    { latitude: -38.750, longitude: -72.600 },
  ],
  showChat: false,
  setShowChat: jest.fn(),
  realtime: {},
};

let mockClientSession: any = {
  activeOrder: { id: 1, status: 'ACCEPTED' },
  provider: { name: 'Proveedor Test', avatar: null },
  providerCoords: { latitude: -38.745, longitude: -72.595 },
  clientCoords: { latitude: -38.750, longitude: -72.600 },
  routeCoords: [
    { latitude: -38.745, longitude: -72.595 },
    { latitude: -38.750, longitude: -72.600 },
  ],
  showChat: false,
  setShowChat: jest.fn(),
};

jest.mock('../context/LocationContext', () => ({
  useLocation: () => ({ location: mockLocation }),
}));

jest.mock('../features/focus-session/useFocusSession', () => ({
  useFocusSession: (role: string) => (role === 'provider' ? mockProviderSession : mockClientSession),
}));

jest.mock('../realtime/RealtimeContext', () => ({
  useRealtime: () => ({
    clientOrders: [],
    cancelOrder: jest.fn(),
  }),
}));

jest.mock('../bottom-sheet/core/useBottomSheet', () => ({
  useBottomSheet: () => ({
    sheetMetrics: { sheetTop: 500, index: 1, isCollapsed: false },
    setIndex: jest.fn(),
    active: 'focus_provider',
    dismiss: jest.fn(),
  }),
}));

jest.mock('../bottom-sheet/core/useMapSheetCollapse', () => ({
  useMapSheetCollapse: () => ({
    handleMapPanDrag: jest.fn(),
    handleMapRegionChangeComplete: jest.fn(),
    cancelPendingRestore: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useIsFocused: () => true,
  useRoute: () => ({ params: {} }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('lucide-react-native', () => {
  const mockReact = require('react');
  const { Text } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, iconName) => (props: any) =>
        mockReact.createElement(
          Text,
          {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
            ...props,
          },
          String(iconName),
        ),
    },
  );
});

describe('Focus Screens Navigation Control Integration', () => {
  beforeEach(() => {
    mockLocation = {
      coords: {
        latitude: -38.745,
        longitude: -72.595,
        heading: 90,
      },
    };
    mockProviderSession = {
      activeOrder: { id: 1, status: 'ACCEPTED', client: { name: 'Cliente Test' } },
      orderState: 'ACCEPTED',
      providerCoords: { latitude: -38.745, longitude: -72.595 },
      clientCoords: { latitude: -38.750, longitude: -72.600 },
      routeCoords: [
        { latitude: -38.745, longitude: -72.595 },
        { latitude: -38.750, longitude: -72.600 },
      ],
      showChat: false,
      setShowChat: jest.fn(),
      realtime: {},
    };
    mockClientSession = {
      activeOrder: { id: 1, status: 'ACCEPTED' },
      provider: { name: 'Proveedor Test', avatar: null },
      providerCoords: { latitude: -38.745, longitude: -72.595 },
      clientCoords: { latitude: -38.750, longitude: -72.600 },
      routeCoords: [
        { latitude: -38.745, longitude: -72.595 },
        { latitude: -38.750, longitude: -72.600 },
      ],
      showChat: false,
      setShowChat: jest.fn(),
    };
  });

  it.each(['PENDING', 'QUOTED', 'PAYMENT_PENDING', 'ACCEPTED', 'IN_PROGRESS'])(
    'FocusModeProviderScreen renders enabled navigation controls for non-terminal status %s',
    async (status) => {
      mockProviderSession.activeOrder = { id: 1, status, client: { name: 'Cliente Test' } };
      const view = await render(<FocusModeProviderScreen />);

      const navBtn = view.getByTestId('btn-toggle-navigation-mode');
      expect(navBtn).toBeTruthy();
      expect(navBtn.props.accessibilityState.selected).toBe(false);
      expect(navBtn.props.accessibilityState.disabled).toBe(false);

      await fireEvent.press(navBtn);
      expect(navBtn.props.accessibilityState.selected).toBe(true);

      await fireEvent.press(navBtn);
      expect(navBtn.props.accessibilityState.selected).toBe(false);
    },
  );

  it('FocusModeProviderScreen enables navigation with client coordinate fallback when provider GPS is unavailable', async () => {
    mockLocation = { coords: null };
    mockProviderSession.providerCoords = null;
    mockProviderSession.clientCoords = { latitude: -38.750, longitude: -72.600 };

    const view = await render(<FocusModeProviderScreen />);

    const navBtn = view.getByTestId('btn-toggle-navigation-mode');
    expect(navBtn.props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(navBtn);
    expect(navBtn.props.accessibilityState.selected).toBe(true);
  });

  it('FocusModeProviderScreen navigation uses HomePage camera timing instead of provider-specific override', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const view = await render(<FocusModeProviderScreen />);

    await fireEvent.press(view.getByTestId('btn-toggle-navigation-mode'));

    const navigationWriteLogs = logSpy.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes('[MAP:NAVIGATION_WRITE]'));

    expect(navigationWriteLogs.some((message) => message.includes('pitch=60°'))).toBe(true);
    expect(navigationWriteLogs.some((message) => message.includes('duration=650ms'))).toBe(false);

    logSpy.mockRestore();
  });

  it('FocusModeProviderScreen smart framing recenters on route and provider', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const view = await render(<FocusModeProviderScreen />);

    const smartFramingBtn = view.getByTestId('btn-smart-framing');
    expect(smartFramingBtn).toBeTruthy();

    await fireEvent.press(smartFramingBtn);

    const logs = logSpy.mock.calls.map((call) => String(call[0]));
    expect(logs.some((message) => message.includes('[MAP:FIT_ROUTE] reason=smart_framing_realtime_order'))).toBe(true);
    expect(logs.some((message) => message.includes('[MAP:RECENTER]'))).toBe(false);

    logSpy.mockRestore();
  });

  it('FocusModeClientScreen renders smart framing but not navigation when status is ACCEPTED', async () => {
    mockClientSession.activeOrder = { id: 1, status: 'ACCEPTED' };
    const view = await render(<FocusModeClientScreen />);

    expect(view.queryByTestId('btn-toggle-navigation-mode')).toBeNull();
    expect(view.getByTestId('btn-smart-framing')).toBeTruthy();
  });
});
