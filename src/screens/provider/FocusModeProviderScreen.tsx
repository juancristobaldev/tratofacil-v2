import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, Dimensions, Linking, Animated } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS, DARK_VISIBLE_MAP_STYLE } from '../../theme';
import { Icon, Avatar, Button, Card, Badge, AnimatedUserMarker, HousePin } from '../../components/ui';
import { usePanel } from '../../context/PanelContext';
import { useLocation } from '../../context/LocationContext';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';
import { useRoutePolyline } from '../../hooks/useRoute';
import type { OrderRealTime } from '../../types/graphql';
import { useNotification } from '../../context/NotificationContext';
import { FocusChatOverlay } from '../client/components/FocusChatOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ProviderOrderState = 'VIEW_REQUEST' | 'WAITING_CLIENT_RESPONSE' | 'EN_CAMINO' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

function getMetersBetween(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371e3;
  const dLat = ((la2 - la1) * Math.PI) / 180;
  const dLon = ((lo2 - lo1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatEta(meters: number): string {
  const minutes = Math.ceil(meters / 200);
  if (minutes <= 0) return 'Llegó';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

export const FocusModeProviderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { panelData, closePanel, openPanel, updatePanelData, clearPanel } = usePanel();
  const { location } = useLocation();
  const realtime = useTimeRealServices();

  const [orderState, setOrderState] = useState<ProviderOrderState>(panelData?.orderState || 'VIEW_REQUEST');
  const lastOrderState = useRef<ProviderOrderState | null>(null);
  const [showChat, setShowChat] = useState(false);

  const [providerCoords, setProviderCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceRemaining, setDistanceRemaining] = useState('...');
  const [etaRemaining, setEtaRemaining] = useState('...');

  const [workSeconds, setWorkSeconds] = useState(0);

  const formatTimer = (sec: number) => {
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const activeOrder: OrderRealTime | null = realtime.providerActiveOrder;

  const clientLat = activeOrder?.clientLat ?? location?.coords?.latitude;
  const clientLng = activeOrder?.clientLng ?? location?.coords?.longitude;
  const clientCoords = clientLat && clientLng ? { latitude: clientLat, longitude: clientLng } : null;

  const myLat = location?.coords?.latitude ?? activeOrder?.providerLat;
  const myLng = location?.coords?.longitude ?? activeOrder?.providerLng;

  useEffect(() => {
    if (location && myLat != null && myLng != null) {
      setProviderCoords({ latitude: myLat, longitude: myLng });
    }
  }, [myLat, myLng, location]);

  useEffect(() => {
    if (activeOrder?.providerLat && activeOrder?.providerLng) {
      setProviderCoords({ latitude: activeOrder.providerLat, longitude: activeOrder.providerLng });
    }
  }, [activeOrder?.providerLat, activeOrder?.providerLng]);

  useEffect(() => {
    if (!providerCoords || !clientCoords) return;
    const m = getMetersBetween(providerCoords.latitude, providerCoords.longitude, clientCoords.latitude, clientCoords.longitude);
    setDistanceRemaining(formatDistance(m));
    setEtaRemaining(formatEta(m));
  }, [providerCoords?.latitude, providerCoords?.longitude, clientCoords?.latitude, clientCoords?.longitude, orderState]);

  const { routeCoords } = useRoutePolyline(
    providerCoords,
    clientCoords,
    orderState === 'EN_CAMINO' || orderState === 'ARRIVED',
  );

  const polylineCoords = routeCoords.length > 0 ? routeCoords : (clientCoords && providerCoords ? [providerCoords, clientCoords] : []);

  const handleFinish = () => {
    clearPanel();
    navigation.navigate('Rating', {
      role: 'provider',
      targetUser: {
        name: activeOrder?.client?.displayName || 'Cliente',
        avatar: null,
        rating: 0,
        reviewsCount: 0,
        subtext: activeOrder?.serviceProvider?.service?.name || '',
      },
      serviceDetails: activeOrder?.clientDescription || '',
      amount: activeOrder?.quotedPrice || 0,
      address: activeOrder?.clientAddress || '',
      orderRealtimeId: activeOrder?.id,
      clientId: activeOrder?.client?.id,
    });
  };

  useEffect(() => {
    if (orderState !== lastOrderState.current) {
      openPanel('focus_provider', {
        orderState,
        etaRemaining,
        distanceRemaining,
        workSeconds,
        formatTimer,
        setOrderState,
        handleFinish,
        setShowChat,
        activeOrder,
        realtime,
      });
      lastOrderState.current = orderState;
    } else {
      updatePanelData({
        orderState,
        etaRemaining,
        distanceRemaining,
        workSeconds,
        formatTimer,
        setOrderState,
        handleFinish,
        setShowChat,
        activeOrder,
        realtime,
      });
    }
  }, [orderState, etaRemaining, distanceRemaining, workSeconds, openPanel, updatePanelData, activeOrder]);

  useEffect(() => {
    const r = realtime?.providerActiveOrder;
    if (!r) return;
    const statusMap: Record<string, ProviderOrderState> = {
      PENDING: 'VIEW_REQUEST',
      QUOTED: 'WAITING_CLIENT_RESPONSE',
      ACCEPTED: 'EN_CAMINO',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      REJECTED: 'CANCELLED',
      EXPIRED: 'CANCELLED',
    };
    const mapped = statusMap[r.status];
    if (mapped && mapped !== orderState) {
      setOrderState(mapped);
    }
    updatePanelData({ activeOrder: r });
  }, [realtime?.providerActiveOrder]);

  const { showNotification } = useNotification();
  
  useEffect(() => {
    if (orderState === 'EN_CAMINO') {
      showNotification({ title: 'Nueva Orden de Trabajo', message: 'Dirígete a la ubicación del cliente para iniciar el servicio.', type: 'info' });
    } else if (orderState === 'ARRIVED') {
      showNotification({ title: 'Llegada a Destino', message: 'Has llegado a la ubicación del cliente.', type: 'success' });
    } else if (orderState === 'IN_PROGRESS') {
      showNotification({ title: 'Servicio Iniciado', message: 'Cronómetro activo.', type: 'info' });
    } else if (orderState === 'COMPLETED') {
      showNotification({ title: 'Trabajo Completado', message: 'Has finalizado el servicio.', type: 'success' });
    }
  }, [orderState]);

  const mapStyle = DARK_VISIBLE_MAP_STYLE;

  useEffect(() => {
    if (orderState !== 'IN_PROGRESS') return;
    const start = activeOrder?.startedAt ? new Date(activeOrder.startedAt).getTime() : Date.now();
    setWorkSeconds(Math.floor((Date.now() - start) / 1000));
    const timer = setInterval(() => {
      setWorkSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [orderState, activeOrder?.startedAt]);

  useEffect(() => {
    if (orderState !== 'EN_CAMINO' || !providerCoords || !clientCoords) return;
    const m = getMetersBetween(providerCoords.latitude, providerCoords.longitude, clientCoords.latitude, clientCoords.longitude);
    if (m < 100) {
      setOrderState('ARRIVED');
    }
  }, [orderState, providerCoords?.latitude, providerCoords?.longitude, clientCoords?.latitude, clientCoords?.longitude]);

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
        >
          {clientCoords && <HousePin coordinate={clientCoords} />}

          {providerCoords && <AnimatedUserMarker coordinate={providerCoords} />}

          {(orderState === 'EN_CAMINO' || orderState === 'ARRIVED') && polylineCoords.length > 0 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={TOKENS.colors.brand500}
              strokeWidth={4}
              lineDashPattern={[6, 3]}
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
