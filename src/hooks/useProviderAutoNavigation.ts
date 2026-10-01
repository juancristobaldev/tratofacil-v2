import { useEffect, useRef, useCallback } from 'react';
import type { RouteCoordinate } from '../utils/directions';
import type { NavigationModeOptions } from './useMapCamera';
import { getDistanceMeters } from '../navigation-engine/geoMathCore';

export interface UseProviderAutoNavigationParams {
  /** Indica si la navegación está disponible para el proveedor según el estado de la orden */
  enabled: boolean;
  /** Coordenada actual del proveedor (GPS local prioritario o coordenadas remotas) */
  providerCoord: RouteCoordinate | null;
  /** Coordenadas de la ruta activa (opcional) */
  routeCoords?: RouteCoordinate[] | null;
  /** Orientación / rumbo en grados [0, 360) */
  heading?: number | null;
  /** Velocidad del proveedor en m/s */
  speed?: number | null;
  /** Precisión del fix GPS en metros */
  accuracy?: number | null;
  /** Timestamp del fix GPS */
  timestamp?: number | null;
  /** Estado de si el mapa está actualmente en modo navegación 3D */
  isNavigating: boolean;
  /** Estado de si el usuario está explorando libremente el mapa */
  isUserExploring: boolean;
  /** Función para alternar o activar el modo navegación */
  toggleNavigationMode: (
    coord?: RouteCoordinate | null,
    options?: NavigationModeOptions,
  ) => void;
  /** Función directa para activar/actualizar navegación sin comportamiento toggle (opcional) */
  navigateToCoordinate?: (
    coord?: RouteCoordinate | null,
    options?: NavigationModeOptions,
  ) => void;
  /** Función directa para salir de navegación (opcional) */
  exitNavigationMode?: (
    coord?: RouteCoordinate | null,
    animated?: boolean,
  ) => void;
  /** Tiempo de inactividad antes de reactivar navegación automáticamente (default: 10000 ms) */
  inactivityTimeoutMs?: number;
  /** Desplazamiento mínimo del proveedor en metros para reactivar navegación al moverse (default: 5 m) */
  movementThresholdMeters?: number;
  /** Velocidad mínima del proveedor en m/s para reactivar navegación (default: 0.5 m/s) */
  speedThresholdMps?: number;
}

export interface UseProviderAutoNavigationReturn {
  /** Manejador que se debe llamar al arrastrar el mapa (onPanDrag) */
  handlePanDrag: () => void;
  /** Notifica un gesto de interacción (ej. zoom con pinza en onRegionChangeComplete) */
  notifyUserGesture: () => void;
  /** Recentra el mapa reactivando inmediatamente el modo de navegación */
  handleRecenter: () => void;
  /** Alterna o reactiva manualmente el modo de navegación */
  handleToggleNavigation: (
    coord?: RouteCoordinate | null,
    options?: NavigationModeOptions,
  ) => void;
  /** Indica si el temporizador de inactividad de 10 segundos está corriendo */
  isTimerActive: boolean;
}

const DEFAULT_INACTIVITY_TIMEOUT_MS = 10000;
const DEFAULT_MOVEMENT_THRESHOLD_METERS = 5;
const DEFAULT_SPEED_THRESHOLD_MPS = 0.5;

function safeDistanceMeters(p1?: RouteCoordinate | null, p2?: RouteCoordinate | null): number {
  if (!p1 || !p2) return 0;
  if (!Number.isFinite(p1.latitude) || !Number.isFinite(p1.longitude)) return 0;
  if (!Number.isFinite(p2.latitude) || !Number.isFinite(p2.longitude)) return 0;
  return getDistanceMeters(p1, p2);
}

