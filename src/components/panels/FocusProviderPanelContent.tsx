import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { BottomSheetScrollView } from '../../bottom-sheet/primitives';
import { useBottomNavHeight } from '../layout/bottomNavMetrics';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Button, Badge, Rating, WorkTimer } from '../ui';
import { useNotification } from '../../context/NotificationContext';
import { useFocusSession } from '../../features/focus-session/useFocusSession';
import { usePanelState } from '../../bottom-sheet/core/useBottomSheet';
import { bottomSheetDebug, nextBottomSheetActionId } from '../../bottom-sheet/core/bottomSheet.debug';
import type { SheetComponentProps } from '../../bottom-sheet/core/bottomSheet.types';

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
  // DEV-only measurement probe (Fase 0) — no layout change
  const primaryActionRef = useRef<View>(null);
  const { height: winH } = useWindowDimensions();
  const navHeight = useBottomNavHeight();
  const session = useFocusSession('provider');
  const {
    activeOrder,
    orderState,
    setOrderState,
    distanceLabel,
    etaLabel,
    setShowChat,
    handleFinish,
    realtime,
  } = session;

  const order = activeOrder;
  const etaRemaining = etaLabel || '...';
  const distanceRemaining = distanceLabel || '...';
  const clientName = order?.client?.displayName || 'Cliente';
  const clientAddress = order?.clientAddress || '';
  const clientDescription = order?.clientDescription || '';
  const basePrice = order?.serviceProvider?.price || 0;
  const totalQuote = (quoteHours * basePrice) + (quoteTransport * 1000);
  const clientAvgRating = (order?.client as any)?.reviewsReceived?.length
    ? (order?.client as any).reviewsReceived.reduce((s: number, r: any) => s + r.rating, 0) / (order?.client as any).reviewsReceived.length
    : 0;
  const clientReviewCount = (order?.client as any)?.reviewsReceived?.length || 0;
  const derivedPhase = orderState === 'VIEW_REQUEST' && order?.counterOfferPrice == null
    ? 'REQUEST_CREATED'
    : orderState === 'VIEW_REQUEST' && order?.counterOfferPrice != null
      ? 'WAITING_PROVIDER_RESPONSE'
      : orderState;
  const turn = derivedPhase === 'REQUEST_CREATED' || derivedPhase === 'WAITING_PROVIDER_RESPONSE'
    ? 'PROVIDER'
    : derivedPhase === 'WAITING_CLIENT_RESPONSE'
      ? 'CLIENT'
      : 'NONE';
  const sendQuoteVisible = orderState === 'VIEW_REQUEST' && order?.counterOfferPrice == null;
  const rejectVisible = orderState === 'VIEW_REQUEST' && order?.counterOfferPrice == null;
  const cancelVisible = orderState === 'WAITING_CLIENT_RESPONSE' || orderState === 'EN_CAMINO' || orderState === 'ARRIVED';
  const acceptCounterVisible = order?.counterOfferPrice != null && (orderState === 'VIEW_REQUEST' || orderState === 'WAITING_CLIENT_RESPONSE');
  const updateQuoteVisible = orderState === 'WAITING_CLIENT_RESPONSE';

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
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'SEND_QUOTE', origin: 'FOCUS_PROVIDER', payload: { quotedPrice: totalQuote, quotedHours: quoteHours, quotedTransport: quoteTransport } });
    if (!order?.id || !realtime?.quoteOrder) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'SEND_QUOTE', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'SEND_QUOTE', result: 'quote_order' });
    try {
      await realtime.quoteOrder({
        orderRealtimeId: order.id,
        quotedPrice: totalQuote,
        quotedHours: quoteHours,
        quotedTransport: quoteTransport,
      });
      setOrderState('WAITING_CLIENT_RESPONSE');
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo enviar la cotización.', type: 'error' });
    }
  };

  const handleAcceptCounterOffer = async () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'ACCEPT_COUNTEROFFER', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.respondToCounterOffer) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'ACCEPT_COUNTEROFFER', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'ACCEPT_COUNTEROFFER', result: 'accept_counteroffer' });
    try {
      await realtime.respondToCounterOffer(order.id, 'ACCEPTED');
      setOrderState('WAITING_CLIENT_RESPONSE');
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo aceptar la contraoferta.', type: 'error' });
    }
  };

  const handleRejectCounterOffer = async () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'REJECT_COUNTEROFFER', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.respondToCounterOffer) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'REJECT_COUNTEROFFER', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'REJECT_COUNTEROFFER', result: 'reject_counteroffer' });
    try {
      await realtime.respondToCounterOffer(order.id, 'REJECTED');
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo rechazar la contraoferta.', type: 'error' });
    }
  };

  const handleReject = async () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'REJECT_REQUEST', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.respondRequest) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'REJECT_REQUEST', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'REJECT_REQUEST', result: 'reject_request' });
    try {
      await realtime.respondRequest(order.id, 'reject');
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo rechazar la solicitud.', type: 'error' });
    }
  };

  const handleCancelOrder = async () => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'focus_provider', action: 'CANCEL_ORDER', origin: 'FOCUS_PROVIDER' });
    if (!order?.id || !realtime?.cancelOrder) {
      bottomSheetDebug('ACTION_BLOCKED', { actionId, key: 'focus_provider', action: 'CANCEL_ORDER', reason: !order?.id ? 'missing_active_order' : 'missing_realtime_executor' });
      return;
    }
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'focus_provider', action: 'CANCEL_ORDER', result: 'cancel_order' });
    try {
      await realtime.cancelOrder(order.id);
      showNotification({ title: 'Orden cancelada', message: 'Has cancelado la orden de servicio.', type: 'info' });
    } catch {
      showNotification({ title: 'Error', message: 'No se pudo cancelar la orden.', type: 'error' });
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
    handleFinish();
  };

  if (isCollapsed) {
    return (
      <View style={styles.compactContainer}>
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
                ? 'Solicitud de cotización'
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
              title="Enviar cotización"
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
                size="md"
                style={styles.compactGroupBtn}
              />
              <Button
                title="Rechazar"
                variant="outline"
                onPress={handleRejectCounterOffer}
                size="md"
                style={styles.compactGroupBtn}
              />
            </View>
          )}

          {orderState === 'WAITING_CLIENT_RESPONSE' && !acceptCounterVisible && (
            <Button
              title="Actualizar Cotización"
              variant="secondary"
              size="md"
              onPress={handleSendQuote}
              style={styles.compactActionBtn}
            />
          )}

          {(orderState === 'EN_CAMINO' || orderState === 'ARRIVED') && (
            <Button
              title="Abrir Chat"
              variant="secondary"
              icon="MessageCircle"
              size="md"
              onPress={handleOpenChat}
              style={styles.compactActionBtn}
            />
          )}

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
      </View>
    );
  }

  return (
    <BottomSheetScrollView
      style={styles.container}
      contentContainerStyle={styles.sheetBody}
      showsVerticalScrollIndicator={true}
      bounces={true}
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
                <Avatar uri={null} name={clientName} size={42} />
                <View style={styles.clientCardInfo}>
                  <Text style={styles.clientName}>{clientName}</Text>
                  <View style={styles.ratingRow}>
                    <Rating rating={clientAvgRating} size={12} showText textSuffix="Cliente" reviewsCount={clientReviewCount} />
                  </View>
                </View>
              </View>
              <View style={styles.problemSnippet}>
                <Text style={styles.problemSnippetLabel}>Detalles del problema</Text>
                <Text style={styles.detailText} numberOfLines={3}>
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
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Rechazar"
                    variant="outline"
                    onPress={handleRejectCounterOffer}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            )}

            {order?.counterOfferPrice == null && (
              <>
                <View style={styles.quoteCard}>
                  <View style={styles.quoteCardHeader}>
                    <Text style={styles.priceAdjusterLabel}>Cotización del servicio</Text>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalBadgeLabel}>Total a Cobrar</Text>
                      <Text style={styles.totalBadgeValue}>{`$${totalQuote.toLocaleString('es-CL')}`}</Text>
                    </View>
                  </View>
                  <View style={styles.quoteRowsContainer}>
                    <View style={styles.quoteRowItem}>
                      <View style={styles.quoteFieldInfo}>
                        <Text style={styles.quoteFieldTitle}>Horas de servicio</Text>
                        <Text style={styles.quoteFieldSub}>Tiempo estimado de trabajo</Text>
                      </View>
                      <View style={styles.priceAdjusterRow}>
                        <TouchableOpacity
                          onPress={() => setQuoteHours((h) => Math.max(1, h - 1))}
                          style={styles.adjusterBtnSmall}
                          accessibilityLabel="Disminuir horas de cotización"
                          accessibilityRole="button"
                        >
                          <Icon name="Minus" size={16} color={TOKENS.colors.dark900} />
                        </TouchableOpacity>
                        <Text style={styles.quoteFieldValue}>{quoteHours}h</Text>
                        <TouchableOpacity
                          onPress={() => setQuoteHours((h) => Math.min(6, h + 1))}
                          style={styles.adjusterBtnSmall}
                          accessibilityLabel="Aumentar horas de cotización"
                          accessibilityRole="button"
                        >
                          <Icon name="Plus" size={16} color={TOKENS.colors.dark900} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.quoteRowItem}>
                      <View style={styles.quoteFieldInfo}>
                        <Text style={styles.quoteFieldTitle}>Km de transporte</Text>
                        <Text style={styles.quoteFieldSub}>Traslado al domicilio</Text>
                      </View>
                      <View style={styles.priceAdjusterRow}>
                        <TouchableOpacity
                          onPress={() => setQuoteTransport((t) => Math.max(0, t - 1))}
                          style={styles.adjusterBtnSmall}
                          accessibilityLabel="Disminuir transporte en kilómetros"
                          accessibilityRole="button"
                        >
                          <Icon name="Minus" size={16} color={TOKENS.colors.dark900} />
                        </TouchableOpacity>
                        <Text style={styles.quoteFieldValue}>{quoteTransport}km</Text>
                        <TouchableOpacity
                          onPress={() => setQuoteTransport((t) => t + 1)}
                          style={styles.adjusterBtnSmall}
                          accessibilityLabel="Aumentar transporte en kilómetros"
                          accessibilityRole="button"
                        >
                          <Icon name="Plus" size={16} color={TOKENS.colors.dark900} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                <View
                  ref={primaryActionRef}
                  collapsable={false}
                  style={styles.primaryActionStack}
                  onLayout={() => {
                    if (!__DEV__) return;
                    primaryActionRef.current?.measureInWindow((x, y, w, h) => {
                      const navTop = winH - navHeight;
                      console.log('[BS:ACTION_GEOMETRY]', {
                        key: 'focus_provider',
                        action: 'PRIMARY_ACTION_STACK',
                        description: 'SEND_QUOTE(above) + REJECT(below)',
                        stackTop: y,
                        stackBottom: y + h,
                        navTop,
                        windowHeight: winH,
                        overlapPx: y + h - navTop,
                      });
                    });
                  }}
                >
                  <Button
                    title="Enviar cotización"
                    onPress={handleSendQuote}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Rechazar solicitud"
                    variant="subtle"
                    size="md"
                    onPress={handleReject}
                    style={{ marginTop: 8 }}
                  />
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
                  <Button title="Aceptar" onPress={handleAcceptCounterOffer} style={styles.actionBtn} />
                  <Button title="Rechazar" variant="danger-outline" size="md" onPress={handleRejectCounterOffer} style={{ marginTop: 8 }} />
                </View>
                <Button
                  title="Cancelar orden"
                  variant="subtle"
                  size="md"
                  onPress={handleCancelOrder}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              <>
                <Icon name="Clock" size={40} color={TOKENS.colors.brand500} />
                <Text style={styles.waitingTitle}>Cotización enviada</Text>
                <Text style={styles.waitingDesc}>Esperando confirmación o respuesta del cliente...</Text>
                <Button
                  title="Actualizar Cotización"
                  variant="secondary"
                  onPress={handleSendQuote}
                  style={styles.actionBtn}
                />
                <Button
                  title="Cancelar orden"
                  variant="subtle"
                  size="md"
                  onPress={handleCancelOrder}
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
              title="Cancelar orden"
              variant="subtle"
              size="md"
              onPress={handleCancelOrder}
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

            <Button
              title="Cancelar orden"
              variant="subtle"
              size="md"
              onPress={handleCancelOrder}
              style={{ marginTop: 8 }}
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

            <Button
              title="Cancelar Orden"
              variant="subtle"
              size="md"
              onPress={handleCancelOrder}
              style={{ marginTop: 8 }}
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
    paddingBottom: 36,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  quoteRowsContainer: {
    gap: 12,
    marginBottom: TOKENS.spacing.sm,
  },
  quoteRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  quoteFieldInfo: {
    flex: 1,
    marginRight: 8,
  },
  quoteFieldTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  quoteFieldSub: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    marginTop: 1,
  },
  quoteFieldValue: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    minWidth: 44,
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
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  problemSnippet: {
    backgroundColor: TOKENS.colors.white,
    padding: 10,
    borderRadius: 10,
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
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    padding: 12,
    gap: 10,
  },
  quoteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBadge: {
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    alignItems: 'flex-end',
  },
  totalBadgeLabel: {
    fontSize: 8,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
    textTransform: 'uppercase',
  },
  totalBadgeValue: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand700,
  },
  primaryActionStack: {
    gap: 8,
    marginTop: 8,
    width: '100%',
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
  },
  compactActionBtn: {
    width: '100%',
    minHeight: 44,
  },
  compactActionGroup: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  compactGroupBtn: {
    flex: 1,
    minHeight: 44,
  },
  compactWaitingRow: {
    width: '100%',
  },
});
