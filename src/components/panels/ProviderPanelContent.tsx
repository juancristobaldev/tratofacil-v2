import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch } from 'react-native';
import { BottomSheetScrollView } from '../../bottom-sheet/primitives';
import Geolocation, { GeoPosition } from 'react-native-geolocation-service';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Card, Button } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useLocation } from '../../context/LocationContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useNotification } from '../../context/NotificationContext';
import { useServices } from '../../hooks/useServices';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { bottomSheetDebug, nextBottomSheetActionId } from '../../bottom-sheet/core/bottomSheet.debug';
import type { SheetComponentProps } from '../../bottom-sheet/core/bottomSheet.types';

export const ProviderPanelContent: React.FC<SheetComponentProps<'provider_dashboard'>> = () => {
  const navigation = useNavigation<any>();
  const { present } = useBottomSheet();
  const { user } = useAuth();
  const { wallet } = usePlans();
  const { location } = useLocation();
  const realtime = useRealtime();
  const { showNotification } = useNotification();
  const { myServices } = useServices();

  const [online, setOnline] = useState(realtime?.isRealtimeActive || false);

  useEffect(() => {
    setOnline(realtime?.isRealtimeActive || false);
  }, [realtime?.isRealtimeActive]);

  // Reglas de negocio para activar el modo en línea (coherente con el backend):
  // perfil completo + al menos un servicio publicado.
  const canGoOnline =
    user?.isProfileFullyComplete === true && (myServices?.length || 0) > 0;

  const handleToggleOnline = async (value: boolean) => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'provider_dashboard', action: 'TOGGLE_ONLINE', origin: 'PROVIDER_DASHBOARD', payload: { value } });
    // Solo se bloquea el ENCENDIDO. Apagar siempre está permitido.
    if (value && !canGoOnline) {
      setOnline(false);
      bottomSheetDebug('ACTION_BLOCKED', {
        actionId,
        key: 'provider_dashboard',
        action: 'TOGGLE_ONLINE',
        reason: !user?.isProfileFullyComplete ? 'profile_incomplete' : 'no_services_published',
      });
      if (!user?.isProfileFullyComplete) {
        showNotification({
          title: 'Perfil incompleto',
          message: 'Completa tu perfil profesional para activar el modo en línea.',
          type: 'error',
        });
        navigation.navigate('VerificationCenter');
      } else {
        showNotification({
          title: 'Publica un servicio',
          message: 'Necesitas al menos un servicio publicado para activar el modo en línea.',
          type: 'error',
        });
        navigation.navigate('MyServices');
      }
      return;
    }

    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'provider_dashboard', action: 'TOGGLE_ONLINE', result: value ? 'go_online' : 'go_offline' });

    setOnline(value);
    let lat: number | null | undefined = null;
    let lng: number | null | undefined = null;
    if (value) {
      try {
        const pos = await new Promise<GeoPosition>((resolve, reject) => {
          Geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 5000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        lat = location?.coords?.latitude ?? null;
        lng = location?.coords?.longitude ?? null;
      }
    }
    try {
      await realtime?.toggleAvailability(value, lat, lng);
    } catch (err: any) {
      // El backend puede rechazar la activación (reglas de negocio).
      setOnline(false);
      showNotification({
        title: 'No se pudo activar el modo en línea',
        message: err?.message || 'Completa tu perfil y publica un servicio para continuar.',
        type: 'error',
      });
    }
  };

  const handleRejectRequest = async (orderId: number) => {
    try {
      await realtime?.respondRequest(orderId, 'reject');
    } catch {}
  };

  const walletBalance = wallet?.balance || 0;
  const completedOrdersCount = user?.provider?.completedOrdersCount || 0;
  const planActive = user?.planOrders?.some((p) => p.planActive) || false;

  const handleAcceptRequest = (orderId: number) => {
    const actionId = nextBottomSheetActionId();
    bottomSheetDebug('ACTION', { actionId, key: 'provider_dashboard', action: 'VIEW_ORDER', origin: 'PROVIDER_DASHBOARD', payload: { orderId } });
    bottomSheetDebug('FLOW_INTENT', { actionId, key: 'provider_dashboard', action: 'VIEW_ORDER', target: 'focus_provider' });
    present('focus_provider', { orderId });
  };

  return (
    <BottomSheetScrollView style={styles.container} contentContainerStyle={styles.scrollBody} bounces={true}>
      <View style={styles.onlineRow}>
          <View style={styles.onlineInfo}>
            <View style={[styles.statusDot, online && styles.statusDotActive]} />
            <Text style={[styles.onlineLabel, online && styles.onlineLabelActive]}>
              {online ? 'En línea' : 'Desconectado'}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={handleToggleOnline}
            trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }}
            thumbColor={online ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle}
          />
        </View>

        <Card style={styles.walletCard} padded={false}>
          <TouchableOpacity
            style={styles.walletBtn}
            onPress={() => {
              const actionId = nextBottomSheetActionId();
              bottomSheetDebug('ACTION', { actionId, key: 'provider_dashboard', action: 'OPEN_WALLET', origin: 'PROVIDER_DASHBOARD' });
              bottomSheetDebug('FLOW_INTENT', { actionId, key: 'provider_dashboard', action: 'OPEN_WALLET', target: 'Wallet' });
              navigation.navigate('Wallet');
            }}
            activeOpacity={0.9}
          >
            <View style={styles.walletTextCol}>
              <Text style={styles.walletLabel}>Saldo disponible</Text>
              <Text style={styles.walletVal}>${walletBalance.toLocaleString('es-CL')}</Text>
              <Text style={styles.walletSub}>{completedOrdersCount} servicios completados</Text>
            </View>
            <View style={styles.walletIconCircle}>
              <Icon name="ArrowRight" size={18} color={TOKENS.colors.white} />
            </View>
          </TouchableOpacity>
        </Card>

        {planActive && (
          <Card style={styles.planNoticeCard} padded={true}>
            <View style={styles.planNoticeRow}>
              <Icon name="Crown" size={20} color={TOKENS.colors.starActive} />
              <View style={styles.planNoticeText}>
                <Text style={styles.planNoticeTitle}>Plan Profesional Activo</Text>
                <Text style={styles.planNoticeSub}>Tienes acceso a todas las funciones premium.</Text>
              </View>
              <TouchableOpacity onPress={() => {
                const actionId = nextBottomSheetActionId();
                bottomSheetDebug('ACTION', { actionId, key: 'provider_dashboard', action: 'OPEN_PLANS', origin: 'PROVIDER_DASHBOARD' });
                bottomSheetDebug('FLOW_INTENT', { actionId, key: 'provider_dashboard', action: 'OPEN_PLANS', target: 'Plans' });
                navigation.navigate('Plans');
              }}>
                <Text style={styles.planNoticeLink}>Ver Planes</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

      {/*
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>
            Solicitudes en curso ({online ? (realtime?.providerActiveOrder ? 1 : 0) : 0})
          </Text>

          {!online ? (
            <View style={styles.offlinePlaceholder}>
              <Icon name="WifiOff" size={48} color={TOKENS.colors.textMuted} />
              <Text style={styles.offlineTextPlaceholder}>Conéctate para recibir solicitudes en tiempo real.</Text>
            </View>
          ) : realtime?.providerActiveOrder ? (
            <Card style={styles.requestCard}>
              <View style={styles.reqHeader}>
                <View style={styles.reqHeaderMain}>
                  <Text style={styles.reqTitle} numberOfLines={1}>
                    {realtime.providerActiveOrder.serviceProvider?.service?.name || 'Servicio solicitado'}
                  </Text>
                  <Text style={styles.reqClient}>
                    {realtime.providerActiveOrder.client?.displayName || 'Cliente'}
                  </Text>
                </View>
                <Text style={styles.reqPrice}>
                  ${(realtime.providerActiveOrder.quotedPrice || 0).toLocaleString('es-CL')}
                </Text>
              </View>

              <View style={styles.reqMeta}>
                <View style={styles.reqMetaItem}>
                  <Icon name="MapPin" size={14} color={TOKENS.colors.textSubtle} />
                  <Text style={styles.reqMetaText}>
                    {realtime.providerActiveOrder.clientAddress || 'Dirección no especificada'}
                  </Text>
                </View>
              </View>

              <View style={styles.reqActions}>
                <Button
                  title="Rechazar"
                  variant="white"
                  onPress={() => handleRejectRequest(realtime.providerActiveOrder!.id)}
                  style={styles.declineBtn}
                />
                <Button
                  title="Ver"
                  onPress={() => handleAcceptRequest(realtime.providerActiveOrder!.id)}
                  style={styles.acceptBtn}
                />
              </View>
            </Card>
          ) : (
            <View style={styles.offlinePlaceholder}>
              <Icon name="Clock" size={48} color={TOKENS.colors.textMuted} />
              <Text style={styles.offlineTextPlaceholder}>Esperando nuevas solicitudes...</Text>
            </View>
          )}
        </View>
      */}
    </BottomSheetScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  scrollBody: {
    padding: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    gap: TOKENS.spacing.md,
    paddingBottom: 20,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.surface300,
  },
  statusDotActive: {
    backgroundColor: TOKENS.colors.statusSuccess,
  },
  onlineLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  onlineLabelActive: {
    color: TOKENS.colors.statusSuccess,
  },
  walletCard: {
    backgroundColor: TOKENS.colors.dark900,
    borderColor: TOKENS.colors.dark800,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TOKENS.spacing.lg,
    justifyContent: 'space-between',
  },
  walletTextCol: {
    flex: 1,
  },
  walletLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  walletVal: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    marginTop: 4,
  },
  walletSub: {
    color: TOKENS.colors.brand100,
    fontSize: TOKENS.typography.sizes.xxs,
    marginTop: 2,
    fontWeight: '600',
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planNoticeCard: {
    backgroundColor: TOKENS.colors.white,
  },
  planNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planNoticeText: {
    flex: 1,
    marginLeft: 10,
  },
  planNoticeTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  planNoticeSub: {
    fontSize: TOKENS.typography.sizes.xxs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  planNoticeLink: {
    color: TOKENS.colors.brand500,
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    textDecorationLine: 'underline',
  },
  requestsSection: {
    gap: TOKENS.spacing.md,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  offlinePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  offlineTextPlaceholder: {
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontWeight: '500',
  },
  requestCard: {
    backgroundColor: TOKENS.colors.white,
    gap: 12,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reqHeaderMain: {
    flex: 1,
    marginRight: 12,
  },
  reqTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  reqClient: {
    fontSize: TOKENS.typography.sizes.xxs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
    fontWeight: '500',
  },
  reqPrice: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand600,
  },
  reqMeta: {
    gap: 6,
    paddingVertical: TOKENS.spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.surface100,
  },
  reqMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqMetaText: {
    fontSize: TOKENS.typography.sizes.xxs,
    color: TOKENS.colors.textSubtle,
    fontWeight: '500',
  },
  reqActions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    height: 44,
  },
  acceptBtn: {
    flex: 1,
    height: 44,
  },
});