export function useProviderAutoNavigation(
  params: UseProviderAutoNavigationParams,
): UseProviderAutoNavigationReturn {
  const {
    enabled,
    providerCoord,
    routeCoords,
    heading,
    speed,
    accuracy,
    timestamp,
    isNavigating,
    isUserExploring,
    toggleNavigationMode,
    navigateToCoordinate,
    exitNavigationMode,
    inactivityTimeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
    movementThresholdMeters = DEFAULT_MOVEMENT_THRESHOLD_METERS,
    speedThresholdMps = DEFAULT_SPEED_THRESHOLD_MPS,
  } = params;

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragAnchorCoordRef = useRef<RouteCoordinate | null>(null);
  const userPausedNavRef = useRef<boolean>(false);
  const isNavigatingRef = useRef<boolean>(isNavigating);
  isNavigatingRef.current = isNavigating;
  const isUserExploringRef = useRef<boolean>(isUserExploring);
  isUserExploringRef.current = isUserExploring;
  const enabledRef = useRef<boolean>(enabled);
  enabledRef.current = enabled;
  const providerCoordRef = useRef<RouteCoordinate | null>(providerCoord);
  providerCoordRef.current = providerCoord;

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const activateNavigation = useCallback(
    (
      reason: string,
      coordOverride?: RouteCoordinate | null,
      optionsOverride?: NavigationModeOptions,
    ) => {
      const coord = coordOverride || providerCoordRef.current;
      if (!enabledRef.current || !coord) return;

      clearInactivityTimer();
      userPausedNavRef.current = false;
      dragAnchorCoordRef.current = null;

      const sanitizedHeading =
        optionsOverride?.heading ??
        (heading != null && Number.isFinite(heading) && heading >= 0 ? heading : undefined);

      if (__DEV__) {
        console.log(`[NAV:AUTO_ACTIVATE] reason=${reason} coord=(${coord.latitude.toFixed(5)},${coord.longitude.toFixed(5)})`);
      }

      const effectiveRouteCoords =
        optionsOverride?.routeCoords !== undefined
          ? optionsOverride.routeCoords
          : routeCoords && routeCoords.length >= 2
            ? routeCoords
            : undefined;

      const navAction = navigateToCoordinate || toggleNavigationMode;
      navAction(coord, {
        heading: sanitizedHeading,
        speed: optionsOverride?.speed ?? speed ?? undefined,
        accuracy: optionsOverride?.accuracy ?? accuracy ?? undefined,
        timestamp: optionsOverride?.timestamp ?? timestamp ?? undefined,
        routeCoords: effectiveRouteCoords,
        pitch: (optionsOverride?.pitch != null && optionsOverride.pitch > 0) ? optionsOverride.pitch : 65,
        animated: optionsOverride?.animated ?? true,
        force: true,
        reason,
      });
    },
    [clearInactivityTimer, heading, speed, accuracy, timestamp, routeCoords, navigateToCoordinate, toggleNavigationMode],
  );

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();

    // Guardar posición ancla al momento del gesto para detectar desplazamiento
    if (providerCoordRef.current) {
      dragAnchorCoordRef.current = {
        latitude: providerCoordRef.current.latitude,
        longitude: providerCoordRef.current.longitude,
      };
    }

    inactivityTimerRef.current = setTimeout(() => {
      if (__DEV__) {
        console.log('[NAV:AUTO_ACTIVATE] 10 seconds inactivity expired; auto-activating compass navigation');
      }
      userPausedNavRef.current = false;
      activateNavigation('timeout_10s_inactivity');
    }, inactivityTimeoutMs);
  }, [clearInactivityTimer, inactivityTimeoutMs, activateNavigation]);

  // Al arrastrar el mapa: desactivar navegación y comenzar temporizador de 10 segundos
  const handlePanDrag = useCallback(() => {
    if (!enabledRef.current) return;

    if (__DEV__) {
      console.log('[NAV:USER_GESTURE] Map pan drag detected; starting 10s auto-reactivation countdown');
    }
    userPausedNavRef.current = true;
    startInactivityTimer();
  }, [startInactivityTimer]);

  // Notificación de gestos adicionales (como zoom con pinza)
  const notifyUserGesture = useCallback(() => {
    if (!enabledRef.current) return;
    userPausedNavRef.current = true;
    startInactivityTimer();
  }, [startInactivityTimer]);

  // Recenter manual (botón "Centrar"): reactiva inmediatamente el modo navegación
  const handleRecenter = useCallback(() => {
    if (!enabledRef.current) return;
    clearInactivityTimer();
    userPausedNavRef.current = false;
    activateNavigation('manual_recenter');
  }, [clearInactivityTimer, activateNavigation]);

  // Alternar manualmente navegación
  const handleToggleNavigation = useCallback(
    (coord?: RouteCoordinate | null, options?: NavigationModeOptions) => {
      if (!enabledRef.current) return;

      if (isNavigatingRef.current) {
        // El usuario apaga manualmente navegación: desactiva pero inicia temporizador de 15s / movimiento
        clearInactivityTimer();
        userPausedNavRef.current = true;
        const subject = coord || providerCoordRef.current;
        if (exitNavigationMode) {
          exitNavigationMode(subject, options?.animated ?? true);
        } else {
          toggleNavigationMode(subject, { animated: options?.animated ?? true, force: false });
        }
        startInactivityTimer();
      } else {
        // El usuario activa manualmente navegación respetando coordenadas y opciones provistas
        clearInactivityTimer();
        userPausedNavRef.current = false;
        activateNavigation('manual_toggle_on', coord, options);
      }
    },
    [clearInactivityTimer, activateNavigation, exitNavigationMode, toggleNavigationMode, startInactivityTimer],
  );

  // REGLA 1: En los estados disponibles, el modo navegación SE ACTIVA SOLO sin ningún botón
  useEffect(() => {
    if (!enabled) return;

    // Si no está navegando y el usuario no ha pausado o no está en exploración manual libre, activar automáticamente
    if (!isNavigating && !isUserExploring && !userPausedNavRef.current && providerCoord) {
      activateNavigation('initial_or_state_change');
    }
  }, [enabled, isNavigating, isUserExploring, providerCoord, activateNavigation]);

  // REGLA 1.1: Sincronización inmediata al recibir o actualizar la geometría de la ruta (routeCoords):
  // Si la navegación ya está activa y routeCoords se carga inicialmente o se actualiza por recálculo dinámico (desvío de camino),
  // forzar inmediatamente la sincronización con la ruta para que aplique road-snapping,
  // rumbo de calzada y lookahead vial sin esperar movimiento físico ni interacción manual.
  const prevRouteCoordsRef = useRef<RouteCoordinate[] | null | undefined>(routeCoords);
  useEffect(() => {
    const prev = prevRouteCoordsRef.current;
    prevRouteCoordsRef.current = routeCoords;
    const currentLength = routeCoords?.length ?? 0;
    const prevLength = prev?.length ?? 0;

    if (!enabled || !providerCoord) return;

    const isInitialLoad = currentLength >= 2 && prevLength < 2;
    const isRouteUpdated =
      currentLength >= 2 &&
      routeCoords &&
      prev &&
      prev !== routeCoords &&
      (prev[0]?.latitude !== routeCoords[0]?.latitude ||
        prev[0]?.longitude !== routeCoords[0]?.longitude ||
        Math.abs(currentLength - prevLength) > 1);

    if ((isInitialLoad || isRouteUpdated) && isNavigating) {
      if (__DEV__) {
        console.log(`[NAV:ROUTE_READY_SYNC] routeCoords loaded/updated (${currentLength} pts); syncing 3D camera to route`);
      }
      activateNavigation('route_geometry_ready_sync');
    }
  }, [enabled, isNavigating, routeCoords, providerCoord, activateNavigation]);

  // REGLA 2: Si el usuario está explorando/pausado y el proveedor SE MUEVE, se activa automáticamente
  useEffect(() => {
    if (!enabled || (!isUserExploring && !userPausedNavRef.current) || !providerCoord) return;

    const anchor = dragAnchorCoordRef.current;
    if (!anchor) {
      dragAnchorCoordRef.current = {
        latitude: providerCoord.latitude,
        longitude: providerCoord.longitude,
      };
      const hasSpeed = speed != null && Number.isFinite(speed) && speed >= speedThresholdMps;
      if (hasSpeed) {
        if (__DEV__) {
          console.log(
            `[NAV:AUTO_ACTIVATE] Provider moving with speed=${speed ?? 0}m/s; canceling 10s timer and auto-activating compass navigation`,
          );
        }
        userPausedNavRef.current = false;
        activateNavigation('provider_moved');
      }
      return;
    }

    const distanceMoved = safeDistanceMeters(anchor, providerCoord);
    const hasSpeed = speed != null && Number.isFinite(speed) && speed >= speedThresholdMps;
    const hasDisplacement = distanceMoved >= movementThresholdMeters;

    if (hasSpeed || hasDisplacement) {
      if (__DEV__) {
        console.log(
          `[NAV:AUTO_ACTIVATE] Provider moved (distance=${distanceMoved.toFixed(1)}m, speed=${speed ?? 0}m/s); canceling 10s timer and auto-activating compass navigation`,
        );
      }
      userPausedNavRef.current = false;
      activateNavigation('provider_moved');
    }
  }, [
    enabled,
    isUserExploring,
    providerCoord,
    speed,
    movementThresholdMeters,
    speedThresholdMps,
    activateNavigation,
  ]);

  // Limpieza al desmontar o si deja de estar disponible el modo navegación
  useEffect(() => {
    if (!enabled) {
      clearInactivityTimer();
      userPausedNavRef.current = false;
      dragAnchorCoordRef.current = null;
    }
    return () => {
      clearInactivityTimer();
    };
  }, [enabled, clearInactivityTimer]);

  return {
    handlePanDrag,
    notifyUserGesture,
    handleRecenter,
    handleToggleNavigation,
    isTimerActive: inactivityTimerRef.current !== null,
  };
}
