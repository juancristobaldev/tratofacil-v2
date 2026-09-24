import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useMapCamera, type UseMapCameraOptions } from './useMapCamera';
import type { RouteCoordinate } from '../utils/directions';
import {
  DEFAULT_HORIZONTAL_PADDING,
  DEFAULT_VERTICAL_PADDING,
  ROUTE_FIT_BOTTOM_CLEARANCE,
  ROUTE_FIT_HORIZONTAL_CLEARANCE,
  ROUTE_FIT_TOP_CLEARANCE,
  ROUTE_FIT_ZOOM_SCALE,
  NAVIGATION_LATITUDE_DELTA,
  NAVIGATION_LONGITUDE_DELTA,
  projectCoordinateToScreen,
} from '../utils/mapGeometry';
import { SMART_NAV_CONSTANTS } from '../navigation-engine';

describe('useMapCamera Hook & Real Safe Viewport Validation', () => {
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

  it('TEST A: target inside safeMapRect results in no camera movement (CAMERA_SKIP)', async () => {
    // Screen 390x844, headerBottom=100, sheetTop=600 -> usableRect: top=116, bottom=584
    // Center is at y = 350 (comfortably inside safeMapRect)
    mockMapRef.current.pointForCoordinate.mockResolvedValue({ x: 195, y: 350 });

    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const targetCoord: RouteCoordinate = { latitude: -33.45, longitude: -70.66 };
    await act(async () => {
      await hookValue.followCoordinate(targetCoord, { force: false });
    });

    // Target was inside safeMapRect -> camera skipped
    expect(mockMapRef.current.animateToRegion).not.toHaveBeenCalled();
  });

  it('TEST B: target outside safeMapRect triggers camera movement to recenter within safe viewport', async () => {
    // Screen 390x844, headerBottom=100, sheetTop=600. Target point at y = 700 (below sheetTop)
    mockMapRef.current.pointForCoordinate.mockResolvedValue({ x: 195, y: 700 });

    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const targetCoord: RouteCoordinate = { latitude: -33.45, longitude: -70.66 };
    await act(async () => {
      await hookValue.followCoordinate(targetCoord, { force: false });
    });

    // Target is occluded/outside safeMapRect -> camera moves
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(1);
  });

  it('TEST C (CRITICAL): GPS coordinate unchanged, sheetTop changes from 650 to 350, target becomes occluded -> camera moves', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    const targetCoord: RouteCoordinate = { latitude: -33.45, longitude: -70.66 };

    // Initial state: sheetTop = 650. Target is at y = 500 (inside safe viewport: 116 < 500 < 634)
    mockMapRef.current.pointForCoordinate.mockResolvedValue({ x: 195, y: 500 });

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={650}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    // Initial follow positioning
    await act(async () => {
      await hookValue.followCoordinate(targetCoord, { force: true });
    });
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(1);

    // Now sheet expands: sheetTop drops to 350. Target is STILL at y = 500 (which is now BELOW sheetTop=350!)
    // pointForCoordinate reports y = 500 which is > safeRect.bottom (~280)
    mockMapRef.current.pointForCoordinate.mockResolvedValue({ x: 195, y: 500 });

    await act(async () => {
      renderer!.update(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={350}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    // Camera MUST re-adjust because sheetTop changed and target became occluded
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(2);
  });

  it('TEST D: GPS changes 2m and target remains visible -> CAMERA_SKIP by gps_jitter', async () => {
    mockMapRef.current.pointForCoordinate.mockResolvedValue({ x: 195, y: 350 });

    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    // First fix with force
    const coord: RouteCoordinate = { latitude: -33.45000, longitude: -70.66000 };
    await act(async () => {
      await hookValue.followCoordinate(coord, { force: true });
    });
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(1);

    // 2 meters jitter, target at y=351 (still safely visible)
    mockMapRef.current.pointForCoordinate.mockResolvedValue({ x: 195, y: 351 });
    const jitterCoord: RouteCoordinate = { latitude: -33.45002, longitude: -70.66001 };
    await act(async () => {
      await hookValue.followCoordinate(jitterCoord, { force: false });
    });

    // CAMERA_SKIP -> animateToRegion not called a second time
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(1);
  });

  it('TEST E: GPS changes 2m BUT target is occluded (outside safeMapRect) -> camera moves', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={350}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const coord: RouteCoordinate = { latitude: -33.45000, longitude: -70.66000 };
    await act(async () => {
      await hookValue.followCoordinate(coord, { force: true });
    });
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(1);

    // 2m GPS change, BUT target is at y=500 (occluded by sheetTop=350)
    mockMapRef.current.pointForCoordinate.mockResolvedValue({ x: 195, y: 500 });
    const jitterCoord: RouteCoordinate = { latitude: -33.45002, longitude: -70.66001 };
    await act(async () => {
      await hookValue.followCoordinate(jitterCoord, { force: false });
    });

    // Should NOT skip camera because target is occluded
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(2);
  });

  it('TEST F: native pointForCoordinate rejection triggers mathematical fallback without crashing', async () => {
    mockMapRef.current.pointForCoordinate.mockRejectedValue(new Error('Native MapView is unmounted or bridge busy'));

    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const coord: RouteCoordinate = { latitude: -33.45, longitude: -70.66 };
    await expect(
      act(async () => {
        await hookValue.followCoordinate(coord, { force: false });
      })
    ).resolves.not.toThrow();
  });

  it('TEST G: same route geometry in a new array reference does not trigger redundant fitToCoordinates', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={500}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const route1: RouteCoordinate[] = [
      { latitude: -33.40, longitude: -70.60 },
      { latitude: -33.45, longitude: -70.65 },
      { latitude: -33.50, longitude: -70.70 },
    ];
    const route2: RouteCoordinate[] = [
      { latitude: -33.40, longitude: -70.60 },
      { latitude: -33.45, longitude: -70.65 },
      { latitude: -33.50, longitude: -70.70 },
    ];

    act(() => {
      hookValue.fitToRoute(route1, { reason: 'initial_route' });
    });
    expect(mockMapRef.current.fitToCoordinates).toHaveBeenCalledTimes(1);

    // Same route points in new array
    act(() => {
      hookValue.fitToRoute(route2, { reason: 'duplicate_route_state' });
    });
    // isMaterialRouteChange returned false -> skipped
    expect(mockMapRef.current.fitToCoordinates).toHaveBeenCalledTimes(1);
  });

  it('FIT_ROUTE: applies provider-card safe padding around floating controls', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={160}
          sheetTop={500}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const route: RouteCoordinate[] = [
      { latitude: -38.75, longitude: -72.60 },
      { latitude: -38.74, longitude: -72.58 },
    ];

    act(() => {
      hookValue.fitToRoute(route, { reason: 'provider_card_non_occlusion' });
    });

    expect(mockMapRef.current.fitToCoordinates).toHaveBeenCalledTimes(1);
    expect(mockMapRef.current.fitToCoordinates).toHaveBeenCalledWith(route, {
      animated: true,
      edgePadding: {
        top: 160 + DEFAULT_VERTICAL_PADDING,
        bottom: 844 - 500 + DEFAULT_VERTICAL_PADDING,
        left: DEFAULT_HORIZONTAL_PADDING,
        right: DEFAULT_HORIZONTAL_PADDING,
      },
    });
  });

  it('FIT_ROUTE: mathematical fallback uses route fit zoom scale', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={160}
          sheetTop={500}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const point: RouteCoordinate = { latitude: -38.75, longitude: -72.60 };

    act(() => {
      hookValue.fitToRoute([point], {
        animated: false,
        minDelta: { latitudeDelta: 0.01, longitudeDelta: 0.02 },
        reason: 'single_point_route_fit',
      });
    });

    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(1);
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        latitudeDelta: 0.01 * ROUTE_FIT_ZOOM_SCALE,
        longitudeDelta: 0.02 * ROUTE_FIT_ZOOM_SCALE,
      }),
      0,
    );
  });

  it('USER_EXPLORING: ignores background GPS updates when user is exploring with onPanDrag', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={500}
        />
      );
    });

    act(() => {
      hookValue.handlePanDrag();
    });

    const newGpsCoord: RouteCoordinate = { latitude: -33.46, longitude: -70.67 };
    await act(async () => {
      await hookValue.followCoordinate(newGpsCoord);
    });

    expect(mockMapRef.current.animateToRegion).not.toHaveBeenCalled();
    expect(hookValue.isUserExploring).toBe(true);
  });

  it('NAVIGATION_MODE: navigateToCoordinate applies pitch 60, heading and close zoom to user coordinate', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const userCoord: RouteCoordinate = { latitude: -38.745, longitude: -72.595 };

    act(() => {
      hookValue.navigateToCoordinate(userCoord, { heading: 90, animated: true });
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        heading: 90,
        pitch: SMART_NAV_CONSTANTS.CANONICAL_PITCH,
        zoom: 18,
      }),
      expect.any(Object),
    );
    expect(hookValue.isFollowing).toBe(true);
    expect(hookValue.isNavigating).toBe(true);
    expect(hookValue.cameraMode).toBe('NAVIGATION');
  });

  it('NAVIGATION_LOOKAHEAD_CENTER: navigateToCoordinate delivers lookahead target.center to animateCamera', () => {
    const windowDimensions = { width: 390, height: 844 };
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={500}
          windowDimensions={windowDimensions}
        />
      );
    });

    const userCoord: RouteCoordinate = { latitude: -38.745, longitude: -72.595 };

    act(() => {
      hookValue.navigateToCoordinate(userCoord, { heading: 90, animated: true });
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);
    const cameraArg = mockMapRef.current.animateCamera.mock.calls[0][0];

    // En navegación 3D, el centro de cámara proyecta hacia adelante (lookahead) a lo largo del rumbo (90° = Este)
    expect(cameraArg.center.latitude).toBeCloseTo(-38.745, 4);
    expect(cameraArg.center.longitude).toBeGreaterThan(-72.595);
    expect(hookValue.navigationPosition).toEqual(userCoord);
  });

  it('NAVIGATION_VIEWPORT_SETTLE: sheetTop changes do not disrupt active 50/50 navigation mode', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    const windowDimensions = { width: 390, height: 844 };
    const userCoord: RouteCoordinate = { latitude: -38.745, longitude: -72.595 };

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={650}
          windowDimensions={windowDimensions}
        />
      );
    });

    act(() => {
      hookValue.navigateToCoordinate(userCoord, { heading: 90, animated: true });
    });
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer!.update(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={350}
          windowDimensions={windowDimensions}
        />
      );
    });

    // La navegación permanece en 50/50 y no compite con el movimiento del bottom sheet
    expect(hookValue.cameraMode).toBe('NAVIGATION');
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);
  });

  it('NAVIGATION_TOGGLE: toggleNavigationMode activates 3D navigation and deactivates to 2D on second click', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const userCoord: RouteCoordinate = { latitude: -38.745, longitude: -72.595 };

    // 1. Primer click: Activar modo navegación 3D
    act(() => {
      hookValue.toggleNavigationMode(userCoord, { heading: 45 });
    });

    expect(hookValue.isNavigating).toBe(true);
    expect(hookValue.cameraMode).toBe('NAVIGATION');
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledWith(
      expect.objectContaining({ pitch: SMART_NAV_CONSTANTS.CANONICAL_PITCH, heading: 45 }),
      expect.any(Object),
    );

    mockMapRef.current.animateCamera.mockClear();

    // 2. Segundo click: Desactivar modo navegación y volver a 2D plano (pitch: 0, heading: 0)
    act(() => {
      hookValue.toggleNavigationMode(userCoord);
    });

    expect(hookValue.isNavigating).toBe(false);
    expect(hookValue.cameraMode).toBe('FOLLOW_USER');
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledWith(
      expect.objectContaining({ pitch: 0, heading: 0 }),
      expect.any(Object),
    );
  });

  it('NAVIGATION_FOLLOW_STREAM: followCoordinate in navigation mode updates 3D camera and dynamic heading', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const coord1: RouteCoordinate = { latitude: -38.745, longitude: -72.595 };
    act(() => {
      hookValue.navigateToCoordinate(coord1, { heading: 0 });
    });
    mockMapRef.current.animateCamera.mockClear();

    // Stream GPS actualiza coordenada y rumbo a 120° con desplazamiento realista
    const coord2: RouteCoordinate = { latitude: -38.74502, longitude: -72.59502 };
    await act(async () => {
      await hookValue.followCoordinate(coord2, { heading: 120, speed: 10, force: true, animated: true });
    });

    expect(hookValue.isNavigating).toBe(true);
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        heading: expect.any(Number),
        pitch: SMART_NAV_CONSTANTS.CANONICAL_PITCH,
        zoom: expect.any(Number),
      }),
      expect.any(Object),
    );
  });

  it('NAVIGATION_FOLLOW_STREAM: preserves the active navigation pitch across GPS updates', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const coord1: RouteCoordinate = { latitude: -38.745, longitude: -72.595 };
    act(() => {
      hookValue.navigateToCoordinate(coord1, { heading: 0, pitch: 60 });
    });
    mockMapRef.current.animateCamera.mockClear();

    const coord2: RouteCoordinate = { latitude: -38.74502, longitude: -72.59502 };
    await act(async () => {
      await hookValue.followCoordinate(coord2, { heading: 120, speed: 10, force: true, animated: true });
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledWith(
      expect.objectContaining({ pitch: 60 }),
      expect.any(Object),
    );
  });

  it('HEADING_SANITIZATION: negative heading (-1) is normalized to 0 without causing flip loops', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    act(() => {
      hookValue.navigateToCoordinate({ latitude: -38.745, longitude: -72.595 }, { heading: -1 });
    });

    expect(mockMapRef.current.animateCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        heading: 0,
        pitch: SMART_NAV_CONSTANTS.CANONICAL_PITCH,
      }),
      expect.any(Object),
    );
  });

  it('NAVIGATION_EXCLUSIVITY: passive fitToRoute does NOT override active navigation mode', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    // 1. Activar navegación
    act(() => {
      hookValue.navigateToCoordinate({ latitude: -38.745, longitude: -72.595 }, { heading: 45 });
    });
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);

    // 2. Intento de fitToRoute pasivo de fondo (sin force)
    act(() => {
      hookValue.fitToRoute([
        { latitude: -38.745, longitude: -72.595 },
        { latitude: -38.750, longitude: -72.600 },
      ]);
    });

    // fitToCoordinates no debe ser invocado, preservando la cámara en NAVIGATION
    expect(mockMapRef.current.fitToCoordinates).not.toHaveBeenCalled();
    expect(hookValue.cameraMode).toBe('NAVIGATION');
  });

  it('GESTURE_RELEASE: pan drag immediately cancels navigation mode and enters USER_EXPLORING', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    // 1. Activar navegación
    act(() => {
      hookValue.navigateToCoordinate({ latitude: -38.745, longitude: -72.595 });
    });
    expect(hookValue.isNavigating).toBe(true);

    // 2. Usuario arrastra la pantalla
    act(() => {
      hookValue.handlePanDrag();
    });

    expect(hookValue.isNavigating).toBe(false);
    expect(hookValue.isFollowing).toBe(false);
    expect(hookValue.isUserExploring).toBe(true);
    expect(hookValue.cameraMode).toBe('USER_EXPLORING');
  });

  it('NAVIGATION_ATOMIC_AUTHORITY: executes a single atomic animateCamera call with SmartNavigationEngine target', async () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
          windowDimensions={{ width: 390, height: 844 }}
        />
      );
    });

    const userCoord = { latitude: -38.745, longitude: -72.595 };
    act(() => {
      hookValue.navigateToCoordinate(userCoord, { heading: 45, animated: true });
    });

    // Exactamente 1 llamada a animateCamera, con rumbo 45°, pitch canónico 40° y centro proyectado lookahead
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledTimes(1);
    expect(mockMapRef.current.animateCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        pitch: SMART_NAV_CONSTANTS.CANONICAL_PITCH,
        heading: 45,
        center: expect.objectContaining({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
        }),
      }),
      expect.any(Object),
    );
    const cameraArg = mockMapRef.current.animateCamera.mock.calls[0][0];
    expect(cameraArg.center.latitude).toBeCloseTo(-38.745, 3);
    expect(cameraArg.center.longitude).toBeCloseTo(-72.595, 3);
  });

  it('DEFAULT_REGION_FIT: fitToDefaultRegion animates camera to default Temuco + Padre Las Casas bounds', () => {
    act(() => {
      ReactTestRenderer.create(
        <TestComponent
          mapRef={mockMapRef}
          headerBottom={100}
          sheetTop={600}
        />
      );
    });

    act(() => {
      hookValue.fitToDefaultRegion();
    });

    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledTimes(1);
    expect(mockMapRef.current.animateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        longitude: -72.595,
        latitudeDelta: 0.098,
        longitudeDelta: 0.098,
      }),
      800,
    );
    expect(hookValue.isFollowing).toBe(false);
  });
});
