import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { TOKENS, DARK_VISIBLE_MAP_STYLE } from '../../theme';
import { Icon, Avatar, AnimatedUserMarker, AnimatedProviderMarker, AnimatedPolyline, HousePin } from '../../components/ui';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { useFocusSession } from '../../features/focus-session/useFocusSession';
import { useRealtime } from '../../realtime/RealtimeContext';
import { getImageUrl } from '../../utils/imageUrl';
import type { OrderRealTime } from '../../types/graphql';
import { FocusChatOverlay } from './components/FocusChatOverlay';
import { useBottomNavHeight } from '../../components/layout/bottomNavMetrics';

export const FocusModeClientScreen: React.FC = () => {
  const bottomNavHeight = useBottomNavHeight();
  const navigation = useNavigation<any>();
  const { dismiss } = useBottomSheet();
  const session = useFocusSession('client');
  const realtime = useRealtime();

  const { activeOrder, provider, providerCoords, clientCoords, routeCoords, showChat, setShowChat } = session;

  const completedOrder: OrderRealTime | null = realtime.clientOrders?.find(
    (o: any) => o.id === activeOrder?.id && o.status === 'COMPLETED' && o.provider
  ) || null;

  const status = activeOrder?.status || 'PENDING';

  const polylineCoords = routeCoords;

  // Cámara: follow mode (auto-centra) vs manual (el usuario explora).
  const mapRef = useRef<MapView>(null);
  const [followMode, setFollowMode] = useState(true);
  const lastAnimatedRef = useRef<string>('');

  const followRegion: Region = useMemo(() => {
    const lat = ((clientCoords?.latitude ?? -33.4489) + (providerCoords?.latitude ?? -33.4489)) / 2;
    const lng = ((clientCoords?.longitude ?? -70.6693) + (providerCoords?.longitude ?? -70.6693)) / 2;
    const latitudeDelta =
      providerCoords && clientCoords
        ? Math.abs(clientCoords.latitude - providerCoords.latitude) * 2 + 0.005
        : 0.05;
    const longitudeDelta =
      providerCoords && clientCoords
        ? Math.abs(clientCoords.longitude - providerCoords.longitude) * 2 + 0.005
        : 0.05;
    return { latitude: lat, longitude: lng, latitudeDelta, longitudeDelta };
  }, [clientCoords, providerCoords]);

  // Sigue al proveedor solo en follow mode; el usuario puede alejarse (manual).
  useEffect(() => {
    if (!followMode || !mapRef.current) return;
    const key = `${followRegion.latitude.toFixed(5)},${followRegion.longitude.toFixed(5)},${followRegion.latitudeDelta.toFixed(5)},${followRegion.longitudeDelta.toFixed(5)}`;
    if (key === lastAnimatedRef.current) return;
    lastAnimatedRef.current = key;
    mapRef.current.animateToRegion(followRegion, 800);
  }, [followRegion, followMode]);

  const handleFollow = () => {
    setFollowMode(true);
    if (mapRef.current) {
      mapRef.current.animateToRegion(followRegion, 800);
    }
  };

  // Finalización: cuando la orden se completa con proveedor, navega a Rating.
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
      dismiss();
      return;
    }
  }, [activeOrder, completedOrder, dismiss, navigation]);

  // Radar animation values
  const pingScale = useRef(new Animated.Value(1)).current;
  const pingOpacity = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const mapStyle = DARK_VISIBLE_MAP_STYLE;

  useEffect(() => {
    if (__DEV__) console.log('[ANIM:UNMOUNT] component=FocusModeClientScreen mounted=true');
    return () => {
      if (__DEV__) console.log('[ANIM:UNMOUNT] component=FocusModeClientScreen');
    };
  }, []);

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
    if (__DEV__) console.log('[ANIM:START] component=FocusModeClientScreen name=pending_radar_composite');
    composite.start();

    return () => {
      if (__DEV__) console.log('[ANIM:STOP] component=FocusModeClientScreen name=pending_radar_composite');
      composite.stop();
    };
  }, [status]);

  return (
    <View style={styles.container}>
      {/* MAP COVER */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={followRegion}
          onPanDrag={() => setFollowMode(false)}
          customMapStyle={mapStyle}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          mapPadding={{ top: 16, right: 16, bottom: bottomNavHeight + 24, left: 16 }}
        >
            {clientCoords && <HousePin coordinate={clientCoords} />}

            {status !== 'PENDING' && providerCoords && (
              <AnimatedProviderMarker
                coordinate={providerCoords}
                text={status === 'QUOTED' ? 'Cotizó' : status === 'ACCEPTED' ? 'En camino' : 'Llegó a tu domicilio'}
              />
            )}

            {polylineCoords.length >= 2 && (
              <AnimatedPolyline
                coordinates={polylineCoords}
                strokeColor={TOKENS.colors.brand500}
                strokeWidth={4}
              />
            )}
          </MapView>

        {!followMode && status !== 'PENDING' && (
          <TouchableOpacity onPress={handleFollow} style={styles.followBtn}>
            <Icon name="Locate" size={18} color={TOKENS.colors.brand500} />
            <Text style={styles.followBtnText}>Centrar</Text>
          </TouchableOpacity>
        )}
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
            <Animated.View style={[styles.floatingAvatar2, { transform: [{ translateY: floatAnim.interpolate({ inputRange: [-20, 20], outputRange: [20, -20] }) }] }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop' }} style={styles.floatingAvatarImage} />
            </Animated.View>
          </View>

          <Text style={styles.radarText}>Esperando respuesta...</Text>
          <Text style={styles.radarSubText}>Notificando al profesional indicado</Text>
          
          <TouchableOpacity  onPress={async () => {
            if (__DEV__) console.log(`[BS:ACTION] key=focus_client action=CANCEL_ORDER origin=FOCUS_MODE_CLIENT orderId=${activeOrder?.id ?? 'null'} status=${activeOrder?.status ?? 'null'}`);
            if (activeOrder?.id) {
              try { await realtime.cancelOrder(activeOrder.id); } catch {}
            }
            if (__DEV__) console.log(`[BS:DISMISS] key=focus_client reason=focus_mode_client_cancel_after_mutation orderId=${activeOrder?.id ?? 'null'}`);
            dismiss();
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

          <TouchableOpacity onPress={async () => {
            if (__DEV__) console.log(`[BS:ACTION] key=focus_client action=CANCEL_ORDER origin=FOCUS_MODE_CLIENT_PAYMENT orderId=${activeOrder?.id ?? 'null'} status=${activeOrder?.status ?? 'null'}`);
            if (activeOrder?.id) {
              try { await realtime.cancelOrder(activeOrder.id); } catch {}
            }
            if (__DEV__) console.log(`[BS:DISMISS] key=focus_client reason=focus_mode_client_payment_cancel_after_mutation orderId=${activeOrder?.id ?? 'null'}`);
            dismiss();
          }} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancelar orden</Text>
          </TouchableOpacity>
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
