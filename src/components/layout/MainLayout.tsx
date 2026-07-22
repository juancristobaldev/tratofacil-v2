import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { BottomNav, AppTab } from './BottomNav';
import { PanelContainer } from './PanelContainer';
import { useRole } from '../../context/RoleContext';
import { HomePage } from '../tabs/HomePage';
import { usePanel } from '../../context/PanelContext';
import { FocusModeClientScreen } from '../../screens/client/FocusModeClientScreen';
import { FocusModeProviderScreen } from '../../screens/provider/FocusModeProviderScreen';
import { MarketplaceTab } from '../tabs/MarketplaceTab';
import { JobsTab } from '../tabs/JobsTab';
import { EarningsTab } from '../tabs/EarningsTab';
import { MyProfileScreen } from '../../screens/shared/MyProfileScreen';
import { MyServicesScreen } from '../../screens/shared/MyServicesScreen';
import { TratoDirectoScreen } from '../../screens/shared/TratoDirectoScreen';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const { activePanel, closePanel, openPanel, panelData } = usePanel();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const hasAutoOpened = useRef(false);

  const isChatActive = panelData?.orderState === 'CHAT';

  useEffect(() => {
    if (role === 'provider' && activePanel === null && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openPanel('provider_dashboard');
    }
    if (role === 'client' || role === 'guest') {
      hasAutoOpened.current = false;
    }
  }, [role, activePanel, openPanel]);

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
      case 'account':
        return <MyProfileScreen />;
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
      {activePanel === 'focus_client' && (
        <View style={[styles.focusOverlay, isChatActive && { bottom: 0, zIndex: 600 }]}>
          <FocusModeClientScreen />
        </View>
      )}

      {activePanel === 'focus_provider' && (
        <View style={[styles.focusOverlay, isChatActive && { bottom: 0, zIndex: 600 }]}>
          <FocusModeProviderScreen />
        </View>
      )}

      {/* Panel container (above content, below bottom nav) */}
      {activeTab === 'home' && (
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
