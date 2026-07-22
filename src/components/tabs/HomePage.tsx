import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, FlatList, Image } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Badge, ProviderPin, AnimatedUserMarker } from '../ui';
import { MOCK_CATEGORIES, MOCK_PROVIDERS, Category, Provider } from '../../mocks/mockData';
import { usePanel } from '../../context/PanelContext';
import { useRole } from '../../context/RoleContext';
import { useLocation } from '../../context/LocationContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SANTIAGO_REGION = {
  latitude: -33.42098,
  longitude: -70.60862,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

export const HomePage: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { location } = useLocation();
  const mapRef = useRef<MapView>(null);
  const { openPanel, panelState, activePanel } = usePanel();
  const [region, setRegion] = useState(SANTIAGO_REGION);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditingRadius, setIsEditingRadius] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);

  const { role } = useRole();

  const onCategoryPressRef = useRef<(category: Category) => void>();
  onCategoryPressRef.current = useCallback((category: Category) => {
    setSelectedCategory(category);
    setRegion({
      ...SANTIAGO_REGION,
      latitude: -33.421,
      longitude: -70.609,
    });
  }, []);

  const onClearCategoryRef = useRef<() => void>();
  onClearCategoryRef.current = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const selectedCategoryRef = useRef(selectedCategory);
  selectedCategoryRef.current = selectedCategory;

  useEffect(() => {
    if ((role === 'client' || role === 'guest') && (activePanel === null || activePanel === 'categories')) {
      openPanel('categories', {
        selectedCategory: selectedCategoryRef.current,
        onCategoryPress: (category: Category) => onCategoryPressRef.current?.(category),
        onClearCategory: () => onClearCategoryRef.current?.(),
      });
    }
  }, [role, activePanel, openPanel]);

  const handleRecenter = () => {
    if (location) {
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      });
    } else {
      setRegion(SANTIAGO_REGION);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
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
        {MOCK_PROVIDERS.map((provider, index) => {
          const latOffset = (index - 1.5) * 0.007;
          const lngOffset = (index - 1) * 0.006;
          const coordinate = {
            latitude: SANTIAGO_REGION.latitude + latOffset,
            longitude: SANTIAGO_REGION.longitude + lngOffset,
          };
          const isSelected = selectedCategory?.slug === provider.categorySlug;
          return (
            <ProviderPin
              key={provider.id}
              provider={provider}
              coordinate={coordinate}
              isSelected={isSelected}
              onPress={() => navigation.navigate('ProviderProfile', { providerId: provider.id })}
            />
          );
        })}
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
