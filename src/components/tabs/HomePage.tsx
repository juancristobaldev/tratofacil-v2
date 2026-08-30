import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, Image, Keyboard } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Supercluster from 'supercluster';
import { TOKENS, DARK_VISIBLE_MAP_STYLE } from '../../theme';
import { Icon, Avatar, Rating, Badge, ProviderPin, AnimatedUserMarker, LoadingScreen, ErrorState, AnimatedPolyline, HousePin } from '../ui';
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
import { ENDPOINT } from '../../config/endpoints';
import { getImageUrl } from '../../utils/imageUrl';
import { geocodeCity, getCachedCoords } from '../../utils/geocode';
import type { RouteCoordinate } from '../../utils/directions';
import { useRoutePolyline } from '../../hooks/useRoute';
import { resolveCategorySlugs } from '../../utils/categoryTree';
import { EMPTY_ARRAY } from '../../utils/emptyArray';
import { DEFAULT_TEMUCO_PLC_REGION } from '../../utils/mapGeometry';
import { DevJoystickOverlay } from '../../dev/joystick';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
let homePageRuntimeOwnerGeneration = 0;
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
    fitToDefaultRegion,
    handlePanDrag: onCameraPanDrag,
    handleRegionChangeComplete: onCameraRegionChangeComplete,
    recenter: recenterCamera,
    dynamicEdgePadding,
    isUserExploring,
    isNavigating,
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
  const [region, setRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(DEFAULT_TEMUCO_PLC_REGION);
  const initialCenterDone = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { role } = useRole();
  const realtime = useRealtime();
  const hasActiveRealtimeOrder = useMemo(() => {
    const order = role === 'provider' ? realtime.providerActiveOrder : selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);
    if (!order?.status) return false;
    return !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(order.status);
  }, [role, realtime.activeOrder, realtime.localActiveOrder, realtime.providerActiveOrder]);

  const desiredMapSurface = useMemo<DesiredMapSurface>(() => {
    const clientOrder = selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);
    return deriveDesiredMapSurface({
      role,
      clientActiveOrder: clientOrder,
      providerActiveOrder: realtime.providerActiveOrder,
    });
  }, [role, realtime.activeOrder, realtime.localActiveOrder, realtime.providerActiveOrder]);

  useEffect(() => {
      const order = role === 'provider'
      ? realtime.providerActiveOrder
      : selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);
    const desired = desiredMapSurface.kind === 'SHEET' ? desiredMapSurface.key : 'NO_SHEET_BY_DESIGN';
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
  }, [active, desiredMapSurface, realtime.activeOrder, realtime.localActiveOrder, realtime.providerActiveOrder, role]);

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
      if (order && !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(order.status)) {
        const lat = order.clientLat;
        const lng = order.clientLng;
        if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
          return { latitude: lat, longitude: lng };
        }
      }
      return null;
    }

    const clientOrder = selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder);
    if (clientOrder && !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(clientOrder.status)) {
      const lat = clientOrder.providerLat ?? (clientOrder.provider as any)?.lat;
      const lng = clientOrder.providerLng ?? (clientOrder.provider as any)?.lng;
      if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }

    if (selectedProvider) {
      const lat = selectedProvider.lat ?? selectedProvider.latitude;
      const lng = selectedProvider.lng ?? selectedProvider.longitude;
      return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
        ? { latitude: lat, longitude: lng }
        : null;
    }

    return null;
  }, [role, realtime.providerActiveOrder, realtime.localActiveOrder, realtime.activeOrder, selectedProvider]);

  const { routeCoords } = useRoutePolyline(
    activeUserCoords,
    activeDestinationCoords,
    Boolean(activeDestinationCoords && activeUserCoords && isFocused),
  );
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
    onCameraRegionChangeComplete(newRegion, mapPanActiveRef.current);
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
      console.log('[MAP:GESTURE] PAN_END');
    }
  }, [updateClusters, onCameraRegionChangeComplete, onSheetAutoCollapseRegionComplete]);

  const handleMapPanDrag = useCallback(() => {
    Keyboard.dismiss();
    onCameraPanDrag();
    onSheetAutoCollapsePanDrag();
    if (mapPanActiveRef.current) return;
    mapPanActiveRef.current = true;
    console.log('[MAP:GESTURE] PAN_START');
  }, [onCameraPanDrag, onSheetAutoCollapsePanDrag]);

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
      const heading = (location.coords.heading != null && Number.isFinite(location.coords.heading) && location.coords.heading >= 0)
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
          reason: isNavigating ? 'gps_stream_navigation_follow' : 'gps_stream_follow',
        },
      );
    }
  }, [location?.coords?.latitude, location?.coords?.longitude, location?.coords?.heading, isUserExploring, isNavigating, followCoordinate]);

  const { token } = useAuth();

  const {
    servicesByCategory,
    categories,
    refetchServicesByCategory,
  } = useCategories();

  useEffect(() => {
    const socket = (realtime as any).socketRef?.current;
    if (!socket) return;

    const onProviderStatus = () => {
      refetchServicesByCategory();
    };

    socket.on('provider:realtime:status', onProviderStatus);

    return () => {
      socket.off('provider:realtime:status', onProviderStatus);
    };
  }, [(realtime as any).socketRef, refetchServicesByCategory]);

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
        const p = sp.provider;
        const cityKey = (sp.cities?.[0]?.city || p.location || '').toLowerCase();
        const fallbackCoords = resolvedCoords[cityKey];
        const lat = p.lat ?? fallbackCoords?.lat ?? null;
        const lng = p.lng ?? fallbackCoords?.lng ?? null;
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
  }, [filteredProviders, updateClusters]);

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
  ]);

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
        { reason: 'provider_route_ready' },
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
          { force: true, reason: 'carousel_provider_select_ab' },
        );
      } else {
        followCoordinate(
          { latitude: pLat, longitude: pLng },
          { force: true, animated: true, reason: 'carousel_provider_select' },
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

  useEffect(() => {
    bottomSheetDebug('MAP_FLOW', { reason: 'home_mounted' });
    return () => {
      bottomSheetDebug('MAP_FLOW', { reason: 'home_unmounted', mapFlowActive: false });
      setMapFlowActive(false);
    };
  }, [setMapFlowActive]);

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

    if (desiredMapSurface.kind === 'NO_SHEET_BY_DESIGN') {
      bottomSheetDebug('NO_SHEET', {
        role,
        orderId: reconcileOrder?.id ?? null,
        status: reconcileOrder?.status ?? null,
        current: active,
        reason: desiredMapSurface.reason,
      });

      bottomSheetDebug('RECONCILE_DECISION', {
        role,
        orderId: reconcileOrder?.id ?? null,
        status: reconcileOrder?.status ?? null,
        current: active,
        desired: 'NO_SHEET_BY_DESIGN',
        decision: active ? 'DISMISS' : 'KEEP',
        reason: desiredMapSurface.reason,
        hasProvider: !!reconcileOrder?.provider,
        hasServiceProvider: !!reconcileOrder?.serviceProvider,
      });

      if (active) {
        dismiss();
      }
      return;
    }

    const target = desiredMapSurface.key;
    const activeAllowed = active ? isSheetAllowedForRole(active, role) : false;
    const activeIsFocus = active === 'focus_client' || active === 'focus_provider';
    const targetHasRealtimePriority = target === 'focus_client' || target === 'focus_provider';
    const needsReconcile = active !== target && (!activeAllowed || !active || targetHasRealtimePriority || activeIsFocus);

    if (!needsReconcile) {
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
  }, [active, desiredMapSurface, dismiss, isFocused, logTransitionRequest, present, presentCategories, realtime.activeOrder, realtime.localActiveOrder, realtime.providerActiveOrder, role]);

  const handleNavigationMode = (source: 'nav_button' | 'user_marker' = 'nav_button') => {
    console.log(`[MAP:INTERACTION] type=NAVIGATION_MODE_PRESS source=${source} isNavigating=${isNavigating}`);
    if (location?.coords) {
      const userCoord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      if (isNavigating) {
        exitNavigationMode(userCoord, true);
      } else {
        const heading = (location.coords.heading != null && Number.isFinite(location.coords.heading) && location.coords.heading >= 0)
          ? location.coords.heading
          : 0;
        navigateToCoordinate(
          userCoord,
          {
            heading,
            pitch: 60,
            animated: true,
          },
        );
      }
    }
  };

  const handleRecenter = (source: 'recenter_button' | 'user_marker' = 'recenter_button') => {
    console.log(`[MAP:INTERACTION] type=RECENTER_PRESS source=${source}`);
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
    console.log('[MAP:INTERACTION] type=SMART_FRAMING_PRESS');
    
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
    console.log('[MAP:INTERACTION] type=BACKGROUND_PRESS');
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
            onPress={() => handleNavigationMode('user_marker')}
          />
        )}
        {role === 'provider' && activeDestinationCoords && (
          <HousePin coordinate={activeDestinationCoords} />
        )}
        {orderedFilteredProviders.map((provider: any) => {
          const latitude = provider.lat ?? provider.latitude;
          const longitude = provider.lng ?? provider.longitude;
          if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

          const isSelected = !!(selectedProvider && String(selectedProvider.id) === String(provider.id));

          return (
            <ProviderPin
              key={`provider-${provider.spId || provider.id}`}
              provider={provider}
              coordinate={{ latitude, longitude }}
              isSelected={isSelected}
              onPress={() => {
                cancelSheetAutoRestore();
                console.log(`[MAP:INTERACTION] type=PROVIDER_PRESS providerId=${provider.id}`);
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
            strokeColor={TOKENS.colors.brand500}
            latitudeDelta={region?.latitudeDelta}
          />
        )}
      </MapView>
      )}

      {/* Top Floating Controls */}
      <View
        style={[
          styles.topFloatingControls,
          { top: insets.top > 0 ? insets.top + 8 : TOKENS.spacing.md },
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

        {/* Floating Map Action Buttons (Navigation 3D & Smart Framing) */}
        <View style={styles.floatingButtonsWrapper}>
          <TouchableOpacity
            onPress={() => handleNavigationMode('nav_button')}
            activeOpacity={0.8}
            style={[styles.floatingActionBtn, isNavigating && styles.floatingActionBtnActive]}
            accessibilityLabel="Modo navegación 3D"
          >
            <Icon
              name="Navigation"
              size={19}
              color={isNavigating ? TOKENS.colors.white : TOKENS.colors.brand500}
              fill={isNavigating ? TOKENS.colors.white : TOKENS.colors.brand500}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSmartFraming}
            activeOpacity={0.8}
            style={styles.floatingActionBtn}
            accessibilityLabel="Encuadre inteligente de mapa"
          >
            <Icon name="Maximize2" size={18} color={TOKENS.colors.dark900} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dev Street Navigation Joystick */}
      <DevJoystickOverlay
        onFollowCoordinate={followCoordinate}
        bottomOffset={bottomNavHeight + 16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFill },
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
  floatingActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.floating,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  floatingActionBtnActive: {
    backgroundColor: TOKENS.colors.brand500,
    borderColor: TOKENS.colors.brand600,
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
});
