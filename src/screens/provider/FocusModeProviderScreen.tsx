import React, { useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS, DARK_VISIBLE_MAP_STYLE } from '../../theme';
import { Icon, AnimatedUserMarker, HousePin, AnimatedPolyline } from '../../components/ui';
import { useFocusSession } from '../../features/focus-session/useFocusSession';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { useMapCamera } from '../../hooks/useMapCamera';
import { FocusChatOverlay } from '../client/components/FocusChatOverlay';
import { useBottomNavHeight } from '../../components/layout/bottomNavMetrics';
import type { RouteCoordinate } from '../../utils/directions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FocusModeProviderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const headerBottom = 60 + insets.top;
  const bottomNavHeight = useBottomNavHeight();
  const { sheetMetrics } = useBottomSheet();
  const session = useFocusSession('provider');
  const { activeOrder, orderState, providerCoords, clientCoords, routeCoords, showChat, setShowChat, realtime } = session;

  const polylineCoords = routeCoords;
  const mapStyle = DARK_VISIBLE_MAP_STYLE;
  const mapRef = useRef<MapView>(null);

  const {
    fitToRoute,
    followCoordinate,
    handlePanDrag,
    handleRegionChangeComplete,
    recenter,
    dynamicEdgePadding,
    isFollowing,
  } = useMapCamera({
    mapRef,
    headerBottom,
    sheetTop: sheetMetrics?.sheetTop ?? null,
    bottomNavHeight,
  });

  const initialCenterRegion: Region = useMemo(() => {
    const lat = providerCoords?.latitude ?? clientCoords?.latitude ?? -33.4489;
    const lng = providerCoords?.longitude ?? clientCoords?.longitude ?? -70.6693;
    return { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 };
  }, [clientCoords?.latitude, clientCoords?.longitude, providerCoords?.latitude, providerCoords?.longitude]);

  useEffect(() => {
    if (routeCoords.length >= 2) {
      const points: RouteCoordinate[] = [
        providerCoords ? { latitude: providerCoords.latitude, longitude: providerCoords.longitude } : null,
        clientCoords ? { latitude: clientCoords.latitude, longitude: clientCoords.longitude } : null,
        ...routeCoords,
      ].filter(Boolean) as RouteCoordinate[];
      fitToRoute(points, { reason: 'focus_provider_route_fit' });
    } else if (providerCoords && clientCoords) {
      fitToRoute(
        [
          { latitude: providerCoords.latitude, longitude: providerCoords.longitude },
          { latitude: clientCoords.latitude, longitude: clientCoords.longitude },
        ],
        { reason: 'focus_provider_pins_fit' },
      );
    } else if (providerCoords) {
      followCoordinate(providerCoords, { reason: 'focus_provider_self_follow' });
    }
  }, [orderState, routeCoords, clientCoords?.latitude, clientCoords?.longitude, providerCoords?.latitude, providerCoords?.longitude, fitToRoute, followCoordinate]);

  const handleFollow = () => {
    if (routeCoords.length >= 2) {
      const points: RouteCoordinate[] = [
        providerCoords ? { latitude: providerCoords.latitude, longitude: providerCoords.longitude } : null,
        clientCoords ? { latitude: clientCoords.latitude, longitude: clientCoords.longitude } : null,
        ...routeCoords,
      ].filter(Boolean) as RouteCoordinate[];
      recenter({ pointsToFit: points });
    } else if (providerCoords && clientCoords) {
      recenter({
        pointsToFit: [
          { latitude: providerCoords.latitude, longitude: providerCoords.longitude },
          { latitude: clientCoords.latitude, longitude: clientCoords.longitude },
        ],
      });
    } else if (providerCoords) {
      recenter({ targetCoordinate: providerCoords });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialCenterRegion}
          onPanDrag={handlePanDrag}
          onRegionChangeComplete={handleRegionChangeComplete}
          customMapStyle={mapStyle}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          mapPadding={dynamicEdgePadding}
        >
          {clientCoords && <HousePin coordinate={clientCoords} />}

          {providerCoords && <AnimatedUserMarker coordinate={providerCoords} />}

          {polylineCoords.length >= 2 && (
            <AnimatedPolyline
              coordinates={polylineCoords}
              strokeColor={TOKENS.colors.brand500}
              strokeWidth={4}
            />
          )}
        </MapView>

        {!isFollowing && (
          <TouchableOpacity onPress={handleFollow} style={styles.followBtn}>
            <Icon name="Locate" size={18} color={TOKENS.colors.brand500} />
            <Text style={styles.followBtnText}>Centrar</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* CHAT OVERLAY */}
      {showChat && (
        <FocusChatOverlay
          chatUser={activeOrder?.client}
          activeOrder={activeOrder}
          realtime={realtime}
          role="provider"
          onClose={() => setShowChat(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface100,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  sheetBody: {
    flex: 1,
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  etaText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    borderRadius: 16,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
  },
  clientCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  clientAddress: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
  },
  guideText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  bypassBtn: {
    paddingVertical: TOKENS.spacing.xs,
    alignItems: 'center',
  },
  bypassBtnText: {
    color: TOKENS.colors.brand500,
    fontSize: TOKENS.typography.sizes.xxs,
    fontWeight: TOKENS.typography.weights.bold,
    textDecorationLine: 'underline',
  },
  actionBtn: {
    width: '100%',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.xs,
  },
  timerLabel: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    fontWeight: TOKENS.typography.weights.bold,
  },
  timerVal: {
    fontSize: 32,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    marginTop: 4,
  },
  workingDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
    lineHeight: 16,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
    gap: 8,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.colors.statusSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
  },
  completedTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginTop: 4,
  },
  completedSub: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
  clientMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.dark900,
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
  },
  providerMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.brand500,
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.floating,
  },
  followBtn: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  followBtnText: {
    color: TOKENS.colors.brand500,
    fontSize: 13,
    fontWeight: '700',
  },
});
