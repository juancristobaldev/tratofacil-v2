import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, Dimensions, Linking, Animated } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Button, Card, BottomSheet, BottomSheetState, Badge, AnimatedUserMarker } from '../../components/ui';
import { usePanel } from '../../context/PanelContext';
import { useLocation } from '../../context/LocationContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_NAV_HEIGHT = 85;

const CLIENT_LOCATION = {
  latitude: -33.42098,
  longitude: -70.60862,
};

const PROVIDER_START_LOCATION = {
  latitude: -33.42898,
  longitude: -70.61262,
};

const ROUTE_COORDS = [
  PROVIDER_START_LOCATION,
  { latitude: -33.42738, longitude: -70.61182 },
  { latitude: -33.42588, longitude: -70.61102 },
  { latitude: -33.42438, longitude: -70.61022 },
  { latitude: -33.42288, longitude: -70.60942 },
  CLIENT_LOCATION,
];

type ProviderOrderState = 'EN_CAMINO' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';

export const FocusModeProviderScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { panelData, closePanel, openPanel, updatePanelData, clearPanel } = usePanel();
  const { location } = useLocation();
  const requestId = panelData?.requestId || 'req201';

  const [orderState, setOrderState] = useState<ProviderOrderState>('EN_CAMINO');
  const lastOrderState = useRef<ProviderOrderState | null>(null);

  // Simulated provider position movement on map when EN_CAMINO
  const [providerCoords, setProviderCoords] = useState(PROVIDER_START_LOCATION);
  const [distanceRemaining, setDistanceRemaining] = useState('1.2 km');
  const [etaRemaining, setEtaRemaining] = useState('6 min');

  // Work timer ticking
  const [workSeconds, setWorkSeconds] = useState(0);

  const formatTimer = (sec: number) => {
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleFinish = () => {
    clearPanel();
    navigation.navigate('Rating', {
      role: 'provider',
      targetUser: {
        name: 'Juan Pérez',
        avatar: null,
        rating: 5.0,
        reviewsCount: 12,
        subtext: 'Cliente',
      },
      serviceDetails: 'Reparación de tablero eléctrico',
      amount: 22000,
      address: 'Av. Providencia 1450',
      paymentMethod: 'Tarjeta de Crédito',
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
      });
    }
  }, [orderState, etaRemaining, distanceRemaining, workSeconds, openPanel, updatePanelData]);

  // Push notifications
  const [pushAlert, setPushAlert] = useState<{ title: string; message: string } | null>(null);
  const pushTranslateY = useRef(new Animated.Value(-120)).current;

  const triggerPushAlert = (title: string, message: string) => {
    setPushAlert({ title, message });
    Animated.timing(pushTranslateY, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(pushTranslateY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setPushAlert(null);
      });
    }, 3500);
  };

  useEffect(() => {
    if (orderState === 'EN_CAMINO') {
      triggerPushAlert("Nueva Orden de Trabajo", "Dirígete a Padre Las Casas para iniciar el servicio.");
    } else if (orderState === 'ARRIVED') {
      triggerPushAlert("Llegada a Destino", "Has llegado a la ubicación del cliente. Confirma el inicio del trabajo.");
    } else if (orderState === 'IN_PROGRESS') {
      triggerPushAlert("Servicio Iniciado", "Cronómetro activo. Realiza la reparación correspondiente.");
    } else if (orderState === 'COMPLETED') {
      triggerPushAlert("Trabajo Completado", "Has finalizado el servicio y emitido el recibo.");
    }
  }, [orderState]);

  const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  ];

  useEffect(() => {
    if (orderState !== 'EN_CAMINO') return;

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const coord = ROUTE_COORDS[step] || CLIENT_LOCATION;
      setProviderCoords(coord);

      // Update mock labels
      if (step === 1) {
        setDistanceRemaining('800m');
        setEtaRemaining('4 min');
      } else if (step === 2) {
        setDistanceRemaining('400m');
        setEtaRemaining('2 min');
      } else if (step === 3) {
        setDistanceRemaining('100m');
        setEtaRemaining('Llegando');
      } else if (step === 4) {
        clearInterval(interval);
        setDistanceRemaining('0m');
        setEtaRemaining('Llegaste');
        setOrderState('ARRIVED'); // Arrived!
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderState]);

  useEffect(() => {
    if (orderState !== 'IN_PROGRESS') return;

    const timer = setInterval(() => {
      setWorkSeconds((p) => p + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [orderState]);

  return (
    <SafeAreaView style={styles.container}>
      {/* MAP AREA */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={{
            latitude: (CLIENT_LOCATION.latitude + providerCoords.latitude) / 2,
            longitude: (CLIENT_LOCATION.longitude + providerCoords.longitude) / 2,
            latitudeDelta: Math.abs(CLIENT_LOCATION.latitude - providerCoords.latitude) * 2 + 0.005,
            longitudeDelta: Math.abs(CLIENT_LOCATION.longitude - providerCoords.longitude) * 2 + 0.005,
          }}
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
          {/* Client Marker */}
          <Marker coordinate={CLIENT_LOCATION}>
            <View style={styles.clientMarker}>
              <Icon name="Home" size={12} color={TOKENS.colors.white} />
            </View>
          </Marker>

          {/* Provider Marker */}
          <Marker coordinate={providerCoords}>
            <View style={styles.providerMarker}>
              <Icon name="Wrench" size={12} color={TOKENS.colors.white} />
            </View>
          </Marker>

          {/* Route path */}
          {orderState === 'EN_CAMINO' && (
            <Polyline
              coordinates={[providerCoords, CLIENT_LOCATION]}
              strokeColor={TOKENS.colors.brand500}
              strokeWidth={4}
              lineDashPattern={[6, 3]}
            />
          )}
        </MapView>
      </View>

      {/* PUSH ALERTS */}

      {pushAlert && (
        <Animated.View style={[styles.pushNotificationContainer, { transform: [{ translateY: pushTranslateY }] }]}>
          <View style={styles.pushNotificationIcon}>
            <Icon name="Bell" size={18} color={TOKENS.colors.white} />
          </View>
          <View style={styles.pushNotificationContent}>
            <Text style={styles.pushNotificationTitle}>{pushAlert.title}</Text>
            <Text style={styles.pushNotificationMessage} numberOfLines={2}>{pushAlert.message}</Text>
          </View>
        </Animated.View>
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
  pushNotificationContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: TOKENS.colors.dark900,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 9999,
    ...TOKENS.shadows.floating,
  },
  pushNotificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushNotificationContent: {
    flex: 1,
  },
  pushNotificationTitle: {
    color: TOKENS.colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  pushNotificationMessage: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
});
