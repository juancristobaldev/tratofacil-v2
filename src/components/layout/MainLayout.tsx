import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { BottomNav, AppTab } from './BottomNav';
import { PanelContainer } from './PanelContainer';
import { useRole } from '../../context/RoleContext';
import { HomePage } from '../tabs/HomePage';
import { usePanel } from '../../context/PanelContext';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';
import { useFlow } from '../../hooks/useFlow';
import { setPaymentCallbackHandler } from '../../utils/deepLinks';
import { getImageUrl } from '../../utils/imageUrl';
import { FocusModeClientScreen } from '../../screens/client/FocusModeClientScreen';
import { FocusModeProviderScreen } from '../../screens/provider/FocusModeProviderScreen';
import { MarketplaceTab } from '../tabs/MarketplaceTab';
import { JobsTab } from '../tabs/JobsTab';
import { EarningsTab } from '../tabs/EarningsTab';
import { MyServicesScreen } from '../../screens/shared/MyServicesScreen';
import { TratoDirectoScreen } from '../../screens/shared/TratoDirectoScreen';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

const STATUS_TO_PROVIDER_STATE: Record<string, string> = {
  PENDING: 'VIEW_REQUEST',
  QUOTED: 'WAITING_CLIENT_RESPONSE',
  ACCEPTED: 'EN_CAMINO',
  IN_PROGRESS: 'IN_PROGRESS',
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const { activePanel, closePanel, openPanel, panelData } = usePanel();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const hasAutoOpened = useRef(false);

  const isChatActive = panelData?.orderState === 'CHAT';

  useEffect(() => {
    if (role === 'provider') {
      openPanel('provider_dashboard');
    } else {
      // Si el panel actual era de provider y cambiamos a cliente, cerramos o forzamos categories
      // Ya que HomePage tiene su propio useEffect para abrir 'categories', 
      // esto asegura que el estado sea limpio al volver.
      openPanel('categories');
    }
  }, [role, openPanel]);

  const realtime = useTimeRealServices();
  const flow = useFlow();

  useEffect(() => {
    setPaymentCallbackHandler((token: string, type?: string) => {
      if (type === 'product') {
        flow.confirm('product', token).catch(() => {});
      } else if (type === 'realtime' && realtime?.confirmPayment) {
        realtime.confirmPayment(token).catch(() => {});
      }
    });
  }, [realtime?.confirmPayment, flow]);

  useEffect(() => {
    if (role === 'provider') return;
    if (realtime.cancellingRef?.current) return;

    const order = realtime.activeOrder;
    if (!order?.status) return;
    if (activePanel === 'focus_client') return;

    const TERMINAL = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
    if (TERMINAL.includes(order.status)) return;

    const p = order.provider;
    if (!p) return;

    openPanel('focus_client', {
      order,
      provider: {
        id: String(p.id),
        name: p.name,
        providerName: p.name,
        avatar: getImageUrl((p as any).logoImage?.cdnUrl || null),
        rating: 0,
        reviewsCount: 0,
        verified: false,
        isRealtimeActive: true,
        serviceName: order.serviceProvider?.service?.name || '',
        serviceProviderId: order.serviceProvider?.id,
      },
      userLat: order.clientLat,
      userLng: order.clientLng,
      realtime,
    });
  }, [realtime.activeOrder, realtime.clientOrders, activePanel, openPanel]);

  // Proveedor: si hay una orden en tiempo real activa (no terminal), retomar focus mode.
  useEffect(() => {
    if (role !== 'provider') return;
    if (realtime.cancellingRef?.current) return;

    const order = realtime.providerActiveOrder;
    if (!order?.status) return;
    if (activePanel === 'focus_provider') return;

    if (TERMINAL_STATUSES.includes(order.status)) return;

    const orderState = STATUS_TO_PROVIDER_STATE[order.status];
    if (!orderState) return;

    openPanel('focus_provider', {
      requestId: order.id,
      orderState,
      activeOrder: order,
      realtime,
    });
  }, [
    realtime,
    realtime.providerActiveOrder,
    realtime.activeOrder,
    realtime.cancellingRef,
    activePanel,
    openPanel,
    role,
  ]);

  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    if (activePanel === 'focus_client' || activePanel === 'focus_provider') {
      closePanel();
    }
  }, [activePanel, closePanel]);

  const BOTTOM_NAV_HEIGHT = 75 + insets.bottom;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'marketplace':
        return <MarketplaceTab />;
      case 'jobs':
        return role === 'provider' ? <MyServicesScreen /> : <JobsTab />;
      case 'direct':
        return role === 'provider' ? <EarningsTab /> : <View style={styles.placeholder}><Text>Trato Directo</Text></View>;
      case 'trato_directo':
        return <TratoDirectoScreen />;
      default:
        return children;
    }
  };

  return (
    <View style={styles.root}>


      {/* Content area */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Overlays de Focus Mode (se detienen sobre el bottom nav) */}
      {role !== 'provider' && activePanel === 'focus_client' && (
        <View style={[styles.focusOverlay, isChatActive && { bottom: 0, zIndex: 600 }]}>
          <FocusModeClientScreen />
        </View>
      )}

      {role === 'provider' && activePanel === 'focus_provider' && (
        <View style={[styles.focusOverlay, isChatActive && { bottom: 0, zIndex: 600 }]}>
          <FocusModeProviderScreen />
        </View>
      )}

      {/* Panel container (above content, below bottom nav) */}
      {activeTab === 'home' && !(activePanel === 'focus_client' && realtime.activeOrder?.status === 'PENDING') && (
        <PanelContainer bottomNavHeight={BOTTOM_NAV_HEIGHT} />
      )}

      {/* Bottom nav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        role={role}
        notificationCount={3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface100,
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 75,
    zIndex: 250,
  },
});
