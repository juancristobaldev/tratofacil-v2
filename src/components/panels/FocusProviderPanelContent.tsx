import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetView, TouchableOpacity } from '../../bottom-sheet/primitives';
import { useBottomNavHeight } from '../layout/bottomNavMetrics';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Button, Badge, Rating, WorkTimer } from '../ui';
import { useNotification } from '../../context/NotificationContext';
import { useLocation } from '../../context/LocationContext';
import { useFocusSession } from '../../features/focus-session/useFocusSession';
import { usePanelState } from '../../bottom-sheet/core/useBottomSheet';
import { bottomSheetDebug, nextBottomSheetActionId } from '../../bottom-sheet/core/bottomSheet.debug';
import type { SheetComponentProps } from '../../bottom-sheet/core/bottomSheet.types';
import { sanitizeAddress, isCoordinateString } from '../../utils/addressSanitizer';
import { reverseGeocode } from '../../utils/geocode';

export const FocusProviderPanelContent: React.FC<SheetComponentProps<'focus_provider'>> = ({
  isCollapsed = false,
  setIndex,
}) => {
  const { showNotification } = useNotification();
  const [quoteState, setQuoteState] = usePanelState('focus_provider', {
    quoteHours: 1,
    quoteTransport: 0,
  });
  const quoteHours = quoteState.quoteHours;
  const quoteTransport = quoteState.quoteTransport;
  const setQuoteHours = (fnOrVal: number | ((h: number) => number)) =>
    setQuoteState((prev) => ({
      ...prev,
      quoteHours: typeof fnOrVal === 'function' ? fnOrVal(prev.quoteHours) : fnOrVal,
    }));
  const setQuoteTransport = (fnOrVal: number | ((t: number) => number)) =>
    setQuoteState((prev) => ({
      ...prev,
      quoteTransport: typeof fnOrVal === 'function' ? fnOrVal(prev.quoteTransport) : fnOrVal,
    }));
  const [contentHeight, setContentHeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  // DEV-only measurement probe (Fase 0) — no layout change
  const primaryActionRef = useRef<View>(null);
  const { height: winH } = useWindowDimensions();
  const navHeight = useBottomNavHeight();
  const session = useFocusSession('provider');
  const locContext = useLocation();
  const gpsSpeed = locContext?.location?.coords?.speed;

  const {
    activeOrder,
    orderState,
    setOrderState,
    distanceLabel,
    etaLabel,
    distanceMeters,
    isWithinArrivalRadius,
    providerCoords,
    setShowChat,
    handleFinish,
    realtime,
  } = session;

  // Auto-colapsar el panel a index 0 (156px) al entrar en EN_CAMINO para garantizar máxima visibilidad del mapa
  const prevOrderStateRef = useRef<string | null>(null);
  useEffect(() => {
    if (orderState === 'EN_CAMINO' && prevOrderStateRef.current !== 'EN_CAMINO') {
      setIndex?.(0);
    }
    prevOrderStateRef.current = orderState;
  }, [orderState, setIndex]);

  // Si el profesional se desplaza en vehículo (velocidad > 0.8 m/s ~ 3 km/h) en EN_CAMINO, replegar a index 0
  useEffect(() => {
    if (orderState === 'EN_CAMINO' && !isCollapsed && typeof gpsSpeed === 'number' && gpsSpeed > 0.8) {
      setIndex?.(0);
    }
  }, [orderState, isCollapsed, gpsSpeed, setIndex]);

  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);

  const order = activeOrder;
  const etaRemaining = etaLabel || '...';
  const distanceRemaining = distanceLabel || '...';
  const clientName = order?.client?.displayName || 'Cliente';
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (order?.clientAddress && !isCoordinateString(order.clientAddress)) return;
    if (!order?.clientLat || !order?.clientLng) return;
    let cancelled = false;
    reverseGeocode(order.clientLat, order.clientLng)
      .then((addr) => {
        if (!cancelled && addr) setResolvedAddress(addr);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [order?.clientAddress, order?.clientLat, order?.clientLng]);

  const clientAddress = sanitizeAddress(resolvedAddress || order?.clientAddress, 'Ubicación del cliente');
  const clientDescription = order?.clientDescription || '';
  const basePrice = order?.serviceProvider?.price || 0;
  const totalQuote = (quoteHours * basePrice) + (quoteTransport * 1000);
  const clientAvgRating = (order?.client as any)?.reviewsReceived?.length
    ? (order?.client as any).reviewsReceived.reduce((s: number, r: any) => s + r.rating, 0) / (order?.client as any).reviewsReceived.length
    : 0;
  const clientReviewCount = (order?.client as any)?.reviewsReceived?.length || 0;
  const hasCounterOffer = order?.counterOfferPrice != null;
  const derivedPhase = (orderState === 'VIEW_REQUEST' && !hasCounterOffer)
    ? 'REQUEST_CREATED'
    : hasCounterOffer
      ? 'WAITING_PROVIDER_RESPONSE'
      : orderState;
  const turn = derivedPhase === 'REQUEST_CREATED' || derivedPhase === 'WAITING_PROVIDER_RESPONSE'
    ? 'PROVIDER'
    : derivedPhase === 'WAITING_CLIENT_RESPONSE'
      ? 'CLIENT'
      : 'NONE';
  const sendQuoteVisible = orderState === 'VIEW_REQUEST' && !hasCounterOffer;
  const rejectVisible = orderState === 'VIEW_REQUEST' && !hasCounterOffer;
  const cancelVisible = orderState === 'WAITING_CLIENT_RESPONSE' && !hasCounterOffer;
  const acceptCounterVisible = hasCounterOffer && (orderState === 'VIEW_REQUEST' || orderState === 'WAITING_CLIENT_RESPONSE');
  const updateQuoteVisible = orderState === 'WAITING_CLIENT_RESPONSE' && !hasCounterOffer;

  useEffect(() => {
    if (!__DEV__) return;
    console.log(
      `[NEG:PROVIDER_PHASE] orderId=${order?.id ?? 'null'} status=${order?.status ?? 'null'} orderState=${orderState} quotedPrice=${order?.quotedPrice ?? 'null'} counterOfferPrice=${order?.counterOfferPrice ?? 'null'} derivedPhase=${derivedPhase} turn=${turn} sheetKey=focus_provider sheetIndex=unknown contentHeight=${contentHeight}`,
    );
    console.log(
      `[NEG:PROVIDER_ACTIONS] sendQuoteVisible=${sendQuoteVisible} rejectVisible=${rejectVisible} cancelVisible=${cancelVisible} acceptCounterVisible=${acceptCounterVisible} updateQuoteVisible=${updateQuoteVisible}`,
    );
  }, [acceptCounterVisible, cancelVisible, contentHeight, derivedPhase, order?.counterOfferPrice, order?.id, order?.quotedPrice, order?.status, orderState, rejectVisible, sendQuoteVisible, turn, updateQuoteVisible]);

  const handleSendQuote = async () => {
    if (isSubmitting) return;
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'SEND_QUOTE', origin: 'FOCUS_PROVIDER', payload: { quotedPrice: totalQuote, quotedHours: quoteHours, quotedTransport: quoteTransport } });
    if (!order?.id || !realtime?.quoteOrder) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'SEND_QUOTE', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'SEND_QUOTE', result: 'quote_order' });
    setIsSubmitting(true);
    try {
      await realtime.quoteOrder({
        orderRealtimeId: order.id,
        quotedPrice: totalQuote,
        quotedHours: quoteHours,
        quotedTransport: quoteTransport,
      });
      setOrderState('WAITING_CLIENT_RESPONSE');
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo enviar la oferta.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditingQuote = () => {
    setQuoteHours(order?.quotedHours || 1);
    setQuoteTransport(order?.quotedTransport || 0);
    setIsEditingQuote(true);
  };

  const handleUpdateQuote = async () => {
    if (isSubmitting) return;
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', {
      actionId,
      key: 'focus_provider',
      action: 'UPDATE_QUOTE',
      origin: 'FOCUS_PROVIDER',
      payload: { quotedPrice: totalQuote, quotedHours: quoteHours, quotedTransport: quoteTransport },
    });
    if (!order?.id || !realtime?.updateQuote) {
      bottomSheetDebug('ACTION_BLOCKED', {
        actionId,
        key: 'focus_provider',
        action: 'UPDATE_QUOTE',
        reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor',
      });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'UPDATE_QUOTE', result: 'update_quote' });
    setIsSubmitting(true);
    try {
      await realtime.updateQuote({
        orderRealtimeId: order.id,
        quotedPrice: totalQuote,
        quotedHours: quoteHours,
        quotedTransport: quoteTransport,
      });
      setIsEditingQuote(false);
      showNotification({
        title: 'Oferta actualizada',
        message: 'Tu cotización ha sido actualizada con éxito.',
        type: 'success',
      });
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo actualizar la oferta.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptCounterOffer = async () => {
    if (isSubmitting) return;
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'ACCEPT_COUNTEROFFER', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.respondToCounterOffer) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'ACCEPT_COUNTEROFFER', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'ACCEPT_COUNTEROFFER', result: 'accept_counteroffer' });
    setIsSubmitting(true);
    try {
      await realtime.respondToCounterOffer(order.id, 'ACCEPTED');
      setOrderState('WAITING_CLIENT_RESPONSE');
      showNotification({
        title: 'Contraoferta aceptada',
        message: 'Has aceptado la contraoferta del cliente.',
        type: 'success',
      });
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo aceptar la contraoferta.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectCounterOffer = async () => {
    if (isSubmitting) return;
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'REJECT_COUNTEROFFER', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.respondToCounterOffer) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'REJECT_COUNTEROFFER', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'REJECT_COUNTEROFFER', result: 'reject_counteroffer' });
    setIsSubmitting(true);
    try {
      await realtime.respondToCounterOffer(order.id, 'REJECTED');
      showNotification({
        title: 'Contraoferta rechazada',
        message: 'Has rechazado la contraoferta. Se mantiene tu oferta previa.',
        type: 'info',
      });
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo rechazar la contraoferta.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (isSubmitting) return;
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'REJECT_REQUEST', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.respondRequest) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'REJECT_REQUEST', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'REJECT_REQUEST', result: 'reject_request' });
    setIsSubmitting(true);
    try {
      await realtime.respondRequest(order.id, 'reject');
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo rechazar la solicitud.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (isCancelling) return;
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'CANCEL_ORDER', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.cancelOrder) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'CANCEL_ORDER', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'CANCEL_ORDER', result: 'cancel_order' });
    setIsCancelling(true);
    try {
      await realtime.cancelOrder(order.id);
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo cancelar la orden.', type: 'error' });
    } finally {
      setIsCancelling(false);
    }
  };


  const handleConfirmArrival = async () => {
    if (isConfirmingArrival || !order?.id) return;
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'CONFIRM_ARRIVAL', origin: 'FOCUS_PROVIDER' });
    if (!realtime?.confirmArrival) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'CONFIRM_ARRIVAL', reason: 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'CONFIRM_ARRIVAL', result: 'confirm_arrival' });
    setIsConfirmingArrival(true);
    try {
      await realtime.confirmArrival(order.id, providerCoords?.latitude, providerCoords?.longitude);
      setOrderState('ARRIVED');
      showNotification({
        title: 'Llegada confirmada',
        message: 'Has confirmado tu llegada al domicilio. Esperando inicio por parte del cliente.',
        type: 'success',
      });
    } catch (err: any) {
      showNotification({
        title: 'Error de llegada',
        message: err?.message || 'Debes encontrarte a menos de 100 metros para confirmar llegada.',
        type: 'error',
      });
    } finally {
      setIsConfirmingArrival(false);
    }
  };

  const handleCompleteWork = async () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'COMPLETE_WORK', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.finishOrder) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'COMPLETE_WORK', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'COMPLETE_WORK', result: 'complete_work' });
    try {
      await realtime.finishOrder(order.id);
      setOrderState('COMPLETED');
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo completar el trabajo.', type: 'error' });
    }
  };

  const handleOpenChat = () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'OPEN_CHAT', origin: 'FOCUS_PROVIDER' });
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'OPEN_CHAT', target: 'chat_overlay' });
    setShowChat(true);
  };

  const handleReturnPanel = () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'RETURN_PANEL', origin: 'FOCUS_PROVIDER' });
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'RETURN_PANEL', target: orderState === 'COMPLETED' ? 'Rating' : 'MainApp' });
    handleFinish(orderState);
  };

  if (isCollapsed) {
    return (
      <BottomSheetView style={styles.compactContainer}>
        <TouchableOpacity
          style={styles.compactHeaderRow}
          onPress={() => setIndex?.(1)}
          activeOpacity={0.8}
          accessibilityLabel="Expandir panel del profesional"
          accessibilityRole="button"
        >
          <Avatar uri={null} name={clientName} size={36} />
          <View style={styles.compactInfoCol}>
            <View style={styles.compactTitleRow}>
              <Text style={styles.compactName} numberOfLines={1}>{clientName}</Text>
              {derivedPhase === 'REQUEST_CREATED' && (
                <Text style={styles.compactPriceBadge}>{`$${totalQuote.toLocaleString('es-CL')}`}</Text>
              )}
              {derivedPhase === 'WAITING_PROVIDER_RESPONSE' && order?.counterOfferPrice != null && (
                <Text style={styles.compactPriceBadge}>{`$${order.counterOfferPrice.toLocaleString('es-CL')}`}</Text>
              )}
            </View>
            <Text style={styles.compactStatusText} numberOfLines={1}>
              {derivedPhase === 'REQUEST_CREATED'
                ? 'Solicitud de oferta'
                : derivedPhase === 'WAITING_PROVIDER_RESPONSE'
                  ? 'Contraoferta recibida'
                  : orderState === 'WAITING_CLIENT_RESPONSE'
                    ? 'Esperando respuesta del cliente'
                    : orderState === 'EN_CAMINO'
                      ? `En camino • ${etaRemaining}`
                      : orderState === 'ARRIVED'
                        ? 'En destino • Listo para iniciar'
                        : orderState === 'IN_PROGRESS'
                          ? 'Servicio en curso'
                          : orderState === 'COMPLETED'
                            ? 'Servicio completado'
                            : 'Servicio cancelado'}
            </Text>
          </View>
          <Icon name="ChevronUp" size={20} color={TOKENS.colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.compactActionRow}>
          {sendQuoteVisible && (
            <Button
              title="Enviar oferta"
              onPress={handleSendQuote}
              size="md"
              style={styles.compactActionBtn}
            />
          )}

          {acceptCounterVisible && (
            <View style={styles.compactActionGroup}>
              <Button
                title="Aceptar"
                onPress={handleAcceptCounterOffer}
                loading={isSubmitting}
                disabled={isSubmitting || isCancelling}
                size="md"
                style={styles.compactGroupBtn}
              />
              <Button
                title="Rechazar"
                variant="outline"
                onPress={handleRejectCounterOffer}
                loading={isSubmitting}
                disabled={isSubmitting || isCancelling}
                size="md"
                style={styles.compactGroupBtn}
              />
            </View>
          )}

          {orderState === 'WAITING_CLIENT_RESPONSE' && !acceptCounterVisible && !isEditingQuote && (
            <Button
              title="Actualizar Oferta"
              variant="secondary"
              size="md"
              onPress={handleStartEditingQuote}
              disabled={isSubmitting || isCancelling}
              style={styles.compactActionBtn}
            />
          )}

          {((orderState === 'EN_CAMINO' || (orderState === 'ARRIVED' && order?.status === 'ACCEPTED' && !order?.arrivedAt)) && isWithinArrivalRadius) ? (
            <View style={styles.compactActionGroup}>
              <Button
                title="Confirmar llegada"
                size="md"
                onPress={handleConfirmArrival}
                loading={isConfirmingArrival}
                disabled={isConfirmingArrival}
                style={styles.compactGroupBtn}
              />
              <Button
                title="Chat"
                variant="secondary"
                icon="MessageCircle"
                size="md"
                onPress={handleOpenChat}
                style={styles.compactGroupBtn}
              />
            </View>
          ) : (orderState === 'EN_CAMINO' || orderState === 'ARRIVED') ? (
            <Button
              title="Abrir Chat"
              variant="secondary"
              icon="MessageCircle"
              size="md"
              onPress={handleOpenChat}
              style={styles.compactActionBtn}
            />
          ) : null}

          {orderState === 'IN_PROGRESS' && (
            <Button
              title="Completar Trabajo"
              size="md"
              onPress={handleCompleteWork}
              style={styles.compactActionBtn}
            />
          )}

          {(orderState === 'COMPLETED' || orderState === 'CANCELLED') && (
            <Button
              title="Volver al Panel"
              size="md"
              onPress={handleReturnPanel}
              style={styles.compactActionBtn}
            />
          )}
        </View>
      </BottomSheetView>
    );
  }

  return (
    <BottomSheetScrollView
      style={styles.container}
      contentContainerStyle={styles.sheetBody}
      showsVerticalScrollIndicator={true}
      bounces={false}
    >
      <View
        collapsable={false}
        onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}
      >
        {orderState === 'VIEW_REQUEST' && (
          <View style={styles.viewRequestContainer}>
            {/* Header unificado del cliente y problema */}
            <View style={styles.clientCompactCard}>
              <View style={styles.clientCardHeader}>
                <Avatar uri={null} name={clientName} size={36} />
                <View style={styles.clientCardInfo}>
                  <View style={styles.clientMetaRow}>
                    <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
                    <Rating rating={clientAvgRating} size={11} showText textSuffix="Cliente" reviewsCount={clientReviewCount} />
                  </View>
                </View>
              </View>
              <View style={styles.problemSnippet}>
                <Text style={styles.problemSnippetLabel}>Detalles del problema</Text>
                <Text style={styles.detailText} numberOfLines={2}>
                  {clientDescription || 'Sin descripción adicional'}
                </Text>
              </View>
            </View>

            {order?.counterOfferPrice != null && (
              <View style={styles.counterOfferCard}>
                <Badge label="CONTRAOFERTA DEL CLIENTE" tone="warning" />
                <Text style={styles.counterOfferPrice}>
                  ${order.counterOfferPrice.toLocaleString('es-CL')}
                </Text>
                <Text style={styles.counterOfferDetail}>
                  Propuesta: {order.counterOfferHours}h / {order.counterOfferTransport}km
                </Text>
                <View style={styles.counterOfferActionStack}>
                  <Button
                    title="Aceptar"
                    onPress={handleAcceptCounterOffer}
                    loading={isSubmitting}
                    disabled={isSubmitting || isCancelling}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Rechazar"
                    variant="outline"
                    onPress={handleRejectCounterOffer}
                    loading={isSubmitting}
                    disabled={isSubmitting || isCancelling}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            )}

            {order?.counterOfferPrice == null && (
              <>
                <View style={styles.quoteCard}>
                  <View style={styles.quoteCardHeader}>
                    <Text style={styles.priceAdjusterLabel}>Oferta del servicio</Text>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalBadgeLabel}>Total a Cobrar</Text>
                      <Text style={styles.totalBadgeValue}>{`$${totalQuote.toLocaleString('es-CL')}`}</Text>
                    </View>
                  </View>
                  <View style={styles.quoteGridContainer}>
                    <View style={styles.quoteGridCol}>
                      <Text style={styles.quoteFieldTitle} numberOfLines={1}>Horas de servicio</Text>
                      <View style={styles.priceAdjusterRow}>
                        <TouchableOpacity
                          onPress={() => setQuoteHours((h) => Math.max(1, h - 1))}
                          style={styles.adjusterBtnCompact}
                          accessibilityLabel="Disminuir horas de oferta"
                          accessibilityRole="button"
                        >
                          <Icon name="Minus" size={14} color={TOKENS.colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.quoteFieldValueCompact}>{quoteHours}h</Text>
                        <TouchableOpacity
                          onPress={() => setQuoteHours((h) => Math.min(6, h + 1))}
                          style={styles.adjusterBtnCompact}
                          accessibilityLabel="Aumentar horas de oferta"
                          accessibilityRole="button"
                        >
                          <Icon name="Plus" size={14} color={TOKENS.colors.white} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.quoteGridCol}>
                      <Text style={styles.quoteFieldTitle} numberOfLines={1}>Km de transporte</Text>
                      <View style={styles.priceAdjusterRow}>
                        <TouchableOpacity
                          onPress={() => setQuoteTransport((t) => Math.max(0, t - 1))}
                          style={styles.adjusterBtnCompact}
                          accessibilityLabel="Disminuir transporte en kilómetros"
                          accessibilityRole="button"
                        >
                          <Icon name="Minus" size={14} color={TOKENS.colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.quoteFieldValueCompact}>{quoteTransport}km</Text>
                        <TouchableOpacity
                          onPress={() => setQuoteTransport((t) => t + 1)}
                          style={styles.adjusterBtnCompact}
                          accessibilityLabel="Aumentar transporte en kilómetros"
                          accessibilityRole="button"
                        >
                          <Icon name="Plus" size={14} color={TOKENS.colors.white} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                <View
                  ref={primaryActionRef}
                  collapsable={false}
                  style={styles.primaryActionRow}
                  onLayout={() => {
                    if (!__DEV__) return;
                    primaryActionRef.current?.measureInWindow((x, y, w, h) => {
                      const navTop = winH - navHeight;
                      console.log('[BS:ACTION_GEOMETRY]', {
                        key: 'focus_provider',
                        action: 'PRIMARY_ACTION_STACK',
                        description: 'REJECT(left) + SEND_QUOTE(right)',
                        stackTop: y,
                        stackBottom: y + h,
                        navTop,
                        windowHeight: winH,
                        overlapPx: y + h - navTop,
                      });
                    });
                  }}
                >
                  <View style={styles.actionBtnSecondaryCol}>
                    <Button
                      title="Rechazar solicitud"
                      variant="subtle"
                      size="md"
                      fullWidth
                      onPress={handleReject}
                      style={styles.actionBtnSecondary}
                      textStyle={styles.actionBtnSecondaryText}
                    />
                  </View>
                  <View style={styles.actionBtnPrimaryCol}>
                    <Button
                      title="Enviar oferta"
                      size="md"
                      fullWidth
                      onPress={handleSendQuote}
                      style={styles.actionBtnPrimary}
                      textStyle={styles.actionBtnPrimaryText}
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {orderState === 'WAITING_CLIENT_RESPONSE' && (
          <View style={styles.waitingContainer}>
            {order?.counterOfferPrice != null ? (
              <View style={styles.counterOfferCard}>
                <Badge label="CONTRAOFERTA DEL CLIENTE" tone="warning" />
                <Text style={styles.counterOfferPrice}>
                  ${order.counterOfferPrice.toLocaleString('es-CL')}
                </Text>
                <Text style={styles.counterOfferDetail}>
                  Propuesta: {order.counterOfferHours}h / {order.counterOfferTransport}km
                </Text>
                <View style={styles.counterOfferActionStack}>
                  <Button
                    title="Aceptar"
                    onPress={handleAcceptCounterOffer}
                    loading={isSubmitting}
                    disabled={isSubmitting || isCancelling}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Rechazar"
                    variant="danger-outline"
                    size="md"
                    onPress={handleRejectCounterOffer}
                    loading={isSubmitting}
                    disabled={isSubmitting || isCancelling}
                    style={{ marginTop: 8 }}
                  />
                </View>
                <Button
                  title="Cancelar orden"
                  variant="subtle"
                  size="md"
                  onPress={handleCancelOrder}
                  loading={isCancelling}
                  disabled={isSubmitting || isCancelling}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : isEditingQuote ? (
              <View style={[styles.quoteCard, { width: '100%', marginBottom: 12 }]}>
                <View style={styles.quoteCardHeader}>
                  <Text style={styles.priceAdjusterLabel}>Modificar cotización</Text>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeLabel}>Nuevo Total</Text>
                    <Text style={styles.totalBadgeValue}>{`$${totalQuote.toLocaleString('es-CL')}`}</Text>
                  </View>
                </View>
                <View style={styles.quoteGridContainer}>
                  <View style={styles.quoteGridCol}>
                    <Text style={styles.quoteFieldTitle} numberOfLines={1}>Horas de servicio</Text>
                    <View style={styles.priceAdjusterRow}>
                      <TouchableOpacity
                        onPress={() => setQuoteHours((h) => Math.max(1, h - 1))}
                        style={styles.adjusterBtnCompact}
                        accessibilityLabel="Disminuir horas de oferta"
                        accessibilityRole="button"
                      >
                        <Icon name="Minus" size={14} color={TOKENS.colors.white} />
                      </TouchableOpacity>
                      <Text style={styles.quoteFieldValueCompact}>{quoteHours}h</Text>
                      <TouchableOpacity
                        onPress={() => setQuoteHours((h) => Math.min(6, h + 1))}
                        style={styles.adjusterBtnCompact}
                        accessibilityLabel="Aumentar horas de oferta"
                        accessibilityRole="button"
                      >
                        <Icon name="Plus" size={14} color={TOKENS.colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.quoteGridCol}>
                    <Text style={styles.quoteFieldTitle} numberOfLines={1}>Km de transporte</Text>
                    <View style={styles.priceAdjusterRow}>
                      <TouchableOpacity
                        onPress={() => setQuoteTransport((t) => Math.max(0, t - 1))}
                        style={styles.adjusterBtnCompact}
                        accessibilityLabel="Disminuir transporte en kilómetros"
                        accessibilityRole="button"
                      >
                        <Icon name="Minus" size={14} color={TOKENS.colors.white} />
                      </TouchableOpacity>
                      <Text style={styles.quoteFieldValueCompact}>{quoteTransport}km</Text>
                      <TouchableOpacity
                        onPress={() => setQuoteTransport((t) => t + 1)}
                        style={styles.adjusterBtnCompact}
                        accessibilityLabel="Aumentar transporte en kilómetros"
                        accessibilityRole="button"
                      >
                        <Icon name="Plus" size={14} color={TOKENS.colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.primaryActionRow, { marginTop: 10 }]}>
                  <View style={styles.actionBtnSecondaryCol}>
                    <Button
                      title="Descartar cambios"
                      variant="ghost"
                      size="md"
                      fullWidth
                      onPress={() => setIsEditingQuote(false)}
                      disabled={isSubmitting || isCancelling}
                      style={styles.actionBtnSecondary}
                      textStyle={styles.actionBtnSecondaryText}
                    />
                  </View>
                  <View style={styles.actionBtnPrimaryCol}>
                    <Button
                      title="Confirmar nueva oferta"
                      variant="primary"
                      size="md"
                      fullWidth
                      onPress={handleUpdateQuote}
                      loading={isSubmitting}
                      disabled={isSubmitting || isCancelling}
                      style={styles.actionBtnPrimary}
                      textStyle={styles.actionBtnPrimaryText}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Icon name="Clock" size={40} color={TOKENS.colors.brand500} />
                <Text style={styles.waitingTitle}>Oferta enviada</Text>
                <Text style={styles.waitingDesc}>Esperando confirmación o respuesta del cliente...</Text>
                <Button
                  title="Actualizar Oferta"
                  variant="secondary"
                  onPress={handleStartEditingQuote}
                  disabled={isSubmitting || isCancelling}
                  style={styles.actionBtn}
                />
                <Button
                  title="Cancelar orden"
                  variant="subtle"
                  size="md"
                  onPress={handleCancelOrder}
                  loading={isCancelling}
                  disabled={isSubmitting || isCancelling}
                  style={{ marginTop: 8 }}
                />
              </>
            )}
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
                <Text style={styles.clientAddress} numberOfLines={1}>{clientAddress || 'Ubicación del cliente'}</Text>
              </View>
              <TouchableOpacity onPress={handleOpenChat} style={styles.chatIconBtnSmall}>
                <Icon name="MessageCircle" size={20} color={TOKENS.colors.brand600} />
              </TouchableOpacity>
            </View>

            <Text style={styles.guideText}>Conduce hacia la ubicación del cliente para iniciar el servicio.</Text>

            <Button
              title={isWithinArrivalRadius ? 'Confirmar llegada' : `Acércate para confirmar llegada (${distanceMeters != null ? `${Math.round(distanceMeters)}m` : '< 100m'})`}
              variant={isWithinArrivalRadius ? 'primary' : 'outline'}
              disabled={!isWithinArrivalRadius || isConfirmingArrival}
              loading={isConfirmingArrival}
              icon="CheckCircle"
              size="md"
              onPress={handleConfirmArrival}
              style={{ marginTop: 16 }}
            />

            <Button
              title="Abrir Chat"
              variant="secondary"
              icon="MessageCircle"
              size="md"
              onPress={handleOpenChat}
              style={{ marginTop: 8 }}
            />
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
                <Text style={styles.clientAddress}>El cliente está esperando en el domicilio</Text>
              </View>
              <TouchableOpacity onPress={handleOpenChat} style={styles.chatIconBtnSmall}>
                <Icon name="MessageCircle" size={20} color={TOKENS.colors.brand600} />
              </TouchableOpacity>
            </View>

            <View style={styles.arrivedWaitingCard}>
              <Icon name="Clock" size={20} color={TOKENS.colors.brand600} />
              <View style={styles.arrivedWaitingInfo}>
                <Text style={styles.arrivedWaitingTitle}>Esperando confirmación</Text>
                <Text style={styles.arrivedWaitingSub}>
                  El cliente debe confirmar el inicio del servicio en su aplicación para comenzar.
                </Text>
              </View>
            </View>

            {(!order?.arrivedAt || order?.status === 'ACCEPTED') && (
              <Button
                title={isWithinArrivalRadius ? 'Confirmar llegada' : `Acércate para confirmar llegada (${distanceMeters != null ? `${Math.round(distanceMeters)}m` : '< 100m'})`}
                variant={isWithinArrivalRadius ? 'primary' : 'outline'}
                disabled={!isWithinArrivalRadius || isConfirmingArrival}
                loading={isConfirmingArrival}
                icon="CheckCircle"
                size="md"
                onPress={handleConfirmArrival}
                style={{ marginTop: 12 }}
              />
            )}

            <Button
              title="Abrir Chat"
              variant="secondary"
              icon="MessageCircle"
              size="md"
              onPress={handleOpenChat}
              style={{ marginTop: 12 }}
            />
          </>
        )}

        {orderState === 'IN_PROGRESS' && (
          <>
            <WorkTimer startedAt={order?.startedAt} />

            <Text style={styles.workingDesc}>{clientDescription || 'Servicio en curso'}</Text>

            <Button
              title="Completar Trabajo"
              onPress={handleCompleteWork}
              style={styles.actionBtn}
            />

            <Button
              title="Abrir Chat"
              variant="secondary"
              icon="MessageCircle"
              onPress={handleOpenChat}
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
              onPress={handleReturnPanel}
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
              onPress={handleReturnPanel}
              style={styles.actionBtn}
            />
          </>
        )}
      </View>
    </BottomSheetScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  sheetBody: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: 16,
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
    marginTop: 10,
  },
  subtleCancelBtn: {
    width: '100%',
    minHeight: 40,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  subtleCancelText: {
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.xs + 1,
    fontWeight: TOKENS.typography.weights.medium,
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
    color: TOKENS.colors.textMain,
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
    gap: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  clientMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 16,
  },
  priceAdjusterContainer: {
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.md,
  },
  priceAdjusterLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: 0,
  },
  priceAdjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjusterBtnCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262936',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjusterBtnSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262936',
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
  quoteGridContainer: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  quoteGridCol: {
    flex: 1,
    backgroundColor: '#16181F',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2D38',
    alignItems: 'center',
    gap: 6,
  },
  quoteRowsContainer: {
    gap: 12,
    marginBottom: TOKENS.spacing.sm,
  },
  quoteRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16181F',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2D38',
  },
  quoteFieldInfo: {
    flex: 1,
    marginRight: 8,
  },
  quoteFieldTitle: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#FFFFFF',
  },
  quoteFieldSub: {
    fontSize: 10,
    color: '#9E9FA8',
    marginTop: 1,
  },
  quoteFieldValue: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.black,
    color: '#FFFFFF',
    minWidth: 44,
    textAlign: 'center',
  },
  quoteFieldValueCompact: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.black,
    color: '#FFFFFF',
    minWidth: 36,
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
  clientCompactCard: {
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  problemSnippet: {
    backgroundColor: TOKENS.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface100,
  },
  problemSnippetLabel: {
    fontSize: 9,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  quoteCard: {
    backgroundColor: '#000000',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262936',
    padding: 10,
    gap: 8,
  },
  quoteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBadge: {
    backgroundColor: '#16181F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand500,
    alignItems: 'flex-end',
  },
  totalBadgeLabel: {
    fontSize: 8,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand400,
    textTransform: 'uppercase',
  },
  totalBadgeValue: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.black,
    color: '#FFFFFF',
  },
  primaryActionStack: {
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    width: '100%',
    alignItems: 'center',
  },
  actionBtnSecondaryCol: {
    flex: 3.5,
  },
  actionBtnSecondary: {
    paddingHorizontal: 4,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
  },
  actionBtnPrimaryCol: {
    flex: 6.5,
  },
  actionBtnPrimary: {
    paddingHorizontal: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
  },
  counterOfferActionStack: {
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  counterOfferCard: {
    alignItems: 'center',
    backgroundColor: TOKENS.colors.warning50,
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.warning200,
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
  arrivedWaitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.brand50,
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
    gap: 12,
    marginTop: 8,
  },
  arrivedWaitingInfo: {
    flex: 1,
  },
  arrivedWaitingTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand900,
    marginBottom: 2,
  },
  arrivedWaitingSub: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.brand700,
    lineHeight: 16,
  },
  compactContainer: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.sm,
    gap: 8,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactInfoCol: {
    flex: 1,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  compactName: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    flex: 1,
  },
  compactPriceBadge: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand600,
  },
  compactStatusText: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 1,
  },
  compactActionRow: {
    width: '100%',
    marginTop: 2,
  },
  compactActionBtn: {
    width: '100%',
    minHeight: 42,
  },
  compactActionGroup: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  compactGroupBtn: {
    flex: 1,
    minHeight: 42,
  },
  compactWaitingRow: {
    width: '100%',
  },
});
