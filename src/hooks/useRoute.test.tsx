import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useRoutePolyline } from './useRoute';
import * as directionsModule from '../utils/directions';

describe('useRoutePolyline Hook (Realtime & Concurrency)', () => {
  let hookValue: ReturnType<typeof useRoutePolyline>;
  let getDirectionsSpy: jest.SpyInstance;

  function TestComponent({
    origin,
    dest,
    active,
  }: {
    origin: directionsModule.RouteCoordinate | null;
    dest: directionsModule.RouteCoordinate | null;
    active: boolean;
  }) {
    hookValue = useRoutePolyline(origin, dest, active);
    return null;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    directionsModule.clearClientRouteCache();
    getDirectionsSpy = jest.spyOn(directionsModule, 'getDirections');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should trigger initial request immediately (0ms delay) when active with valid coordinates', async () => {
    const origin = { latitude: -33.4489, longitude: -70.6693 };
    const dest = { latitude: -33.4520, longitude: -70.6710 };

    const mockRoute: directionsModule.RouteResult = {
      coordinates: [origin, dest],
      distanceMeters: 1000,
      durationSeconds: 120,
      distance: 1000,
      duration: 120,
      provider: 'google',
      origin,
      destination: dest,
      calculatedAt: Date.now(),
    };

    getDirectionsSpy.mockResolvedValueOnce(mockRoute);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent origin={origin} dest={dest} active={true} />,
      );
    });

    // Verified: Called immediately without waiting 2000ms
    expect(getDirectionsSpy).toHaveBeenCalledTimes(1);
    expect(hookValue.status).toBe('ready');
    expect(hookValue.routeCoords).toEqual([origin, dest]);
    expect(hookValue.routeDistance).toBe(1000);
    expect(hookValue.routeDuration).toBe(120);
    expect(hookValue.routeSemantic).toBe('FULL_ROUTE');
    expect(hookValue.routeOrigin).toEqual(origin);
    expect(hookValue.routeDestination).toEqual(dest);
    expect(hookValue.routeCalculatedAt).toBe(mockRoute.calculatedAt);
  });

  it('should ignore GPS jitter (< 20m) and not fire unnecessary requests', async () => {
    const origin = { latitude: -33.4489, longitude: -70.6693 };
    const dest = { latitude: -33.4520, longitude: -70.6710 };

    const mockRoute: directionsModule.RouteResult = {
      coordinates: [origin, dest],
      distanceMeters: 1000,
      durationSeconds: 120,
      distance: 1000,
      duration: 120,
      provider: 'google',
      origin,
      destination: dest,
      calculatedAt: Date.now(),
    };

    getDirectionsSpy.mockResolvedValue(mockRoute);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent origin={origin} dest={dest} active={true} />,
      );
    });

    expect(getDirectionsSpy).toHaveBeenCalledTimes(1);

    // Jitter: User moves ~2 meters
    const jitterOrigin = { latitude: -33.44891, longitude: -70.66931 };
    await act(async () => {
      renderer.update(<TestComponent origin={jitterOrigin} dest={dest} active={true} />);
      jest.advanceTimersByTime(2000);
    });

    // Still only 1 call! Jitter suppressed
    expect(getDirectionsSpy).toHaveBeenCalledTimes(1);
  });

  it('should preserve Last-Known-Good route when a refresh fails', async () => {
    const origin1 = { latitude: -33.4489, longitude: -70.6693 };
    const dest = { latitude: -33.4520, longitude: -70.6710 };

    const mockRoute1: directionsModule.RouteResult = {
      coordinates: [origin1, dest],
      distanceMeters: 1000,
      durationSeconds: 120,
      distance: 1000,
      duration: 120,
      provider: 'google',
      origin: origin1,
      destination: dest,
      calculatedAt: Date.now(),
    };

    getDirectionsSpy.mockResolvedValueOnce(mockRoute1);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent origin={origin1} dest={dest} active={true} />,
      );
    });

    expect(hookValue.routeCoords).toEqual([origin1, dest]);

    // Move provider 100 meters (significant movement)
    const origin2 = { latitude: -33.4498, longitude: -70.6693 };
    // Simulate network failure on refresh
    getDirectionsSpy.mockResolvedValueOnce(null);

    await act(async () => {
      renderer.update(<TestComponent origin={origin2} dest={dest} active={true} />);
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Critical: routeCoords was NOT destroyed to []
    expect(hookValue.routeCoords).toEqual([origin1, dest]);
    expect(hookValue.status).toBe('error');
    expect(hookValue.routeSemantic).toBe('FULL_ROUTE');
    expect(hookValue.routeOrigin).toEqual(origin1);
    expect(hookValue.routeDestination).toEqual(dest);
    expect(hookValue.routeCalculatedAt).toBe(mockRoute1.calculatedAt);
  });

  it('should atomically swap to new route when refresh succeeds', async () => {
    const origin1 = { latitude: -33.4489, longitude: -70.6693 };
    const origin2 = { latitude: -33.4500, longitude: -70.6700 };
    const dest = { latitude: -33.4520, longitude: -70.6710 };

    const mockRoute1: directionsModule.RouteResult = {
      coordinates: [origin1, dest],
      distanceMeters: 1000,
      durationSeconds: 120,
      distance: 1000,
      duration: 120,
      provider: 'google',
      origin: origin1,
      destination: dest,
      calculatedAt: Date.now(),
    };

    const mockRoute2: directionsModule.RouteResult = {
      coordinates: [origin2, dest],
      distanceMeters: 750,
      durationSeconds: 90,
      distance: 750,
      duration: 90,
      provider: 'google',
      origin: origin2,
      destination: dest,
      calculatedAt: Date.now(),
    };

    getDirectionsSpy.mockResolvedValueOnce(mockRoute1);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent origin={origin1} dest={dest} active={true} />,
      );
    });

    expect(hookValue.routeCoords).toEqual([origin1, dest]);

    // Provider moves 150m
    getDirectionsSpy.mockResolvedValueOnce(mockRoute2);
    await act(async () => {
      renderer.update(<TestComponent origin={origin2} dest={dest} active={true} />);
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Atomic Swap completed
    expect(hookValue.routeCoords).toEqual([origin2, dest]);
    expect(hookValue.routeDistance).toBe(750);
    expect(hookValue.routeDuration).toBe(90);
    expect(hookValue.status).toBe('ready');
    expect(hookValue.routeOrigin).toEqual(origin2);
    expect(hookValue.routeDestination).toEqual(dest);
    expect(hookValue.routeCalculatedAt).toBe(mockRoute2.calculatedAt);
  });

  it('should handle race conditions with latest-wins (Request A cannot overwrite newer Request B)', async () => {
    const originA = { latitude: -33.4489, longitude: -70.6693 };
    const originB = { latitude: -33.4510, longitude: -70.6705 };
    const dest = { latitude: -33.4520, longitude: -70.6710 };

    let resolveRequestA: (val: any) => void = () => {};
    let resolveRequestB: (val: any) => void = () => {};

    const promiseA = new Promise((resolve) => {
      resolveRequestA = resolve;
    });
    const promiseB = new Promise((resolve) => {
      resolveRequestB = resolve;
    });

    getDirectionsSpy
      .mockImplementationOnce(() => promiseA) // Request A (initial)
      .mockImplementationOnce(() => promiseB); // Request B (newer update)

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent origin={originA} dest={dest} active={true} />,
      );
    });

    // Origin changes to B while A is still pending
    await act(async () => {
      renderer.update(<TestComponent origin={originB} dest={dest} active={true} />);
      jest.advanceTimersByTime(2000);
    });

    // Now resolve Request B (newer) FIRST
    const mockRouteB: directionsModule.RouteResult = {
      coordinates: [originB, dest],
      distanceMeters: 500,
      durationSeconds: 60,
      distance: 500,
      duration: 60,
      provider: 'google',
      origin: originB,
      destination: dest,
      calculatedAt: Date.now(),
    };

    await act(async () => {
      resolveRequestB(mockRouteB);
    });

    expect(hookValue.routeCoords).toEqual([originB, dest]);

    // Now resolve old Request A LATER
    const mockRouteA: directionsModule.RouteResult = {
      coordinates: [originA, dest],
      distanceMeters: 1000,
      durationSeconds: 120,
      distance: 1000,
      duration: 120,
      provider: 'google',
      origin: originA,
      destination: dest,
      calculatedAt: Date.now(),
    };

    await act(async () => {
      resolveRequestA(mockRouteA);
    });

    // Critical: Old Request A did NOT overwrite newer Request B
    expect(hookValue.routeCoords).toEqual([originB, dest]);
    expect(hookValue.routeDistance).toBe(500);
  });

  it('should avoid starvation under continuous GPS movements via max-wait timer', async () => {
    const startOrigin = { latitude: -33.4489, longitude: -70.6693 };
    const dest = { latitude: -33.4520, longitude: -70.6710 };

    getDirectionsSpy.mockImplementation((orig) =>
      Promise.resolve({
        coordinates: [orig, dest],
        distanceMeters: 1000,
        durationSeconds: 120,
        distance: 1000,
        duration: 120,
        provider: 'google',
        origin: orig,
        destination: dest,
        calculatedAt: Date.now(),
      }),
    );

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent origin={startOrigin} dest={dest} active={true} />,
      );
    });

    expect(getDirectionsSpy).toHaveBeenCalledTimes(1);

    // Simulate rapid GPS updates every 400ms (continuous driving)
    for (let i = 1; i <= 16; i++) {
      const movedOrigin = {
        latitude: -33.4489 - i * 0.0005,
        longitude: -70.6693 - i * 0.0005,
      };
      await act(async () => {
        renderer.update(<TestComponent origin={movedOrigin} dest={dest} active={true} />);
      });
      await act(async () => {
        jest.advanceTimersByTime(450);
        await Promise.resolve();
      });
    }

    // Anti-starvation verified: Even though debounce was constantly restarted every 400ms,
    // the maxWaitTimer triggered background recalculation!
    expect(getDirectionsSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should clean up and clear route when active becomes false', async () => {
    const origin = { latitude: -33.4489, longitude: -70.6693 };
    const dest = { latitude: -33.4520, longitude: -70.6710 };

    const mockRoute: directionsModule.RouteResult = {
      coordinates: [origin, dest],
      distanceMeters: 1000,
      durationSeconds: 120,
      distance: 1000,
      duration: 120,
      provider: 'google',
      origin,
      destination: dest,
      calculatedAt: Date.now(),
    };

    getDirectionsSpy.mockResolvedValueOnce(mockRoute);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <TestComponent origin={origin} dest={dest} active={true} />,
      );
    });

    expect(hookValue.routeCoords.length).toBe(2);

    await act(async () => {
      renderer.update(<TestComponent origin={origin} dest={dest} active={false} />);
    });

    expect(hookValue.routeCoords).toEqual([]);
    expect(hookValue.status).toBe('idle');
    expect(hookValue.routeSemantic).toBe('FULL_ROUTE');
    expect(hookValue.routeOrigin).toBeNull();
    expect(hookValue.routeDestination).toBeNull();
    expect(hookValue.routeCalculatedAt).toBeNull();
  });
});
