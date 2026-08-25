import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import { TOKENS } from '../../theme';

// --- SEGMENTED TABS ---
export interface TabOption<T> {
  key: T;
  label: string;
  count?: number;
}

export interface SegmentedTabsProps<T> {
  tabs: TabOption<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SegmentedTabs<T extends string | number>({
  tabs,
  activeTab,
  onTabChange,
  style,
  testID,
}: SegmentedTabsProps<T>) {
  return (
    <View style={[styles.container, style]} testID={testID}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={String(tab.key)}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.8}
            style={[styles.tabButton, isActive && styles.activeTabButton]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Text
              style={[styles.tabText, isActive ? styles.activeTabText : styles.inactiveTabText]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {typeof tab.count === 'number' && (
              <View
                style={[
                  styles.badge,
                  isActive ? styles.activeBadge : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isActive ? styles.activeBadgeText : styles.inactiveBadgeText,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// --- INTERVAL TOGGLE (e.g. Mensual / Anual -20%) ---
export interface IntervalToggleProps {
  isAnnual: boolean;
  onToggle: (annual: boolean) => void;
  discountLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const IntervalToggle: React.FC<IntervalToggleProps> = ({
  isAnnual,
  onToggle,
  discountLabel = '-20%',
  style,
  testID,
}) => {
  return (
    <View style={[styles.intervalContainer, style]} testID={testID}>
      <TouchableOpacity
        onPress={() => onToggle(false)}
        activeOpacity={0.8}
        style={[styles.intervalBtn, !isAnnual && styles.intervalBtnActive]}
      >
        <Text style={[styles.intervalBtnText, !isAnnual && styles.intervalBtnTextActive]}>
          Mensual
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onToggle(true)}
        activeOpacity={0.8}
        style={[styles.intervalBtn, isAnnual && styles.intervalBtnActive]}
      >
        <Text style={[styles.intervalBtnText, isAnnual && styles.intervalBtnTextActive]}>
          Anual{' '}
          <Text style={styles.discountText}>{discountLabel}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(226, 232, 240, 0.6)',
    borderRadius: TOKENS.geometry.radiusInput,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  tabButton: {
    flex: 1,
    paddingVertical: TOKENS.spacing.xs + 2,
    borderRadius: TOKENS.geometry.radiusSm + 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 38,
  },
  activeTabButton: {
    backgroundColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  tabText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
  activeTabText: {
    color: TOKENS.colors.dark900,
  },
  inactiveTabText: {
    color: TOKENS.colors.textSubtle,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: TOKENS.geometry.radiusPill,
  },
  activeBadge: {
    backgroundColor: TOKENS.colors.brand50,
  },
  inactiveBadge: {
    backgroundColor: TOKENS.colors.surface200,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
  },
  activeBadgeText: {
    color: TOKENS.colors.brand500,
  },
  inactiveBadgeText: {
    color: TOKENS.colors.textSubtle,
  },
  intervalContainer: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: TOKENS.geometry.radiusPill,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    ...TOKENS.shadows.soft,
  },
  intervalBtn: {
    paddingHorizontal: TOKENS.spacing.md + 4,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.geometry.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalBtnActive: {
    backgroundColor: TOKENS.colors.dark900,
  },
  intervalBtnText: {
    fontSize: TOKENS.typography.sizes.xs + 1,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  intervalBtnTextActive: {
    color: TOKENS.colors.white,
  },
  discountText: {
    color: TOKENS.colors.success500,
    fontWeight: TOKENS.typography.weights.black,
  },
});
