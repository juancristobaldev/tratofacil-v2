import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { render, fireEvent } from '@testing-library/react-native';
import { MapFloatingNavigationControls } from '../components/ui/MapFloatingNavigationControls';
import { FocusSessionProvider, useFocusSession } from '../features/focus-session/FocusSessionProvider';
import type { RouteCoordinate } from '../utils/directions';

let mockRealtime: any;
let mockLocation: any;

jest.mock('../realtime/RealtimeContext', () => ({
  useRealtime: () => mockRealtime,
}));

jest.mock('../context/LocationContext', () => ({
  useLocation: () => ({ location: mockLocation }),
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: jest.fn() }),
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

function CaptureClientSession({ onValue }: { onValue: (value: any) => void }) {
  const session = useFocusSession('client');
  onValue(session);
  return null;
}

function CaptureProviderSession({ onValue }: { onValue: (value: any) => void }) {
  const session = useFocusSession('provider');
  onValue(session);
  return null;
}

describe('Phase 1 - Geographic Truth & Marker Integrity Invariants', () => {
  beforeEach(() => {
    mockLocation = {
      coords: {
        latitude: -38.7396,
        longitude: -72.5901,
        heading: 45,
      },
    };
    mockRealtime = {
      activeOrder: null,
      localActiveOrder: null,
      providerActiveOrder: null,
      clientOrders: [],
      setLocalActiveOrder: jest.fn(),
    };
  });

  describe('Invariant 1: MapFloatingNavigationControls subjectCoordinate isolation', () => {
    it('activates navigation strictly using subjectCoordinate and ignores destinationCoordinate', async () => {
      const onToggleNavigation = jest.fn();
      const subjectCoord: RouteCoordinate = { latitude: -38.7396, longitude: -72.5901 };
      const destinationCoord: RouteCoordinate = { latitude: -38.7500, longitude: -72.6000 };

      const view = await render(
        <MapFloatingNavigationControls
          isNavigating={false}
          subjectCoordinate={subjectCoord}
          destinationCoordinate={destinationCoord}
          targetCoordinate={subjectCoord}
          heading={45}
          onToggleNavigation={onToggleNavigation}
          showNavigation={true}
        />
      );

      const navBtn = view.getByTestId('btn-toggle-navigation-mode');
      expect(navBtn.props.accessibilityState.disabled).toBe(false);

      await fireEvent.press(navBtn);

      expect(onToggleNavigation).toHaveBeenCalledTimes(1);
      expect(onToggleNavigation).toHaveBeenCalledWith(subjectCoord, {
        heading: 45,
        animated: true,
        force: true,
      });
      // Crucial: Must NEVER have been called with destinationCoord
      expect(onToggleNavigation).not.toHaveBeenCalledWith(destinationCoord, expect.anything());
    });

    it('disables navigation toggle when subjectCoordinate is null even if destinationCoordinate is present', async () => {
      const onToggleNavigation = jest.fn();
      const destinationCoord: RouteCoordinate = { latitude: -38.7500, longitude: -72.6000 };

      const view = await render(
        <MapFloatingNavigationControls
          isNavigating={false}
          subjectCoordinate={null}
          destinationCoordinate={destinationCoord}
          targetCoordinate={null}
          onToggleNavigation={onToggleNavigation}
          showNavigation={true}
        />
      );

      const navBtn = view.getByTestId('btn-toggle-navigation-mode');
      expect(navBtn.props.accessibilityState.disabled).toBe(true);

      await fireEvent.press(navBtn);
      expect(onToggleNavigation).not.toHaveBeenCalled();
    });
  });

  describe('Invariant 2: FocusSessionProvider semantic distinction between live GPS and order destination', () => {
    it('properly distinguishes client live GPS (clientUserCoords) from order destination (serviceDestinationCoords)', () => {
      mockLocation = {
        coords: {
          latitude: -38.7300,
          longitude: -72.5800,
        },
      };
      mockRealtime.activeOrder = {
        id: 42,
        status: 'ACCEPTED',
        clientLat: -38.7400,
        clientLng: -72.5900,
        providerLat: -38.7500,
        providerLng: -72.6000,
        provider: {
          id: 'prov_1',
          name: 'Tech Master',
        },
      };

      let capturedClient: any;
      act(() => {
        ReactTestRenderer.create(
          <FocusSessionProvider>
            <CaptureClientSession onValue={(value) => { capturedClient = value; }} />
          </FocusSessionProvider>,
        );
      });

      // Live user GPS
      expect(capturedClient.clientUserCoords).toEqual({ latitude: -38.7300, longitude: -72.5800 });
      // Fixed order destination
      expect(capturedClient.serviceDestinationCoords).toEqual({ latitude: -38.7400, longitude: -72.5900 });
      // Provider coordinates
      expect(capturedClient.providerCoords).toEqual({ latitude: -38.7500, longitude: -72.6000 });
    });

    it('properly distinguishes provider live GPS (providerLocalCoords) from client destination (serviceDestinationCoords)', () => {
      mockLocation = {
        coords: {
          latitude: -38.7100,
          longitude: -72.5600,
        },
      };
      mockRealtime.providerActiveOrder = {
        id: 99,
        status: 'EN_CAMINO',
        clientLat: -38.7400,
        clientLng: -72.5900,
        providerLat: -38.7100,
        providerLng: -72.5600,
      };

      let capturedProvider: any;
      act(() => {
        ReactTestRenderer.create(
          <FocusSessionProvider>
            <CaptureProviderSession onValue={(value) => { capturedProvider = value; }} />
          </FocusSessionProvider>,
        );
      });

      // Moving provider GPS
      expect(capturedProvider.providerLocalCoords).toEqual({ latitude: -38.7100, longitude: -72.5600 });
      // Fixed client service destination
      expect(capturedProvider.serviceDestinationCoords).toEqual({ latitude: -38.7400, longitude: -72.5900 });
    });
  });
});
