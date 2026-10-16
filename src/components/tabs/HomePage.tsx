import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, Image, Keyboard, Animated, Easing, ActivityIndicator, BackHandler } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Supercluster from 'supercluster';
import { TOKENS, DARK_VISIBLE_MAP_STYLE, MAP_BACKGROUND_COLOR } from '../../theme';
import { Icon, Avatar, Rating, Badge, ProviderPin, ClusterPin, AnimatedUserMarker, AnimatedProviderMarker, LoadingScreen, ErrorState, AnimatedPolyline, HousePin, MapFloatingNavigationControls, DrivingNavigationHUD, ClientArrivalHUD } from '../ui';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { useMapSheetCollapse } from '../../bottom-sheet/core/useMapSheetCollapse';
import { bottomSheetDebug, nextBottomSheetTransitionId } from '../../bottom-sheet/core/bottomSheet.debug';
import { isSheetAllowedForRole } from '../../bottom-sheet/core/bottomSheet.registry';
import type { SheetKey } from '../../bottom-sheet/core/bottomSheet.types';
import { useMapCamera } from '../../hooks/useMapCamera';
import { useBottomNavHeight } from '../layout/bottomNavMetrics';
import { useRole } from '../../context/RoleContext';
import { useLocation } from '../../context/LocationContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../context/CategoriesContext';
import { useFocusSession } from '../../features/focus-session/useFocusSession';
import { FocusChatOverlay } from '../../screens/client/components/FocusChatOverlay';
import { canUseProviderNavigation } from '../../utils/orderStatus';
import { useProviderAutoNavigation } from '../../hooks/useProviderAutoNavigation';
import { ENDPOINT } from '../../config/endpoints';
import { getImageUrl } from '../../utils/imageUrl';
import { geocodeCity, getCachedCoords } from '../../utils/geocode';
import type { RouteCoordinate } from '../../utils/directions';
import { useRoutePolyline } from '../../hooks/useRoute';
import { resolveCategorySlugs } from '../../utils/categoryTree';
import { summarizeForRole } from '../../utils/ratings';
import { EMPTY_ARRAY } from '../../utils/emptyArray';
import {
  DEFAULT_TEMUCO_PLC_REGION,
  PIN_SELECTION_MIN_LATITUDE_DELTA,
  PIN_SELECTION_MIN_LONGITUDE_DELTA,
  PIN_SELECTION_HORIZONTAL_CLEARANCE,
  PIN_SELECTION_TOP_CLEARANCE,
  PIN_SELECTION_BOTTOM_CLEARANCE,
  PIN_SELECTION_ZOOM_SCALE,
  PIN_SELECTION_SINGLE_LAT_DELTA,
} from '../../utils/mapGeometry';
import { DevJoystickOverlay } from '../../dev/joystick';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
let homePageRuntimeOwnerGeneration = 0;
const navigatedToRatingOrderIds = new Set<number>();
export const _resetNavigatedToRatingOrderIds = () => {
  navigatedToRatingOrderIds.clear();
};
import {
  TERMINAL_REALTIME_STATUSES,
  PROVIDER_FOCUS_STATUSES,
  DesiredMapSurface,
  selectClientRealtimeOrder,
  deriveDesiredMapSurface,
} from '../../bottom-sheet/core/sheetPolicy';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  subcategories: any[];
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const mapStyle = DARK_VISIBLE_MAP_STYLE;

