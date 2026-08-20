import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Linking, Animated, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { TOKENS, DARK_VISIBLE_MAP_STYLE } from '../../theme';
import { Icon, Avatar, Button, Card, Badge, AnimatedUserMarker, HousePin, AnimatedPolyline } from '../../components/ui';
import { useFocusSession } from '../../features/focus-session/useFocusSession';
import { FocusChatOverlay } from '../client/components/FocusChatOverlay';
import { useBottomNavHeight } from '../../components/layout/bottomNavMetrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FocusModeProviderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomNavHeight = useBottomNavHeight();
  const session = useFocusSession('provider');
  const { activeOrder, orderState, providerCoords, clientCoords, routeCoords, showChat, setShowChat, realtime } = session;

  const polylineCoords = routeCoords;

  const mapStyle = DARK_VISIBLE_MAP_STYLE;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={{
            latitude: ((clientCoords?.latitude ?? -33.4489) + (providerCoords?.latitude ?? -33.4489)) / 2,
            longitude: ((clientCoords?.longitude ?? -70.6693) + (providerCoords?.longitude ?? -70.6693)) / 2,
            latitudeDelta: clientCoords && providerCoords
              ? Math.abs(clientCoords.latitude - providerCoords.latitude) * 2 + 0.005
              : 0.05,
            longitudeDelta: clientCoords && providerCoords
              ? Math.abs(clientCoords.longitude - providerCoords.longitude) * 2 + 0.005
              : 0.05,
          }}
          customMapStyle={mapStyle}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          mapPadding={{ top: insets.top + 20, right: 16, bottom: bottomNavHeight + 24, left: 16 }}
        >
          {clientCoords && <HousePin coordinate={clientCoords} />}

          {providerCoords && <AnimatedUserMarker coordinate={providerCoords} />}

          {(orderState === 'EN_CAMINO' || orderState === 'ARRIVED') && polylineCoords.length >= 2 && (
            <AnimatedPolyline
              coordinates={polylineCoords}
              strokeColor={TOKENS.colors.brand500}
              strokeWidth={4}
            />
          )}
        </MapView>
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
    </SafeAreaView>
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
});
