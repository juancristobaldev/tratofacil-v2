import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

// --- SEGMENTED TABS ---
export interface TabOption<T> {
  key: T;
  label: string;
  count?: number;
  icon?: IconName;
}

export interface SegmentedTabsProps<T> {
  tabs: TabOption<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  testID?: string;
}

export function SegmentedTabs<T extends string | number>({
  tabs,
  activeTab,
  onTabChange,
  style,
  contentContainerStyle,
  scrollable,
  testID,
}: SegmentedTabsProps<T>) {
  const isScrollable = scrollable !== undefined ? scrollable : tabs.length > 3;
  const scrollViewRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

  const scrollToTab = (key: T) => {
    const layout = tabLayoutsRef.current[String(key)];
    if (layout && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: Math.max(0, layout.x - 24),
        animated: true,
      });
    }
  };

  const handleTabPress = (key: T) => {
    onTabChange(key);
    if (isScrollable) {
      scrollToTab(key);
    }
  };

  useEffect(() => {
    if (isScrollable) {
      const timer = setTimeout(() => {
        scrollToTab(activeTab);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isScrollable]);

  const renderTabsContent = () =>
    tabs.map((tab) => {
      const isActive = tab.key === activeTab;
      return (
        <TouchableOpacity
          key={String(tab.key)}
          onPress={() => handleTabPress(tab.key)}
          onLayout={
            isScrollable
              ? (e) => {
                  const { x, width } = e.nativeEvent.layout;
                  tabLayoutsRef.current[String(tab.key)] = { x, width };
                }
              : undefined
          }
          activeOpacity={0.8}
          style={[
            isScrollable ? styles.scrollTabButton : styles.tabButton,
            isActive && styles.activeTabButton,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
          accessibilityLabel={tab.label}
        >
          {tab.icon && (
            <Icon
              name={tab.icon}
              size={16}
              color={isActive ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle}
              style={styles.tabIcon}
            />
          )}
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
    });

  if (isScrollable) {
    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={[styles.scrollContainer, style]}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        testID={testID}
      >
        {renderTabsContent()}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderTabsContent()}
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
  scrollContainer: {
    backgroundColor: 'rgba(226, 232, 240, 0.6)',
    borderRadius: TOKENS.geometry.radiusInput,
    padding: 3,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  scrollTabButton: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.xs + 2,
    borderRadius: TOKENS.geometry.radiusSm + 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 38,
  },
  tabIcon: {
    marginRight: 6,
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
