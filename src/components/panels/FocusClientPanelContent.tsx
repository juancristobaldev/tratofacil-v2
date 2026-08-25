import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { BottomSheetScrollView } from '../../bottom-sheet/primitives';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Button, Badge, PaymentActionCards } from '../ui';
import type { PaymentMethod } from '../ui';
import { START_ORDER_DISTANCE_KM, DEEP_LINK_CALLBACK, REGISTER_CARD_CALLBACK_URL } from '../../config/endpoints';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useFocusSession } from '../../features/focus-session/useFocusSession';
import { bottomSheetDebug, nextBottomSheetActionId } from '../../bottom-sheet/core/bottomSheet.debug';
import type { SheetComponentProps } from '../../bottom-sheet/core/bottomSheet.types';

export const FocusClientPanelContent: React.FC<SheetComponentProps<'focus_client'>> = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const { registerCard } = usePlans();
  const session = useFocusSession('client');
  const {
    activeOrder,
    provider,
    distanceLabel,
    etaLabel,
    distanceToProviderKm,
    realtime,
    setShowChat,
  } = session;

  const hasCard = Boolean(user?.cardActive && user?.last4CardDigits && user?.creditCardType);
  const cardBrand = user?.creditCardType || 'Tarjeta';
  const cardLast4 = user?.last4CardDigits || '****';

  const [counterOfferPrice, setCounterOfferPrice] = useState<number | null>(null);
  const [registering, setRegistering] = useState(false);

  const status = activeOrder?.status || 'PENDING';
  const etaRemaining = etaLabel || '...';
  const distanceRemaining = distanceLabel || '...';

  const [serviceElapsed, setServiceElapsed] = useState('00:00');
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(activeOrder?.quotedPrice || 0);
  const [counterOfferSent, setCounterOfferSent] = useState(false);
  const [isPayingCard, setIsPayingCard] = useState(false);
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
  }, [activeOrder?.quotedPrice, activeOrder?.counterOfferPrice, counterOfferSent, showNotification]);

  const distanceToProvider = distanceToProviderKm;

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
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'PAY_NOW', origin: 'FOCUS_CLIENT' });
    if (!activeOrder?.id || !realtime?.initPayment) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_client', action: 'PAY_NOW', reason: !activeOrder?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_client', action: 'PAY_NOW', target: 'payment_url' });
    try {
      const result = await realtime.initPayment(activeOrder.id, `${DEEP_LINK_CALLBACK}?type=realtime`);
      if (result?.url) {
        await Linking.openURL(result.url);
      }
    } catch {}
  };

  const handlePaySavedCard = async () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'PAY_SAVED_CARD', origin: 'FOCUS_CLIENT' });
    if (!activeOrder?.id || !realtime?.payWithSavedCard) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_client', action: 'PAY_SAVED_CARD', reason: !activeOrder?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_client', action: 'PAY_SAVED_CARD', target: 'direct_charge' });
    setIsPayingCard(true);
    try {
      await realtime.payWithSavedCard(activeOrder.id);
      showNotification({
        title: 'Pago exitoso',
        message: 'Tu pago ha sido procesado con tu tarjeta vinculada.',
        type: 'success',
      });
    } catch (err: any) {
      showNotification({
        title: 'Error de pago',
        message: err?.message || 'No se pudo cobrar a tu tarjeta. Puedes intentar con Webpay.',
        type: 'error',
      });
    } finally {
      setIsPayingCard(false);
    }
  };

  const handleRegisterCard = async () => {
    if (registering) return;
    setRegistering(true);
    try {
      const result = await registerCard(REGISTER_CARD_CALLBACK_URL);
      if (result?.alreadyRegistered) {
        showNotification({ title: 'Tarjeta', message: 'Ya tienes una tarjeta vinculada.', type: 'info' });
      } else if (result?.url) {
        await Linking.openURL(result.url);
      } else {
        showNotification({ title: 'Error', message: 'No se pudo iniciar el registro de la tarjeta.', type: 'error' });
      }
    } catch (err: any) {
      showNotification({ title: 'Error', message: err?.message || 'Error al vincular tarjeta.', type: 'error' });
    } finally {
      setRegistering(false);
    }
  };


  const handleCancel = async () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'CANCEL_ORDER', origin: 'FOCUS_CLIENT' });
    if (!activeOrder?.id || !realtime?.cancelOrder) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_client', action: 'CANCEL_ORDER', reason: !activeOrder?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_client', action: 'CANCEL_ORDER', result: 'cancel_order' });
    try {
      await realtime.cancelOrder(activeOrder.id);
      showNotification({ title: 'Orden cancelada', message: 'Has cancelado la solicitud.', type: 'info' });
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo cancelar la orden.', type: 'error' });
    }
  };

  const handleRejectQuote = () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'REJECT_QUOTE', origin: 'FOCUS_CLIENT' });
    if (!activeOrder?.id || !realtime?.rejectQuote) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_client', action: 'REJECT_QUOTE', reason: !activeOrder?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_client', action: 'REJECT_QUOTE', result: 'reject_quote' });
    realtime.rejectQuote(activeOrder.id).catch(() => {});
  };

  const handleStartOrder = () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'CONFIRM_START', origin: 'FOCUS_CLIENT' });
    if (!activeOrder?.id || !realtime?.startOrder) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_client', action: 'CONFIRM_START', reason: !activeOrder?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_client', action: 'CONFIRM_START', result: 'start_order' });
    realtime.startOrder(activeOrder.id).catch(() => {});
  };



  if (!provider) {
    return (
      <BottomSheetScrollView style={styles.container} contentContainerStyle={styles.emptyStateBody}>
        <View style={styles.emptyStateIcon}>
          <Icon name="Clock" size={28} color={TOKENS.colors.brand500} />
        </View>
        <Text style={styles.emptyStateTitle}>Preparando seguimiento</Text>
        <Text style={styles.emptyStateText}>
          Estamos sincronizando la información del profesional para esta orden.
        </Text>
      </BottomSheetScrollView>
    );
  }


  if (__DEV__) console.log({status})
  return (
    <BottomSheetScrollView
      style={styles.container}
      contentContainerStyle={styles.sheetBody}
      showsVerticalScrollIndicator={true}
      bounces={true}
    >
      {/* QUOTED — Quote recibida */}
      {status === 'QUOTED' && (
        <View style={styles.quotedContainer}>
          {/* Header unificado del profesional con ETA y Chat */}
          <View style={styles.providerCardHeaderCompact}>
            <Avatar uri={provider.avatar} name={provider.name} size={46} />
            <View style={styles.sheetHeaderText}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{provider.name}</Text>
              <Text style={styles.serviceSubtitle} numberOfLines={1}>
                {activeOrder?.serviceProvider?.service?.name || provider?.serviceName || 'Servicio'}
              </Text>
              <View style={styles.ratingAndEtaRow}>
                <Rating rating={provider.rating ?? 0} size={12} showText reviewsCount={provider.reviewsCount} />
                <View style={styles.etaInlineBadge}>
                  <Icon name="Clock" size={12} color={TOKENS.colors.brand600} />
                  <Text style={styles.etaInlineText}>{etaRemaining || '...'} ({distanceRemaining || '...'})</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                const actionId = nextBottomSheetActionId();
                bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'OPEN_CHAT', origin: 'FOCUS_CLIENT' });
                bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_client', action: 'OPEN_CHAT', target: 'chat_overlay' });
                setShowChat(true);
              }}
              style={styles.chatIconBtnSmall}
              accessibilityLabel="Abrir chat con el profesional"
              accessibilityRole="button"
            >
              <Icon name="MessageSquare" size={16} color={TOKENS.colors.brand700} />
            </TouchableOpacity>
          </View>

          {Boolean(activeOrder?.clientDescription || provider?.description) && (
            <View style={styles.serviceDetailCompact}>
              <Text style={styles.serviceDetailDesc} numberOfLines={2}>
                {activeOrder?.clientDescription || provider?.description}
              </Text>
            </View>
          )}

          {/* Bloque integrado de Cotización y Contraoferta */}
          <View style={styles.pricingCard}>
            <View style={styles.priceHeaderRow}>
              <Text style={styles.priceLabel}>Cotización del profesional</Text>
              <Text style={styles.priceValue}>${(activeOrder?.quotedPrice || 0).toLocaleString('es-CL')}</Text>
            </View>

            {counterOfferSent ? (
              <View style={styles.waitingContainerCompact}>
                <Icon name="Clock" size={32} color={TOKENS.colors.brand500} />
                <Text style={styles.waitingTitle}>Contraoferta enviada</Text>
                <Text style={styles.waitingDesc}>Esperando respuesta del profesional...</Text>
                <Button title="Cancelar orden" variant="outline" onPress={handleCancel} style={styles.cancelOrderBtn} />
              </View>
            ) : (
              <>
                <View style={styles.negotiateRowCompact}>
                  <Text style={styles.negotiateLabel}>Tu contraoferta</Text>
                  <View style={styles.adjusterRowCompact}>
                    <TouchableOpacity
                      onPress={() => setNegotiatedPrice((p) => Math.max(5000, p - 1000))}
                      style={styles.adjusterBtnSmall}
                      accessibilityLabel="Disminuir monto de contraoferta"
                      accessibilityHint="Resta 1000 pesos a tu propuesta"
                      accessibilityRole="button"
                    >
                      <Icon name="Minus" size={16} color={TOKENS.colors.dark900} />
                    </TouchableOpacity>
                    <Text style={styles.adjusterPriceCompact}>${negotiatedPrice.toLocaleString('es-CL')}</Text>
                    <TouchableOpacity
                      onPress={() => setNegotiatedPrice((p) => p + 1000)}
                      style={styles.adjusterBtnSmall}
                      accessibilityLabel="Aumentar monto de contraoferta"
                      accessibilityHint="Suma 1000 pesos a tu propuesta"
                      accessibilityRole="button"
                    >
                      <Icon name="Plus" size={16} color={TOKENS.colors.dark900} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.actionsContainerCompact}>
                  {negotiatedPrice !== (activeOrder?.quotedPrice || 0) ? (
                    <>
                      <Button
                        title="Enviar contraoferta"
                        onPress={async () => {
                          const actionId = nextBottomSheetActionId();
                          bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'SEND_COUNTEROFFER', origin: 'FOCUS_CLIENT', payload: { quotedPrice: negotiatedPrice, quotedHours: activeOrder?.quotedHours || 1, quotedTransport: activeOrder?.quotedTransport || 0 } });
                          if (!activeOrder?.id || !realtime?.clientCounterOffer) {
                            bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_client', action: 'SEND_COUNTEROFFER', reason: !activeOrder?.id ? 'missing_active_order' : 'missing_realtime_executor' });
                            return;
                          }
                          bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_client', action: 'SEND_COUNTEROFFER', result: 'send_counteroffer' });
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
                      <Button
                        title="Cancelar orden"
                        variant="subtle"
                        size="md"
                        onPress={handleCancel}
                        style={{ marginTop: 8 }}
                      />
                    </>
                  ) : (
                    <>
                      <PaymentActionCards
                        hasCard={hasCard}
                        cardBrand={cardBrand}
                        cardLast4={cardLast4}
                        onPayWithSavedCard={handlePaySavedCard}
                        onRegisterCard={handleRegisterCard}
                        onPayWithFlow={handlePay}
                        isProcessing={isPayingCard || registering}
                        activeAction={isPayingCard ? 'saved_card' : registering ? 'register_card' : null}
                      />

                      <View style={styles.quotedSecondaryActionsStack}>
                        <Button
                          title="Rechazar cotización"
                          variant="subtle"
                          size="md"
                          disabled={isPayingCard || registering}
                          onPress={handleRejectQuote}
                        />
                        <Button
                          title="Cancelar orden"
                          variant="ghost"
                          size="sm"
                          disabled={isPayingCard || registering}
                          onPress={handleCancel}
                          textStyle={{ color: TOKENS.colors.error600 }}
                        />
                      </View>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* ACCEPTED — En camino / Listo para iniciar */}
      {status === 'ACCEPTED' && (
        <View style={styles.sheetBody}>
          {canStartOrder ? (
            <View style={styles.arrivalCard}>
              <Badge label="LLEGÓ AL DOMICILIO" tone="success" />
              <Text style={styles.arrivalTitle}>Listo para iniciar servicio</Text>
              <Text style={styles.arrivalSubtitle}>El profesional se encuentra en tu dirección.</Text>
              <Button title="Confirmar inicio de servicio" onPress={handleStartOrder} style={styles.confirmStartBtn} />
              <Button
                title="Cancelar orden"
                variant="subtle"
                size="md"
                onPress={handleCancel}
                style={{ marginTop: 8 }}
              />
            </View>
          ) : (
            <>
              <View style={styles.etaHighlightCard}>
                <Text style={styles.etaLabelSmall}>Llegada estimada</Text>
                <Text style={styles.etaValBig}>{etaRemaining || '...'}</Text>
                <Text style={styles.etaSubText}>
                  {distanceToProvider !== null
                    ? `A ${(distanceToProvider * 1000).toFixed(0)}m de tu ubicación`
                    : 'Acercándose a tu domicilio'}
                </Text>
              </View>
              
              <View style={styles.providerCardHeader}>
                <Avatar uri={provider.avatar} name={provider.name} size={48} />
                <View style={styles.sheetHeaderText}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>{provider.name}</Text>
                  <View style={styles.ratingRow}>
                    <Rating rating={provider.rating ?? 0} size={13} showText reviewsCount={provider.reviewsCount} />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const actionId = nextBottomSheetActionId();
                    bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'OPEN_CHAT', origin: 'FOCUS_CLIENT' });
                    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_client', action: 'OPEN_CHAT', target: 'chat_overlay' });
                    setShowChat(true);
                  }}
                  style={styles.chatIconBtnSmall}
                >
                  <Icon name="MessageSquare" size={18} color={TOKENS.colors.brand700} />
                </TouchableOpacity>
              </View>

              <Button
                title="Cancelar servicio"
                variant="subtle"
                size="md"
                onPress={handleCancel}
                style={{ marginTop: 8 }}
              />
            </>
          )}
        </View>
      )}

      {/* IN_PROGRESS — Servicio en curso */}
      {status === 'IN_PROGRESS' && (
        <View style={styles.sheetBody}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerLabel}>Tiempo de servicio</Text>
            <Text style={styles.timerVal}>{serviceElapsed}</Text>
          </View>
          <Text style={styles.workingDesc}>
            {provider.name} está realizando el trabajo en tu domicilio.
          </Text>
          <Button
            title="Abrir Chat"
            variant="secondary"
            icon="MessageCircle"
            onPress={() => {
              const actionId = nextBottomSheetActionId();
              bottomSheetDebug('ACTION', { actionId, key: 'focus_client', action: 'OPEN_CHAT', origin: 'FOCUS_CLIENT' });
              setShowChat(true);
            }}
            style={styles.chatActionBtn}
          />
          <Button
            title="Cancelar servicio"
            variant="subtle"
            size="md"
            onPress={handleCancel}
            style={{ marginTop: 8 }}
          />
        </View>
      )}
    </BottomSheetScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    paddingTop: TOKENS.spacing.xs,
  },
  sheetBody: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: 36,
  },
  providerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 14,
    marginBottom: TOKENS.spacing.md,
    ...TOKENS.shadows.soft,
  },
  sheetHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  sheetTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  chatIconBtnSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: TOKENS.spacing.md,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  infoLabel: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.dark900,
    fontWeight: TOKENS.typography.weights.bold,
    marginTop: 1,
  },
  serviceDetail: {
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 16,
    padding: 14,
    marginBottom: TOKENS.spacing.md,
  },
  serviceDetailTitle: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    fontWeight: TOKENS.typography.weights.bold,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  serviceDetailName: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.dark900,
    fontWeight: TOKENS.typography.weights.bold,
    marginBottom: 2,
  },
  serviceDetailDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 16,
    padding: 14,
    marginBottom: TOKENS.spacing.md,
  },
  priceLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  priceValue: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand800,
  },
  payBtn: {
    width: '100%',
  },
  quotedSecondaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 8,
  },
  ghostActionBtn: {
    flex: 1,
    minHeight: 40,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 4,
  },
  ghostActionBtnText: {
    fontSize: TOKENS.typography.sizes.xs + 1,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
  ghostActionBtnTextDanger: {
    fontSize: TOKENS.typography.sizes.xs + 1,
    color: TOKENS.colors.error600,
    fontWeight: TOKENS.typography.weights.medium,
  },
  actionDividerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TOKENS.colors.surface300,
  },
  subtleCancelBtn: {
    width: '100%',
    minHeight: 40,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  subtleCancelText: {
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.xs + 1,
    fontWeight: TOKENS.typography.weights.medium,
  },
  cancelActionBtn: {
    width: '100%',
    height: 48,
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionBtnText: {
    color: TOKENS.colors.textSubtle,
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.medium,
  },
  etaHighlightCard: {
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  etaLabelSmall: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  etaValBig: {
    fontSize: 32,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand500,
    letterSpacing: -0.5,
  },
  etaSubText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
    fontWeight: TOKENS.typography.weights.medium,
  },
  arrivalCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  arrivalTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    marginTop: 4,
  },
  arrivalSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmStartBtn: {
    width: '100%',
    marginBottom: 8,
  },
  timerHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 18,
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
    fontSize: 34,
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
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    borderRadius: 14,
  },
  chatActionBtnText: {
    color: TOKENS.colors.brand700,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 14,
  },
  waitingTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  waitingDesc: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateBody: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: TOKENS.spacing.lg,
    paddingVertical: 44,
  },
  emptyStateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  emptyStateTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginTop: TOKENS.spacing.xs,
    lineHeight: 20,
  },
  negotiateRow: {
    marginBottom: TOKENS.spacing.md,
    paddingTop: TOKENS.spacing.xs,
  },
  negotiateLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
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
    color: TOKENS.colors.dark900,
    minWidth: 140,
    textAlign: 'center',
  },
  savedCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: TOKENS.geometry.radiusCard,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    marginBottom: 2,
  },
  savedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.xs,
  },
  savedCardText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },

  // Compact Quotation Styles
  quotedContainer: {
    gap: 8,
  },
  providerCardHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 16,
    padding: 10,
    ...TOKENS.shadows.soft,
  },
  ratingAndEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  etaInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  etaInlineText: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },
  serviceDetailCompact: {
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    padding: 10,
  },
  pricingCard: {
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  waitingContainerCompact: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  cancelOrderBtn: {
    marginTop: 8,
    width: '100%',
  },
  negotiateRowCompact: {
    alignItems: 'center',
    gap: 6,
  },
  adjusterRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  adjusterPriceCompact: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    minWidth: 120,
    textAlign: 'center',
  },
  adjusterBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  serviceSubtitle: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
    marginTop: 1,
  },
  quotedSecondaryActionsStack: {
    gap: 6,
    marginTop: 4,
  },
  actionsContainerCompact: {
    gap: 8,
    marginTop: 2,
  },
  savedCardBoxCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  flowPayBtn: {
    marginTop: -2,
  },
});

