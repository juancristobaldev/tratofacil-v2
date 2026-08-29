import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Dimensions } from 'react-native';
import type MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';
import type { RouteCoordinate } from '../utils/directions';
import {
  validateAndSanitizeCoordinates,
  calculateBoundingBox,
  calculateDynamicEdgePadding,
  calculateUsableMapRect,
  calculateSafeMapRect,
  calculateShiftedLatitude,
  isPointInSafeRect,
  projectCoordinateToScreen,
  isMaterialRouteChange,
  DEFAULT_HORIZONTAL_PADDING,
  DEFAULT_VERTICAL_PADDING,
  ROUTE_FIT_BOTTOM_CLEARANCE,
  ROUTE_FIT_HORIZONTAL_CLEARANCE,
  ROUTE_FIT_TOP_CLEARANCE,
  ROUTE_FIT_ZOOM_SCALE,
  DEFAULT_TEMUCO_PLC_REGION,
  NAVIGATION_LATITUDE_DELTA,
  NAVIGATION_LONGITUDE_DELTA,
  NAVIGATION_PITCH,
  NAVIGATION_ZOOM_LEVEL,
  NAVIGATION_ALTITUDE,
  type DynamicEdgePadding,
  type BoundingBox,
  type SafeMapRect,
} from '../utils/mapGeometry';

export interface NavigationModeOptions {
  heading?: number;
  pitch?: number;
  zoom?: number;
  animated?: boolean;
  duration?: number;
}

export type CameraMode =
  | 'IDLE'
  | 'AUTO_FIT_ROUTE'
  | 'FOLLOW_USER'
  | 'FOLLOW_PROVIDER'
  | 'FOLLOW_ORDER'
  | 'NAVIGATION'
  | 'USER_EXPLORING';

export interface UseMapCameraOptions {
  mapRef: React.RefObject<MapView | null>;
  headerBottom: number;
  sheetTop: number | null;
  bottomNavHeight?: number;
  windowDimensions?: { width: number; height: number };
  initialFollowMode?: boolean;
}

export interface FitRouteOptions {
  edgePaddingOverride?: Partial<DynamicEdgePadding>;
  animated?: boolean;
  minDelta?: { latitudeDelta?: number; longitudeDelta?: number };
  force?: boolean;
  reason?: string;
}

export interface FollowCoordinateOptions {
  force?: boolean;
  animated?: boolean;
  latitudeDelta?: number;
  longitudeDelta?: number;
  reason?: string;
  heading?: number;
}

export interface RecenterOptions {
  targetCoordinate?: RouteCoordinate | null;
  pointsToFit?: RouteCoordinate[] | null;
  animated?: boolean;
}

export interface TargetVisibilityResult {
  isVisible: boolean;
  method: 'VISIBILITY_NATIVE' | 'VISIBILITY_ESTIMATED';
  point?: { x: number; y: number };
}

