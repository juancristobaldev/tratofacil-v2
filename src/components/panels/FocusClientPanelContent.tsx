import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Button, Badge } from '../ui';
import { WEB_CALLBACK_URL, START_ORDER_DISTANCE_KM } from '../../config/endpoints';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';
import { useNotification } from '../../context/NotificationContext';
import { usePanel } from '../../context/PanelContext';
import type { OrderRealTime } from '../../types/graphql';

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const FocusClientPanelContent: React.FC = () => {
  const { panelData, clearPanel } = usePanel();
  const { showNotification } = useNotification();
  const {
    order,
    provider,
    etaRemaining,
    distanceRemaining,
    userLat,
    userLng,
    distanceToProvider: liveDistanceToProvider,
    realtime,
    setShowChat,
    handleFinishReview,
  } = panelData || {};

  const activeOrder = (order as OrderRealTime) || null;
  const clientPrice = activeOrder?.quotedPrice || 0;
  const status = activeOrder?.status || 'PENDING';

  const [serviceElapsed, setServiceElapsed] = useState('00:00');
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(activeOrder?.quotedPrice || 0);
  const [counterOfferSent, setCounterOfferSent] = useState(false);
  const prevCounterOfferRef = useRef<number | null | undefined>(undefined);
  const prevNegotiatedPriceRef = useRef<number>(activeOrder?.quotedPrice || 0);

  useEffect(() => {
    const hadCounterOffer = prevCounterOfferRef.current != null;
    const counterOfferCleared = activeOrder?.counterOfferPrice == null;

    if (hadCounterOffer && counterOfferCleared && counterOfferSent) {
      setCounterOfferSent(false);
      const priceChanged = activeOrder?.quotedPrice !== prevCounterOfferRef.current;
      if (priceChanged) {
        setNegotiatedPrice(activeOrder?.quotedPrice || 0);
      } else {
        showNotification({ title: 'Contraoferta rechazada', message: 'El profesional rechazó tu contraoferta. Puedes enviar una nueva oferta.', type: 'error' });
      }
    } else if (activeOrder?.quotedPrice && activeOrder.quotedPrice !== prevNegotiatedPriceRef.current) {
      setNegotiatedPrice(activeOrder.quotedPrice);
      if (!counterOfferSent) setCounterOfferSent(false);
    }

    prevCounterOfferRef.current = activeOrder?.counterOfferPrice;
    prevNegotiatedPriceRef.current = activeOrder?.quotedPrice || 0;
  }, [activeOrder?.quotedPrice, activeOrder?.counterOfferPrice]);

  const providerLat = activeOrder?.providerLat;
  const providerLng = activeOrder?.providerLng;

  const distanceToProvider = useMemo(() => {
    if (liveDistanceToProvider != null) return liveDistanceToProvider;
    if (userLat == null || userLng == null || providerLat == null || providerLng == null) return null;
    return getDistanceKm(userLat, userLng, providerLat, providerLng);
  }, [liveDistanceToProvider, userLat, userLng, providerLat, providerLng]);

  const canStartOrder = status === 'ACCEPTED' && distanceToProvider !== null && distanceToProvider <= START_ORDER_DISTANCE_KM;

  useEffect(() => {
    if (status !== 'IN_PROGRESS' || !activeOrder?.startedAt) return;
    const interval = setInterval(() => {
      const sec = Math.floor((Date.now() - new Date(activeOrder.startedAt!).getTime()) / 1000);
      const mm = Math.floor(sec / 60).toString().padStart(2, '0');
      const ss = (sec % 60).toString().padStart(2, '0');
      setServiceElapsed(`${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [status, activeOrder?.startedAt]);

  const handlePay = async () => {
    if (!activeOrder?.id || !realtime?.initPayment) return;
    try {
      const result = await realtime.initPayment(activeOrder.id, `${WEB_CALLBACK_URL}?type=realtime&source=mobile`);
      if (result?.url) {
        await Linking.openURL(result.url);
      }
    } catch {}
  };

  const handleCancel = async () => {
    if (activeOrder?.id && realtime?.cancelOrder) {
      try {
        await realtime.cancelOrder(activeOrder.id);
        clearPanel();
      } catch {}
    }
  };

  const handleRejectQuote = () => {
    if (activeOrder?.id && realtime?.rejectQuote) {
      realtime.rejectQuote(activeOrder.id).catch(() => {});
    }
  };

  const handleStartOrder = () => {
    if (activeOrder?.id && realtime?.startOrder) {
      realtime.startOrder(activeOrder.id).catch(() => {});
    }
  };



  if (!provider) return null;


  console.log({status})
  return (
    <View style={styles.container}>
      {/* PENDING — Esperando cotización */}
      

      {/* QUOTED — Quote recibida */}
      {status === 'QUOTED' && (
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Avatar uri={provider.avatar} name={provider.name} size={64} />
              <View style={[styles.sheetHeaderText, { marginLeft: 16 }]}>
                <Text style={styles.sheetTitle}>{provider.name}</Text>
                <View style={styles.ratingRow}>
                  <Rating rating={provider.rating} size={14} showText textSuffix="reseñas" reviewsCount={provider.reviewsCount} />
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowChat?.(true)} style={styles.chatIconBtnSmall}>
                <Icon name="MessageSquare" size={20} color={TOKENS.colors.brand500} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Icon name="Clock" size={16} color={TOKENS.colors.textSubtle} />
              <Text style={styles.infoLabel}>Llegada estimada</Text>
              <Text style={styles.infoValue}>{etaRemaining || '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="MapPin" size={16} color={TOKENS.colors.textSubtle} />
              <Text style={styles.infoLabel}>Distancia</Text>
              <Text style={styles.infoValue}>{distanceRemaining || '...'}</Text>
            </View>
          </View>

          <View style={styles.serviceDetail}>
            <Text style={styles.serviceDetailTitle}>Servicio</Text>
            <Text style={styles.serviceDetailName}>{activeOrder?.serviceProvider?.service?.name || provider?.serviceName || 'Servicio'}</Text>
            <Text style={styles.serviceDetailDesc}>{activeOrder?.clientDescription || provider?.description || 'Servicio solicitado'}</Text>
          </View>

          {/* Price row + Negotiation adjuster */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Cotización del profesional</Text>
            <Text style={styles.priceValue}>${(activeOrder?.quotedPrice || 0).toLocaleString('es-CL')}</Text>
          </View>

          {counterOfferSent ? (
            <View style={styles.waitingContainer}>
              <Icon name="Clock" size={32} color={TOKENS.colors.brand500} />
              <Text style={styles.waitingTitle}>Contraoferta enviada</Text>
              <Text style={styles.waitingDesc}>Esperando respuesta del profesional...</Text>
            </View>
          ) : (
            <>
              <View style={styles.negotiateRow}>
                <Text style={styles.negotiateLabel}>Tu contraoferta</Text>
                <View style={styles.adjusterRow}>
                  <TouchableOpacity
                    onPress={() => setNegotiatedPrice((p) => Math.max(5000, p - 1000))}
                    style={styles.adjusterBtn}
                  >
                    <Icon name="Minus" size={20} color={TOKENS.colors.textMain} />
                  </TouchableOpacity>
                  <Text style={styles.adjusterPrice}>${negotiatedPrice.toLocaleString('es-CL')}</Text>
                  <TouchableOpacity
                    onPress={() => setNegotiatedPrice((p) => p + 1000)}
                    style={styles.adjusterBtn}
                  >
                    <Icon name="Plus" size={20} color={TOKENS.colors.textMain} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ gap: 12 }}>
                {negotiatedPrice !== (activeOrder?.quotedPrice || 0) ? (
                  <Button
                    title="Enviar contraoferta"
                    onPress={async () => {
                      if (!activeOrder?.id || !realtime?.clientCounterOffer) return;
                      try {
                        await realtime.clientCounterOffer(
                          activeOrder.id,
                          negotiatedPrice,
                          activeOrder.quotedHours || 1,
                          activeOrder.quotedTransport || 0,
                        );
                        setCounterOfferSent(true);
                      } catch {
                        showNotification({ title: 'Error', message: 'No se pudo enviar la contraoferta.', type: 'error' });
                      }
                    }}
                    style={styles.payBtn}
                  />
                ) : (
                  <Button title="Pagar ahora" onPress={handlePay} style={styles.payBtn} />
                )}
                <Button title="Rechazar cotización" variant="secondary" onPress={handleRejectQuote} />
                <Button title="Cancelar orden" variant="outline" onPress={handleCancel} />
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ACCEPTED — En camino / Listo para iniciar */}
      {status === 'ACCEPTED' && (
        <ScrollView contentContainerStyle={styles.sheetBody}>
          {canStartOrder ? (
            <>
              <Badge label="LLEGÓ" tone="success" />
              <Text style={{ fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginTop: 8 }}>Listo para iniciar</Text>
              <Button title="Confirmar inicio de servicio" onPress={handleStartOrder} style={styles.confirmStartBtn} />
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>Tu prestador va en camino</Text>
              <View style={styles.etaContainer}>
                <Text style={styles.etaLabel}>Tiempo estimado de llegada</Text>
                <Text style={styles.etaVal}>{etaRemaining || '...'}</Text>
              </View>
              <Text style={styles.trackerText}>
                {distanceToProvider !== null
                  ? `Está a ${(distanceToProvider * 1000).toFixed(0)}m de tu ubicación`
                  : 'Acercándose a tu ubicación'}
              </Text>
              <Button title="Cancelar orden" variant="outline" onPress={handleCancel} />
            </>
          )}
        </ScrollView>
      )}

      {/* IN_PROGRESS — Servicio en curso */}
      {status === 'IN_PROGRESS' && (
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerLabel}>Tiempo de servicio</Text>
            <Text style={styles.timerVal}>{serviceElapsed}</Text>
          </View>
          <Text style={styles.workingDesc}>
            {provider.name} está trabajando en tu servicio
          </Text>
        </ScrollView>
      )}

      {/* COMPLETED — Calificar */}
     
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheetBody: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: TOKENS.spacing.md,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: TOKENS.spacing.md,
  },
  infoRow: {
    flex: 1,
  },
  infoLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
  },
  infoValue: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.bold,
  },
  serviceDetail: {
    marginBottom: TOKENS.spacing.md,
  },
  serviceDetailTitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginBottom: 4,
  },
  serviceDetailName: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.bold,
    marginBottom: 2,
  },
  serviceDetailDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
  },
  priceLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
  },
  priceValue: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  payBtn: {
    flex: 1,
  },
  etaContainer: {
    alignItems: 'center',
    marginBottom: TOKENS.spacing.lg,
  },
  etaLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  etaVal: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  confirmStartBtn: {
    width: '100%',
    marginTop: 12,
  },
  timerHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerVal: {
    fontSize: 32,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    marginTop: 2,
  },
  workingDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  confirmFinishedBtn: {
    width: '100%',
  },
  reviewSheetBody: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.xl,
  },
  reviewTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
  },
  reviewSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginTop: 2,
  },
  reviewRatingStars: {
    alignSelf: 'center',
    marginVertical: TOKENS.spacing.md,
  },
  reviewTextarea: {
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface50,
    padding: 10,
    height: 60,
    textAlignVertical: 'top',
    fontSize: 12,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  submitReviewBtn: {
    width: '100%',
  },
  chatIconBtnSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  waitingTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  waitingDesc: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
  },
  trackerText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  negotiateRow: {
    marginBottom: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
  },
  negotiateLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.sm,
    textAlign: 'center',
  },
  adjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: TOKENS.spacing.lg,
  },
  adjusterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  adjusterPrice: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    minWidth: 140,
    textAlign: 'center',
  },
});
