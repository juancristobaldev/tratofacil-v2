import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useMapCamera, type UseMapCameraOptions } from '../hooks/useMapCamera';
import { MapFloatingNavigationControls } from '../components/ui/MapFloatingNavigationControls';
import type { RouteCoordinate } from '../utils/directions';
import { SMART_NAV_CONSTANTS } from './types';

describe('Phase 2 — Smart Navigation, Camera Ownership, Lookahead & Telemetry Invariants', () => {
  let hookValue: ReturnType<typeof useMapCamera>;
  let mockMapRef: any;

  function TestComponent(props: UseMapCameraOptions) {
    hookValue = useMapCamera(props);
    return null;
  }

  beforeEach(() => {
    mockMapRef = {
      current: {
        fitToCoordinates: jest.fn(),
        animateToRegion: jest.fn(),
        animateCamera: jest.fn(),
        pointForCoordinate: jest.fn(),
      },
    };
  });

  // TEST 1 — LOOKAHEAD REACHES CAMERA
  it('TEST 1: Lookahead target.center reaches animateCamera without modifying moving actor GPS coordinate', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />,
      );
    });

    const userCoord: RouteCoordinate = { latitude: -38.7396, longitude: -72.5901 };
    const routeCoords: RouteCoordinate[] = [
      { latitude: -38.7396, longitude: -72.5901 },
      { latitude: -38.7396, longitude: -72.5800 },
    ];

    // Activar navegación a 36 km/h (10 m/s) rumbo Este (90°)
    act(() => {
      hookValue.navigateToCoordinate(userCoord, {
        heading: 90,
        speed: 10,
        accuracy: 5,
        timestamp: 1000,
        routeCoords,
        animated: true,
      });
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);
    const cameraArg = mockMapRef.current.animateCamera.mock.calls[0][0];

    // Lookahead proyecta hacia adelante a lo largo de la ruta (hacia longitud -72.5800)
    expect(cameraArg.center.latitude).toBeCloseTo(-38.7396, 4);
    expect(cameraArg.center.longitude).toBeGreaterThan(-72.5901);
    expect(cameraArg.heading).toBeCloseTo(90, 0);
    expect(cameraArg.pitch).toBe(SMART_NAV_CONSTANTS.CANONICAL_PITCH);

    // Invariante de verdad geográfica: navigationPosition y coordinate se mantienen en el GPS original
    expect(hookValue.navigationPosition).toEqual(userCoord);
  });

  // TEST 2 — TELEMETRY PASSTHROUGH
  it('TEST 2: followCoordinate delivers complete GPS telemetry (heading, speed, accuracy, timestamp, routeCoords) to navigation engine', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />,
      );
    });

    const userCoord1: RouteCoordinate = { latitude: -38.7396, longitude: -72.5901 };
    act(() => {
      hookValue.navigateToCoordinate(userCoord1, { heading: 90, timestamp: 1000 });
    });
    mockMapRef.current.animateCamera.mockClear();

    const userCoord2: RouteCoordinate = { latitude: -38.7396, longitude: -72.5898 };
    const routeCoords: RouteCoordinate[] = [
      { latitude: -38.7396, longitude: -72.5898 },
      { latitude: -38.7396, longitude: -72.5800 },
    ];

    await act(async () => {
      await hookValue.followCoordinate(userCoord2, {
        heading: 92,
        speed: 12,
        accuracy: 4,
        timestamp: 2500,
        routeCoords,
        force: true,
      });
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);
    const cameraArg = mockMapRef.current.animateCamera.mock.calls[0][0];
    expect(cameraArg.heading).toBeCloseTo(90.3, 0);
    expect(cameraArg.pitch).toBe(SMART_NAV_CONSTANTS.CANONICAL_PITCH);
  });

  // TEST 3 — INVALID HEADING
  it('TEST 3: invalid/negative/null heading does NOT snap to 0° North; engine fuses last reliable or route bearing', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />,
      );
    });

    // 1. Navegación inicial con rumbo confiable 180° (Sur)
    act(() => {
      hookValue.navigateToCoordinate(
        { latitude: -38.7396, longitude: -72.5901 },
        { heading: 180, speed: 10, timestamp: 1000, animated: true },
      );
    });
    mockMapRef.current.animateCamera.mockClear();

    // 2. Muestra subsiguiente con heading nulo o inválido
    await act(async () => {
      await hookValue.followCoordinate(
        { latitude: -38.7400, longitude: -72.5901 },
        { heading: undefined, speed: 0.1, timestamp: 2000, force: true },
      );
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);
    const cameraArg = mockMapRef.current.animateCamera.mock.calls[0][0];
    // No debe saltar a 0° (Norte), debe retener el rumbo confiable previo (~180°)
    expect(cameraArg.heading).toBeCloseTo(180, 0);
  });

  // TEST 4 — NAVIGATION CAMERA OWNERSHIP
  it('TEST 4: passive fitToRoute cannot overwrite navigation camera while cameraMode is NAVIGATION', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />,
      );
    });

    act(() => {
      hookValue.navigateToCoordinate({ latitude: -38.7396, longitude: -72.5901 }, { heading: 45 });
    });
    expect(hookValue.cameraMode).toBe('NAVIGATION');
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);

    // Intento de fitToRoute pasivo por cambio de ruta de fondo
    act(() => {
      hookValue.fitToRoute([
        { latitude: -38.7396, longitude: -72.5901 },
        { latitude: -38.7500, longitude: -72.6000 },
      ]);
    });

    // fitToCoordinates es bloqueado
    expect(mockMapRef.current.fitToCoordinates).not.toHaveBeenCalled();
    expect(hookValue.cameraMode).toBe('NAVIGATION');
  });

  // TEST 5 — USER EXPLORING
  it('TEST 5: handlePanDrag transitions to USER_EXPLORING and blocks subsequent auto-camera GPS writes', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />,
      );
    });

    // 1. Navegación activa
    act(() => {
      hookValue.navigateToCoordinate({ latitude: -38.7396, longitude: -72.5901 }, { heading: 45 });
    });
    expect(hookValue.isNavigating).toBe(true);

    // 2. Usuario interactúa arrastrando el mapa
    act(() => {
      hookValue.handlePanDrag();
    });

    expect(hookValue.isNavigating).toBe(false);
    expect(hookValue.isFollowing).toBe(false);
    expect(hookValue.isUserExploring).toBe(true);
    expect(hookValue.cameraMode).toBe('USER_EXPLORING');
    mockMapRef.current.animateCamera.mockClear();
    mockMapRef.current.animateToRegion.mockClear();

    // 3. Ticks de GPS posteriores NO mueven la cámara automáticamente
    await act(async () => {
      await hookValue.followCoordinate({ latitude: -38.7400, longitude: -72.5905 });
    });

    expect(mockMapRef.current.animateCamera).not.toHaveBeenCalled();
    expect(mockMapRef.current.animateToRegion).not.toHaveBeenCalled();
    expect(hookValue.isUserExploring).toBe(true);
  });

  // TEST 6 — RECENTER
  it('TEST 6: recenter restores 2D FOLLOW_USER mode and centers on user coordinate', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />,
      );
    });

    act(() => {
      hookValue.handlePanDrag();
    });
    expect(hookValue.isUserExploring).toBe(true);

    const userCoord: RouteCoordinate = { latitude: -38.7396, longitude: -72.5901 };
    await act(async () => {
      hookValue.recenter({ targetCoordinate: userCoord });
    });

    expect(hookValue.isFollowing).toBe(true);
    expect(hookValue.isUserExploring).toBe(false);
    expect(hookValue.cameraMode).toBe('FOLLOW_USER');
  });

  // TEST 7 — NO GEOGRAPHIC REGRESSION
  it('TEST 7: No geographic regression — moving subject coordinate is never overwritten by destination or lookahead in state', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />,
      );
    });

    const localGps = { latitude: -38.7396, longitude: -72.5901 };
    const destination = { latitude: -38.7600, longitude: -72.6200 };

    act(() => {
      hookValue.navigateToCoordinate(localGps, {
        heading: 225,
        speed: 15,
        routeCoords: [localGps, destination],
      });
    });

    // El centro de cámara recibe el lookahead proyectado a lo largo de la ruta
    const cameraArg = mockMapRef.current.animateCamera.mock.calls[0][0];
    expect(cameraArg.center.latitude).toBeLessThan(localGps.latitude);
    expect(cameraArg.center.latitude).toBeGreaterThan(destination.latitude);
    // Pero el centro de cámara NUNCA es el destino (5 km lejos)
    expect(cameraArg.center.latitude).not.toBe(destination.latitude);
    expect(cameraArg.center.longitude).not.toBe(destination.longitude);
  });

  // TEST 8 — NO CAMERA A->B->A
  it('TEST 8: Toggle navigation button followed by next GPS tick produces continuous local camera progression without teleporting to destination', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />,
      );
    });

    const localGpsA = { latitude: -38.7396, longitude: -72.5901 };
    const destinationB = { latitude: -38.7700, longitude: -72.6300 };

    // 1. Click en botón de navegación: se activa con localGpsA
    act(() => {
      hookValue.toggleNavigationMode(localGpsA, {
        heading: 90,
        speed: 5,
        timestamp: 1000,
        routeCoords: [localGpsA, destinationB],
      });
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);
    const cameraWrite1 = mockMapRef.current.animateCamera.mock.calls[0][0];

    // La cámara 1 está en el entorno local (lookahead de localGpsA)
    expect(cameraWrite1.center.latitude).toBeCloseTo(localGpsA.latitude, 3);
    expect(cameraWrite1.center.longitude).toBeCloseTo(localGpsA.longitude, 3);

    // 2. Siguiente tick de GPS
    const localGpsA2 = { latitude: -38.7396, longitude: -72.5900 };
    await act(async () => {
      await hookValue.followCoordinate(localGpsA2, {
        heading: 90,
        speed: 6,
        timestamp: 2000,
        force: true,
        routeCoords: [localGpsA2, destinationB],
      });
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(2);
    const cameraWrite2 = mockMapRef.current.animateCamera.mock.calls[1][0];

    // La cámara 2 continúa progresando suavemente en el entorno local
    expect(cameraWrite2.center.latitude).toBeCloseTo(localGpsA2.latitude, 3);
    expect(cameraWrite2.center.longitude).toBeCloseTo(localGpsA2.longitude, 3);

    // En NINGÚN momento la cámara saltó al destino B (que está a kilómetros de distancia)
    expect(Math.abs(cameraWrite1.center.latitude - destinationB.latitude)).toBeGreaterThan(0.02);
    expect(Math.abs(cameraWrite2.center.latitude - destinationB.latitude)).toBeGreaterThan(0.02);
  });
});
