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

export const ProviderPanelContent: React.FC<SheetComponentProps<'provider_dashboard'>> = ({
  isCollapsed = false,
  setIndex,
}) => {
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

  if (isCollapsed) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactCardRow}>
          <TouchableOpacity
            style={styles.compactOnlineInfo}
            onPress={() => setIndex?.(1)}
            activeOpacity={0.8}
            accessibilityLabel="Expandir panel del profesional"
            accessibilityRole="button"
          >
            <View style={[styles.statusDot, online && styles.statusDotActive]} />
            <View style={styles.compactTextCol}>
              <Text style={styles.compactOnlineTitle} numberOfLines={1}>
                {online ? 'Disponible para órdenes' : 'Desconectado'}
              </Text>
              <Text style={styles.compactOnlineSubtitle} numberOfLines={1}>
                Saldo: ${walletBalance.toLocaleString('es-CL')} • {completedOrdersCount} servicios
              </Text>
            </View>
            <Icon name="ChevronUp" size={18} color={TOKENS.colors.textMuted} />
          </TouchableOpacity>
          <Switch
            value={online}
            onValueChange={handleToggleOnline}
            trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }}
            thumbColor={online ? TOKENS.colors.brand500 : TOKENS.colors.surface300}
            accessibilityLabel={online ? 'Desactivar disponibilidad' : 'Activar disponibilidad'}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.onlineCard}>
        <View style={styles.onlineInfo}>
          <View style={[styles.statusDot, online && styles.statusDotActive]} />
          <View>
            <Text style={styles.onlineTitle}>
              {online ? 'Disponible para órdenes' : 'Desconectado'}
            </Text>
            <Text style={styles.onlineSubtitle}>
              {online ? 'Recibiendo solicitudes en tiempo real' : 'Actívate para recibir solicitudes'}
            </Text>
          </View>
        </View>
        <Switch
          value={online}
          onValueChange={handleToggleOnline}
          trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }}
          thumbColor={online ? TOKENS.colors.brand500 : TOKENS.colors.surface300}
        />
      </View>

      <View style={styles.walletCard}>
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
      </View>

      {planActive && (
        <View style={styles.planNoticeCard}>
          <View style={styles.planNoticeRow}>
            <View style={styles.crownCircle}>
              <Icon name="Crown" size={20} color={TOKENS.colors.starActive} />
            </View>
            <View style={styles.planNoticeText}>
              <Text style={styles.planNoticeTitle}>Plan Profesional Activo</Text>
              <Text style={styles.planNoticeSub}>Acceso a beneficios premium</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const actionId = nextBottomSheetActionId();
                bottomSheetDebug('ACTION', { actionId, key: 'provider_dashboard', action: 'OPEN_PLANS', origin: 'PROVIDER_DASHBOARD' });
                bottomSheetDebug('FLOW_INTENT', { actionId, key: 'provider_dashboard', action: 'OPEN_PLANS', target: 'Plans' });
                navigation.navigate('Plans');
              }}
              style={styles.planLinkBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.planNoticeLink}>Ver Planes</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    paddingTop: TOKENS.spacing.xs,
    paddingHorizontal: TOKENS.spacing.lg,
    gap: 14,
    paddingBottom: 8,
  },
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 16,
    ...TOKENS.shadows.soft,
  },
  onlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: TOKENS.colors.surface300,
  },
  statusDotActive: {
    backgroundColor: TOKENS.colors.statusSuccess,
  },
  onlineTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  onlineSubtitle: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
    fontWeight: TOKENS.typography.weights.medium,
  },
  walletCard: {
    backgroundColor: TOKENS.colors.dark900,
    borderRadius: 24,
    overflow: 'hidden',
    ...TOKENS.shadows.floating,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'space-between',
  },
  walletTextCol: {
    flex: 1,
  },
  walletLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  walletVal: {
    color: TOKENS.colors.white,
    fontSize: 30,
    fontWeight: TOKENS.typography.weights.black,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  walletSub: {
    color: TOKENS.colors.brand100,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  planNoticeCard: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 16,
    ...TOKENS.shadows.soft,
  },
  planNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crownCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TOKENS.colors.warning50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.warning200,
  },
  planNoticeText: {
    flex: 1,
    marginLeft: 12,
  },
  planNoticeTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  planNoticeSub: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
    fontWeight: TOKENS.typography.weights.medium,
  },
  planLinkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  planNoticeLink: {
    color: TOKENS.colors.brand700,
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
  },
  compactContainer: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.sm,
  },
  compactCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 12,
    ...TOKENS.shadows.soft,
    gap: 10,
  },
  compactOnlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  compactTextCol: {
    flex: 1,
  },
  compactOnlineTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  compactOnlineSubtitle: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 1,
    fontWeight: TOKENS.typography.weights.medium,
  },
});