export function useMapCamera(options: UseMapCameraOptions) {
  const {
    mapRef,
    headerBottom,
    sheetTop,
    bottomNavHeight = 0,
    windowDimensions = Dimensions.get('window'),
    initialFollowMode = true,
  } = options;

  const [cameraMode, setCameraMode] = useState<CameraMode>('IDLE');
  const [isFollowing, setIsFollowing] = useState<boolean>(initialFollowMode);
  const isUserExploring = !isFollowing;

  // Referencias para control de estado interno y concurrencia
  const isProgrammaticMovementRef = useRef<boolean>(false);
  const lastAnimatedRegionRef = useRef<Region | null>(null);
  const lastRenderedRegionRef = useRef<Region | null>(null);
  const lastTargetCoordRef = useRef<RouteCoordinate | null>(null);
  const lastFittedPointsRef = useRef<RouteCoordinate[] | null>(null);
  const lastSheetTopRef = useRef<number | null>(sheetTop);
  const lastHeaderBottomRef = useRef<number>(headerBottom);
  const lastHeadingRef = useRef<number>(0);
  const lastPitchRef = useRef<number>(NAVIGATION_PITCH);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cálculo de dynamicEdgePadding memoizado
  const dynamicEdgePadding = useMemo(() => {
    return calculateDynamicEdgePadding({
      windowWidth: windowDimensions.width,
      windowHeight: windowDimensions.height,
      headerBottom,
      sheetTop,
      bottomNavHeight,
      horizontalPadding: DEFAULT_HORIZONTAL_PADDING,
      topSafety: DEFAULT_VERTICAL_PADDING,
      bottomSafety: DEFAULT_VERTICAL_PADDING,
    });
  }, [windowDimensions.width, windowDimensions.height, headerBottom, sheetTop, bottomNavHeight]);

  // Cálculo del usableMapRect y safeMapRect
  const usableRect = useMemo(() => {
    return calculateUsableMapRect({
      windowWidth: windowDimensions.width,
      windowHeight: windowDimensions.height,
      headerBottom,
      sheetTop,
      bottomNavHeight,
    });
  }, [windowDimensions.width, windowDimensions.height, headerBottom, sheetTop, bottomNavHeight]);

  const safeRect = useMemo(() => {
    return calculateSafeMapRect(usableRect, 0.15, 0.15);
  }, [usableRect]);

  /**
   * Evalúa si una coordenada objetivo está visible físicamente dentro del safeMapRect.
   * Utiliza preferentemente pointForCoordinate() nativo con fallback a proyección estimada.
   */
  const checkTargetVisibility = useCallback(
    async (
      coord: RouteCoordinate,
      currentSafeRect: SafeMapRect,
    ): Promise<TargetVisibilityResult> => {
      // 1. Intentar conversión nativa vía pointForCoordinate
      if (mapRef.current && typeof mapRef.current.pointForCoordinate === 'function') {
        try {
          const nativePoint = await mapRef.current.pointForCoordinate(coord);
          if (nativePoint && Number.isFinite(nativePoint.x) && Number.isFinite(nativePoint.y)) {
            const isVisible = isPointInSafeRect(nativePoint, currentSafeRect);
            return { isVisible, method: 'VISIBILITY_NATIVE', point: nativePoint };
          }
        } catch {
          // Fallback a estimación matemática si el bridge nativo rechaza o falla
        }
      }

      // 2. Fallback estimado basado en la región actual o última animada
      const reg = lastRenderedRegionRef.current || lastAnimatedRegionRef.current;
      if (reg && reg.latitudeDelta > 0 && reg.longitudeDelta > 0) {
        const estimatedPoint = projectCoordinateToScreen(coord, reg, windowDimensions);
        const isVisible = isPointInSafeRect(estimatedPoint, currentSafeRect);
        return { isVisible, method: 'VISIBILITY_ESTIMATED', point: estimatedPoint };
      }

      return { isVisible: false, method: 'VISIBILITY_ESTIMATED' };
    },
    [mapRef, windowDimensions],
  );

  /**
   * Ajusta la cámara para encuadrar todos los puntos (ruta + pins) dentro del área útil del mapa.
   */
  const fitToRoute = useCallback(
    (points: RouteCoordinate[] | null | undefined, fitOpts?: FitRouteOptions) => {
      const sanitized = validateAndSanitizeCoordinates(points);
      if (sanitized.length === 0 || !mapRef.current) return;

      // Bloqueo de exclusividad: si está en modo navegación y no es un force explícito,
      // ningún encuadre pasivo de ruta puede competir ni romper la cámara 3D de navegación.
      if (cameraMode === 'NAVIGATION' && !fitOpts?.force) {
        if (__DEV__) {
          console.log(`[MAP:CAMERA_SKIP] reason=navigation_mode_active points=${sanitized.length}`);
        }
        return;
      }

      // Comprobar identidad semántica de ruta para evitar fits innecesarios
      if (!fitOpts?.force && lastFittedPointsRef.current) {
        const isMaterial = isMaterialRouteChange(lastFittedPointsRef.current, sanitized);
        if (!isMaterial) {
          if (__DEV__) {
            console.log(`[MAP:CAMERA_SKIP] reason=identical_route_geometry points=${sanitized.length}`);
          }
          return;
        }
      }

      lastFittedPointsRef.current = sanitized;

      const animated = fitOpts?.animated ?? true;
      const padding: DynamicEdgePadding = {
        top: dynamicEdgePadding.top + (fitOpts?.edgePaddingOverride?.top ?? 0),
        bottom: dynamicEdgePadding.bottom + (fitOpts?.edgePaddingOverride?.bottom ?? 0),
        left: dynamicEdgePadding.left + (fitOpts?.edgePaddingOverride?.left ?? 0),
        right: dynamicEdgePadding.right + (fitOpts?.edgePaddingOverride?.right ?? 0),
      };

      const bbox: BoundingBox | null = calculateBoundingBox(sanitized, fitOpts?.minDelta);
      if (!bbox) return;

      if (__DEV__) {
        console.log(`[MAP:FIT_ROUTE] reason=${fitOpts?.reason || 'unspecified'} points=${sanitized.length} sheetTop=${sheetTop} headerBottom=${headerBottom} topPadding=${padding.top} bottomPadding=${padding.bottom}`);
      }

      isProgrammaticMovementRef.current = true;
      setCameraMode('AUTO_FIT_ROUTE');

      const targetLatDelta = bbox.latitudeDelta * ROUTE_FIT_ZOOM_SCALE;
      const targetLngDelta = bbox.longitudeDelta * ROUTE_FIT_ZOOM_SCALE;
      const shiftedLat = calculateShiftedLatitude(bbox.centerLatitude, targetLatDelta, padding, windowDimensions.height);
      const targetRegion: Region = {
        latitude: shiftedLat,
        longitude: bbox.centerLongitude,
        latitudeDelta: targetLatDelta,
        longitudeDelta: targetLngDelta,
      };
      lastAnimatedRegionRef.current = targetRegion;

      if (sanitized.length === 1) {
        mapRef.current.animateToRegion?.(targetRegion, animated ? 500 : 0);
      } else {
        try {
          mapRef.current?.fitToCoordinates?.(sanitized, {
            edgePadding: padding,
            animated,
          });
        } catch {
          // Fallback matemático en caso de que fitToCoordinates falle
          mapRef.current.animateToRegion?.(targetRegion, animated ? 500 : 0);
        }
      }
    },
    [cameraMode, dynamicEdgePadding, headerBottom, mapRef, sheetTop, windowDimensions.height],
  );

  /**
   * Sigue una coordenada (ej. ubicación de usuario o proveedor) con compensación del Bottom Sheet.
   * Si el usuario está explorando manualmente, no realiza ningún movimiento (respeta la intención).
   * Evalúa la visibilidad real del marker contra safeMapRect y separa el jitter de GPS.
   */
  const followCoordinate = useCallback(
    async (coord: RouteCoordinate | null | undefined, followOpts?: FollowCoordinateOptions) => {
      if (!coord || !mapRef.current) return;

      const force = followOpts?.force ?? false;
      const animated = followOpts?.animated ?? true;

      // 1. Si el usuario está explorando y no es un force explícito, OMITIR
      if (isUserExploring && !force) {
        if (__DEV__) {
          console.log(`[MAP:CAMERA_SKIP] reason=user_interacting mode=${cameraMode}`);
        }
        return;
      }

      // Si estamos en modo navegación, mantener el modo navegación en vez de degradar a 2D
      if (cameraMode === 'NAVIGATION') {
        const navHeading = (followOpts?.heading != null && Number.isFinite(followOpts.heading) && followOpts.heading >= 0)
          ? followOpts.heading
          : lastHeadingRef.current;
        navigateToCoordinate(coord, {
          heading: navHeading,
          pitch: lastPitchRef.current,
          animated,
        });
        return;
      }

      // 2. Comprobar visibilidad física real contra safeMapRect
      const visibility = await checkTargetVisibility(coord, safeRect);

      // 3. Comprobar si el desplazamiento de GPS es insignificante (< 15 metros)
      const lastCoord = lastTargetCoordRef.current;
      const isGpsJitter =
        !force &&
        !!lastCoord &&
        Math.abs(coord.latitude - lastCoord.latitude) < 0.00015 &&
        Math.abs(coord.longitude - lastCoord.longitude) < 0.00015;

      if (!force) {
        if (isGpsJitter && visibility.isVisible) {
          if (__DEV__) {
            console.log(`[MAP:CAMERA_SKIP] reason=gps_jitter method=${visibility.method}`);
          }
          return;
        }

        if (visibility.isVisible) {
          if (__DEV__) {
            console.log(`[MAP:CAMERA_SKIP] reason=target_inside_safe_viewport method=${visibility.method}`);
          }
          return;
        }
      }

      if (__DEV__ && !visibility.isVisible) {
        console.log(`[MAP:CAMERA_MOVE] reason=target_outside_safe_viewport method=${visibility.method} pt=(${visibility.point?.x?.toFixed(1)},${visibility.point?.y?.toFixed(1)})`);
      }

      lastTargetCoordRef.current = { latitude: coord.latitude, longitude: coord.longitude };

      const latDelta = followOpts?.latitudeDelta ?? 0.012;
      const lngDelta = followOpts?.longitudeDelta ?? 0.012;

      // Compensación visual exacta para que el marker quede centrado en el usableMapRect
      const shiftedLatitude = calculateShiftedLatitude(coord.latitude, latDelta, dynamicEdgePadding, windowDimensions.height);

      const targetRegion: Region = {
        latitude: shiftedLatitude,
        longitude: coord.longitude,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };

      lastAnimatedRegionRef.current = targetRegion;
      lastRenderedRegionRef.current = targetRegion;
      isProgrammaticMovementRef.current = true;
      setCameraMode('FOLLOW_USER');

      if (__DEV__) {
        console.log(`[MAP:FOLLOW] reason=${followOpts?.reason || 'auto_follow'} target=(${coord.latitude.toFixed(4)},${coord.longitude.toFixed(4)}) sheetTop=${sheetTop}`);
      }

      mapRef.current?.animateToRegion?.(targetRegion, animated ? 600 : 0);
    },
    [cameraMode, checkTargetVisibility, dynamicEdgePadding, isUserExploring, mapRef, safeRect, sheetTop, windowDimensions.height],
  );

  /**
   * Evento de reasentamiento del Bottom Sheet (sheetTop settling).
   * Si sheetTop cambia materialmente y el target queda fuera de la zona segura,
   * la cámara se reajusta inmediatamente aunque el GPS no haya cambiado.
   */
  useEffect(() => {
    if (sheetTop === null && lastSheetTopRef.current === null && headerBottom === lastHeaderBottomRef.current) return;
    const previousSheetTop = lastSheetTopRef.current;
    const previousHeaderBottom = lastHeaderBottomRef.current;
    const diff = Math.abs((sheetTop ?? windowDimensions.height) - (previousSheetTop ?? windowDimensions.height));
    const headerDiff = Math.abs(headerBottom - previousHeaderBottom);

    if (diff > 15 || headerDiff > 15) {
      if (__DEV__) {
        console.log(`[MAP:VIEWPORT_CHANGE] reason=viewport_settled sheetTop=${sheetTop} headerBottom=${headerBottom}`);
      }

      if (isFollowing && lastTargetCoordRef.current) {
        followCoordinate(lastTargetCoordRef.current, {
          reason: 'viewport_settle_recenter',
          animated: true,
        });
      } else if (cameraMode === 'AUTO_FIT_ROUTE' && lastFittedPointsRef.current) {
        fitToRoute(lastFittedPointsRef.current, {
          force: true,
          reason: 'viewport_settle_route_fit',
          animated: true,
        });
      }
    }

    lastSheetTopRef.current = sheetTop;
    lastHeaderBottomRef.current = headerBottom;
  }, [sheetTop, headerBottom, windowDimensions.height, isFollowing, followCoordinate, cameraMode, fitToRoute]);

  /**
   * Manejador de gesto de arrastre (pan drag) por el usuario.
   * Conmuta limpiamente a USER_EXPLORING y suspende auto-follow.
   */
  const handlePanDrag = useCallback(() => {
    if (__DEV__) {
      console.log('[MAP:USER_INTERACTION] type=PAN_DRAG');
    }
    setIsFollowing(false);
    setCameraMode('USER_EXPLORING');
  }, []);

  /**
   * Manejador de finalización de movimiento de región del MapView.
   * Filtra movimientos programáticos para no disparar falsamente USER_EXPLORING.
   */
  const handleRegionChangeComplete = useCallback((region: Region, details?: { isGesture?: boolean } | boolean) => {
    lastRenderedRegionRef.current = region;
    if (isProgrammaticMovementRef.current) {
      isProgrammaticMovementRef.current = false;
      return;
    }
    const isGesture = typeof details === 'boolean' ? details : details?.isGesture;
    if (isGesture) {
      if (__DEV__) {
        console.log('[MAP:USER_INTERACTION] type=GESTURE_REGION_CHANGE');
      }
      setIsFollowing(false);
      setCameraMode('USER_EXPLORING');
    }
  }, []);

  /**
   * Desactiva el modo de navegación 3D y restaura la cámara a vista cenital 2D plana (pitch: 0, heading: 0)
   * centrada en la coordenada objetivo (o última coordenada conocida).
   */
  const exitNavigationMode = useCallback(
    (targetCoord?: RouteCoordinate | null, animated: boolean = true) => {
      const coord = targetCoord || lastTargetCoordRef.current;
      if (__DEV__) {
        console.log('[MAP:NAVIGATION_EXIT] resetting pitch to 0 and returning to 2D follow');
      }
      lastPitchRef.current = 0;
      lastHeadingRef.current = 0;
      setIsFollowing(true);
      setCameraMode('FOLLOW_USER');
      isProgrammaticMovementRef.current = true;

      if (coord && mapRef.current) {
        lastTargetCoordRef.current = { latitude: coord.latitude, longitude: coord.longitude };
        const latDelta = 0.012;
        const lngDelta = 0.012;
        const shiftedLatitude = calculateShiftedLatitude(
          coord.latitude,
          latDelta,
          dynamicEdgePadding,
          windowDimensions.height,
        );

        const targetRegion: Region = {
          latitude: shiftedLatitude,
          longitude: coord.longitude,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        };
        lastAnimatedRegionRef.current = targetRegion;
        lastRenderedRegionRef.current = targetRegion;

        if (typeof mapRef.current.animateCamera === 'function') {
          try {
            mapRef.current.animateCamera(
              {
                center: { latitude: shiftedLatitude, longitude: coord.longitude },
                pitch: 0,
                heading: 0,
                zoom: 15.5,
              },
              { duration: animated ? 600 : 0 },
            );
            return;
          } catch {
            // Fallback a animateToRegion
          }
        }
        mapRef.current?.animateToRegion?.(targetRegion, animated ? 600 : 0);
      }
    },
    [dynamicEdgePadding, mapRef, windowDimensions.height],
  );

  /**
   * Activa el modo de navegación cercano centrado en la coordenada (usuario o punto)
   * con inclinación 3D (pitch 60°), orientación (heading) y zoom cercano de calle.
   */
  const navigateToCoordinate = useCallback(
    (coord: RouteCoordinate | null | undefined, navOpts?: NavigationModeOptions) => {
      if (!coord || !mapRef.current) return;
      const rawHeading = navOpts?.heading;
      const heading = (rawHeading != null && Number.isFinite(rawHeading) && rawHeading >= 0)
        ? rawHeading
        : (lastHeadingRef.current >= 0 ? lastHeadingRef.current : 0);
      const pitch = navOpts?.pitch ?? (lastPitchRef.current > 0 ? lastPitchRef.current : NAVIGATION_PITCH);
      const animated = navOpts?.animated ?? true;
      const duration = navOpts?.duration ?? 800;

      lastHeadingRef.current = heading;
      lastPitchRef.current = pitch;

      setIsFollowing(true);
      setCameraMode('NAVIGATION');
      isProgrammaticMovementRef.current = true;
      lastTargetCoordRef.current = { latitude: coord.latitude, longitude: coord.longitude };

      const latDelta = NAVIGATION_LATITUDE_DELTA;
      const lngDelta = NAVIGATION_LONGITUDE_DELTA;
      const shiftedLatitude = calculateShiftedLatitude(coord.latitude, latDelta, dynamicEdgePadding, windowDimensions.height);

      const targetRegion: Region = {
        latitude: shiftedLatitude,
        longitude: coord.longitude,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
      lastAnimatedRegionRef.current = targetRegion;
      lastRenderedRegionRef.current = targetRegion;

      if (typeof mapRef.current.animateCamera === 'function') {
        try {
          mapRef.current.animateCamera(
            {
              center: { latitude: shiftedLatitude, longitude: coord.longitude },
              pitch,
              heading,
              zoom: navOpts?.zoom ?? NAVIGATION_ZOOM_LEVEL,
              altitude: NAVIGATION_ALTITUDE,
            },
            { duration: animated ? duration : 0 },
          );
          return;
        } catch {
          // Fallback a animateToRegion
        }
      }

      mapRef.current?.animateToRegion?.(targetRegion, animated ? duration : 0);
    },
    [dynamicEdgePadding, mapRef, windowDimensions.height],
  );

  /**
   * Alterna entre modo navegación 3D y vista 2D plana.
   * Si ya está activo, lo desactiva. Si está inactivo, lo activa con pitch 60°.
   */
  const toggleNavigationMode = useCallback(
    (coord?: RouteCoordinate | null, navOpts?: NavigationModeOptions) => {
      if (cameraMode === 'NAVIGATION') {
        exitNavigationMode(coord, navOpts?.animated ?? true);
      } else {
        navigateToCoordinate(coord, navOpts);
      }
    },
    [cameraMode, exitNavigationMode, navigateToCoordinate],
  );

  /**
   * Recentra el mapa y reactiva el seguimiento automático de cámara en 2D.
   */
  const recenter = useCallback(
    (recenterOpts?: RecenterOptions) => {
      if (__DEV__) {
        console.log('[MAP:RECENTER] restoring followMode in 2D');
      }
      lastPitchRef.current = 0;
      lastHeadingRef.current = 0;
      setIsFollowing(true);

      if (recenterOpts?.pointsToFit && recenterOpts.pointsToFit.length >= 2) {
        fitToRoute(recenterOpts.pointsToFit, {
          force: true,
          animated: recenterOpts.animated ?? true,
          reason: 'recenter_requested',
        });
      } else if (recenterOpts?.targetCoordinate) {
        followCoordinate(recenterOpts.targetCoordinate, {
          force: true,
          animated: recenterOpts.animated ?? true,
          reason: 'recenter_requested',
        });
      } else if (lastTargetCoordRef.current) {
        followCoordinate(lastTargetCoordRef.current, {
          force: true,
          animated: recenterOpts?.animated ?? true,
          reason: 'recenter_requested',
        });
      }
    },
    [fitToRoute, followCoordinate],
  );

  /**
   * Restaura la vista al encuadre por defecto (Temuco + Padre Las Casas).
   */
  const fitToDefaultRegion = useCallback(
    (defaultRegion: Region = DEFAULT_TEMUCO_PLC_REGION, animated: boolean = true) => {
      if (!mapRef.current) return;
      lastPitchRef.current = 0;
      lastHeadingRef.current = 0;
      setIsFollowing(false);
      setCameraMode('IDLE');
      isProgrammaticMovementRef.current = true;
      lastTargetCoordRef.current = null;

      const latDelta = defaultRegion.latitudeDelta;
      const lngDelta = defaultRegion.longitudeDelta;
      const shiftedLatitude = calculateShiftedLatitude(
        defaultRegion.latitude,
        latDelta,
        dynamicEdgePadding,
        windowDimensions.height,
      );

      const targetRegion: Region = {
        latitude: shiftedLatitude,
        longitude: defaultRegion.longitude,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };

      lastAnimatedRegionRef.current = targetRegion;
      lastRenderedRegionRef.current = targetRegion;

      mapRef.current?.animateToRegion?.(targetRegion, animated ? 800 : 0);
    },
    [dynamicEdgePadding, mapRef, windowDimensions.height],
  );

  return {
    cameraMode,
    isFollowing,
    isNavigating: cameraMode === 'NAVIGATION',
    isUserExploring,
    dynamicEdgePadding,
    usableRect,
    safeRect,
    fitToRoute,
    followCoordinate,
    navigateToCoordinate,
    exitNavigationMode,
    toggleNavigationMode,
    fitToDefaultRegion,
    handlePanDrag,
    handleRegionChangeComplete,
    recenter,
    setFollowMode: setIsFollowing,
  };
}
