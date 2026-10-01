import { renderHook, act } from '@testing-library/react-native';
import { useProviderAutoNavigation } from './useProviderAutoNavigation';
import type { RouteCoordinate } from '../utils/directions';

describe('useProviderAutoNavigation Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockProviderCoord: RouteCoordinate = {
    latitude: -38.735,
    longitude: -72.59,
  };

  it('1. Activa automáticamente la navegación 3D sin ningún botón si enabled es true', async () => {
    const toggleNavigationMode = jest.fn();

    await renderHook(() =>
      useProviderAutoNavigation({
        enabled: true,
        providerCoord: mockProviderCoord,
        heading: 90,
        speed: 0,
        isNavigating: false,
        isUserExploring: false,
        toggleNavigationMode,
      }),
    );

    expect(toggleNavigationMode).toHaveBeenCalledTimes(1);
    expect(toggleNavigationMode).toHaveBeenCalledWith(
      mockProviderCoord,
      expect.objectContaining({
        pitch: 65,
        heading: 90,
        animated: true,
        force: true,
        reason: 'initial_or_state_change',
      }),
    );
  });

  it('2. NO activa navegación automáticamente si enabled es false', async () => {
    const toggleNavigationMode = jest.fn();

    await renderHook(() =>
      useProviderAutoNavigation({
        enabled: false,
        providerCoord: mockProviderCoord,
        heading: 90,
        speed: 0,
        isNavigating: false,
        isUserExploring: false,
        toggleNavigationMode,
      }),
    );

    expect(toggleNavigationMode).not.toHaveBeenCalled();
  });

  it('3. Al arrastrar el mapa se inicia temporizador de 10 segundos y al expirar se activa navegación', async () => {
    const toggleNavigationMode = jest.fn();

    let isNavigating = true;
    let isUserExploring = false;

    const { result, rerender } = await renderHook(() =>
      useProviderAutoNavigation({
        enabled: true,
        providerCoord: mockProviderCoord,
        heading: 90,
        speed: 0,
        isNavigating,
        isUserExploring,
        toggleNavigationMode,
      }),
    );

    // Initial mount was already navigating, so 0 calls
    expect(toggleNavigationMode).toHaveBeenCalledTimes(0);

    // El usuario arrastra el mapa: entra en exploración y se desactiva navegación
    await act(async () => {
      result.current.handlePanDrag();
      isNavigating = false;
      isUserExploring = true;
    });

    await rerender({});
    expect(result.current.isTimerActive).toBe(true);
    expect(toggleNavigationMode).toHaveBeenCalledTimes(0);

    // Avanzamos 9.9 segundos (no debe activarse aún)
    await act(async () => {
      jest.advanceTimersByTime(9900);
    });
    expect(toggleNavigationMode).toHaveBeenCalledTimes(0);

    // Avanzamos los 100ms restantes para cumplir los 10 segundos exactos
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(toggleNavigationMode).toHaveBeenCalledTimes(1);
    expect(toggleNavigationMode).toHaveBeenCalledWith(
      mockProviderCoord,
      expect.objectContaining({
        reason: 'timeout_10s_inactivity',
        pitch: 65,
        force: true,
      }),
    );
  });

  it('4. Si el usuario realiza un gesto (zoom/drag) dentro de los 10 segundos, el temporizador se reinicia', async () => {
    const toggleNavigationMode = jest.fn();
    let isNavigating = false;
    let isUserExploring = true;

    const { result } = await renderHook(() =>
      useProviderAutoNavigation({
        enabled: true,
        providerCoord: mockProviderCoord,
        heading: 90,
        speed: 0,
        isNavigating,
        isUserExploring,
        toggleNavigationMode,
      }),
    );

    await act(async () => {
      result.current.handlePanDrag();
    });

    // Pasan 6 segundos
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(toggleNavigationMode).not.toHaveBeenCalled();

    // El usuario hace otro gesto (zoom/pinch) a los 6 segundos
    await act(async () => {
      result.current.notifyUserGesture();
    });

    // Pasan otros 6 segundos (total 12s desde el inicio, pero solo 6s desde el último gesto)
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(toggleNavigationMode).not.toHaveBeenCalled();

    // Pasan los 4 segundos restantes para completar 10s desde el último gesto
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(toggleNavigationMode).toHaveBeenCalledTimes(1);
  });

  it('5. Si el proveedor SE MUEVE (desplazamiento >= 5m) durante la exploración, se activa inmediatamente sin esperar los 10s', async () => {
    const toggleNavigationMode = jest.fn();
    let isNavigating = false;
    let isUserExploring = true;
    let currentCoord = { latitude: -38.735000, longitude: -72.590000 };

    const { result, rerender } = await renderHook(
      ({ coord }: { coord: RouteCoordinate }) =>
        useProviderAutoNavigation({
          enabled: true,
          providerCoord: coord,
          heading: 90,
          speed: 0,
          isNavigating,
          isUserExploring,
          toggleNavigationMode,
        }),
      { initialProps: { coord: currentCoord } },
    );

    await act(async () => {
      result.current.handlePanDrag();
    });

    // 1. Simular jitter menor (1 metro) -> no debe activar
    currentCoord = { latitude: -38.735008, longitude: -72.590000 };
    await rerender({ coord: currentCoord });
    expect(toggleNavigationMode).not.toHaveBeenCalled();

    // 2. Simular movimiento real del proveedor (15 metros hacia el este)
    currentCoord = { latitude: -38.735000, longitude: -72.589800 };
    await rerender({ coord: currentCoord });

    expect(toggleNavigationMode).toHaveBeenCalledTimes(1);
    expect(toggleNavigationMode).toHaveBeenCalledWith(
      currentCoord,
      expect.objectContaining({
        reason: 'provider_moved',
        pitch: 65,
        force: true,
      }),
    );
  });

  it('6. Si el proveedor SE MUEVE por velocidad (speed >= 0.5 m/s) durante la exploración, se activa inmediatamente', async () => {
    const toggleNavigationMode = jest.fn();
    let isNavigating = false;
    let isUserExploring = true;
    let currentSpeed = 0;

    const { result, rerender } = await renderHook(
      ({ speed }: { speed: number }) =>
        useProviderAutoNavigation({
          enabled: true,
          providerCoord: mockProviderCoord,
          heading: 90,
          speed,
          isNavigating,
          isUserExploring,
          toggleNavigationMode,
        }),
      { initialProps: { speed: currentSpeed } },
    );

    await act(async () => {
      result.current.handlePanDrag();
    });

    expect(toggleNavigationMode).not.toHaveBeenCalled();

    // El vehículo empieza a avanzar a 1.2 m/s (> 0.5 m/s)
    currentSpeed = 1.2;
    await rerender({ speed: currentSpeed });

    expect(toggleNavigationMode).toHaveBeenCalledTimes(1);
    expect(toggleNavigationMode).toHaveBeenCalledWith(
      mockProviderCoord,
      expect.objectContaining({
        reason: 'provider_moved',
        pitch: 65,
        force: true,
      }),
    );
  });

  it('7. Recentrar manualmente (botón Centrar) reactiva navegación de inmediato', async () => {
    const toggleNavigationMode = jest.fn();
    let isNavigating = false;
    let isUserExploring = true;

    const { result } = await renderHook(() =>
      useProviderAutoNavigation({
        enabled: true,
        providerCoord: mockProviderCoord,
        heading: 90,
        speed: 0,
        isNavigating,
        isUserExploring,
        toggleNavigationMode,
      }),
    );

    await act(async () => {
      result.current.handlePanDrag();
    });

    await act(async () => {
      result.current.handleRecenter();
    });

    expect(toggleNavigationMode).toHaveBeenCalledTimes(1);
    expect(toggleNavigationMode).toHaveBeenCalledWith(
      mockProviderCoord,
      expect.objectContaining({
        reason: 'manual_recenter',
        pitch: 65,
        force: true,
      }),
    );
  });

  it('8. Alternar manualmente el botón desactiva con recuperación automática a los 10s', async () => {
    const toggleNavigationMode = jest.fn();
    let isNavigating = true;
    let isUserExploring = false;

    const { result, rerender } = await renderHook(() =>
      useProviderAutoNavigation({
        enabled: true,
        providerCoord: mockProviderCoord,
        heading: 90,
        speed: 0,
        isNavigating,
        isUserExploring,
        toggleNavigationMode,
      }),
    );

    // Usuario presiona botón para apagar
    await act(async () => {
      result.current.handleToggleNavigation(mockProviderCoord);
      isNavigating = false;
      isUserExploring = true;
    });

    await rerender({});
    expect(toggleNavigationMode).toHaveBeenCalledTimes(1); // Para salir

    // Pasan los 10 segundos
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    // Se reactiva solo
    expect(toggleNavigationMode).toHaveBeenCalledTimes(2);
    expect(toggleNavigationMode).toHaveBeenLastCalledWith(
      mockProviderCoord,
      expect.objectContaining({
        reason: 'timeout_10s_inactivity',
        pitch: 65,
      }),
    );
  });

  it('9. Al cargarse asíncronamente routeCoords mientras navega, sincroniza de inmediato con force: true', async () => {
    const toggleNavigationMode = jest.fn();
    let routeCoords: RouteCoordinate[] = [];

    const { rerender } = await renderHook(() =>
      useProviderAutoNavigation({
        enabled: true,
        providerCoord: mockProviderCoord,
        routeCoords,
        heading: 90,
        speed: 0,
        isNavigating: true,
        isUserExploring: false,
        toggleNavigationMode,
      }),
    );

    // Initial mount was already navigating with empty routeCoords, so 0 calls
    expect(toggleNavigationMode).toHaveBeenCalledTimes(0);

    // 500ms después OSRM / Google responde y llegan las coordenadas de ruta
    const newRoute: RouteCoordinate[] = [
      mockProviderCoord,
      { latitude: -38.740, longitude: -72.600 },
      { latitude: -38.745, longitude: -72.610 },
    ];
    routeCoords = newRoute;

    await rerender({});

    expect(toggleNavigationMode).toHaveBeenCalledTimes(1);
    expect(toggleNavigationMode).toHaveBeenCalledWith(
      mockProviderCoord,
      expect.objectContaining({
        reason: 'route_geometry_ready_sync',
        routeCoords: newRoute,
        force: true,
        pitch: 65,
      }),
    );
  });

  it('10. handleToggleNavigation propaga fielmente opciones y coordenadas provistas al activar', async () => {
    const toggleNavigationMode = jest.fn();
    const customCoord: RouteCoordinate = { latitude: -38.750, longitude: -72.620 };

    const { result } = await renderHook(() =>
      useProviderAutoNavigation({
        enabled: true,
        providerCoord: mockProviderCoord,
        heading: 90,
        speed: 0,
        isNavigating: false,
        isUserExploring: false,
        toggleNavigationMode,
      }),
    );

    toggleNavigationMode.mockClear();

    await act(async () => {
      result.current.handleToggleNavigation(customCoord, {
        heading: 135,
        pitch: 60,
        force: true,
      });
    });

    expect(toggleNavigationMode).toHaveBeenCalledTimes(1);
    expect(toggleNavigationMode).toHaveBeenCalledWith(
      customCoord,
      expect.objectContaining({
        heading: 135,
        pitch: 60,
        force: true,
        reason: 'manual_toggle_on',
      }),
    );
  });
});
