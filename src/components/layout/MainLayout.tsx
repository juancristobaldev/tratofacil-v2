import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { RequireLocation } from '../ui';
import { BottomNav, AppTab } from './BottomNav';
import { useRole } from '../../context/RoleContext';
import { HomePage } from '../tabs/HomePage';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { useRealtime } from '../../realtime/RealtimeContext';

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

  useEffect(() => {
    const onBackPress = () => {
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeTab]);

  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    // Let the isMapFlowActive effect handle dismissAll automatically
  }, []);

  useEffect(() => {
    if (pendingMapFlowKey && activeTab !== 'home') {
      setActiveTab('home');
    }
  }, [activeTab, pendingMapFlowKey]);

  const tabContent = useMemo(() => {
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
  }, [activeTab, role, children]);

  const activeSurface = tabContent;

  const contentContainerStyle = useMemo(
    () => [styles.content, { marginBottom: bottomNavHeight }],
    [bottomNavHeight],
  );

  return (
    <RequireLocation>
      <View style={styles.root}>
        {/* Content area */}
        <View style={contentContainerStyle}>
          {activeSurface}
        </View>

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
});
