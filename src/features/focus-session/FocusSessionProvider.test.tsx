import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { FocusSessionProvider, useFocusSession } from './FocusSessionProvider';

let mockRealtime: any;
let mockLocation: any;

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => mockRealtime,
}));

jest.mock('../../context/LocationContext', () => ({
  useLocation: () => ({ location: mockLocation }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: jest.fn() }),
}));

jest.mock('../../hooks/useRoute', () => ({
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

function CaptureProviderSession({ onValue }: { onValue: (value: ReturnType<typeof useFocusSession>) => void }) {
  const session = useFocusSession('provider');
  onValue(session);
  return null;
}

describe('FocusSessionProvider geographic truth', () => {
  beforeEach(() => {
    mockLocation = {
      coords: {
        latitude: -33.45,
        longitude: -70.66,
      },
    };
    mockRealtime = {
      activeOrder: null,
      localActiveOrder: null,
      providerActiveOrder: null,
      setLocalActiveOrder: jest.fn(),
    };
  });

  it('does not use provider local GPS as provider-side client coordinates when order client coords are missing', () => {
    mockRealtime.providerActiveOrder = {
      id: 10,
      status: 'ACCEPTED',
      clientLat: null,
      clientLng: null,
      providerLat: -33.46,
      providerLng: -70.67,
    };

    let captured: any;
    act(() => {
      ReactTestRenderer.create(
        <FocusSessionProvider>
          <CaptureProviderSession onValue={(value) => { captured = value; }} />
        </FocusSessionProvider>,
      );
    });

    expect(captured.clientCoords).toBeNull();
    expect(captured.providerCoords).toEqual({ latitude: -33.45, longitude: -70.66 });
    expect(captured.distanceLabel).toBe('...');
    expect(captured.etaLabel).toBe('...');
  });

  it('uses exact order client coordinates for provider-side client coordinates when present', () => {
    mockRealtime.providerActiveOrder = {
      id: 11,
      status: 'ACCEPTED',
      clientLat: -33.51,
      clientLng: -70.71,
      providerLat: -33.46,
      providerLng: -70.67,
    };

    let captured: any;
    act(() => {
      ReactTestRenderer.create(
        <FocusSessionProvider>
          <CaptureProviderSession onValue={(value) => { captured = value; }} />
        </FocusSessionProvider>,
      );
    });

    expect(captured.clientCoords).toEqual({ latitude: -33.51, longitude: -70.71 });
  });

  it('preserves ARRIVED orderState when backend status remains ACCEPTED and fires arrival alert exactly once', () => {
    const mockShowNotification = jest.fn();
    jest.spyOn(require('../../context/NotificationContext'), 'useNotification').mockReturnValue({
      showNotification: mockShowNotification,
    });

    // Provider is at (-33.5101, -70.7101), client is at (-33.5100, -70.7100) -> ~15 meters (< 100m)
    mockLocation = {
      coords: {
        latitude: -33.51001,
        longitude: -70.71001,
      },
    };

    mockRealtime.providerActiveOrder = {
      id: 22,
      status: 'ACCEPTED',
      clientLat: -33.5100,
      clientLng: -70.7100,
      providerLat: -33.51001,
      providerLng: -70.71001,
    };

    let captured: any;
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <FocusSessionProvider>
          <CaptureProviderSession onValue={(value) => { captured = value; }} />
        </FocusSessionProvider>,
      );
    });

    expect(captured.orderState).toBe('ARRIVED');
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Llegada a Destino' }),
    );
    const arrivalCallsFirst = mockShowNotification.mock.calls.filter((c: any) => c[0]?.title === 'Llegada a Destino').length;
    expect(arrivalCallsFirst).toBe(1);

    // Re-render with new reference of providerActiveOrder (still ACCEPTED from socket sync)
    act(() => {
      mockRealtime.providerActiveOrder = {
        ...mockRealtime.providerActiveOrder,
        updatedAt: Date.now(),
      };
      renderer.update(
        <FocusSessionProvider>
          <CaptureProviderSession onValue={(value) => { captured = value; }} />
        </FocusSessionProvider>,
      );
    });

    // State MUST stay ARRIVED and NOT downgrade to EN_CAMINO
    expect(captured.orderState).toBe('ARRIVED');

    // Arrival notification MUST NOT fire a second time
    const arrivalCallsSecond = mockShowNotification.mock.calls.filter((c: any) => c[0]?.title === 'Llegada a Destino').length;
    expect(arrivalCallsSecond).toBe(1);
  });
});
