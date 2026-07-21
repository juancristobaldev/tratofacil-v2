import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Button, Card, BottomSheet, BottomSheetState, Badge, Gradient, ProviderPin, AnimatedUserMarker } from '../../components/ui';
import { MOCK_PROVIDERS, MOCK_CHAT_HISTORY } from '../../mocks/mockData';
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

type ClientState =
  | 'MATCHING' // 0: Radar
  | 'QUOTE_RECEIVED' // 1: Quote details, chat & pay
  | 'CHAT' // 2: Chat screen
  | 'PAID' // 3: Paid, moving on map
  | 'START_REPAIR' // 4: Provider arrived
  | 'IN_PROGRESS' // 5: Repair timer ticking
  | 'CALIFICAR'; // 6: Rate & review

export const FocusModeClientScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { panelData, closePanel, openPanel, updatePanelData, clearPanel } = usePanel();
  const { location } = useLocation();
  const providerId = panelData?.providerId || 'p1';
  const provider = MOCK_PROVIDERS.find((p) => p.id === providerId) || MOCK_PROVIDERS[0];

  const [orderState, setOrderState] = useState<ClientState>('MATCHING');
  const lastOrderState = useRef<ClientState>(orderState);

  // Simulated provider position movement on map when PAID
  const [providerCoords, setProviderCoords] = useState(PROVIDER_START_LOCATION);
  const [distanceRemaining, setDistanceRemaining] = useState('850m');
  const [etaRemaining, setEtaRemaining] = useState('7 min');

  // In progress timer
  const [repairSeconds, setRepairSeconds] = useState(0);

  const formatTimer = (sec: number) => {
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleFinishReview = () => {
    closePanel();
  };

  useEffect(() => {
    if (orderState === 'CALIFICAR') {
      clearPanel();
      navigation.navigate('Rating', {
        role: 'client',
        targetUser: {
          name: provider.name,
          avatar: provider.avatar,
          rating: provider.rating,
          reviewsCount: provider.reviewsCount,
          subtext: provider.serviceName,
        },
        serviceDetails: 'Reparación de fuga en cañería de agua principal y mantención de grifería.',
        amount: 22000,
        address: 'Av. Nueva Providencia 2150, Ñuñoa',
        paymentMethod: 'Efectivo',
      });
      lastOrderState.current = orderState;
      return;
    }

    if (orderState === 'MATCHING' || orderState === 'CHAT') {
      closePanel();
      lastOrderState.current = orderState;
    } else {
      if (orderState !== lastOrderState.current) {
        openPanel('focus_client', {
          orderState,
          provider,
          etaRemaining,
          distanceRemaining,
          repairSeconds,
          formatTimer,
          setOrderState,
          handleFinishReview,
        });
        lastOrderState.current = orderState;
      } else {
        updatePanelData({
          orderState,
          provider,
          etaRemaining,
          distanceRemaining,
          repairSeconds,
          formatTimer,
          setOrderState,
          handleFinishReview,
        });
      }
    }
  }, [orderState, etaRemaining, distanceRemaining, repairSeconds, provider, openPanel, closePanel, updatePanelData, clearPanel, navigation]);

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

  const lastPushedAlert = useRef<ClientState | null>(null);

  useEffect(() => {
    if (orderState === lastPushedAlert.current) return;
    lastPushedAlert.current = orderState;

    if (orderState === 'QUOTE_RECEIVED') {
      triggerPushAlert("Cotización Recibida", `Has recibido una cotización de ${provider.name}.`);
    } else if (orderState === 'PAID') {
      triggerPushAlert("Servicio Aceptado", `${provider.name} se dirige a tu ubicación en su vehículo.`);
    } else if (orderState === 'START_REPAIR') {
      triggerPushAlert("Técnico ha Llegado", `${provider.name} se encuentra afuera de tu domicilio.`);
    } else if (orderState === 'IN_PROGRESS') {
      triggerPushAlert("Servicio Iniciado", `El profesional ha comenzado el trabajo.`);
    } else if (orderState === 'CALIFICAR') {
      triggerPushAlert("Pago Procesado", `Se han debitado $22.000 de tu tarjeta. Califica a ${provider.name}.`);
    }
  }, [orderState]);

  // Animation values
  const radarScale1 = useRef(new Animated.Value(0.5)).current;
  const radarOpacity1 = useRef(new Animated.Value(1)).current;
  const radarScale2 = useRef(new Animated.Value(0.5)).current;
  const radarOpacity2 = useRef(new Animated.Value(1)).current;
  const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  ];

  // Radar Animation Loop
  useEffect(() => {
    if (orderState !== 'MATCHING') return;

    radarScale1.setValue(0.5);
    radarOpacity1.setValue(1);
    radarScale2.setValue(0.5);
    radarOpacity2.setValue(1);

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(radarScale1, {
            toValue: 3,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(radarOpacity1, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.parallel([
          Animated.timing(radarScale2, {
            toValue: 3,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(radarOpacity2, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const composite = Animated.parallel([loop1, loop2]);
    composite.start();

    // Auto advance from MATCHING to QUOTE_RECEIVED after 3 seconds
    const timer = setTimeout(() => {
      setOrderState('QUOTE_RECEIVED');
    }, 3000);

    return () => {
      composite.stop();
      clearTimeout(timer);
    };
  }, [orderState]);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT_HISTORY);
  const [typedMessage, setTypedMessage] = useState('');
  const chatScrollRef = useRef<ScrollView | null>(null);

  const handleSendMessage = () => {
    if (!typedMessage.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      sender: 'client',
      text: typedMessage,
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setTypedMessage('');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    // Auto replies from bot
    setTimeout(() => {
      const replies = [
        'Perfecto, ya estoy finalizando unos detalles.',
        'De acuerdo, procederé con lo acordado.',
        'Excelente, nos vemos en un momento.',
        '¡Listo! Iniciemos el trabajo.',
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'provider',
        text: randomReply,
        time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
  };

  useEffect(() => {
    if (orderState !== 'PAID') return;

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const coord = ROUTE_COORDS[step] || CLIENT_LOCATION;
      setProviderCoords(coord);

      // Update mock labels
      if (step === 1) {
        setDistanceRemaining('650m');
        setEtaRemaining('5 min');
      } else if (step === 2) {
        setDistanceRemaining('400m');
        setEtaRemaining('3 min');
      } else if (step === 3) {
        setDistanceRemaining('200m');
        setEtaRemaining('1 min');
      } else if (step === 4) {
        setDistanceRemaining('50m');
        setEtaRemaining('En tu puerta');
      } else if (step === 5) {
        clearInterval(interval);
        setDistanceRemaining('0m');
        setEtaRemaining('Llegó');
        setOrderState('START_REPAIR'); // Arrived!
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderState]);

  useEffect(() => {
    if (orderState !== 'IN_PROGRESS') return;

    const timer = setInterval(() => {
      setRepairSeconds((p) => p + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [orderState]);

  // Review states
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const reviewTags = ['Puntual', 'Limpio', 'Eficiente', 'Amable', 'Buen precio'];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* MAP COVER */}
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

          {/* Provider Marker (shows up in states after quote) */}
          {orderState !== 'MATCHING' && (
            <Marker coordinate={providerCoords}>
              <View style={styles.providerAvatarMarker}>
                <Image
                  source={{ uri: provider.avatar }}
                  style={styles.providerAvatarImage}
                />
                <View style={styles.providerAvatarCarBadge}>
                  <Icon name="Truck" size={8} color={TOKENS.colors.white} />
                </View>
              </View>
            </Marker>
          )}

          {/* Route path */}
          {orderState === 'PAID' && (
            <Polyline
              coordinates={[providerCoords, CLIENT_LOCATION]}
              strokeColor={TOKENS.colors.brand500}
              strokeWidth={4}
              lineDashPattern={[6, 3]}
            />
          )}
        </MapView>
      </View>

      {/* MATCHING RADAR OVERLAY */}
      {orderState === 'MATCHING' && (
        <View style={styles.radarOverlay}>
          <Animated.View
            style={[
              styles.radarRing,
              {
                opacity: radarOpacity1,
                transform: [{ scale: radarScale1 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              {
                opacity: radarOpacity2,
                transform: [{ scale: radarScale2 }],
              },
            ]}
          />
          <View style={styles.radarPulseCenter}>
            <Avatar uri={provider.avatar} name={provider.name} size={64} />
          </View>
          <Text style={styles.radarText}>Contactando al profesional solicitado...</Text>
          <TouchableOpacity onPress={closePanel} style={styles.cancelLink}>
            <Text style={styles.cancelLinkText}>Cancelar búsqueda</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CHAT STEP OVERLAY */}
      {orderState === 'CHAT' && (
        <SafeAreaView style={styles.chatOverlay}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setOrderState('QUOTE_RECEIVED')} style={styles.chatBackBtn}>
              <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
            </TouchableOpacity>
            <Avatar uri={provider.avatar} name={provider.name} size={36} />
            <Text style={styles.chatHeaderTitle}>{provider.name}</Text>
          </View>

          {/* Messages scroll */}
          <ScrollView
            ref={chatScrollRef}
            contentContainerStyle={styles.chatScroll}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {chatMessages.map((msg) => {
              const isMe = msg.sender === 'client';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubbleContainer,
                    isMe ? styles.chatBubbleContainerMe : styles.chatBubbleContainerThem,
                  ]}
                >
                  <View
                    style={[
                      styles.chatBubble,
                      isMe ? styles.chatBubbleMe : styles.chatBubbleThem,
                    ]}
                  >
                    <Text style={isMe ? styles.chatBubbleTextMe : styles.chatBubbleTextThem}>
                      {msg.text}
                    </Text>
                    <Text style={isMe ? styles.chatBubbleTimeMe : styles.chatBubbleTimeThem}>
                      {msg.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Messages input bar */}
          <View style={styles.chatInputBar}>
            <TextInput
              placeholder="Escribe un mensaje aquí..."
              placeholderTextColor={TOKENS.colors.textMuted}
              value={typedMessage}
              onChangeText={setTypedMessage}
              style={styles.chatInput}
            />
            <TouchableOpacity onPress={handleSendMessage} style={styles.chatSendBtn}>
              <Icon name="Send" size={18} color={TOKENS.colors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

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
  radarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 26, 29, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
  },
  radarRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: TOKENS.colors.brand500,
    backgroundColor: 'transparent',
  },
  radarPulseCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: TOKENS.colors.brand500,
    ...TOKENS.shadows.floating,
  },
  radarText: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    marginTop: TOKENS.spacing.lg,
    textAlign: 'center',
  },
  cancelLink: {
    marginTop: 32,
  },
  cancelLinkText: {
    color: TOKENS.colors.brand400,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    textDecorationLine: 'underline',
  },
  sheetBody: {
    flex: 1,
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  sheetHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  sheetTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  quoteCard: {
    marginBottom: TOKENS.spacing.md,
    padding: TOKENS.spacing.md,
  },
  quoteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quoteCardTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
  },
  quoteCardPrice: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  quoteCardDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: TOKENS.spacing.sm,
  },
  chatIconBtn: {
    width: 52,
    height: 52,
    borderRadius: TOKENS.geometry.radiusInput,
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtn: {
    flex: 1,
  },
  routeHeader: {
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
  providerCardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    borderRadius: 16,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
  },
  providerCardRouteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerNameText: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  providerVehicleText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  phoneCallBtn: {
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
  trackerText: {
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
  confirmStartBtn: {
    width: '100%',
  },
  timerHeader: {
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
  confirmFinishedBtn: {
    width: '100%',
  },
  reviewSheetBody: {
    flex: 1,
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    alignItems: 'center',
  },
  reviewTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  reviewSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
    marginBottom: TOKENS.spacing.md,
  },
  reviewRatingStars: {
    marginBottom: TOKENS.spacing.lg,
  },
  tagLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    alignSelf: 'flex-start',
    marginBottom: TOKENS.spacing.xs,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: TOKENS.spacing.md,
  },
  tagItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: TOKENS.geometry.radiusPill,
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  tagItemActive: {
    backgroundColor: TOKENS.colors.brand50,
    borderColor: TOKENS.colors.brand500,
  },
  tagText: {
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.xxs,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  tagTextActive: {
    color: TOKENS.colors.brand500,
  },
  reviewTextarea: {
    width: '100%',
    height: 72,
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textMain,
    textAlignVertical: 'top',
    marginBottom: TOKENS.spacing.md,
  },
  submitReviewBtn: {
    width: '100%',
  },
  chatOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: TOKENS.colors.white,
    zIndex: 100,
  },
  chatHeader: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    gap: 8,
  },
  chatBackBtn: {
    padding: TOKENS.spacing.xs,
    marginRight: 4,
  },
  chatHeaderTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  chatScroll: {
    padding: TOKENS.spacing.md,
    gap: 12,
  },
  chatBubbleContainer: {
    width: '100%',
    flexDirection: 'row',
  },
  chatBubbleContainerMe: {
    justifyContent: 'flex-end',
  },
  chatBubbleContainerThem: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  chatBubbleMe: {
    backgroundColor: TOKENS.colors.brand500,
    borderTopRightRadius: 4,
  },
  chatBubbleThem: {
    backgroundColor: TOKENS.colors.surface100,
    borderTopLeftRadius: 4,
  },
  chatBubbleTextMe: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
  },
  chatBubbleTextThem: {
    color: TOKENS.colors.textMain,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
  },
  chatBubbleTimeMe: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: 'bold',
  },
  chatBubbleTimeThem: {
    fontSize: 9,
    color: TOKENS.colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: 'bold',
  },
  chatInputBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom: 10,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 20,
    paddingHorizontal: 16,
    color: TOKENS.colors.textMain,
    fontSize: TOKENS.typography.sizes.sm,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
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
