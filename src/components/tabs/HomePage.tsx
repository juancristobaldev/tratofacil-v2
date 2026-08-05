import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, FlatList, Image } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Supercluster from 'supercluster';
import { TOKENS, DARK_VISIBLE_MAP_STYLE } from '../../theme';
import { Icon, Avatar, Rating, Badge, ProviderPin, ClusterPin, AnimatedUserMarker, LoadingScreen, ErrorState } from '../ui';
import { usePanel } from '../../context/PanelContext';
import { useRole } from '../../context/RoleContext';
import { useLocation } from '../../context/LocationContext';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import { ENDPOINT } from '../../config/endpoints';
import { getImageUrl } from '../../utils/imageUrl';
import { geocodeCity, getCachedCoords } from '../../utils/geocode';
import { getDirections } from '../../utils/directions';
import { resolveCategorySlugs } from '../../utils/categoryTree';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const navigation = useNavigation<any>();
  const { location } = useLocation();
  const mapRef = useRef<MapView>(null);
  const { openPanel, closePanel, updatePanelData, panelState, activePanel } = usePanel();
  const [region, setRegion] = useState({
    latitude: -33.4489,
    longitude: -70.6693,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditingRadius, setIsEditingRadius] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const realtime = useTimeRealServices();

  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const [clusters, setClusters] = useState<any[]>([]);
  const superclusterRef = useRef<Supercluster>(new Supercluster({ radius: 50, maxZoom: 16 }));
  const regionRef = useRef(region);
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

    console.log('[AUDIT:7] getClusters params | bbox:', bbox.map((v: any) => Number(v).toFixed(5)).join(' / '), '| zoom:', zoom);

    const newClusters = superclusterRef.current.getClusters(bbox, zoom);

    console.log('[AUDIT:8] getClusters result | count:', newClusters.length);
    newClusters.forEach((c: any, i: number) => {
      const isCl = c.properties.cluster;
      console.log('[AUDIT:8]   cluster[' + i + '] | isCluster:', isCl, '| coords:', c.geometry.coordinates, isCl ? ('| point_count:' + c.properties.point_count) : ('| providerId:' + c.properties.provider?.id));
    });

    setClusters(newClusters);
  }, []);

  const handleRegionChangeComplete = useCallback((newRegion: any) => {
    const current = regionRef.current;
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
  }, [updateClusters]);

  useEffect(() => {
    if (location?.coords) {
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [location?.coords?.latitude, location?.coords?.longitude]);

  const { role } = useRole();
  const { token } = useAuth();

  const {
    mainCategories,
    servicesByCategory,
    categories,
    categoryTree,
    refetchServicesByCategory,
  } = useCategories();

  useEffect(() => {
    const socket = (realtime as any).socketRef?.current;
    if (!socket) return;

    const onProviderStatus = () => {
      refetchServicesByCategory();
    };
    const onProviderLocation = () => {
      refetchServicesByCategory();
    };

    socket.on('provider:realtime:status', onProviderStatus);
    socket.on('provider:location-updated', onProviderLocation);

    return () => {
      socket.off('provider:realtime:status', onProviderStatus);
      socket.off('provider:location-updated', onProviderLocation);
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

  const displayCategories = useMemo(() => {
    if (!mainCategories?.length) return [];
    return mainCategories.map((cat: any) => ({
      id: String(cat.id),
      name: cat.name,
      slug: cat.slug,
      icon: 'Grid',
      subcategories: [],
    }));
  }, [mainCategories]);

  const displayProviders = useMemo(() => {
    if (!servicesByCategory?.length) return [];
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
          console.log('[DEBUG:MAP] Provider found | service:', service.slug, '| catSlug:', service.category?.slug, '| provider:', p.name, '| lat:', lat, '| lng:', lng, '| city:', cityKey, '| hasFallback:', !!fallbackCoords, '| isRealtime:', p.isRealtimeActive);
        }
        providers.push({
          id: String(p.id),
          spId: sp.id,
          name: p.name,
          avatar: getImageUrl(p.logoImage?.cdnUrl || null),
          rating: p.reviews?.length
            ? p.reviews.reduce((s: number, r: any) => s + r.rating, 0) / p.reviews.length
            : 0,
          reviewsCount: p.reviews?.length || 0,
          verified: true,
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
    if (!selectedCategory) return [];

    const selectedSlugs = resolveCategorySlugs(
      categories,
      selectedCategory.slug,
    );

    const result = displayProviders.filter((p: any) =>
      selectedSlugs.includes(p.categorySlug),
    );

    console.log('[DEBUG:MAP] filteredProviders | selectedCategory:', selectedCategory.slug, '| resolvedSlugs:', selectedSlugs, '| displayProviders:', displayProviders.length, '| filtered:', result.length);
    if (result.length > 0) {
      result.forEach((p: any) => console.log('[DEBUG:MAP]  → provider:', p.name, '| catSlug:', p.categorySlug, '| lat:', p.lat, '| lng:', p.lng));
    }
    return result;
  }, [displayProviders, selectedCategory, categories]);

  useEffect(() => {
    console.log('[AUDIT:1] supercluster effect START | selectedCategory:', selectedCategory?.slug, '| filteredProviders.length:', filteredProviders.length, '| region:', region.latitude.toFixed(5), region.longitude.toFixed(5), '| latDelta:', region.latitudeDelta, '| lngDelta:', region.longitudeDelta);

    if (!selectedCategory) {
      superclusterRef.current.load([]);
      setClusters([]);
      return;
    }

    filteredProviders.forEach((p: any) => {
      const hasCoords = p.lat != null && p.lng != null;
      console.log('[AUDIT:2] provider filter | name:', p.name, '| id:', p.id, '| lat:', p.lat, 'type:', typeof p.lat, '| lng:', p.lng, 'type:', typeof p.lng, '| isFinite:', hasCoords ? (Number.isFinite(p.lat) && Number.isFinite(p.lng)) : 'N/A', '| passes:', hasCoords);
    });

    const uniqueProvidersMap = new Map();
    filteredProviders
      .filter((p: any) => p.lat != null && p.lng != null)
      .forEach((p: any) => {
        if (!uniqueProvidersMap.has(p.id)) {
          uniqueProvidersMap.set(p.id, p);
        }
      });

    console.log('[AUDIT:3] uniqueProviders | count:', uniqueProvidersMap.size, '| items:', Array.from(uniqueProvidersMap.values()).map((p: any) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })));

    const points = Array.from(uniqueProvidersMap.values())
      .map((p: any) => {
        const feature = {
          type: 'Feature',
          properties: { cluster: false, provider: p },
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
        };
        console.log('[AUDIT:4] GeoJSON point | id:', p.id, '| coords:', feature.geometry.coordinates);
        return feature;
      }) as any[];
    
    console.log('[AUDIT:5] loading into supercluster | points.length:', points.length);
    superclusterRef.current.load(points);
    const allPoints = superclusterRef.current.getClusters([-180, -90, 180, 90], 0);
    console.log('[AUDIT:6] supercluster total indexed | count:', allPoints.length);

    updateClusters(region);
    console.log('[DEBUG:MAP] clusters loaded | points prepared:', points.length, '| filteredProviders total:', filteredProviders.length, '| filtered with coords:', uniqueProvidersMap.size);
  }, [filteredProviders, updateClusters]);

  const onCategoryPressRef = useRef<(category: Category) => void>(null);
  onCategoryPressRef.current = useCallback((category: Category) => {
    setSelectedCategory(category);
    setSelectedProvider(null);

    const slugs = resolveCategorySlugs(categories, category.slug);
    const matched = displayProviders.filter((p: any) =>
      slugs.includes(p.categorySlug),
    );
    const validLat = matched.map((p: any) => p.lat).filter((v: any) => v != null);
    const validLng = matched.map((p: any) => p.lng).filter((v: any) => v != null);

    if (validLat.length > 0) {
      const pad = 0.01;
      setRegion({
        latitude: (Math.min(...validLat) + Math.max(...validLat)) / 2,
        longitude: (Math.min(...validLng) + Math.max(...validLng)) / 2,
        latitudeDelta: Math.max(
          (Math.max(...validLat) - Math.min(...validLat)) * 1.5,
          pad,
        ),
        longitudeDelta: Math.max(
          (Math.max(...validLng) - Math.min(...validLng)) * 1.5,
          pad,
        ),
      });
    }
  }, [displayProviders, categories]);

  const onClearCategoryRef = useRef<() => void>(null);
  onClearCategoryRef.current = useCallback(() => {
    setSelectedCategory(null);
    setSelectedProvider(null);
    setRouteCoords([]);
  }, []);

  useEffect(() => {
    const provider = selectedProvider;
    const user = location?.coords;
    if (!provider || provider.lat == null || provider.lng == null || !user) {
      setRouteCoords([]);
      return;
    }
    let cancelled = false;
    getDirections(
      { latitude: user.latitude, longitude: user.longitude },
      { latitude: provider.lat, longitude: provider.lng },
    )
      .then((result) => {
        if (cancelled || !result) return;
        setRouteCoords(result.coordinates);
      })
      .catch(() => {
        if (!cancelled) setRouteCoords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProvider, location?.coords?.latitude, location?.coords?.longitude]);


  const selectedCategoryRef = useRef(selectedCategory);
  selectedCategoryRef.current = selectedCategory;

  useEffect(() => {
    updatePanelData({ selectedCategory });
  }, [selectedCategory, updatePanelData]);

  useEffect(() => {
    if ((role === 'client' || role === 'guest') && (activePanel === null || activePanel === 'categories')) {
      openPanel('categories', {
        categories: displayCategories,
        categoryTree,
        selectedCategory: selectedCategoryRef.current,
        onCategoryPress: (category: Category) => onCategoryPressRef.current?.(category),
        onClearCategory: () => onClearCategoryRef.current?.(),
        closePanel,
        selectedProvider,
        setSelectedProvider,
      });
    }
  }, [role, activePanel, openPanel, displayCategories]);

  const handleRecenter = () => {
    if (location?.coords) {
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
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
          />
        )}
        {(() => {
          console.log('[AUDIT:9] MapView render | clusters.length:', clusters.length, '| region:', region.latitude.toFixed(5), region.longitude.toFixed(5));
          clusters.forEach((c: any, i: number) => {
            console.log('[AUDIT:9]   render['+i+'] | isCluster:', c.properties.cluster, '| coords:', c.geometry.coordinates, '| key:', c.properties.cluster ? ('cluster-'+i) : ('provider-'+c.properties.provider?.id));
          });
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
                setSelectedProvider(provider);
                openPanel('provider_preview', {
                  provider,
                  onViewProfile: (p: any) => {
                    closePanel();
                    setSelectedProvider(null);
                    setRouteCoords([]);
                    navigation.navigate('ProviderProfile', { providerId: p.id });
                  },
                });
              }}
            />
          );
        })}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={TOKENS.colors.brand500}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

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
            onPress={handleRecenter}
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