export const HomePage: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { location } = useLocation();
  const mapRef = useRef<MapView>(null);
  const bottomNavHeight = useBottomNavHeight();
  const [topControlsHeight, setTopControlsHeight] = useState<number>(116);
  const headerBottom = Math.max(80, insets.top + topControlsHeight + 12);
  const {
    present,
    dismiss,
    update,
    setIndex,
    active,
    activePayload,
    sheetMetrics,
    setMapFlowActive,
    bindRuntimeActionHandlers,
    unbindRuntimeActionHandlers,
  } = useBottomSheet();
  const {
    handleMapPanDrag: onSheetAutoCollapsePanDrag,
    handleMapRegionChangeComplete: onSheetAutoCollapseRegionComplete,
    cancelPendingRestore: cancelSheetAutoRestore,
    isMapManipulating,
  } = useMapSheetCollapse({
    activeSheet: active,
    sheetIndex: sheetMetrics?.index ?? 1,
    isCollapsed: sheetMetrics?.isCollapsed ?? false,
    setIndex,
    enabled: isFocused,
  });
  const {
    fitToRoute,
    followCoordinate,
    navigateToCoordinate,
    exitNavigationMode,
    toggleNavigationMode,
    restoreNavigationCamera,
    fitToDefaultRegion,
    handlePanDrag: onCameraPanDrag,
    handleRegionChangeComplete: onCameraRegionChangeComplete,
    recenter: recenterCamera,
    dynamicEdgePadding,
    isFollowing,
    isNavigating,
    navigationPosition,
    activeNavigationTarget,
    isUserExploring,
  } = useMapCamera({
    mapRef,
    headerBottom,
    sheetTop: sheetMetrics?.sheetTop ?? null,
    bottomNavHeight,
  });
  const runtimeOwnerRef = useRef({
    ownerId: `HomePage:${++homePageRuntimeOwnerGeneration}`,
    generation: homePageRuntimeOwnerGeneration,
  });
  const userDeselectedProviderCategoryRef = useRef<string | null>(null);
  const lastRoleReconcileLogRef = useRef<string | null>(null);
  const focusTerminationGraceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFocusTerminationGraceTimeout = useCallback(() => {
    if (focusTerminationGraceTimeoutRef.current) {
      clearTimeout(focusTerminationGraceTimeoutRef.current);
      focusTerminationGraceTimeoutRef.current = null;
    }
  }, []);
  const [region, setRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(DEFAULT_TEMUCO_PLC_REGION);
  const initialCenterDone = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { role } = useRole();
  const realtime = useRealtime();
  const focusSession = useFocusSession();
  const providerSession = focusSession.provider;
  const clientSession = focusSession.client;
  const { showChat, setShowChat } = role === 'provider' ? providerSession : clientSession;

  const clientActiveOrder = useMemo(() => {
    return selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);
  }, [realtime.localActiveOrder, realtime.activeOrder]);

  const clientOrderStatus = clientActiveOrder?.status;

  const hasActiveRealtimeOrder = useMemo(() => {
    const order = role === 'provider' ? realtime.providerActiveOrder : clientActiveOrder;
    if (!order?.status) return false;
    return !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(order.status);
  }, [role, clientActiveOrder, realtime.providerActiveOrder]);

  const desiredMapSurface = useMemo<DesiredMapSurface>(() => {
    return deriveDesiredMapSurface({
      role,
      clientActiveOrder,
      providerActiveOrder: realtime.providerActiveOrder,
    });
  }, [role, clientActiveOrder, realtime.providerActiveOrder]);

  const isFocusMapSurfaceActive = desiredMapSurface.kind === 'SHEET'
    && (desiredMapSurface.key === 'focus_client' || desiredMapSurface.key === 'focus_provider');

  useEffect(() => {
      const order = role === 'provider'
      ? realtime.providerActiveOrder
      : clientActiveOrder;
    const desired = desiredMapSurface.kind === 'SHEET' ? desiredMapSurface.key : desiredMapSurface.kind;
    bottomSheetDebug('DESIRED', {
      role,
      orderId: order?.id ?? null,
      status: order?.status ?? null,
      current: active,
      desired,
      reason: desiredMapSurface.reason,
      hasProvider: !!order?.provider,
      hasServiceProvider: !!order?.serviceProvider,
    });
  }, [active, desiredMapSurface, clientActiveOrder, realtime.providerActiveOrder, role]);

  const activeRef = useRef(active);
  activeRef.current = active;
  const presentRef = useRef(present);
  presentRef.current = present;
  const updateRef = useRef(update);
  updateRef.current = update;

  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  const activeUserCoords = useMemo<RouteCoordinate | null>(() => {
    const lat = location?.coords?.latitude;
    const lng = location?.coords?.longitude;
    return lat != null && lng != null ? { latitude: lat, longitude: lng } : null;
  }, [location?.coords?.latitude, location?.coords?.longitude]);

  // Si rol es provider: Destino es el cliente de la orden activa
  // Si rol es client/guest con orden activa: Destino es el proveedor de la orden activa
  // Si rol es client/guest explorando: Destino es el proveedor seleccionado en catálogo
  const activeDestinationCoords = useMemo<RouteCoordinate | null>(() => {
    if (role === 'provider') {
      const order = realtime.providerActiveOrder;
      if (
        order &&
        !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'ARRIVED', 'IN_PROGRESS'].includes(order.status)
      ) {
        const lat = order.clientLat;
        const lng = order.clientLng;
        if (
          lat != null &&
          lng != null &&
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          (Math.abs(lat) > 1e-4 || Math.abs(lng) > 1e-4) &&
          lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
        ) {
          return { latitude: lat, longitude: lng };
        }
      }
      return null;
    }

    if (
      clientActiveOrder &&
      !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'ARRIVED', 'IN_PROGRESS'].includes(clientActiveOrder.status)
    ) {
      const lat = clientActiveOrder.providerLat ?? (clientActiveOrder.provider as any)?.lat;
      const lng = clientActiveOrder.providerLng ?? (clientActiveOrder.provider as any)?.lng;
      if (
        lat != null &&
        lng != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        (Math.abs(lat) > 1e-4 || Math.abs(lng) > 1e-4) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ) {
        return { latitude: lat, longitude: lng };
      }
    }

    if (selectedProvider) {
      const lat = selectedProvider.lat ?? selectedProvider.latitude;
      const lng = selectedProvider.lng ?? selectedProvider.longitude;
      return lat != null &&
        lng != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        (Math.abs(lat) > 1e-4 || Math.abs(lng) > 1e-4) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
        ? { latitude: lat, longitude: lng }
        : null;
    }

    return null;
  }, [role, realtime.providerActiveOrder, clientActiveOrder, selectedProvider]);

  // Regla Cardinal 4: Para cualquier orden activa, la polyline SIEMPRE conecta la ubicación del proveedor
  // con el Punto de Encuentro (HousePin). NUNCA se conecta al GPS móvil del cliente.
  const activeRouteOrigin = useMemo<RouteCoordinate | null>(() => {
    if (role === 'provider') {
      return activeUserCoords;
    }

    if (
      hasActiveRealtimeOrder &&
      clientActiveOrder &&
      !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'ARRIVED', 'IN_PROGRESS'].includes(clientActiveOrder.status)
    ) {
      const lat = clientActiveOrder.providerLat ?? (clientActiveOrder.provider as any)?.lat;
      const lng = clientActiveOrder.providerLng ?? (clientActiveOrder.provider as any)?.lng;
      if (
        lat != null &&
        lng != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        (Math.abs(lat) > 1e-4 || Math.abs(lng) > 1e-4) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ) {
        return { latitude: lat, longitude: lng };
      }
      return null;
    }

    // Cliente explorando catálogo (sin orden activa): su propia ubicación
    return activeUserCoords;
  }, [role, hasActiveRealtimeOrder, clientActiveOrder, activeUserCoords]);

  const activeRouteDestination = useMemo<RouteCoordinate | null>(() => {
    if (role === 'provider') {
      const order = realtime.providerActiveOrder;
      if (
        order &&
        !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'ARRIVED', 'IN_PROGRESS'].includes(order.status)
      ) {
        const lat = order.clientLat;
        const lng = order.clientLng;
        if (
          lat != null &&
          lng != null &&
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          (Math.abs(lat) > 1e-4 || Math.abs(lng) > 1e-4) &&
          lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
        ) {
          return { latitude: lat, longitude: lng };
        }
      }
      return null;
    }

    if (
      hasActiveRealtimeOrder &&
      clientActiveOrder &&
      !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'ARRIVED', 'IN_PROGRESS'].includes(clientActiveOrder.status)
    ) {
      // Punto de encuentro fijo del servicio (HousePin)
      const lat = clientActiveOrder.clientLat;
      const lng = clientActiveOrder.clientLng;
      if (
        lat != null &&
        lng != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        (Math.abs(lat) > 1e-4 || Math.abs(lng) > 1e-4) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ) {
        return { latitude: lat, longitude: lng };
      }
      return null;
    }

    // Cliente explorando catálogo sin orden activa: proveedor seleccionado
    if (selectedProvider) {
      const lat = selectedProvider.lat ?? selectedProvider.latitude;
      const lng = selectedProvider.lng ?? selectedProvider.longitude;
      return lat != null &&
        lng != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        (Math.abs(lat) > 1e-4 || Math.abs(lng) > 1e-4) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
        ? { latitude: lat, longitude: lng }
        : null;
    }

    return null;
  }, [role, hasActiveRealtimeOrder, clientActiveOrder, realtime.providerActiveOrder, selectedProvider]);

  const isRealtimeOrderActive = Boolean(
    hasActiveRealtimeOrder && (role === 'provider' || clientOrderStatus === 'ACCEPTED')
  );

  const activeOrderRouteCoords = role === 'provider'
    ? providerSession.routeCoords
    : clientSession.routeCoords;

  const isRouteActive = Boolean(
    activeRouteOrigin &&
    activeRouteDestination &&
    isFocused &&
    (hasActiveRealtimeOrder ? (role === 'provider' || clientOrderStatus === 'ACCEPTED') : Boolean(selectedProvider))
  );

  const { routeCoords: exploreRouteCoords } = useRoutePolyline(
    activeRouteOrigin,
    activeRouteDestination,
    isRouteActive && !isRealtimeOrderActive,
  );

  const routeCoords = isRealtimeOrderActive && activeOrderRouteCoords && activeOrderRouteCoords.length >= 2
    ? activeOrderRouteCoords
    : exploreRouteCoords;

  const canUseNavigation = useMemo(() => {
    return canUseProviderNavigation({
      role,
      isFocusModeProviderActive: hasActiveRealtimeOrder,
      activeOrder: realtime.providerActiveOrder,
      orderState: providerSession.orderState,
    });
  }, [role, hasActiveRealtimeOrder, realtime.providerActiveOrder, providerSession.orderState]);

  // Coordinador de navegación automática para el proveedor:
  // - Se activa solo sin ningún botón en estados disponibles
  // - Al arrastrar se desactiva
  // - Tras 15 seg o si el proveedor se mueve se activa automáticamente
  const {
    handlePanDrag: onAutoNavPanDrag,
    notifyUserGesture,
    handleRecenter: onAutoNavRecenter,
  } = useProviderAutoNavigation({
    enabled: canUseNavigation,
    providerCoord: activeUserCoords,
    routeCoords,
    heading: location?.coords?.heading,
    speed: location?.coords?.speed,
    accuracy: location?.coords?.accuracy,
    timestamp: location?.timestamp,
    isNavigating,
    isUserExploring,
    toggleNavigationMode,
    navigateToCoordinate,
    exitNavigationMode,
  });

  useEffect(() => {
    if (!canUseNavigation && isNavigating) {
      exitNavigationMode(activeUserCoords, true);
    }
  }, [canUseNavigation, isNavigating, activeUserCoords, exitNavigationMode]);

  useEffect(() => {
    return () => {
      if (isNavigating) {
        exitNavigationMode(null, false);
      }
    };
  }, [isNavigating, exitNavigationMode]);

  // Radar Animation for Client PENDING state
  const pingScale = useRef(new Animated.Value(1)).current;
  const pingOpacity = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (role === 'provider' || clientOrderStatus !== 'PENDING') return;

    pingScale.setValue(1);
    pingOpacity.setValue(1);
    pulseOpacity.setValue(0.5);
    floatAnim.setValue(0);

    const pingLoop = Animated.loop(
      Animated.parallel([
        Animated.timing(pingScale, {
          toValue: 1.5,
          duration: 2500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pingOpacity, {
          toValue: 0,
          duration: 2500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const composite = Animated.parallel([pingLoop, pulseLoop, floatLoop]);
    composite.start();

    return () => {
      composite.stop();
    };
  }, [clientOrderStatus, role]);

  const hasNavigatedToRatingRef = useRef<number | null>(null);
  useEffect(() => {
    if (role !== 'provider' && clientActiveOrder?.status === 'COMPLETED' && clientActiveOrder?.id) {
      const orderId = clientActiveOrder.id;
      const resolvedProviderId =
        clientActiveOrder.provider?.id ??
        (clientActiveOrder as any).providerId ??
        (clientActiveOrder as any).serviceProvider?.provider?.id;

      if (!resolvedProviderId) return;

      if (
        hasNavigatedToRatingRef.current === orderId ||
        navigatedToRatingOrderIds.has(orderId) ||
        realtime.isOrderReviewed?.(orderId)
      ) {
        return;
      }
      hasNavigatedToRatingRef.current = orderId;
      navigatedToRatingOrderIds.add(orderId);

      const providerImg = getImageUrl(clientActiveOrder.provider?.logoImage?.cdnUrl || null);
      const reviews = clientActiveOrder.provider?.reviews || [];
      const avgRating = reviews.length
        ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
        : 0;

      navigation.navigate('Rating', {
        role: 'client',
        targetUser: {
          id: resolvedProviderId,
          name: clientActiveOrder.provider?.name || 'Profesional',
          avatar: providerImg || undefined,
          rating: avgRating,
          reviewsCount: reviews.length,
          subtext: clientActiveOrder.serviceProvider?.service?.name || '',
        },
        serviceDetails: clientActiveOrder.clientDescription || '',
        amount: clientActiveOrder.payment?.amount || clientActiveOrder.quotedPrice || 0,
        address: clientActiveOrder.clientAddress || '',
        paymentMethod: clientActiveOrder.payment ? 'Flow.cl' : '-',
        orderRealtimeId: orderId,
        providerId: resolvedProviderId,
      });
      setSelectedProvider(null);
      realtime.setLocalActiveOrder?.(null);
      dismiss();
    } else if (role === 'provider' && realtime.providerActiveOrder?.status === 'COMPLETED' && realtime.providerActiveOrder?.id) {
      const pOrder = realtime.providerActiveOrder;
      const orderId = pOrder.id;
      if (
        hasNavigatedToRatingRef.current === orderId ||
        navigatedToRatingOrderIds.has(orderId) ||
        realtime.isOrderReviewed?.(orderId)
      ) {
        return;
      }
      hasNavigatedToRatingRef.current = orderId;
      navigatedToRatingOrderIds.add(orderId);

      const clientSummary = summarizeForRole(pOrder?.client, 'client');
      navigation.navigate('Rating', {
        role: 'provider',
        targetUser: {
          id: pOrder?.client?.id,
          name: pOrder?.client?.displayName || 'Cliente',
          avatar: null,
          rating: clientSummary?.rating ?? 0,
          reviewsCount: clientSummary?.count ?? 0,
          subtext: pOrder?.serviceProvider?.service?.name || '',
        },
        serviceDetails: pOrder?.clientDescription || '',
        amount: pOrder?.payment?.amount || pOrder?.quotedPrice || 0,
        address: pOrder?.clientAddress || '',
        orderRealtimeId: orderId,
        clientId: pOrder?.client?.id,
      });
      setSelectedProvider(null);
      realtime.setLocalProviderActiveOrder?.(null);
      dismiss();
    }
  }, [clientActiveOrder, dismiss, navigation, realtime, role]);

  const wasActiveRealtimeOrderRef = useRef(hasActiveRealtimeOrder);
  useEffect(() => {
    if (!hasActiveRealtimeOrder && wasActiveRealtimeOrderRef.current) {
      setSelectedProvider(null);
    }
    wasActiveRealtimeOrderRef.current = hasActiveRealtimeOrder;
  }, [hasActiveRealtimeOrder]);
  const hydratedCategoriesPayloadRef = useRef(false);
  const hydratedProviderPreviewPayloadRef = useRef(false);

  // Si el preview de proveedor se cierra por swipe-down/backdrop (no por el botón "Cancelar",
  // que ya limpia esto explícitamente), igual deseleccionamos — evita que el pin quede marcado
  // como seleccionado con la ruta trazada después de cerrar el sheet de cualquier forma.
  const wasProviderPreviewOpenRef = useRef(false);
  useEffect(() => {
    const isProviderPreviewOpen = active === 'provider_preview';
    if (isProviderPreviewOpen) {
      wasProviderPreviewOpenRef.current = true;
    } else if (wasProviderPreviewOpenRef.current) {
      wasProviderPreviewOpenRef.current = false;
      setSelectedProvider(null);
    }
  }, [active]);

  const [clusters, setClusters] = useState<any[]>([]);
  const superclusterRef = useRef<Supercluster>(new Supercluster({ radius: 50, maxZoom: 16 }));
  const regionRef = useRef(region);
  const mapPanActiveRef = useRef(false);
  regionRef.current = region;

  const updateClusters = useCallback((currentRegion: any) => {
    if (!currentRegion) return;
    const padding = currentRegion.longitudeDelta * 0.2; // slight padding
    const bbox = [
      currentRegion.longitude - currentRegion.longitudeDelta / 2 - padding,
      currentRegion.latitude - currentRegion.latitudeDelta / 2 - padding,
      currentRegion.longitude + currentRegion.longitudeDelta / 2 + padding,
      currentRegion.latitude + currentRegion.latitudeDelta / 2 + padding
    ] as any;
    
    // Calculate zoom level. MapView uses latitudeDelta/longitudeDelta
    const zoom = Math.max(0, Math.min(20, Math.round(Math.log2(360 / currentRegion.longitudeDelta))));

    if (__DEV__) console.log('[AUDIT:7] getClusters params | bbox:', bbox.map((v: any) => Number(v).toFixed(5)).join(' / '), '| zoom:', zoom);

    const newClusters = superclusterRef.current.getClusters(bbox, zoom);

    if (__DEV__) {
      console.log('[AUDIT:8] getClusters result | count:', newClusters.length);
      newClusters.forEach((c: any, i: number) => {
        const isCl = c.properties.cluster;
        console.log('[AUDIT:8]   cluster[' + i + '] | isCluster:', isCl, '| coords:', c.geometry.coordinates, isCl ? ('| point_count:' + c.properties.point_count) : ('| providerId:' + c.properties.provider?.id));
      });
    }

    setClusters(newClusters);
  }, []);

  const handleRegionChangeComplete = useCallback((newRegion: any) => {
    onCameraRegionChangeComplete(newRegion, { isGesture: mapPanActiveRef.current });
    onSheetAutoCollapseRegionComplete();
    const current = regionRef.current;
    if (!current) return;
    const moved = (
      Math.abs(newRegion.latitude - current.latitude) > 0.0005 ||
      Math.abs(newRegion.longitude - current.longitude) > 0.0005 ||
      Math.abs(newRegion.latitudeDelta - current.latitudeDelta) > 0.002 ||
      Math.abs(newRegion.longitudeDelta - current.longitudeDelta) > 0.002
    );
    if (moved) {
      setRegion(newRegion);
    }
    updateClusters(newRegion);
    if (mapPanActiveRef.current) {
      mapPanActiveRef.current = false;
      notifyUserGesture();
      if (__DEV__) console.log('[MAP:GESTURE] PAN_END');
    }
  }, [updateClusters, onCameraRegionChangeComplete, onSheetAutoCollapseRegionComplete, notifyUserGesture]);

  const handleMapPanDrag = useCallback(() => {
    Keyboard.dismiss();
    onCameraPanDrag();
    onAutoNavPanDrag();
    onSheetAutoCollapsePanDrag();
    if (mapPanActiveRef.current) return;
    mapPanActiveRef.current = true;
    if (__DEV__) console.log('[MAP:GESTURE] PAN_START');
  }, [onCameraPanDrag, onAutoNavPanDrag, onSheetAutoCollapsePanDrag]);

  const initialGpsCenteredRef = useRef(false);

  useEffect(() => {
    if (!initialCenterDone.current) {
      initialCenterDone.current = true;
      setRegion(DEFAULT_TEMUCO_PLC_REGION);
    }
  }, []);

  // Centrado inicial automático metropolitano sobre el dot del usuario tan pronto como GPS obtenga fix
  useEffect(() => {
    if (location?.coords && !initialGpsCenteredRef.current) {
      initialGpsCenteredRef.current = true;
      followCoordinate(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        {
          force: true,
          animated: true,
          latitudeDelta: DEFAULT_TEMUCO_PLC_REGION.latitudeDelta,
          longitudeDelta: DEFAULT_TEMUCO_PLC_REGION.longitudeDelta,
          reason: 'initial_gps_metropolitan_fix',
        },
      );
    }
  }, [location?.coords?.latitude, location?.coords?.longitude, followCoordinate]);

  // Seguimiento continuo del stream GPS cuando isFollowing está activo y el usuario no está explorando manualmente
  useEffect(() => {
    if (location?.coords && !isUserExploring) {
      const heading =
        location.coords.heading != null &&
        Number.isFinite(location.coords.heading) &&
        location.coords.heading >= 0
          ? location.coords.heading
          : undefined;

      followCoordinate(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        {
          animated: true,
          heading,
          speed: location.coords.speed ?? undefined,
          accuracy: location.coords.accuracy ?? undefined,
          timestamp: location.timestamp,
          routeCoords: isNavigating && routeCoords.length >= 2 ? routeCoords : undefined,
          reason: isNavigating ? 'nav_gps_stream_follow' : 'gps_stream_follow',
        },
      );
    }
  }, [
    location?.coords?.latitude,
    location?.coords?.longitude,
    location?.coords?.heading,
    location?.coords?.speed,
    location?.coords?.accuracy,
    location?.timestamp,
    isUserExploring,
    isNavigating,
    routeCoords,
    followCoordinate,
  ]);

  const { token } = useAuth();

  const {
    servicesByCategory,
    categories,
    refetchServicesByCategory,
  } = useCategories();

  useEffect(() => {
    if (!realtime?.subscribe) return;
    const unsubscribe = realtime.subscribe('provider:realtime:status', () => {
      refetchServicesByCategory();
    });
    return unsubscribe;
  }, [realtime?.subscribe, refetchServicesByCategory]);

  const [resolvedCoords, setResolvedCoords] = useState<Record<string, { lat: number; lng: number }>>({});

  useEffect(() => {
    const toGeocode = new Set<string>();
    (servicesByCategory || []).forEach((service: any) => {
      (service.serviceProviders || []).forEach((sp: any) => {
        const p = sp.provider;
        if (!p || p.lat != null) return;
        const city = (sp.cities?.[0]?.city || p.location || '').trim().toLowerCase();
        if (city && !getCachedCoords(city)) {
          toGeocode.add(city);
        }
      });
    });

    toGeocode.forEach(async (city) => {
      const coords = await geocodeCity(city);
      if (coords) {
        setResolvedCoords((prev) => ({ ...prev, [city]: coords }));
      }
    });
  }, [servicesByCategory]);

  const displayProviders = useMemo(() => {
    if (!servicesByCategory?.length) return EMPTY_ARRAY;
    const providers: any[] = [];
    servicesByCategory.forEach((service: any) => {
      service.serviceProviders?.forEach((sp: any) => {
        if (!sp.provider) return;
        // Solo servicios con visita a domicilio pueden aparecer en el mapa de tiempo real
        if (!sp.hasHomeVisit) return;
        const p = sp.provider;
        const cityKey = (sp.cities?.[0]?.city || p.location || '').toLowerCase();
        const fallbackCoords = resolvedCoords[cityKey];
        let lat = p.lat ?? null;
        let lng = p.lng ?? null;
        if (lat == null && fallbackCoords?.lat != null) {
          const hash = Number(p.id) || 1;
          const angle = (hash * 137.5) * (Math.PI / 180);
          const radiusMeters = 120 + ((hash * 47) % 320);
          const deltaLat = (radiusMeters / 111000) * Math.cos(angle);
          const deltaLng = (radiusMeters / (111000 * Math.cos((fallbackCoords.lat * Math.PI) / 180))) * Math.sin(angle);
          lat = fallbackCoords.lat + deltaLat;
          lng = fallbackCoords.lng + deltaLng;
        }
        if (service.slug === 'reparacion-de-llaves-de-agua' || service.slug === 'albanileria-en-general') {
          if (__DEV__) console.log('[DEBUG:MAP] Provider found | service:', service.slug, '| catSlug:', service.category?.slug, '| provider:', p.name, '| lat:', lat, '| lng:', lng, '| city:', cityKey, '| hasFallback:', !!fallbackCoords, '| isRealtime:', p.isRealtimeActive);
        }
        // Un proveedor puede tener reseñas de órdenes normales (reviews) y/o de
        // órdenes realtime (realtimeReviews) — hay que sumar ambas o el rating
        // aparece en 0 para proveedores que solo tienen reseñas realtime.
        const allReviews = [...(p.reviews || []), ...(p.realtimeReviews || [])];
        providers.push({
          id: String(p.id),
          spId: sp.id,
          serviceId: service.id,
          name: p.name,
          avatar: getImageUrl(p.logoImage?.cdnUrl || null),
          rating: allReviews.length
            ? allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length
            : 0,
          reviewsCount: allReviews.length,
          verified: !!(p.certificates?.some((c: any) => c.verified)),
          isRealtimeActive: p.isRealtimeActive || false,
          hasHomeVisit: true,
          serviceName: service.name,
          categorySlug: service.category?.slug || '',
          pricePerHour: sp.price || 0,
          description: sp.description || '',
          city: sp.cities?.[0]?.city || p.location || '',
          phone: '',
          link: '',
          providerName: p.name,
          reviews: [],
          lat,
          lng,
        });
      });
    });
    if (__DEV__ && providers.length > 0) {
      const sample = providers[0];
      console.log('[TRACE:MAP] HomePage displayProviders | total:', providers.length, '| sample name:', sample.name, '| avatar:', String(sample.avatar).slice(0, 80));
    }
    return providers;
  }, [servicesByCategory, resolvedCoords]);

  const filteredProviders = useMemo(() => {
    if (!selectedCategory) return EMPTY_ARRAY;

    let result: any[];
    if (selectedCategory.slug.startsWith('service-')) {
      const serviceId = parseInt(selectedCategory.slug.replace('service-', ''), 10);
      result = displayProviders.filter((p: any) => p.serviceId === serviceId);
    } else {
      const selectedSlugs = resolveCategorySlugs(categories, selectedCategory.slug);
      result = displayProviders.filter((p: any) =>
        selectedSlugs.includes(p.categorySlug),
      );
    }

    if (__DEV__) {
      console.log('[DEBUG:MAP] filteredProviders | selectedCategory:', selectedCategory.slug, '| displayProviders:', displayProviders.length, '| filtered:', result.length);
      if (result.length > 0) {
        result.forEach((p: any) => console.log('[DEBUG:MAP]  → provider:', p.name, '| catSlug:', p.categorySlug, '| lat:', p.lat, '| lng:', p.lng));
      }
    }
    return result;
  }, [displayProviders, selectedCategory, categories]);

  // Proveedores de la categoría seleccionada, con coordenadas válidas y ordenados por
  // distancia al usuario (cercano → lejano). Permite "viajar" entre ellos desde el sheet.
  const orderedFilteredProviders = useMemo(() => {
    const withCoords = (filteredProviders as any[]).filter(
      (p: any) =>
        p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng),
    );
    const lat = location?.coords?.latitude;
    const lng = location?.coords?.longitude;
    if (lat == null || lng == null) return withCoords;
    return [...withCoords].sort((a: any, b: any) => {
      const da = getDistanceKm(lat, lng, a.lat, a.lng);
      const db = getDistanceKm(lat, lng, b.lat, b.lng);
      return da - db;
    });
  }, [filteredProviders, location?.coords?.latitude, location?.coords?.longitude]);

  // Memoización estable de GeoJSON Features excluyendo selectedProvider (que se renderiza como pin dedicado e inmutable)
  const fallbackFeatures = useMemo(() => {
    return orderedFilteredProviders
      .filter((p: any) => !selectedProvider || String(p.id) !== String(selectedProvider.id))
      .map((p: any) => ({
        type: 'Feature' as const,
        properties: { cluster: false, provider: p },
        geometry: { type: 'Point' as const, coordinates: [p.lng ?? p.longitude, p.lat ?? p.latitude] },
      }));
  }, [orderedFilteredProviders, selectedProvider]);



  useEffect(() => {
    if (__DEV__) console.log('[AUDIT:1] supercluster effect START | selectedCategory:', selectedCategory?.slug, '| filteredProviders.length:', filteredProviders.length, '| region:', region?.latitude.toFixed(5), region?.longitude.toFixed(5), '| latDelta:', region?.latitudeDelta, '| lngDelta:', region?.longitudeDelta);

    if (!selectedCategory) {
      superclusterRef.current.load([]);
      // Forma funcional: si ya estaba vacío, devolvemos la misma referencia para
      // que React no dispare un re-render (y por lo tanto no vuelva a correr este
      // efecto) cuando filteredProviders cambia de identidad sin cambiar de contenido.
      setClusters((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    if (!region) return;

    filteredProviders.forEach((p: any) => {
      const hasCoords = p.lat != null && p.lng != null;
      if (__DEV__) console.log('[AUDIT:2] provider filter | name:', p.name, '| id:', p.id, '| lat:', p.lat, 'type:', typeof p.lat, '| lng:', p.lng, 'type:', typeof p.lng, '| isFinite:', hasCoords ? (Number.isFinite(p.lat) && Number.isFinite(p.lng)) : 'N/A', '| passes:', hasCoords);
    });

    const uniqueProvidersMap = new Map();
    filteredProviders
      .filter((p: any) => p.lat != null && p.lng != null)
      .forEach((p: any) => {
        // Invariante de verdad geográfica: selectedProvider se renderiza como pin dedicado e inmutable fuera de clusters
        if (selectedProvider && String(p.id) === String(selectedProvider.id)) {
          return;
        }
        if (!uniqueProvidersMap.has(p.id)) {
          uniqueProvidersMap.set(p.id, p);
        }
      });

    if (__DEV__) console.log('[AUDIT:3] uniqueProviders | count:', uniqueProvidersMap.size, '| items:', Array.from(uniqueProvidersMap.values()).map((p: any) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })));

    const points = Array.from(uniqueProvidersMap.values())
      .map((p: any) => {
        const feature = {
          type: 'Feature',
          properties: { cluster: false, provider: p },
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
        };
        if (__DEV__) console.log('[AUDIT:4] GeoJSON point | id:', p.id, '| coords:', feature.geometry.coordinates);
        return feature;
      }) as any[];
    
    if (__DEV__) console.log('[AUDIT:5] loading into supercluster | points.length:', points.length);
    superclusterRef.current.load(points);
    const allPoints = superclusterRef.current.getClusters([-180, -90, 180, 90], 0);
    if (__DEV__) console.log('[AUDIT:6] supercluster total indexed | count:', allPoints.length);

    updateClusters(region);
    if (__DEV__) console.log('[DEBUG:MAP] clusters loaded | points prepared:', points.length, '| filteredProviders total:', filteredProviders.length, '| filtered with coords:', uniqueProvidersMap.size);
  }, [filteredProviders, selectedProvider?.id, updateClusters]);

  const handleCategoryPress = useCallback((category: Category) => {
    userDeselectedProviderCategoryRef.current = null;
    setSelectedCategory(category);
    setSelectedProvider(null);

    let matched: any[];
    if (category.slug.startsWith('service-')) {
      const serviceId = parseInt(category.slug.replace('service-', ''), 10);
      matched = displayProviders.filter((p: any) => p.serviceId === serviceId);
    } else {
      const slugs = resolveCategorySlugs(categories, category.slug);
      matched = displayProviders.filter((p: any) =>
        slugs.includes(p.categorySlug),
      );
    }

    matched.forEach((p: any) => {
      if ((p.lat == null || p.lng == null) && p.city) {
        const city = p.city.toLowerCase();
        if (!getCachedCoords(city)) {
          geocodeCity(city).then((coords) => {
            if (coords) setResolvedCoords((prev) => ({ ...prev, [city]: coords }));
          });
        }
      }
    });
  }, [displayProviders, categories]);

  const onCategoryPressRef = useRef<(category: Category) => void>(null);
  onCategoryPressRef.current = handleCategoryPress;

  const selectedCategoryRef = useRef(selectedCategory);
  selectedCategoryRef.current = selectedCategory;

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const presentCategories = useCallback((categoryOverride?: Category | null, queryOverride?: string) => {
    const cat = categoryOverride !== undefined ? categoryOverride : selectedCategoryRef.current;
    const q = queryOverride !== undefined ? queryOverride : searchQueryRef.current;
    present('categories', {
      selectedCategory: cat,
      searchQuery: q,
    });
  }, [present]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (selectedCategoryRef.current && text) {
      userDeselectedProviderCategoryRef.current = null;
      setSelectedCategory(null);
      setSelectedProvider(null);
    }
    if (activeRef.current === 'categories') {
      updateRef.current?.({ searchQuery: text, selectedCategory: text ? null : selectedCategoryRef.current });
    } else if (role === 'client' || role === 'guest') {
      presentRef.current?.('categories', { searchQuery: text, selectedCategory: null });
    }
  }, [role]);

  const handleClearSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchQuery('');
    if (activeRef.current === 'categories') {
      updateRef.current?.({ searchQuery: '', selectedCategory: selectedCategoryRef.current });
    }
  }, []);

  const logTransitionRequest = useCallback((params: { actionId?: number; from: SheetKey | null; to: SheetKey; origin: string; reason: string }) => {
    bottomSheetDebug('TRANSITION_REQUEST', {
      transitionId: nextBottomSheetTransitionId(),
      actionId: params.actionId,
      from: params.from,
      to: params.to,
      origin: params.origin,
      reason: params.reason,
    });
  }, []);

  useEffect(() => {
    if (hasActiveRealtimeOrder || isFocusMapSurfaceActive) return;
    if (activeRef.current === 'focus_client' || activeRef.current === 'focus_provider') return;
    if (!selectedCategory || filteredProviders.length === 0) return;
    const withCoords = filteredProviders.filter(
      (p: any) =>
        p.lat != null &&
        p.lng != null &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng),
    );
    if (withCoords.length === 0) return;

    // CASO 1: Si solo hay 1 proveedor, auto-seleccionar, abrir preview y encuadrar
    if (withCoords.length === 1) {
      if (userDeselectedProviderCategoryRef.current === selectedCategory.slug) {
        return;
      }
      const singleProvider = withCoords[0];
      setSelectedProvider(singleProvider);
      const previewPayload = {
        provider: singleProvider,
        providers: [singleProvider],
        selectedIndex: 0,
      };
      if (activeRef.current === 'provider_preview') {
        updateRef.current?.(previewPayload);
      } else {
        logTransitionRequest({
          from: activeRef.current,
          to: 'provider_preview',
          origin: 'AUTO_SINGLE_PROVIDER',
          reason: 'single_provider_match',
        });
        presentRef.current?.('provider_preview', previewPayload);
      }

      const points: RouteCoordinate[] = [
        { latitude: singleProvider.lat, longitude: singleProvider.lng },
      ];
      if (
        location?.coords?.latitude != null &&
        location?.coords?.longitude != null &&
        Number.isFinite(location.coords.latitude) &&
        Number.isFinite(location.coords.longitude)
      ) {
        points.push({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
      fitToRoute(points, { force: true, reason: 'single_provider_auto_fit' });
      return;
    }

    // CASO 2: Múltiples proveedores -> encuadrar todos para exploración general
    const points: RouteCoordinate[] = withCoords.map((p: any) => ({
      latitude: p.lat,
      longitude: p.lng,
    }));
    if (
      location?.coords?.latitude != null &&
      location?.coords?.longitude != null &&
      Number.isFinite(location.coords.latitude) &&
      Number.isFinite(location.coords.longitude)
    ) {
      points.push({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
    fitToRoute(points, { force: true, reason: 'category_filtered_providers' });
  }, [
    filteredProviders,
    selectedCategory,
    fitToRoute,
    location?.coords?.latitude,
    location?.coords?.longitude,
    logTransitionRequest,
    hasActiveRealtimeOrder,
    isFocusMapSurfaceActive,
  ]);

  useEffect(() => {
    if (hasActiveRealtimeOrder && selectedProvider) {
      setSelectedProvider(null);
    }
  }, [hasActiveRealtimeOrder, selectedProvider]);

  const handleClearCategory = useCallback(() => {
    userDeselectedProviderCategoryRef.current = null;
    setSelectedCategory(null);
    setSelectedProvider(null);
    if (location?.coords?.latitude != null && location?.coords?.longitude != null) {
      followCoordinate(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { force: true, animated: true, reason: 'clear_category_recenter_user' },
      );
    }
  }, [location?.coords?.latitude, location?.coords?.longitude, followCoordinate]);

  const onClearCategoryRef = useRef<() => void>(null);
  onClearCategoryRef.current = handleClearCategory;
  const onNavigateProviderRef = useRef<(provider: any) => void>(null);
  const onViewProviderProfileRef = useRef<(provider: any) => void>(null);
  const onDeselectProviderRef = useRef<() => void>(null);

  useEffect(() => {
    if (!selectedProvider || !activeDestinationCoords || !activeUserCoords) return;

    if (routeCoords.length >= 2) {
      fitToRoute(
        [
          activeUserCoords,
          activeDestinationCoords,
          ...routeCoords,
        ],
        {
          reason: 'provider_route_ready',
          minDelta: {
            latitudeDelta: PIN_SELECTION_MIN_LATITUDE_DELTA,
            longitudeDelta: PIN_SELECTION_MIN_LONGITUDE_DELTA,
          },
          edgePaddingOverride: {
            left: PIN_SELECTION_HORIZONTAL_CLEARANCE,
            right: PIN_SELECTION_HORIZONTAL_CLEARANCE,
            top: PIN_SELECTION_TOP_CLEARANCE,
            bottom: PIN_SELECTION_BOTTOM_CLEARANCE,
          },
          zoomScale: PIN_SELECTION_ZOOM_SCALE,
        },
      );
    }
  }, [selectedProvider, activeDestinationCoords, activeUserCoords, routeCoords, fitToRoute]);

  // Centra la cámara encuadrando de Punto A a Punto B respetando el área útil sobre provider_preview.
  const animateToProvider = useCallback(
    (provider: any) => {
      if (!provider) return;
      const pLat = provider.lat ?? provider.latitude;
      const pLng = provider.lng ?? provider.longitude;
      if (pLat == null || pLng == null) return;

      const user = location?.coords;
      if (user) {
        fitToRoute(
          [
            { latitude: user.latitude, longitude: user.longitude },
            { latitude: pLat, longitude: pLng },
          ],
          {
            force: true,
            reason: 'carousel_provider_select_ab',
            minDelta: {
              latitudeDelta: PIN_SELECTION_MIN_LATITUDE_DELTA,
              longitudeDelta: PIN_SELECTION_MIN_LONGITUDE_DELTA,
            },
            edgePaddingOverride: {
              left: PIN_SELECTION_HORIZONTAL_CLEARANCE,
              right: PIN_SELECTION_HORIZONTAL_CLEARANCE,
              top: PIN_SELECTION_TOP_CLEARANCE,
              bottom: PIN_SELECTION_BOTTOM_CLEARANCE,
            },
            zoomScale: PIN_SELECTION_ZOOM_SCALE,
          },
        );
      } else {
        followCoordinate(
          { latitude: pLat, longitude: pLng },
          {
            force: true,
            animated: true,
            reason: 'carousel_provider_select',
            latitudeDelta: PIN_SELECTION_SINGLE_LAT_DELTA,
            longitudeDelta: PIN_SELECTION_SINGLE_LAT_DELTA,
          },
        );
      }
    },
    [fitToRoute, followCoordinate, location?.coords],
  );

  // Navegación desde el carrusel: selecciona proveedor, centra cámara y sincroniza el sheet
  // SIN reabrir el panel (usa update para evitar loops de present).
  const handleNavigateProvider = useCallback(
    (provider: any) => {
      bottomSheetDebug('ACTION', { key: 'provider_preview', action: 'INDEX_CHANGE', owner: runtimeOwnerRef.current.ownerId });
      setSelectedProvider(provider);
      animateToProvider(provider);
      const idx = orderedFilteredProviders.findIndex(
        (p: any) => String(p.id) === String(provider.id),
      );
      update({ provider, selectedIndex: idx < 0 ? 0 : idx });
    },
    [setSelectedProvider, animateToProvider, orderedFilteredProviders, update],
  );

  const handleViewProviderProfile = useCallback(
    (p: any) => {
      bottomSheetDebug('ACTION', { key: 'provider_preview', action: 'VIEW_PROFILE', owner: runtimeOwnerRef.current.ownerId });
      navigation.navigate('ProviderProfile', { providerId: p.id });
    },
    [navigation],
  );

  const handleDeselectProvider = useCallback(() => {
    bottomSheetDebug('ACTION', { key: 'provider_preview', action: 'DESELECT', owner: runtimeOwnerRef.current.ownerId });
    userDeselectedProviderCategoryRef.current = selectedCategoryRef.current?.slug ?? null;
    selectedCategoryRef.current = null;
    setSelectedProvider(null);
    setSelectedCategory(null);
    presentCategories(null);
    if (location?.coords?.latitude != null && location?.coords?.longitude != null) {
      followCoordinate(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { force: true, animated: true, reason: 'deselect_provider_recenter_user' },
      );
    }
  }, [presentCategories, location?.coords?.latitude, location?.coords?.longitude, followCoordinate]);

  onNavigateProviderRef.current = handleNavigateProvider;
  onViewProviderProfileRef.current = handleViewProviderProfile;
  onDeselectProviderRef.current = handleDeselectProvider;

  // Botón atrás nativo de Android (hardwareBackPress):
  // 1. Si el overlay de chat está abierto -> cerrarlo
  // 2. Si un proveedor está seleccionado o preview abierto -> deseleccionarlo y restaurar categories
  // 3. Si hay una categoría filtrada -> limpiarla y restaurar vista general
  // 4. Si hay texto de búsqueda -> limpiarlo
  // 5. Si el bottom sheet está expandido (índice > 0) y es colapsable -> colapsar a índice 0
  // 6. De lo contrario retornar false para delegar a MainLayout o navegación superior
  useEffect(() => {
    if (!isFocused) return;

    const onBackPress = () => {
      if (showChat) {
        setShowChat(false);
        return true;
      }
      if (role !== 'provider' && clientOrderStatus === 'PENDING') {
        if (clientActiveOrder?.id) {
          realtime.cancelOrder(clientActiveOrder.id).catch(() => {});
        }
        dismiss();
        return true;
      }
      if (role !== 'provider' && clientOrderStatus === 'PAYMENT_PENDING' && active !== 'focus_client') {
        if (clientActiveOrder?.id) {
          realtime.cancelOrder(clientActiveOrder.id).catch(() => {});
        }
        dismiss();
        return true;
      }
      if (selectedProvider || active === 'provider_preview') {
        handleDeselectProvider();
        return true;
      }
      if (selectedCategory) {
        handleClearCategory();
        return true;
      }
      if (searchQuery.trim().length > 0) {
        handleClearSearch();
        return true;
      }
      if (
        sheetMetrics &&
        sheetMetrics.index > 0 &&
        !sheetMetrics.isCollapsed &&
        active !== 'focus_provider' &&
        active !== 'focus_client'
      ) {
        setIndex?.(0);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [
    isFocused,
    showChat,
    setShowChat,
    role,
    clientOrderStatus,
    clientActiveOrder?.id,
    realtime,
    dismiss,
    selectedProvider,
    active,
    handleDeselectProvider,
    selectedCategory,
    handleClearCategory,
    searchQuery,
    handleClearSearch,
    sheetMetrics,
    setIndex,
  ]);

  useEffect(() => {
    bottomSheetDebug('MAP_FLOW', { reason: 'home_mounted' });
    return () => {
      bottomSheetDebug('MAP_FLOW', { reason: 'home_unmounted', mapFlowActive: false });
      setMapFlowActive(false);
      clearFocusTerminationGraceTimeout();
    };
  }, [clearFocusTerminationGraceTimeout, setMapFlowActive]);

  useEffect(() => {
    const owner = runtimeOwnerRef.current;
    bindRuntimeActionHandlers(owner, {
      categories: {
        SELECT_CATEGORY: (category, meta) => {
          bottomSheetDebug('FLOW_INTENT', { actionId: meta.actionId, key: 'categories', action: 'SELECT_CATEGORY', target: 'categories:selected' });
          setSearchQuery('');
          onCategoryPressRef.current?.({
            id: category.id,
            name: category.name,
            slug: category.slug,
            icon: category.icon ?? 'Grid',
            subcategories: category.subcategories ?? [],
          });
        },
        CLEAR_CATEGORY: (_payload, meta) => {
          bottomSheetDebug('FLOW_INTENT', { actionId: meta.actionId, key: 'categories', action: 'CLEAR_CATEGORY', target: 'categories' });
          onClearCategoryRef.current?.();
        },
      },
      provider_preview: {
        INDEX_CHANGE: (provider, meta) => {
          bottomSheetDebug('FLOW_INTENT', { actionId: meta.actionId, key: 'provider_preview', action: 'INDEX_CHANGE', target: 'provider_preview' });
          onNavigateProviderRef.current?.(provider);
        },
        VIEW_PROFILE: (provider, meta) => {
          bottomSheetDebug('FLOW_INTENT', { actionId: meta.actionId, key: 'provider_preview', action: 'VIEW_PROFILE', target: 'ProviderProfile' });
          onViewProviderProfileRef.current?.(provider);
        },
        DESELECT: (_payload, meta) => {
          bottomSheetDebug('FLOW_INTENT', { actionId: meta.actionId, key: 'provider_preview', action: 'DESELECT', target: 'categories' });
          onDeselectProviderRef.current?.();
        },
      },
    });

    return () => {
      unbindRuntimeActionHandlers(owner);
    };
  }, [bindRuntimeActionHandlers, unbindRuntimeActionHandlers]);

  useEffect(() => {
    // Authority for MAP_FLOW_ACTIVE
    setMapFlowActive(isFocused);
    if (!isFocused) {
      bottomSheetDebug('MAP_FLOW', { reason: 'home_blur_suspend', mapFlowActive: false });
    }
  }, [isFocused, setMapFlowActive]);

  useEffect(() => {
    if (active !== 'categories') {
      hydratedCategoriesPayloadRef.current = false;
      return;
    }

    const payload = activePayload && typeof activePayload === 'object'
      ? activePayload as { selectedCategory?: Category | null; searchQuery?: string }
      : null;
    const payloadSelectedCategory = payload?.selectedCategory ?? null;

    if (!hydratedCategoriesPayloadRef.current) {
      hydratedCategoriesPayloadRef.current = true;
      if (payloadSelectedCategory && selectedCategory?.slug !== payloadSelectedCategory.slug) {
        setSelectedCategory(payloadSelectedCategory);
        return;
      }
    }

    update({ selectedCategory, searchQuery });
  }, [active, selectedCategory, searchQuery, update]);

  useEffect(() => {
    if (active !== 'provider_preview') {
      hydratedProviderPreviewPayloadRef.current = false;
      return;
    }

    const payload = activePayload && typeof activePayload === 'object'
      ? activePayload as { provider?: any }
      : null;
    const payloadProvider = payload?.provider ?? null;

    if (!hydratedProviderPreviewPayloadRef.current) {
      hydratedProviderPreviewPayloadRef.current = true;
      if (payloadProvider && String(selectedProvider?.id) !== String(payloadProvider.id)) {
        setSelectedProvider(payloadProvider);
      }
    }

  }, [active, selectedProvider?.id]);

  useEffect(() => {
    if (!isFocused) return;

    const reconcileOrder = role === 'provider'
      ? realtime.providerActiveOrder
      : selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);

    const target = desiredMapSurface.kind === 'SHEET' ? desiredMapSurface.key : null;
    const activeAllowed = active ? isSheetAllowedForRole(active, role) : false;
    const activeIsFocus = active === 'focus_client' || active === 'focus_provider';
    const targetHasRealtimePriority = target === 'focus_client' || target === 'focus_provider';
    const needsReconcile = active !== target && (!activeAllowed || !active || targetHasRealtimePriority || activeIsFocus);

    const isAnyOverlayActive = Boolean(
      (role !== 'provider' && clientOrderStatus === 'PENDING') ||
      showChat
    );

    if (desiredMapSurface.kind === 'NO_SHEET_BY_DESIGN' || isAnyOverlayActive) {
      if (active !== null) {
        dismiss();
      }
      return;
    }

    if (!needsReconcile) {
      clearFocusTerminationGraceTimeout();
      bottomSheetDebug('RECONCILE_DECISION', {
        role,
        orderId: reconcileOrder?.id ?? null,
        status: reconcileOrder?.status ?? null,
        current: active,
        desired: target,
        decision: 'KEEP',
        reason: activeAllowed ? 'allowed_for_role' : 'target_active',
        hasProvider: !!reconcileOrder?.provider,
        hasServiceProvider: !!reconcileOrder?.serviceProvider,
      });
      const keepLogKey = `${role}:${active}:KEEP`;
      if (lastRoleReconcileLogRef.current !== keepLogKey) {
        bottomSheetDebug('ROLE_RECONCILE', {
          role,
          key: active,
          action: 'KEEP',
          reason: activeAllowed ? 'allowed_for_role' : 'target_active',
        });
        lastRoleReconcileLogRef.current = keepLogKey;
      }
      return;
    }

    const isFocusTermination = activeIsFocus && !targetHasRealtimePriority;
    const isConfirmedTerminal = Boolean(
      reconcileOrder?.status && TERMINAL_REALTIME_STATUSES.includes(reconcileOrder.status)
    );

    // Hysteresis / Grace period against transient null orders during reconnect/refetch:
    // If we are in Focus mode and target degrades to default without an explicit terminal status,
    // hold Focus mode for 800ms to allow socket/cache to rehydrate.
    if (isFocusTermination && !isConfirmedTerminal) {
      if (!focusTerminationGraceTimeoutRef.current) {
        bottomSheetDebug('RECONCILE_DECISION', {
          role,
          orderId: reconcileOrder?.id ?? null,
          status: reconcileOrder?.status ?? null,
          current: active,
          desired: target,
          decision: 'GRACE_WAIT',
          reason: 'awaiting_confirmed_terminal_or_reconnect',
        });
        focusTerminationGraceTimeoutRef.current = setTimeout(() => {
          focusTerminationGraceTimeoutRef.current = null;
          const currentDesired = deriveDesiredMapSurface({
            role,
            clientActiveOrder: selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder),
            providerActiveOrder: realtime.providerActiveOrder,
          });
          if (currentDesired.kind === 'SHEET') {
            if (currentDesired.key === 'categories') {
              presentCategories();
            } else if (currentDesired.key === 'provider_dashboard') {
              present('provider_dashboard', undefined);
            }
          }
        }, 800);
      }
      return;
    }

    clearFocusTerminationGraceTimeout();

    const reason = active && !activeAllowed
      ? (target === 'focus_client' || target === 'focus_provider'
        ? 'active_not_allowed_for_role_realtime_priority'
        : 'active_not_allowed_for_role')
      : activeIsFocus && !targetHasRealtimePriority
        ? 'focus_session_ended'
        : active === null
          ? 'initial_target'
          : 'domain_priority_changed';

    bottomSheetDebug('RECONCILE_DECISION', {
      role,
      orderId: reconcileOrder?.id ?? null,
      status: reconcileOrder?.status ?? null,
      current: active,
      desired: target,
      decision: active === null ? 'PRESENT' : 'REPLACE',
      reason,
      hasProvider: !!reconcileOrder?.provider,
      hasServiceProvider: !!reconcileOrder?.serviceProvider,
    });

    const reconcileLogKey = `${role}:${active ?? 'null'}:${target}:${reason}`;
    if (lastRoleReconcileLogRef.current !== reconcileLogKey) {
      bottomSheetDebug('ROLE_RECONCILE', {
        role,
        from: active,
        to: target,
        reason,
      });
      lastRoleReconcileLogRef.current = reconcileLogKey;
    }

    if (target === 'categories') {
      bottomSheetDebug('CALL', { key: 'categories', role, mapFlowActive: isFocused, reason });
      logTransitionRequest({ from: active, to: 'categories', origin: 'HOME_RECONCILE', reason });
      presentCategories();
    } else if (target === 'provider_dashboard') {
      bottomSheetDebug('CALL', { key: 'provider_dashboard', role, mapFlowActive: isFocused, reason });
      logTransitionRequest({ from: active, to: 'provider_dashboard', origin: 'HOME_RECONCILE', reason });
      present('provider_dashboard', undefined);
    } else if (target === 'focus_client') {
      const order = selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);
      if (!order?.id) return;
      bottomSheetDebug('CALL', { key: 'focus_client', role, mapFlowActive: isFocused, reason });
      logTransitionRequest({ from: active, to: 'focus_client', origin: 'REALTIME_RECONCILE', reason });
      present('focus_client', { orderId: order.id });
    } else if (target === 'focus_provider') {
      const order = realtime.providerActiveOrder;
      if (!order?.id) return;
      bottomSheetDebug('CALL', { key: 'focus_provider', role, mapFlowActive: isFocused, reason });
      logTransitionRequest({ from: active, to: 'focus_provider', origin: 'REALTIME_RECONCILE', reason });
      present('focus_provider', { orderId: order.id });
    }
  }, [active, clearFocusTerminationGraceTimeout, clientOrderStatus, desiredMapSurface, dismiss, isFocused, logTransitionRequest, present, presentCategories, realtime.activeOrder, realtime.localActiveOrder, realtime.providerActiveOrder, role, showChat]);

  const recoverSheetIfDismissed = useCallback(() => {
    const isAnyOverlayActive = Boolean(
      (role !== 'provider' && clientOrderStatus === 'PENDING') ||
      showChat
    );
    if (active === null && !isAnyOverlayActive && desiredMapSurface.kind === 'SHEET') {
      const target = desiredMapSurface.key;
      if (target === 'categories') {
        presentCategories();
      } else if (target === 'provider_dashboard') {
        present('provider_dashboard', undefined);
      } else if (target === 'focus_client') {
        const order = selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);
        if (order?.id) present('focus_client', { orderId: order.id });
      } else if (target === 'focus_provider') {
        const order = realtime.providerActiveOrder;
        if (order?.id) present('focus_provider', { orderId: order.id });
      }
    }
  }, [active, clientOrderStatus, desiredMapSurface, present, presentCategories, realtime.activeOrder, realtime.localActiveOrder, realtime.providerActiveOrder, role, showChat]);

  const handleRecenter = (source: 'recenter_button' | 'user_marker' = 'recenter_button') => {
    if (__DEV__) console.log(`[MAP:INTERACTION] type=RECENTER_PRESS source=${source}`);
    recoverSheetIfDismissed();
    onAutoNavRecenter();

    if (canUseNavigation && activeUserCoords) {
      return;
    }

    if (location?.coords) {
      followCoordinate(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        {
          force: true,
          animated: true,
          reason: 'user_recenter_press',
        },
      );
    }
  };

  const handleSmartFraming = () => {
    if (__DEV__) console.log('[MAP:INTERACTION] type=SMART_FRAMING_PRESS');
    recoverSheetIfDismissed();
    
    // 1. Si existe orden realtime activa no terminal
    const order = role === 'provider'
      ? realtime.providerActiveOrder
      : selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);

    const isNonTerminalOrder = order?.status && !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(order.status);

    if (isNonTerminalOrder) {
      const clientLat = order.clientLat ?? (order.client as any)?.lat ?? (role === 'client' ? location?.coords?.latitude : null);
      const clientLng = order.clientLng ?? (order.client as any)?.lng ?? (role === 'client' ? location?.coords?.longitude : null);
      const providerLat = order.providerLat ?? (order.provider as any)?.lat ?? (role === 'provider' ? location?.coords?.latitude : null);
      const providerLng = order.providerLng ?? (order.provider as any)?.lng ?? (role === 'provider' ? location?.coords?.longitude : null);

      const points: RouteCoordinate[] = [];
      if (clientLat != null && clientLng != null && Number.isFinite(clientLat) && Number.isFinite(clientLng)) {
        points.push({ latitude: clientLat, longitude: clientLng });
      }
      if (providerLat != null && providerLng != null && Number.isFinite(providerLat) && Number.isFinite(providerLng)) {
        points.push({ latitude: providerLat, longitude: providerLng });
      }
      if (routeCoords.length >= 2) {
        points.push(...routeCoords);
      }

      if (points.length >= 2) {
        fitToRoute(points, { force: true, animated: true, reason: 'smart_framing_realtime_order' });
        return;
      }
    }

    // 2. Si hay un proveedor seleccionado con ruta
    if (selectedProvider && location?.coords) {
      const pLat = selectedProvider.lat ?? selectedProvider.latitude;
      const pLng = selectedProvider.lng ?? selectedProvider.longitude;
      if (pLat != null && pLng != null && Number.isFinite(pLat) && Number.isFinite(pLng)) {
        const points: RouteCoordinate[] = [
          { latitude: location.coords.latitude, longitude: location.coords.longitude },
          { latitude: pLat, longitude: pLng },
          ...routeCoords,
        ];
        fitToRoute(points, { force: true, animated: true, reason: 'smart_framing_selected_provider' });
        return;
      }
    }

    // 3. Si hay una categoría seleccionada con proveedores disponibles con coordenadas
    if (selectedCategory && orderedFilteredProviders.length > 0) {
      const points: RouteCoordinate[] = orderedFilteredProviders.map((p: any) => ({
        latitude: p.lat ?? p.latitude,
        longitude: p.lng ?? p.longitude,
      }));
      if (location?.coords) {
        points.push({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
      if (points.length >= 2) {
        fitToRoute(points, { force: true, animated: true, reason: 'smart_framing_category_providers' });
        return;
      }
    }

    // 4. Caso por defecto: Encuadre metropolitano (Temuco + Padre Las Casas) centrado en el usuario
    if (location?.coords) {
      followCoordinate(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        {
          force: true,
          animated: true,
          latitudeDelta: DEFAULT_TEMUCO_PLC_REGION.latitudeDelta,
          longitudeDelta: DEFAULT_TEMUCO_PLC_REGION.longitudeDelta,
          reason: 'smart_framing_metropolitan_user_recenter',
        },
      );
      return;
    }

    // 5. Fallback si no hay GPS disponible: Regresar a vista metropolitana (Temuco + Padre Las Casas)
    fitToDefaultRegion(DEFAULT_TEMUCO_PLC_REGION, true);
  };

  const handleMapPress = () => {
    Keyboard.dismiss();
    if (__DEV__) console.log('[MAP:INTERACTION] type=BACKGROUND_PRESS');
    recoverSheetIfDismissed();
  };

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPanDrag={handleMapPanDrag}
          onPress={handleMapPress}
          customMapStyle={mapStyle}
          userInterfaceStyle="dark"
          loadingBackgroundColor={MAP_BACKGROUND_COLOR}
          loadingEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
        >
        {location && (
          <AnimatedUserMarker 
            coordinate={{ 
              latitude: location.coords.latitude, 
              longitude: location.coords.longitude 
            }} 
            heading={(isNavigating && activeNavigationTarget?.heading != null) ? activeNavigationTarget.heading : location?.coords?.heading}
            isMapManipulating={isMapManipulating || mapPanActiveRef.current}
            onPress={() => {
              if (canUseNavigation) {
                onAutoNavRecenter();
              } else {
                handleRecenter('user_marker');
              }
            }}
          />
        )}
        {role === 'provider' && activeDestinationCoords && (
          <HousePin coordinate={activeDestinationCoords} />
        )}
        {role !== 'provider' &&
          hasActiveRealtimeOrder &&
          clientActiveOrder?.clientLat != null &&
          clientActiveOrder?.clientLng != null &&
          (Math.abs(clientActiveOrder.clientLat) > 1e-4 || Math.abs(clientActiveOrder.clientLng) > 1e-4) && (
          <HousePin coordinate={{ latitude: clientActiveOrder.clientLat, longitude: clientActiveOrder.clientLng }} />
        )}
        {role !== 'provider' && hasActiveRealtimeOrder && clientOrderStatus !== 'PENDING' && activeDestinationCoords && (
          <AnimatedProviderMarker
            coordinate={activeDestinationCoords}
            text={clientOrderStatus === 'ACCEPTED' ? 'En camino' : clientOrderStatus === 'IN_PROGRESS' ? 'Llegó a tu domicilio' : undefined}
          />
        )}
        {!hasActiveRealtimeOrder && selectedProvider && (() => {
          const sLat = selectedProvider.lat ?? selectedProvider.latitude;
          const sLng = selectedProvider.lng ?? selectedProvider.longitude;
          if (sLat == null || sLng == null || !Number.isFinite(sLat) || !Number.isFinite(sLng)) return null;
          return (
            <ProviderPin
              key={`selected-provider-${selectedProvider.spId || selectedProvider.id}`}
              provider={selectedProvider}
              coordinate={{ latitude: sLat, longitude: sLng }}
              isSelected={true}
              isMapManipulating={isMapManipulating || mapPanActiveRef.current}
              onPress={() => {
                cancelSheetAutoRestore();
                clearFocusTerminationGraceTimeout();
                if (__DEV__) console.log(`[MAP:INTERACTION] type=SELECTED_PROVIDER_PRESS providerId=${selectedProvider.id}`);
                const idx = orderedFilteredProviders.findIndex(
                  (p: any) => String(p.id) === String(selectedProvider.id),
                );
                animateToProvider(selectedProvider);
                const previewPayload = {
                  provider: selectedProvider,
                  providers: orderedFilteredProviders,
                  selectedIndex: idx < 0 ? 0 : idx,
                };
                if (active === 'provider_preview') {
                  update(previewPayload);
                } else {
                  logTransitionRequest({ from: active, to: 'provider_preview', origin: 'PROVIDER_PRESS', reason: 'provider_pin_press' });
                  present('provider_preview', previewPayload);
                }
              }}
            />
          );
        })()}
        {!hasActiveRealtimeOrder && (clusters.length > 0 ? clusters : fallbackFeatures).map((item: any, itemIdx: number) => {
          const isCluster = item.properties?.cluster;
          const [longitude, latitude] = item.geometry?.coordinates || [];
          if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

          if (isCluster) {
            return (
              <ClusterPin
                key={`cluster-${item.id || item.properties?.cluster_id || itemIdx}`}
                coordinate={{ latitude, longitude }}
                pointCount={item.properties.point_count}
                isMapManipulating={isMapManipulating || mapPanActiveRef.current}
                onPress={() => {
                  try {
                    const expansionZoom = superclusterRef.current.getClusterExpansionZoom(item.id);
                    const nextLongitudeDelta = Math.min(DEFAULT_TEMUCO_PLC_REGION.longitudeDelta, 360 / Math.pow(2, expansionZoom));
                    const nextLatitudeDelta = nextLongitudeDelta * 0.8;
                    mapRef.current?.animateToRegion({
                      latitude,
                      longitude,
                      latitudeDelta: nextLatitudeDelta,
                      longitudeDelta: nextLongitudeDelta,
                    }, 350);
                  } catch (err) {
                    if (__DEV__) console.log('[MAP:CLUSTER_ZOOM_ERR]', err);
                  }
                }}
              />
            );
          }

          const provider = item.properties?.provider || item;
          if (!provider) return null;
          if (selectedProvider && String(selectedProvider.id) === String(provider.id)) return null;

          const isSelected = false;

          return (
            <ProviderPin
              key={`provider-${provider.spId || provider.id}`}
              provider={provider}
              coordinate={{ latitude, longitude }}
              isSelected={isSelected}
              isMapManipulating={isMapManipulating || mapPanActiveRef.current}
              onPress={() => {
                cancelSheetAutoRestore();
                clearFocusTerminationGraceTimeout();
                if (__DEV__) console.log(`[MAP:INTERACTION] type=PROVIDER_PRESS providerId=${provider.id}`);
                bottomSheetDebug('ACTION', { key: 'provider_preview', action: 'PROVIDER_PRESS', origin: 'MAP_PROVIDER_PIN' });
                bottomSheetDebug('FLOW_INTENT', { key: 'provider_preview', action: 'PROVIDER_PRESS', target: 'provider_preview' });
                const idx = orderedFilteredProviders.findIndex(
                  (p: any) => String(p.id) === String(provider.id),
                );
                setSelectedProvider(provider);
                animateToProvider(provider);
                const previewPayload = {
                  provider,
                  providers: orderedFilteredProviders,
                  selectedIndex: idx < 0 ? 0 : idx,
                };
                if (active === 'provider_preview') {
                  update(previewPayload);
                } else {
                  logTransitionRequest({ from: active, to: 'provider_preview', origin: 'PROVIDER_PRESS', reason: 'provider_pin_press' });
                  present('provider_preview', previewPayload);
                }
              }}
            />
          );
        })}
        {routeCoords.length >= 2 && (
          <AnimatedPolyline
            coordinates={routeCoords}
            currentPosition={activeRouteOrigin}
            strokeColor={TOKENS.colors.brand500}
            latitudeDelta={isNavigating ? 0.0025 : region?.latitudeDelta}
          />
        )}
      </MapView>
      )}

      {/* HUD Superior de Conducción (Proveedor en EN_CAMINO): 25px bajo el header (Persistente) */}
      {role === 'provider' && canUseNavigation && providerSession.orderState === 'EN_CAMINO' && (
        <DrivingNavigationHUD
          turn={activeNavigationTarget?.turn}
          etaLabel={providerSession.etaLabel}
          distanceLabel={providerSession.distanceLabel}
          destinationAddress={realtime.providerActiveOrder?.clientAddress}
          clientName={realtime.providerActiveOrder?.client?.displayName}
          style={{
            position: 'absolute',
            top: 25,
            left: 0,
            right: 0,
            zIndex: 60,
          }}
        />
      )}

      {/* Client Arrival HUD (Cliente en orden aceptada / en camino): Misma posición canónica a 25px */}
      {role !== 'provider' && clientOrderStatus === 'ACCEPTED' && (
        <ClientArrivalHUD
          providerName={clientSession.provider?.name || clientActiveOrder?.provider?.name || 'Profesional'}
          providerAvatar={getImageUrl(clientSession.provider?.avatar || clientActiveOrder?.provider?.logoImage?.cdnUrl || null)}
          providerRating={clientSession.provider?.rating}
          vehicleInfo={clientSession.provider?.serviceName}
          etaMinutes={clientSession.etaLabel}
          distanceRemaining={clientSession.distanceLabel}
          style={{
            position: 'absolute',
            top: 25,
            left: 0,
            right: 0,
            zIndex: 60,
          }}
        />
      )}

      {/* Top Floating Controls */}
      <View
        style={[
          styles.topFloatingControls,
          {
            top:
              (role === 'provider' && canUseNavigation && providerSession.orderState === 'EN_CAMINO') ||
              (role !== 'provider' && clientOrderStatus === 'ACCEPTED')
                ? 109
                : insets.top > 0
                  ? insets.top + 8
                  : TOKENS.spacing.md,
          },
        ]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - topControlsHeight) > 2) {
            setTopControlsHeight(h);
          }
        }}
        pointerEvents="box-none"
      >
        {/* Floating Search Bar (Client only, hidden when there is an active non-terminal order) */}
        {(role === 'client' || role === 'guest') && !hasActiveRealtimeOrder && (
          <View style={styles.floatingSearchContainer}>
            <View style={styles.floatingSearchIconBox}>
              <Icon name="Search" size={20} color={TOKENS.colors.brand500} />
            </View>
            <TextInput
              style={styles.floatingSearchInput}
              placeholder="¿Qué servicio necesitas?"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Buscar servicio o categoría"
              accessibilityRole="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.floatingSearchClearBtn}
                onPress={handleClearSearch}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Borrar búsqueda"
                accessibilityRole="button"
              >
                <Icon name="X" size={16} color={TOKENS.colors.textSubtle} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {!(role !== 'provider' && clientOrderStatus === 'PENDING') && (
          <MapFloatingNavigationControls
            isNavigating={isNavigating}
            subjectCoordinate={activeUserCoords}
            targetCoordinate={activeUserCoords}
            destinationCoordinate={activeDestinationCoords}
            heading={location?.coords?.heading}
            onSmartFraming={handleSmartFraming}
            showNavigation={false}
            showSmartFraming={role !== 'provider'}
          />
        )}
      </View>

      {/* PENDING RADAR OVERLAY (Cliente) */}
      {role !== 'provider' && clientOrderStatus === 'PENDING' && (
        <View style={styles.radarOverlay}>
          <View style={styles.radarContainer}>
            <View style={styles.staticRing} />
            <Animated.View
              style={[
                styles.pingRing,
                {
                  opacity: pingOpacity,
                  transform: [{ scale: pingScale }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: pulseOpacity,
                },
              ]}
            />
            <View style={styles.radarPulseCenter}>
              {clientSession.provider?.avatar ? (
                <Avatar uri={clientSession.provider.avatar} name={clientSession.provider.name} size={60} />
              ) : (
                <Icon name="Search" size={32} color={TOKENS.colors.white} />
              )}
            </View>
            <Animated.View style={[styles.floatingAvatar1, { transform: [{ translateY: floatAnim }] }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop' }} style={styles.floatingAvatarImage} />
            </Animated.View>
            <Animated.View style={[styles.floatingAvatar2, { transform: [{ translateY: floatAnim.interpolate({ inputRange: [-20, 20], outputRange: [20, -20] }) }] }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop' }} style={styles.floatingAvatarImage} />
            </Animated.View>
          </View>
          <Text style={styles.radarText}>Esperando respuesta...</Text>
          <Text style={styles.radarSubText}>Notificando al profesional indicado</Text>
          <TouchableOpacity
            onPress={async () => {
              if (clientActiveOrder?.id) {
                try { await realtime.cancelOrder(clientActiveOrder.id); } catch {}
              }
              dismiss();
            }}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Cancelar búsqueda</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CHAT OVERLAY */}
      {showChat && (
        <FocusChatOverlay
          chatUser={role === 'provider' ? realtime.providerActiveOrder?.client : (clientActiveOrder?.provider || (clientActiveOrder?.serviceProvider as any)?.provider)}
          activeOrder={role === 'provider' ? realtime.providerActiveOrder : clientActiveOrder}
          realtime={realtime}
          role={role === 'provider' ? 'provider' : 'client'}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Dev Street Navigation Joystick */}
      <DevJoystickOverlay
        onFollowCoordinate={followCoordinate}
        routeCoords={routeCoords}
        bottomOffset={
          active && sheetMetrics?.sheetHeight
            ? bottomNavHeight + sheetMetrics.sheetHeight + 12
            : bottomNavHeight + 16
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MAP_BACKGROUND_COLOR },
  map: { ...StyleSheet.absoluteFill, backgroundColor: MAP_BACKGROUND_COLOR },
  sheetSearchBarContainer: {
    height: 52,
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
  },
  searchIcon: { marginRight: TOKENS.spacing.sm },
  searchInput: {
    flex: 1,
    color: TOKENS.colors.textMain,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    height: '100%',
    padding: 0,
  },
  floatingButtonsWrapper: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sheetContent: { flex: 1, paddingHorizontal: TOKENS.spacing.lg, paddingTop: TOKENS.spacing.xxs },
  sheetTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, paddingBottom: 24 },
  categoryCard: { width: '48%', backgroundColor: TOKENS.colors.surface50, borderColor: TOKENS.colors.surface200, borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: TOKENS.colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  categoryCardText: { fontSize: TOKENS.typography.sizes.xs, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain, flex: 1 },
  sheetBackBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sheetBackText: { color: TOKENS.colors.brand500, fontSize: TOKENS.typography.sizes.xs, fontWeight: TOKENS.typography.weights.semibold, marginLeft: 4 },
  categoryTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: TOKENS.colors.textSubtle, fontSize: TOKENS.typography.sizes.sm, textAlign: 'center', paddingHorizontal: 20 },
  providerCard: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  providerName: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, flex: 1, marginRight: 8 },
  providerService: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, marginBottom: 4 },
  providerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  providerPrice: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  topFloatingControls: {
    position: 'absolute',
    left: TOKENS.spacing.md,
    right: TOKENS.spacing.md,
    zIndex: 50,
  },
  floatingSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    height: 56,
    paddingHorizontal: 14,
    marginBottom: TOKENS.spacing.xs,
    ...TOKENS.shadows.floating,
  },
  floatingSearchIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  floatingSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textMain,
    paddingVertical: 0,
  },
  floatingSearchClearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  radarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 26, 29, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    elevation: 90,
  },
  radarContainer: {
    position: 'relative',
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.xxl,
    marginTop: TOKENS.spacing.xxl,
  },
  staticRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pingRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
  },
  radarPulseCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: TOKENS.colors.brand500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 10,
    overflow: 'hidden',
  },
  floatingAvatar1: {
    position: 'absolute',
    top: 24,
    right: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    opacity: 0.8,
    zIndex: 15,
    overflow: 'hidden',
  },
  floatingAvatar2: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 15,
    overflow: 'hidden',
  },
  floatingAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  radarText: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    marginTop: TOKENS.spacing.md,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  radarSubText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: TOKENS.spacing.xxl,
    marginTop: TOKENS.spacing.xs,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 20,
  },
  cancelBtnText: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
});
