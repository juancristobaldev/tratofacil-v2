import React from 'react';
import { StyleSheet } from 'react-native';
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

  it.each(['PENDING', 'QUOTED', 'PAYMENT_PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'])(
    'FocusModeProviderScreen enables automatic navigation for non-terminal status %s without manual toggle button',
    async (status) => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockProviderSession.activeOrder = { id: 1, status, client: { name: 'Cliente Test' } };
      mockProviderSession.orderState = status;
      const view = await render(<FocusModeProviderScreen />);

      // No existe botón manual para apagar la navegación (permanece encendida automáticamente)
      expect(view.queryByTestId('btn-toggle-navigation-mode')).toBeNull();
      // Smart framing retirado en proveedor
      expect(view.queryByTestId('btn-smart-framing')).toBeNull();

      // Verifica que la cámara se posicionó en modo navegación automáticamente
      const navigationWriteLogs = logSpy.mock.calls
        .map((call) => String(call[0]))
        .filter((message) => message.includes('[NAV:CAMERA_WRITE]') || message.includes('[MAP:NAVIGATION_WRITE]'));
      expect(navigationWriteLogs.some((message) => message.includes('pitch='))).toBe(true);

      logSpy.mockRestore();
    },
  );

  it('FocusModeProviderScreen disables navigation when provider GPS is unavailable without falling back to client coordinates', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockLocation = { coords: null };
    mockProviderSession.providerCoords = null;
    mockProviderSession.clientCoords = { latitude: -38.750, longitude: -72.600 };

    const view = await render(<FocusModeProviderScreen />);

    expect(view.queryByTestId('btn-toggle-navigation-mode')).toBeNull();

    const navigationWriteLogs = logSpy.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes('[NAV:CAMERA_WRITE]') || message.includes('[MAP:NAVIGATION_WRITE]'));
    expect(navigationWriteLogs.length).toBe(0);

    logSpy.mockRestore();
  });

  it('FocusModeProviderScreen navigation uses HomePage camera timing instead of provider-specific override', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await render(<FocusModeProviderScreen />);

    const navigationWriteLogs = logSpy.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes('[NAV:CAMERA_WRITE]') || message.includes('[MAP:NAVIGATION_WRITE]'));

    expect(navigationWriteLogs.some((message) => message.includes('pitch='))).toBe(true);
    expect(navigationWriteLogs.some((message) => message.includes('duration=650ms'))).toBe(false);

    logSpy.mockRestore();
  });

  it('FocusModeProviderScreen renders DrivingNavigationHUD when orderState is EN_CAMINO and keeps it mounted on panDrag', async () => {
    mockProviderSession.activeOrder = {
      id: 1,
      status: 'ACCEPTED',
      clientAddress: 'Av. Alemania 0123',
      client: { displayName: 'Juan Pérez' },
    };
    mockProviderSession.orderState = 'EN_CAMINO';
    mockProviderSession.distanceLabel = '1.8 km';
    mockProviderSession.etaLabel = '6 min';

    const view = await render(<FocusModeProviderScreen />);

    expect(view.getByTestId('driving-navigation-hud')).toBeTruthy();
    expect(view.getByText('6 min')).toBeTruthy();
    expect(view.getByText('1.8 km')).toBeTruthy();

    // Trigger pan drag on MapView (user moves the map)
    const mapView = view.getByTestId('provider-map-view');
    fireEvent(mapView, 'panDrag');

    // HUD MUST REMAIN MOUNTED AND PERSISTENT
    expect(view.getByTestId('driving-navigation-hud')).toBeTruthy();
    expect(view.getByText('6 min')).toBeTruthy();
    expect(view.getByText('1.8 km')).toBeTruthy();
  });

  it('FocusModeProviderScreen does not render smart framing button', async () => {
    const view = await render(<FocusModeProviderScreen />);
    expect(view.queryByTestId('btn-smart-framing')).toBeNull();
  });

  it('FocusModeClientScreen renders smart framing but not navigation when status is ACCEPTED', async () => {
    mockClientSession.activeOrder = { id: 1, status: 'ACCEPTED' };
    const view = await render(<FocusModeClientScreen />);

    expect(view.queryByTestId('btn-toggle-navigation-mode')).toBeNull();
    expect(view.getByTestId('btn-smart-framing')).toBeTruthy();
  });

  it('FocusModeClientScreen renders ClientArrivalHUD at top: 25 and smart framing at top: 109 below the HUD', async () => {
    mockClientSession.activeOrder = { id: 1, status: 'ACCEPTED' };
    mockClientSession.provider = { name: 'Carlos Electricista', avatar: null, rating: 4.8 };
    mockClientSession.etaLabel = '7 min';
    mockClientSession.distanceLabel = '2.1 km';

    const view = await render(<FocusModeClientScreen />);

    const clientHud = view.getByTestId('client-arrival-hud');
    expect(clientHud).toBeTruthy();
    expect(view.getByText('Carlos Electricista')).toBeTruthy();
    expect(view.getByText('~7 min')).toBeTruthy();
    expect(view.getByText('2.1 km')).toBeTruthy();

    // Verify HUD is positioned at top: 25 (matching Driving HUD)
    const hudStyle = StyleSheet.flatten(clientHud.props.style);
    expect(hudStyle.top).toBe(25);
    expect(hudStyle.position).toBe('absolute');

    // Verify MapFloatingNavigationControls is positioned below the HUD at top: 109
    const floatingControls = view.getByTestId('map-floating-navigation-controls');
    const controlsStyle = StyleSheet.flatten(floatingControls.props.style);
    expect(controlsStyle.top).toBe(109);
  });

  it('FocusModeClientScreen hides ClientArrivalHUD and restores smart framing position when status is ARRIVED', async () => {
    mockClientSession.activeOrder = { id: 1, status: 'ARRIVED' };
    const view = await render(<FocusModeClientScreen />);

    expect(view.queryByTestId('client-arrival-hud')).toBeNull();

    // Verify MapFloatingNavigationControls reverts to insets top
    const floatingControls = view.getByTestId('map-floating-navigation-controls');
    const controlsStyle = StyleSheet.flatten(floatingControls.props.style);
    // insets.top is 44, so top is 44 + 8 = 52
    expect(controlsStyle.top).toBe(52);
  });
});
