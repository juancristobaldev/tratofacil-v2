import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useMapCamera, type UseMapCameraOptions } from './useMapCamera';
import type { RouteCoordinate } from '../utils/directions';

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
});
