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
  isPointInSafeRect,
  projectCoordinateToScreen,
  isMaterialRouteChange,
  DEFAULT_HORIZONTAL_PADDING,
  DEFAULT_VERTICAL_PADDING,
  type DynamicEdgePadding,
  type BoundingBox,
  type SafeMapRect,
} from '../utils/mapGeometry';

export type CameraMode =
  | 'IDLE'
  | 'AUTO_FIT_ROUTE'
  | 'FOLLOW_USER'
  | 'FOLLOW_PROVIDER'
  | 'FOLLOW_ORDER'
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
        ...dynamicEdgePadding,
        ...fitOpts?.edgePaddingOverride,
      };

      const bbox: BoundingBox | null = calculateBoundingBox(sanitized, fitOpts?.minDelta);
      if (!bbox) return;

      if (__DEV__) {
        console.log(`[MAP:FIT_ROUTE] reason=${fitOpts?.reason || 'unspecified'} points=${sanitized.length} sheetTop=${sheetTop} headerBottom=${headerBottom} topPadding=${padding.top} bottomPadding=${padding.bottom}`);
      }

      isProgrammaticMovementRef.current = true;
      setCameraMode('AUTO_FIT_ROUTE');

      const shiftedLat = bbox.centerLatitude - (padding.bottom - padding.top) * 0.000005;
      const targetRegion: Region = {
        latitude: shiftedLat,
        longitude: bbox.centerLongitude,
        latitudeDelta: bbox.latitudeDelta * 1.3,
        longitudeDelta: bbox.longitudeDelta * 1.3,
      };
      lastAnimatedRegionRef.current = targetRegion;

      try {
        mapRef.current.fitToCoordinates(sanitized, {
          edgePadding: padding,
          animated,
        });
      } catch {
        // Fallback matemático en caso de que fitToCoordinates falle
        mapRef.current.animateToRegion?.(targetRegion, animated ? 500 : 0);
      }
    },
    [dynamicEdgePadding, headerBottom, mapRef, sheetTop],
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

      // Compensación visual para que el marker quede centrado en el usableMapRect
      const verticalOffsetRatio = (dynamicEdgePadding.bottom - dynamicEdgePadding.top) / windowDimensions.height;
      const shiftedLatitude = coord.latitude - (verticalOffsetRatio * latDelta * 0.45);

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

      mapRef.current.animateToRegion(targetRegion, animated ? 600 : 0);
    },
    [cameraMode, checkTargetVisibility, dynamicEdgePadding.bottom, dynamicEdgePadding.top, isUserExploring, mapRef, safeRect, sheetTop, windowDimensions.height],
  );

  /**
   * Evento de reasentamiento del Bottom Sheet (sheetTop settling).
   * Si sheetTop cambia materialmente y el target queda fuera de la zona segura,
   * la cámara se reajusta inmediatamente aunque el GPS no haya cambiado.
   */
  useEffect(() => {
    if (sheetTop === null && lastSheetTopRef.current === null) return;
    const previousSheetTop = lastSheetTopRef.current;
    const diff = Math.abs((sheetTop ?? windowDimensions.height) - (previousSheetTop ?? windowDimensions.height));

    if (diff > 15) {
      if (__DEV__) {
        console.log(`[MAP:VIEWPORT_CHANGE] reason=sheet_settled sheetTop=${sheetTop} previous=${previousSheetTop}`);
      }

      if (isFollowing && lastTargetCoordRef.current) {
        followCoordinate(lastTargetCoordRef.current, {
          reason: 'sheet_settle_recenter',
          animated: true,
        });
      } else if (cameraMode === 'AUTO_FIT_ROUTE' && lastFittedPointsRef.current) {
        fitToRoute(lastFittedPointsRef.current, {
          force: true,
          reason: 'sheet_settle_route_fit',
          animated: true,
        });
      }
    }

    lastSheetTopRef.current = sheetTop;
  }, [sheetTop, windowDimensions.height, isFollowing, followCoordinate, cameraMode, fitToRoute]);

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
   * Recentra el mapa y reactiva el seguimiento automático de cámara.
   */
  const recenter = useCallback(
    (recenterOpts?: RecenterOptions) => {
      if (__DEV__) {
        console.log('[MAP:RECENTER] restoring followMode');
      }
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
      }
    },
    [fitToRoute, followCoordinate],
  );

  return {
    cameraMode,
    isFollowing,
    isUserExploring,
    dynamicEdgePadding,
    usableRect,
    safeRect,
    fitToRoute,
    followCoordinate,
    handlePanDrag,
    handleRegionChangeComplete,
    recenter,
    setFollowMode: setIsFollowing,
  };
}
