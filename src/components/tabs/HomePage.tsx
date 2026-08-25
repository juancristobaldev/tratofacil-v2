import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Supercluster from 'supercluster';
import { TOKENS, DARK_VISIBLE_MAP_STYLE } from '../../theme';
import { Icon, Avatar, Rating, Badge, ProviderPin, ClusterPin, AnimatedUserMarker, LoadingScreen, ErrorState, AnimatedPolyline } from '../ui';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { bottomSheetDebug, nextBottomSheetTransitionId } from '../../bottom-sheet/core/bottomSheet.debug';
import { isSheetAllowedForRole } from '../../bottom-sheet/core/bottomSheet.registry';
import type { SheetKey } from '../../bottom-sheet/core/bottomSheet.types';
import { useRole } from '../../context/RoleContext';
import { useLocation } from '../../context/LocationContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../context/CategoriesContext';
import { ENDPOINT } from '../../config/endpoints';
import { getImageUrl } from '../../utils/imageUrl';
import { geocodeCity, getCachedCoords } from '../../utils/geocode';
import { getDirections } from '../../utils/directions';
import { resolveCategorySlugs } from '../../utils/categoryTree';
import { EMPTY_ARRAY } from '../../utils/emptyArray';

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
  const {
    present,
    dismiss,
    update,
    active,
    activePayload,
    setMapFlowActive,
    bindRuntimeActionHandlers,
    unbindRuntimeActionHandlers,
  } = useBottomSheet();
  const runtimeOwnerRef = useRef({
    ownerId: `HomePage:${++homePageRuntimeOwnerGeneration}`,
    generation: homePageRuntimeOwnerGeneration,
  });
  const lastRoleReconcileLogRef = useRef<string | null>(null);
  const [region, setRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const initialCenterDone = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditingRadius, setIsEditingRadius] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
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

  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
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
      setRouteCoords([]);
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
  }, [updateClusters]);

  const handleMapPanDrag = useCallback(() => {
    if (mapPanActiveRef.current) return;
    mapPanActiveRef.current = true;
    console.log('[MAP:GESTURE] PAN_START');
  }, []);

  useEffect(() => {
    if (location?.coords && !initialCenterDone.current) {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      initialCenterDone.current = true;
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 600);
      }
    }
  }, [location?.coords?.latitude, location?.coords?.longitude]);

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

  useEffect(() => {
    if (!selectedCategory || filteredProviders.length === 0) return;
    const withCoords = filteredProviders.filter(
      (p: any) => p.lat != null && p.lng != null,
    );
    if (withCoords.length === 0) return;
    const validLat = withCoords.map((p: any) => p.lat);
    const validLng = withCoords.map((p: any) => p.lng);
    const pad = 0.01;
    setRegion({
      latitude: (Math.min(...validLat) + Math.max(...validLat)) / 2,
      longitude: (Math.min(...validLng) + Math.max(...validLng)) / 2,
      latitudeDelta: Math.max((Math.max(...validLat) - Math.min(...validLat)) * 1.5, pad),
      longitudeDelta: Math.max((Math.max(...validLng) - Math.min(...validLng)) * 1.5, pad),
    });
  }, [filteredProviders, selectedCategory]);

  const handleClearCategory = useCallback(() => {
    setSelectedCategory(null);
    setSelectedProvider(null);
    setRouteCoords([]);
  }, []);

  const onClearCategoryRef = useRef<() => void>(null);
  onClearCategoryRef.current = handleClearCategory;
  const onNavigateProviderRef = useRef<(provider: any) => void>(null);
  const onViewProviderProfileRef = useRef<(provider: any) => void>(null);
  const onDeselectProviderRef = useRef<() => void>(null);

  useEffect(() => {
    const provider = selectedProvider;
    const user = location?.coords;
    const pLat = provider?.lat ?? provider?.latitude;
    const pLng = provider?.lng ?? provider?.longitude;
    if (!provider || pLat == null || pLng == null || !user) {
      setRouteCoords([]);
      return;
    }

    const controller = new AbortController();

    getDirections(
      { latitude: user.latitude, longitude: user.longitude },
      { latitude: pLat, longitude: pLng },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result && result.coordinates.length >= 2) {
          setRouteCoords(result.coordinates);
        } else {
          setRouteCoords([
            { latitude: user.latitude, longitude: user.longitude },
            { latitude: pLat, longitude: pLng },
          ]);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRouteCoords([
            { latitude: user.latitude, longitude: user.longitude },
            { latitude: pLat, longitude: pLng },
          ]);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedProvider, location?.coords?.latitude, location?.coords?.longitude]);

  // Centra la cámara en un proveedor (desplazado al norte para no quedar tapado por el sheet).
  const animateToProvider = useCallback((provider: any) => {
    if (!provider || provider.lat == null || provider.lng == null) return;
    mapRef.current?.animateToRegion(
      {
        latitude: provider.lat + 0.005,
        longitude: provider.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500,
    );
  }, []);

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

  const selectedCategoryRef = useRef(selectedCategory);
  selectedCategoryRef.current = selectedCategory;

  const presentCategories = useCallback(() => {
    present('categories', {
      selectedCategory: selectedCategoryRef.current,
    });
  }, [present]);

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

  const handleDeselectProvider = useCallback(() => {
    bottomSheetDebug('ACTION', { key: 'provider_preview', action: 'DESELECT', owner: runtimeOwnerRef.current.ownerId });
    setSelectedProvider(null);
    setRouteCoords([]);
    presentCategories();
  }, [presentCategories]);

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
      ? activePayload as { selectedCategory?: Category | null }
      : null;
    const payloadSelectedCategory = payload?.selectedCategory ?? null;

    if (!hydratedCategoriesPayloadRef.current) {
      hydratedCategoriesPayloadRef.current = true;
      if (payloadSelectedCategory && selectedCategory?.slug !== payloadSelectedCategory.slug) {
        setSelectedCategory(payloadSelectedCategory);
        return;
      }
    }

    update({ selectedCategory });
  }, [active, selectedCategory, update]);

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
    const targetHasRealtimePriority = target === 'focus_client' || target === 'focus_provider';
    const needsReconcile = active !== target && (!activeAllowed || !active || targetHasRealtimePriority);

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

  const handleRecenter = (source: 'gps_button' | 'user_marker' = 'gps_button') => {
    console.log(`[MAP:INTERACTION] type=USER_LOCATION_PRESS source=${source}`);
    if (location?.coords) {
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleMapPress = () => {
    console.log('[MAP:INTERACTION] type=BACKGROUND_PRESS');
  };

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPanDrag={handleMapPanDrag}
          onPress={handleMapPress}
          customMapStyle={mapStyle}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          mapPadding={{ top: 80, right: 16, bottom: 96, left: 16 }}
        >
        {location && (
          <AnimatedUserMarker 
            coordinate={{ 
              latitude: location.coords.latitude, 
              longitude: location.coords.longitude 
            }} 
            onPress={() => handleRecenter('user_marker')}
          />
        )}
        {(() => {
          if (__DEV__) {
            console.log('[AUDIT:9] MapView render | clusters.length:', clusters.length, '| region:', region.latitude.toFixed(5), region.longitude.toFixed(5));
            clusters.forEach((c: any, i: number) => {
              console.log('[AUDIT:9]   render['+i+'] | isCluster:', c.properties.cluster, '| coords:', c.geometry.coordinates, '| key:', c.properties.cluster ? ('cluster-'+i) : ('provider-'+c.properties.provider?.id));
            });
          }
          return null;
        })()}
        {clusters.map((cluster: any, index: number) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count, provider } = cluster.properties;

          if (isCluster) {
            return (
              <ClusterPin
                key={`cluster-${cluster.id || index}`}
                coordinate={{ latitude, longitude }}
                pointCount={point_count}
                onPress={() => {
                  try {
                    const expansionZoom = superclusterRef.current.getClusterExpansionZoom(cluster.id);
                    const zoomDelta = 360 / Math.pow(2, expansionZoom);
                    mapRef.current?.animateToRegion({
                      latitude,
                      longitude,
                      latitudeDelta: zoomDelta,
                      longitudeDelta: zoomDelta,
                    }, 500);
                  } catch (e) {
                    // Fallback if zoom calculation fails
                  }
                }}
              />
            );
          }

          const isSelected = !!(selectedProvider && String(selectedProvider.id) === String(provider.id));

          return (
            <ProviderPin
              key={`provider-${provider.spId}`}
              provider={provider}
              coordinate={{ latitude, longitude }}
              isSelected={isSelected}
              onPress={() => {
                console.log(`[MAP:INTERACTION] type=PROVIDER_PRESS providerId=${provider.id}`);
                bottomSheetDebug('ACTION', { key: 'provider_preview', action: 'PROVIDER_PRESS', origin: 'MAP_PROVIDER_PIN' });
                bottomSheetDebug('FLOW_INTENT', { key: 'provider_preview', action: 'PROVIDER_PRESS', target: 'provider_preview' });
                const idx = orderedFilteredProviders.findIndex(
                  (p: any) => String(p.id) === String(provider.id),
                );
                setSelectedProvider(provider);
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
            strokeWidth={4}
          />
        )}
      </MapView>
      )}

      {/* Top Floating Controls */}
      <View style={styles.topFloatingControls}>
        {/* Floating Location & Radius Box (Client only) */}
        {(role === 'client' || role === 'guest') && (
          <View style={styles.locationFloatContainer}>
            <TouchableOpacity 
              style={styles.locationHeaderRow} 
              onPress={() => setIsEditingRadius(!isEditingRadius)}
              activeOpacity={0.8}
            >
              <View style={styles.locationLeft}>
                <View style={styles.locationIconBox}>
                  <Icon name="MapPin" size={14} color={TOKENS.colors.white} />
                </View>
                <Text style={styles.locationLabel}>Mi ubicación</Text>
              </View>
              <View style={styles.radiusBadge}>
                <Text style={styles.radiusBadgeText}>Radio {radiusKm === 50 ? '+50' : radiusKm}km</Text>
                <Icon name={isEditingRadius ? "ChevronUp" : "ChevronDown"} size={14} color={TOKENS.colors.brand600} />
              </View>
            </TouchableOpacity>
            
            {isEditingRadius && (
              <View style={styles.radiusEditor}>
                <Text style={styles.radiusEditorTitle}>Ajustar radio de búsqueda</Text>
                <View style={styles.radiusOptions}>
                  {[2, 5, 10, 25, 50].map((r) => (
                    <TouchableOpacity 
                      key={r} 
                      style={[styles.radiusOptionBtn, radiusKm === r && styles.radiusOptionBtnActive]}
                      onPress={() => {
                        setRadiusKm(r);
                        setTimeout(() => setIsEditingRadius(false), 200);
                      }}
                    >
                      <Text style={[styles.radiusOptionText, radiusKm === r && styles.radiusOptionTextActive]}>
                        {r === 50 ? '+50' : r} km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* GPS button */}
        <View style={styles.gpsBtnWrapper}>
          <TouchableOpacity
            onPress={() => handleRecenter('gps_button')}
            activeOpacity={0.8}
            style={styles.gpsBtn}
          >
            <Icon name="Crosshair" size={20} color={TOKENS.colors.dark900} />
          </TouchableOpacity>
        </View>
      </View>
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
  gpsBtnWrapper: {
    alignItems: 'flex-end',
  },
  gpsBtn: {
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
    top: TOKENS.spacing.md,
    left: TOKENS.spacing.md,
    right: TOKENS.spacing.md,
    zIndex: 50,
  },
  locationFloatContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    ...TOKENS.shadows.floating,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: TOKENS.spacing.sm,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.dark900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  radiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    gap: 4,
  },
  radiusBadgeText: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
  },
  radiusEditor: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface100,
  },
  radiusEditorTitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.semibold,
    marginBottom: 12,
    textAlign: 'center',
  },
  radiusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  radiusOptionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    alignItems: 'center',
  },
  radiusOptionBtnActive: {
    backgroundColor: TOKENS.colors.brand500,
    borderColor: TOKENS.colors.brand500,
  },
  radiusOptionText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  radiusOptionTextActive: {
    color: TOKENS.colors.white,
  },
});
