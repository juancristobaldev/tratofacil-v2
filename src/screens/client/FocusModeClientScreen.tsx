import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Easing,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TOKENS, DARK_VISIBLE_MAP_STYLE } from '../../theme';
import { Icon, Avatar, Rating, Button, Badge, AnimatedUserMarker, ProviderTrackingPin } from '../../components/ui';
import { usePanel } from '../../context/PanelContext';
import { useLocation } from '../../context/LocationContext';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';
import { useRoutePolyline } from '../../hooks/useRoute';
import { getImageUrl } from '../../utils/imageUrl';
import type { OrderRealTime } from '../../types/graphql';
import { FocusChatOverlay } from './components/FocusChatOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TERMINAL_STATUSES = new Set<string>(['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED']);

export const FocusModeClientScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { panelData, closePanel, openPanel, updatePanelData, clearPanel } = usePanel();
  const { location } = useLocation();
  const realtime = useTimeRealServices();

  const activeOrder: OrderRealTime | null = realtime.localActiveOrder || realtime.activeOrder;

  const completedOrder: OrderRealTime | null = realtime.clientOrders?.find(
    (o: any) => o.id === activeOrder?.id && o.status === 'COMPLETED' && o.provider
  ) || null;

  const provider = useMemo(() => {
    const p = activeOrder?.provider;
    const sp = activeOrder?.serviceProvider;
    if (p) {
      return {
        id: String(p.id),
        name: p.name,
        providerName: p.name,
        avatar: getImageUrl(p.logoImage?.cdnUrl || null),
        rating: p.reviews?.length ? p.reviews.reduce((s: number, r: any) => s + r.rating, 0) / p.reviews.length : 0,
        reviewsCount: p.reviews?.length || 0,
        verified: p.certificates?.some((c: any) => c.verified) || false,
        description: p.bio || '',
        pricePerHour: sp?.price || 0,
        serviceName: sp?.service?.name || '',
        serviceProviderId: sp?.id,
      };
    }
    return panelData?.provider || null;
  }, [activeOrder, panelData?.provider]);

  const status = activeOrder?.status || 'PENDING';

  const clientLat = activeOrder?.clientLat ?? location?.coords?.latitude;
  const clientLng = activeOrder?.clientLng ?? location?.coords?.longitude;
  const clientCoords = clientLat && clientLng ? { latitude: clientLat, longitude: clientLng } : null;

  const providerLat = activeOrder?.providerLat ?? activeOrder?.provider?.lat;
  const providerLng = activeOrder?.providerLng ?? activeOrder?.provider?.lng;
  const providerCoords = providerLat && providerLng ? { latitude: providerLat, longitude: providerLng } : null;

  const { routeCoords } = useRoutePolyline(
    providerCoords,
    clientCoords,
    true,
  );

  const polylineCoords = routeCoords.length > 0 ? routeCoords : (clientCoords && providerCoords ? [providerCoords, clientCoords] : []);

  const distanceLabel = useMemo(() => {
    if (!clientCoords || !providerCoords) return null;
    const R = 6371e3;
    const dLat = ((providerCoords.latitude - clientCoords.latitude) * Math.PI) / 180;
    const dLon = ((providerCoords.longitude - clientCoords.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((clientCoords.latitude * Math.PI) / 180) * Math.cos((providerCoords.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }, [clientCoords, providerCoords]);

  const etaLabel = useMemo(() => {
    if (!clientCoords || !providerCoords) return null;
    const R = 6371e3;
    const dLat = ((providerCoords.latitude - clientCoords.latitude) * Math.PI) / 180;
    const dLon = ((providerCoords.longitude - clientCoords.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((clientCoords.latitude * Math.PI) / 180) * Math.cos((providerCoords.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const minutes = Math.ceil(meters / 200);
    if (minutes <= 0) return 'Llegó';
    if (minutes === 1) return '1 min';
    return `${minutes} min`;
  }, [clientCoords, providerCoords]);

  const distanceToProviderKm = useMemo(() => {
    if (!clientCoords || !providerCoords) return null;
    const R = 6371;
    const dLat = ((providerCoords.latitude - clientCoords.latitude) * Math.PI) / 180;
    const dLon = ((providerCoords.longitude - clientCoords.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((clientCoords.latitude * Math.PI) / 180) * Math.cos((providerCoords.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [clientCoords, providerCoords]);

  const [showChat, setShowChat] = useState(false);

  // Sync panel data whenever order data changes
  useEffect(() => {
    if (activeOrder?.status === 'COMPLETED' && activeOrder?.provider) {
      const providerImg = getImageUrl(activeOrder.provider.logoImage?.cdnUrl || null);
      const reviews = activeOrder.provider.reviews || [];
      const avgRating = reviews.length
        ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
        : 0;
      navigation.navigate('Rating', {
        role: 'client',
        targetUser: {
          name: activeOrder.provider.name || 'Profesional',
          avatar: providerImg || undefined,
          rating: avgRating,
          reviewsCount: reviews.length,
          subtext: activeOrder.serviceProvider?.service?.name || '',
        },
        serviceDetails: activeOrder.clientDescription || '',
        amount: activeOrder.payment?.amount || activeOrder.quotedPrice || 0,
        address: activeOrder.clientAddress || '',
        paymentMethod: activeOrder.payment ? 'Flow.cl' : '-',
        orderRealtimeId: activeOrder.id,
        providerId: activeOrder.provider.id,
      });
      clearPanel();
      return;
    }
    if (!provider) return;
    updatePanelData({
      order: activeOrder,
      provider,
      userLat: location?.coords?.latitude,
      userLng: location?.coords?.longitude,
      etaRemaining: etaLabel || '...',
      distanceRemaining: distanceLabel || '...',
      setShowChat,
      handleFinishReview,
      realtime,
    });
  }, [activeOrder, completedOrder]);

  useEffect(() => {
    updatePanelData({ distanceToProvider: distanceToProviderKm });
  }, [distanceToProviderKm, updatePanelData]);

  const handleFinishReview = useCallback(() => {
    closePanel();
    clearPanel();
    realtime.setLocalActiveOrder(null);
  }, [closePanel, clearPanel, realtime]);

  // Radar animation values
  const pingScale = useRef(new Animated.Value(1)).current;
  const pingOpacity = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const mapStyle = DARK_VISIBLE_MAP_STYLE;

  useEffect(() => {
    if (status !== 'PENDING') return;

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
  }, [status]);

  return (
    <SafeAreaView style={styles.container}>
      {/* MAP COVER */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={{
            latitude: ((clientCoords?.latitude || -33.4489) + (providerCoords?.latitude || -33.4489)) / 2,
            longitude: ((clientCoords?.longitude || -70.6693) + (providerCoords?.longitude || -70.6693)) / 2,
            latitudeDelta: providerCoords && clientCoords
              ? Math.abs(clientCoords.latitude - providerCoords.latitude) * 2 + 0.005
              : 0.05,
            longitudeDelta: providerCoords && clientCoords
              ? Math.abs(clientCoords.longitude - providerCoords.longitude) * 2 + 0.005
              : 0.05,
          }}
          customMapStyle={mapStyle}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {clientCoords && <AnimatedUserMarker coordinate={clientCoords} />}

          {status !== 'PENDING' && providerCoords && (
            <ProviderTrackingPin coordinate={providerCoords} text={status === 'QUOTED' ? 'Cotizó' : status === 'ACCEPTED' ? 'En camino' : 'Llegó a tu domicilio'} />
          )}

          {polylineCoords.length > 0 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={TOKENS.colors.brand500}
              strokeWidth={4}
              lineDashPattern={[6, 3]}
            />
          )}
        </MapView>
      </View>

      {/* PENDING RADAR OVERLAY */}
      {status === 'PENDING' && (
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
              {provider?.avatar ? (
                <Avatar uri={provider.avatar} name={provider.name} size={60} />
              ) : (
                <Icon name="Search" size={32} color={TOKENS.colors.white} />
              )}
            </View>

            <Animated.View style={[styles.floatingAvatar1, { transform: [{ translateY: floatAnim }] }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop' }} style={styles.floatingAvatarImage} />
            </Animated.View>
            <Animated.View style={[styles.floatingAvatar2, { transform: [{ translateY: Animated.multiply(floatAnim, -1) }] }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop' }} style={styles.floatingAvatarImage} />
            </Animated.View>
          </View>

          <Text style={styles.radarText}>Esperando respuesta...</Text>
          <Text style={styles.radarSubText}>Notificando al profesional indicado</Text>
          
          <TouchableOpacity  onPress={async () => {
            if (activeOrder?.id) {
              try { await realtime.cancelOrder(activeOrder.id); } catch {}
            }
            clearPanel();
          }} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancelar búsqueda</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PAYMENT_PENDING OVERLAY */}
      {status === 'PAYMENT_PENDING' && (
        <View style={styles.radarOverlay}>
          <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
          <Text style={styles.radarText}>Esperando confirmación de pago</Text>
          <Text style={styles.radarSubText}>Estamos verificando tu pago con la pasarela...</Text>
        </View>
      )}

      {/* CHAT OVERLAY */}
      {showChat && (
        <FocusChatOverlay
          chatUser={provider}
          activeOrder={activeOrder}
          realtime={realtime}
          role="client"
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
  radarOverlay: {
    ...StyleSheet.absoluteFill,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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
    marginTop:20
  },
  cancelBtnText: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
  providerAvatarMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 2,
    borderColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.floating,
    position: 'relative',
  },
  providerAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  providerAvatarCarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TOKENS.colors.brand500,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
