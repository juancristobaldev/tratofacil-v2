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

function CaptureClientSession({ onValue }: { onValue: (value: any) => void }) {
  const session = useFocusSession('client');
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

  it('maintains EN_CAMINO with isWithinArrivalRadius true when arriving at destination and only transitions to ARRIVED on server confirmation', () => {
    const mockShowNotification = jest.fn();
    jest.spyOn(require('../../context/NotificationContext'), 'useNotification').mockReturnValue({
      showNotification: mockShowNotification,
    });

    // Provider is at (-33.51001, -70.71001), client is at (-33.5100, -70.7100) -> ~1.5 meters (<= 100m)
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

    // Mientras el backend siga en ACCEPTED, la sesión expone EN_CAMINO pero con isWithinArrivalRadius true
    expect(captured.orderState).toBe('EN_CAMINO');
    expect(captured.isWithinArrivalRadius).toBe(true);
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Llegada a Destino' }),
    );
    const arrivalCallsFirst = mockShowNotification.mock.calls.filter((c: any) => c[0]?.title === 'Llegada a Destino').length;
    expect(arrivalCallsFirst).toBe(1);

    // Re-render con actualización de orden (todavía ACCEPTED): no re-dispara alerta
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

    expect(captured.orderState).toBe('EN_CAMINO');
    const arrivalCallsSecond = mockShowNotification.mock.calls.filter((c: any) => c[0]?.title === 'Llegada a Destino').length;
    expect(arrivalCallsSecond).toBe(1);

    // Cuando el backend (o la mutación confirmArrival) actualiza la orden a ARRIVED:
    act(() => {
      mockRealtime.providerActiveOrder = {
        ...mockRealtime.providerActiveOrder,
        status: 'ARRIVED',
        arrivedAt: new Date().toISOString(),
      };
      renderer.update(
        <FocusSessionProvider>
          <CaptureProviderSession onValue={(value) => { captured = value; }} />
        </FocusSessionProvider>,
      );
    });

    expect(captured.orderState).toBe('ARRIVED');
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Llegada Confirmada' }),
    );
  });

  it('notifies client when provider is approaching within 5 minutes (between step 8 and 9)', () => {
    const mockShowNotification = jest.fn();
    jest.spyOn(require('../../context/NotificationContext'), 'useNotification').mockReturnValue({
      showNotification: mockShowNotification,
    });

    // Client at (-33.450, -70.660), Provider at (-33.454, -70.664) -> ~600m -> ~2 min
    mockRealtime.activeOrder = {
      id: 55,
      status: 'ACCEPTED',
      clientLat: -33.450,
      clientLng: -70.660,
      providerLat: -33.454,
      providerLng: -70.664,
    };

    let captured: any;
    act(() => {
      ReactTestRenderer.create(
        <FocusSessionProvider>
          <CaptureClientSession onValue={(value) => { captured = value; }} />
        </FocusSessionProvider>,
      );
    });

    expect(captured.orderId).toBe(55);
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'clientOrder:55:APPROACHING',
        title: 'Profesional por llegar',
        message: expect.stringMatching(/El profesional está por llegar en/),
        type: 'info',
      }),
    );
  });

  it('anchors client route and distance strictly to meeting point (clientLat/Lng) and not to client device GPS', () => {
    const { useRoutePolyline } = require('../../hooks/useRoute');
    // Client device is at office (-33.42, -70.60), but meeting point/home is at (-33.450, -70.660)
    mockLocation = {
      coords: {
        latitude: -33.420,
        longitude: -70.600,
      },
    };

    mockRealtime.activeOrder = {
      id: 77,
      status: 'ACCEPTED',
      clientLat: -33.450,
      clientLng: -70.660,
      providerLat: -33.460,
      providerLng: -70.670,
    };

    let captured: any;
    act(() => {
      ReactTestRenderer.create(
        <FocusSessionProvider>
          <CaptureClientSession onValue={(value) => { captured = value; }} />
        </FocusSessionProvider>,
      );
    });

    // Destination of useRoutePolyline must be the meeting point (-33.450, -70.660), NEVER client GPS (-33.420, -70.600)
    expect(useRoutePolyline).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -33.460, longitude: -70.670 }), // Provider
      expect.objectContaining({ latitude: -33.450, longitude: -70.660 }), // Meeting point (HousePin)
      true,
    );

    expect(captured.serviceDestinationCoords).toEqual({ latitude: -33.450, longitude: -70.660 });
    expect(captured.clientUserCoords).toEqual({ latitude: -33.420, longitude: -70.600 });
  });
});
