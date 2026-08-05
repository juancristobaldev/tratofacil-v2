import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon } from '../ui/Icon';

export type AppTab = 'home' | 'direct' | 'marketplace' | 'jobs' | 'trato_directo';

interface TabItem {
  key: AppTab;
  label: string;
  icon: string;
  iconFilled?: string;
}

const CLIENT_TABS: TabItem[] = [
  { key: 'home', label: 'Buscar', icon: 'Search', iconFilled: 'Search' },
  { key: 'marketplace', label: 'Marketplace', icon: 'Store' },
  { key: 'jobs', label: 'Trabajos', icon: 'Briefcase' },
  { key: 'trato_directo', label: 'Trato Directo', icon: 'Sparkles' },
];

const PROVIDER_TABS: TabItem[] = [
  { key: 'home', label: 'Mapa', icon: 'MapPin' },
  { key: 'direct', label: 'Ganancias', icon: 'TrendingUp' },
  { key: 'trato_directo', label: 'Trato Directo', icon: 'Sparkles' },
];

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  role: 'guest' | 'client' | 'provider';
  notificationCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  role,
  notificationCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const tabs = (role === 'provider') ? PROVIDER_TABS : CLIENT_TABS;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 4 }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={styles.tab}
            activeOpacity={0.6}
          >
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              <Icon
                name={tab.icon as any}
                size={isActive ? 22 : 20}
                color={isActive ? TOKENS.colors.brand500 : TOKENS.colors.textMuted}
                fill={isActive ? TOKENS.colors.brand50 : 'none'}
              />
              {tab.key === 'jobs' && notificationCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? TOKENS.colors.brand500 : TOKENS.colors.textMuted },
                isActive && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: TOKENS.colors.white,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 6,
    paddingHorizontal: 4,
    zIndex: 500,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconWrapperActive: {
    backgroundColor: TOKENS.colors.brand50,
  },
  label: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.medium,
  },
  labelActive: {
    fontWeight: TOKENS.typography.weights.bold,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.white,
  },
  notifText: {
    color: TOKENS.colors.white,
    fontSize: 8,
    fontWeight: TOKENS.typography.weights.bold,
  },
});
