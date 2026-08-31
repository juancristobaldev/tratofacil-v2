import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { RequireLocation } from '../ui';
import { BottomNav, AppTab } from './BottomNav';
import { useRole } from '../../context/RoleContext';
import { HomePage } from '../tabs/HomePage';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { useRealtime } from '../../realtime/RealtimeContext';

import { FocusModeClientScreen } from '../../screens/client/FocusModeClientScreen';
import { FocusModeProviderScreen } from '../../screens/provider/FocusModeProviderScreen';
import { MarketplaceTab } from '../tabs/MarketplaceTab';
import { JobsTab } from '../tabs/JobsTab';
import { EarningsTab } from '../tabs/EarningsTab';
import { MyServicesScreen } from '../../screens/shared/MyServicesScreen';
import { TratoDirectoScreen } from '../../screens/shared/TratoDirectoScreen';
import { useBottomNavHeight } from './bottomNavMetrics';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const { active, pendingMapFlowKey } = useBottomSheet();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const bottomNavHeight = useBottomNavHeight();
  const realtime = useRealtime();
  const clientRealtimeOrder = realtime.localActiveOrder || realtime.activeOrder;
  const nonTerminalClientOrder = !!clientRealtimeOrder?.status && !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(clientRealtimeOrder.status);
  const providerRealtimeOrder = realtime.providerActiveOrder;
  const nonTerminalProviderOrder = !!providerRealtimeOrder?.status && !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(providerRealtimeOrder.status);
  const shouldShowClientFocus = role !== 'provider' && (active === 'focus_client' || nonTerminalClientOrder);
  const shouldShowProviderFocus = role === 'provider' && (active === 'focus_provider' || nonTerminalProviderOrder);

  const renderCountRef = useRef(0);
  if (__DEV__) {
    renderCountRef.current++;
    console.log('[TRACE:RENDER_COUNT] MainLayout #' + renderCountRef.current + ' | activeTab:', activeTab, '| role:', role);
  }

  useEffect(() => {
    if (__DEV__) console.log('[TRACE:LAYOUT] MainLayout mounted');
    return () => {
      if (__DEV__) console.log('[TRACE:LAYOUT] MainLayout unmounted');
    };
  }, []);

  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    // Let the isMapFlowActive effect handle dismissAll automatically
  }, []);

  useEffect(() => {
    if (pendingMapFlowKey && activeTab !== 'home') {
      setActiveTab('home');
    }
  }, [activeTab, pendingMapFlowKey]);

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
    <RequireLocation>
      <View style={styles.root}>


        {/* Content area */}
        <View style={[styles.content, { marginBottom: bottomNavHeight }]}>
          {renderTabContent()}
        </View>

        {/* Focus Mode background layers (se detienen sobre el bottom nav) */}
        {shouldShowClientFocus && (
          <View style={[styles.focusOverlay, { bottom: bottomNavHeight }]}> 
            <FocusModeClientScreen />
          </View>
        )}

        {shouldShowProviderFocus && (
          <View style={[styles.focusOverlay, { bottom: bottomNavHeight }]}>
            <FocusModeProviderScreen />
          </View>
        )}

        {/* Bottom nav */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          role={role}
        />
      </View>
    </RequireLocation>
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
    zIndex: 0,
    elevation: 0,
  },
});
