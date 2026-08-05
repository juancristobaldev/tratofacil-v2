import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Button, Badge, Rating } from '../ui';
import { usePanel } from '../../context/PanelContext';
import { useNotification } from '../../context/NotificationContext';
import type { OrderRealTime } from '../../types/graphql';

export const FocusProviderPanelContent: React.FC = () => {
  const { panelData, closePanel } = usePanel();
  const { showNotification } = useNotification();
  const [quoteHours, setQuoteHours] = useState(1);
  const [quoteTransport, setQuoteTransport] = useState(0);
  const {
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
  } = panelData || {};

  const order = (activeOrder as OrderRealTime) || null;
  const clientName = order?.client?.displayName || 'Cliente';
  const clientAddress = order?.clientAddress || '';
  const clientDescription = order?.clientDescription || '';
  const basePrice = order?.serviceProvider?.price || 0;
  const totalQuote = (quoteHours * basePrice) + (quoteTransport * 1000);
  const clientAvgRating = (order?.client as any)?.reviewsReceived?.length
    ? (order?.client as any).reviewsReceived.reduce((s: number, r: any) => s + r.rating, 0) / (order?.client as any).reviewsReceived.length
    : 0;
  const clientReviewCount = (order?.client as any)?.reviewsReceived?.length || 0;

  const handleSendQuote = async () => {
    if (order?.id && realtime?.quoteOrder) {
      try {
        await realtime.quoteOrder({
          orderRealtimeId: order.id,
          quotedPrice: totalQuote,
          quotedHours: quoteHours,
          quotedTransport: quoteTransport,
        });
        if (setOrderState) setOrderState('WAITING_CLIENT_RESPONSE');
      } catch {
        showNotification({ title: 'Error', message: 'No se pudo enviar la cotización.', type: 'error' });
      }
    }
  };

  const handleAcceptCounterOffer = async () => {
    if (order?.id && realtime?.respondToCounterOffer) {
      try {
        await realtime.respondToCounterOffer(order.id, 'ACCEPTED');
        if (setOrderState) setOrderState('WAITING_CLIENT_RESPONSE');
      } catch {
        showNotification({ title: 'Error', message: 'No se pudo aceptar la contraoferta.', type: 'error' });
      }
    }
  };

  const handleRejectCounterOffer = async () => {
    if (order?.id && realtime?.respondToCounterOffer) {
      try {
        await realtime.respondToCounterOffer(order.id, 'REJECTED');
      } catch {
        showNotification({ title: 'Error', message: 'No se pudo rechazar la contraoferta.', type: 'error' });
      }
    }
  };

  const handleReject = async () => {
    if (order?.id && realtime?.respondRequest) {
      try {
        await realtime.respondRequest(order.id, 'reject');
        closePanel();
      } catch {
        showNotification({ title: 'Error', message: 'No se pudo rechazar la solicitud.', type: 'error' });
      }
    }
  };

  const handleStartWork = async () => {
    if (order?.id && realtime?.startOrder) {
      try {
        await realtime.startOrder(order.id);
        if (setOrderState) setOrderState('IN_PROGRESS');
      } catch {
        showNotification({ title: 'Error', message: 'No se pudo iniciar el trabajo.', type: 'error' });
      }
    }
  };

  const handleCompleteWork = async () => {
    if (order?.id && realtime?.finishOrder) {
      try {
        await realtime.finishOrder(order.id);
        if (setOrderState) setOrderState('COMPLETED');
      } catch {
        showNotification({ title: 'Error', message: 'No se pudo completar el trabajo.', type: 'error' });
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.sheetBody}>
        {orderState === 'VIEW_REQUEST' && (
          <View style={styles.viewRequestContainer}>
            <View style={styles.clientCard}>
              <Avatar uri={null} name={clientName} size={48} />
              <View style={styles.clientCardInfo}>
                <Text style={styles.clientName}>{clientName}</Text>
                <View style={styles.ratingRow}>
                  <Rating rating={clientAvgRating} size={14} showText textSuffix="Cliente" reviewsCount={clientReviewCount} />
                </View>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Detalles del problema</Text>
              <Text style={styles.detailText}>{clientDescription || 'Sin descripción'}</Text>
            </View>

            {order?.counterOfferPrice != null && (
              <View style={styles.counterOfferCard}>
                <Badge label="CONTRAOFERTA" tone="warning" />
                <Text style={styles.counterOfferPrice}>
                  ${order.counterOfferPrice.toLocaleString('es-CL')}
                </Text>
                <Text style={styles.counterOfferDetail}>
                  {order.counterOfferHours}h / {order.counterOfferTransport}km
                </Text>
                <View style={styles.actionRow}>
                  <Button
                    title="Rechazar"
                    variant="outline"
                    onPress={handleRejectCounterOffer}
                    style={styles.actionRowBtn}
                  />
                  <Button
                    title="Aceptar"
                    onPress={handleAcceptCounterOffer}
                    style={styles.actionRowBtn}
                  />
                </View>
              </View>
            )}

            {order?.counterOfferPrice == null && (
              <>
                <View style={styles.priceAdjusterContainer}>
                  <Text style={styles.priceAdjusterLabel}>Cotización del servicio</Text>
                  <View style={styles.quoteRow}>
                    <View style={styles.quoteField}>
                      <Text style={styles.quoteFieldLabel}>Horas</Text>
                      <View style={styles.priceAdjusterRow}>
                        <TouchableOpacity
                          onPress={() => setQuoteHours((h) => Math.max(1, h - 1))}
                          style={styles.adjusterBtnSmall}
                        >
                          <Icon name="Minus" size={18} color={TOKENS.colors.textMain} />
                        </TouchableOpacity>
                        <Text style={styles.quoteFieldValue}>{quoteHours}</Text>
                        <TouchableOpacity
                          onPress={() => setQuoteHours((h) => Math.min(6, h + 1))}
                          style={styles.adjusterBtnSmall}
                        >
                          <Icon name="Plus" size={18} color={TOKENS.colors.textMain} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.quoteField}>
                      <Text style={styles.quoteFieldLabel}>Km</Text>
                      <View style={styles.priceAdjusterRow}>
                        <TouchableOpacity
                          onPress={() => setQuoteTransport((t) => Math.max(0, t - 1))}
                          style={styles.adjusterBtnSmall}
                        >
                          <Icon name="Minus" size={18} color={TOKENS.colors.textMain} />
                        </TouchableOpacity>
                        <Text style={styles.quoteFieldValue}>{quoteTransport}</Text>
                        <TouchableOpacity
                          onPress={() => setQuoteTransport((t) => t + 1)}
                          style={styles.adjusterBtnSmall}
                        >
                          <Icon name="Plus" size={18} color={TOKENS.colors.textMain} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total a Cobrar</Text>
                    <Text style={styles.totalValue}>${totalQuote.toLocaleString('es-CL')}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Button
                    title="Rechazar"
                    variant="outline"
                    onPress={handleReject}
                    style={styles.actionRowBtn}
                  />
                  <Button
                    title="Enviar cotización"
                    onPress={handleSendQuote}
                    style={styles.actionRowBtn}
                  />
                </View>
              </>
            )}
          </View>
        )}

        {orderState === 'WAITING_CLIENT_RESPONSE' && (
          <View style={styles.waitingContainer}>
            {order?.counterOfferPrice != null && (
              <View style={styles.counterOfferCard}>
                <Badge label="CONTRAOFERTA DEL CLIENTE" tone="warning" />
                <Text style={styles.counterOfferPrice}>
                  ${order.counterOfferPrice.toLocaleString('es-CL')}
                </Text>
                <Text style={styles.counterOfferDetail}>
                  {order.counterOfferHours}h / {order.counterOfferTransport}km
                </Text>
                <View style={styles.actionRow}>
                  <Button title="Rechazar" variant="outline" onPress={handleRejectCounterOffer} style={styles.actionRowBtn} />
                  <Button title="Aceptar" onPress={handleAcceptCounterOffer} style={styles.actionRowBtn} />
                </View>
              </View>
            )}
            <Icon name="Clock" size={48} color={TOKENS.colors.brand500} />
            <Text style={styles.waitingTitle}>Cotización enviada</Text>
            <Text style={styles.waitingDesc}>Esperando respuesta del cliente...</Text>
            <Button
              title="Actualizar Cotización"
              variant="outline"
              onPress={handleSendQuote}
              style={styles.actionBtn}
            />
          </View>
        )}

        {orderState === 'EN_CAMINO' && (
          <>
            <View style={styles.stateHeader}>
              <Badge label="DIRIGIÉNDOSE AL CLIENTE" tone="brand" />
              <Text style={styles.etaText}>{etaRemaining || '...'} ({distanceRemaining || '...'})</Text>
            </View>

            <View style={styles.clientCard}>
              <Avatar uri={null} name={clientName} size={48} />
              <View style={styles.clientCardInfo}>
                <Text style={styles.clientName}>{clientName}</Text>
                <Text style={styles.clientAddress} numberOfLines={1}>{clientAddress || 'Ubicación'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowChat?.(true)} style={styles.chatIconBtnSmall}>
                <Icon name="MessageCircle" size={20} color={TOKENS.colors.brand600} />
              </TouchableOpacity>
            </View>

            <Text style={styles.guideText}>Conduce hacia la ubicación del cliente para iniciar el servicio.</Text>
          </>
        )}

        {orderState === 'ARRIVED' && (
          <>
            <View style={styles.stateHeader}>
              <Badge label="LLEGADO AL DESTINO" tone="success" />
              <Text style={styles.etaText}>Listo para iniciar trabajo</Text>
            </View>

            <View style={styles.clientCard}>
              <Avatar uri={null} name={clientName} size={48} />
              <View style={styles.clientCardInfo}>
                <Text style={styles.clientName}>{clientName}</Text>
                <Text style={styles.clientAddress}>Se encuentra esperando tu llegada</Text>
              </View>
              <TouchableOpacity onPress={() => setShowChat?.(true)} style={styles.chatIconBtnSmall}>
                <Icon name="MessageCircle" size={20} color={TOKENS.colors.brand600} />
              </TouchableOpacity>
            </View>

            <Button
              title="Iniciar Trabajo"
              onPress={handleStartWork}
              style={styles.actionBtn}
            />
          </>
        )}

        {orderState === 'IN_PROGRESS' && (
          <>
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Tiempo transcurrido</Text>
              <Text style={styles.timerVal}>{formatTimer ? formatTimer(workSeconds) : '00:00'}</Text>
            </View>

            <Text style={styles.workingDesc}>{clientDescription || 'Servicio en curso'}</Text>

            <Button
              title="Abrir Chat"
              variant="outline"
              icon="MessageCircle"
              onPress={() => setShowChat?.(true)}
              style={styles.actionBtn}
            />

            <Button
              title="Completar Trabajo"
              onPress={handleCompleteWork}
              style={styles.actionBtn}
            />
          </>
        )}

        {orderState === 'COMPLETED' && (
          <>
            <View style={styles.completedContainer}>
              <View style={styles.checkCircle}>
                <Icon name="Check" size={28} color={TOKENS.colors.white} />
              </View>
              <Text style={styles.completedTitle}>¡Servicio Completado!</Text>
              <Text style={styles.completedSub}>Has ganado ${(order?.quotedPrice || 0).toLocaleString('es-CL')}</Text>
            </View>

            <Button
              title="Volver al Panel"
              onPress={handleFinish}
              style={styles.actionBtn}
            />
          </>
        )}

        {orderState === 'CANCELLED' && (
          <>
            <View style={styles.completedContainer}>
              <View style={[styles.checkCircle, { backgroundColor: TOKENS.colors.textSubtle }]}>
                <Icon name="X" size={28} color={TOKENS.colors.white} />
              </View>
              <Text style={styles.completedTitle}>Servicio Cancelado</Text>
              <Text style={styles.completedSub}>Esta solicitud ha sido cancelada o rechazada.</Text>
            </View>

            <Button
              title="Volver al Panel"
              onPress={handleFinish}
              style={styles.actionBtn}
            />
          </>
        )}
      </ScrollView>
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
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  etaText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 16,
    padding: 12,
    marginBottom: TOKENS.spacing.md,
  },
  clientCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  clientAddress: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  guideText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  actionBtn: {
    width: '100%',
    marginTop: 12,
  },
  timerContainer: {
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
  completedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.colors.statusSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    marginBottom: 12,
  },
  viewRequestContainer: {
    gap: TOKENS.spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailSection: {
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  detailTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 8,
  },
  detailText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    lineHeight: 20,
  },
  priceAdjusterContainer: {
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.md,
  },
  priceAdjusterLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 16,
  },
  priceAdjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjusterBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjusterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceAdjusterValue: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand600,
    minWidth: 140,
    textAlign: 'center',
  },
  quoteRow: {
    flexDirection: 'row',
    gap: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.lg,
  },
  quoteField: {
    alignItems: 'center',
    gap: 8,
  },
  quoteFieldLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
  },
  quoteFieldValue: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    minWidth: 32,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: TOKENS.colors.brand50,
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.geometry.radiusInput,
    marginBottom: TOKENS.spacing.sm,
  },
  totalLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },
  totalValue: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand700,
  },
  counterOfferCard: {
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
  },
  counterOfferPrice: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  counterOfferDetail: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  actionRow: {
    flexDirection: 'row',
    gap: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
  },
  actionRowBtn: {
    flex: 1,
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
  chatIconBtnSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
  },
});
