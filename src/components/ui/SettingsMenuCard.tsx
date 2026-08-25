import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';
import { Badge } from './Badge';

export interface MenuItemProps {
  id?: string;
  icon: IconName;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'neutral' | 'brand' | 'success' | 'warning' | 'error';
  onPress: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}

export interface SettingsMenuCardProps {
  title?: string;
  items: MenuItemProps[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SettingsMenuCard: React.FC<SettingsMenuCardProps> = ({
  title,
  items,
  style,
  testID,
}) => {
  return (
    <View testID={testID} style={[styles.cardContainer, style]}>
      {title && <Text style={styles.cardHeaderTitle}>{title}</Text>}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const iconColor = item.destructive
          ? TOKENS.colors.statusError
          : item.iconColor || TOKENS.colors.brand500;
        const iconBgColor = item.destructive
          ? TOKENS.colors.surfaceError
          : item.iconBgColor || TOKENS.colors.brand50;

        return (
          <React.Fragment key={item.id || index}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                <Icon name={item.icon} size={18} color={iconColor} />
              </View>

              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.itemTitle,
                    item.destructive && styles.destructiveText,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>

              {item.badge ? (
                <Badge
                  label={item.badge}
                  tone={item.badgeTone || 'neutral'}
                  style={styles.badgeMargin}
                />
              ) : null}

              {item.showChevron !== false && (
                <Icon
                  name="ChevronRight"
                  size={18}
                  color={TOKENS.colors.surface300}
                />
              )}
            </TouchableOpacity>
            {!isLast && <View style={styles.divider} />}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusCard,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
    marginBottom: TOKENS.spacing.md,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minHeight: 52,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  itemSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  destructiveText: {
    color: TOKENS.colors.statusError,
  },
  badgeMargin: {
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.surface100,
    marginLeft: 64,
  },
});
