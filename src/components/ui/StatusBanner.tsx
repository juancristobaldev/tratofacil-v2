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
import { Icon, IconName } from './Icon';

export type StatusBannerVariant = 'success' | 'error' | 'warning' | 'info' | 'brand';

export interface StatusBannerProps {
  title: string;
  description?: string;
  variant?: StatusBannerVariant;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  title,
  description,
  variant = 'info',
  icon,
  actionLabel,
  onAction,
  style,
  testID,
}) => {
  const getConfig = () => {
    switch (variant) {
      case 'success':
        return {
          bg: TOKENS.colors.surfaceSuccess,
          border: TOKENS.colors.success200,
          titleColor: TOKENS.colors.success800,
          descColor: TOKENS.colors.success700,
          iconColor: TOKENS.colors.success500,
          defaultIcon: 'CheckCircle' as IconName,
        };
      case 'error':
        return {
          bg: TOKENS.colors.surfaceError,
          border: TOKENS.colors.error200,
          titleColor: TOKENS.colors.error700,
          descColor: TOKENS.colors.error600,
          iconColor: TOKENS.colors.statusError,
          defaultIcon: 'AlertCircle' as IconName,
        };
      case 'warning':
        return {
          bg: TOKENS.colors.surfaceWarning,
          border: TOKENS.colors.warning200,
          titleColor: TOKENS.colors.warning700,
          descColor: TOKENS.colors.warning600,
          iconColor: TOKENS.colors.statusWarning,
          defaultIcon: 'AlertTriangle' as IconName,
        };
      case 'brand':
        return {
          bg: TOKENS.colors.brand50,
          border: TOKENS.colors.brand100,
          titleColor: TOKENS.colors.brand800,
          descColor: TOKENS.colors.brand700,
          iconColor: TOKENS.colors.brand500,
          defaultIcon: 'Shield' as IconName,
        };
      case 'info':
      default:
        return {
          bg: TOKENS.colors.surfaceInfo,
          border: TOKENS.colors.info200,
          titleColor: TOKENS.colors.info700,
          descColor: TOKENS.colors.info600,
          iconColor: TOKENS.colors.statusInfo,
          defaultIcon: 'Info' as IconName,
        };
    }
  };

  const config = getConfig();
  const activeIcon = icon || config.defaultIcon;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.iconWrap}>
        <Icon name={activeIcon} size={20} color={config.iconColor} />
      </View>
      <View style={styles.contentWrap}>
        <Text style={[styles.title, { color: config.titleColor }]}>{title}</Text>
        {description && (
          <Text style={[styles.description, { color: config.descColor }]}>
            {description}
          </Text>
        )}
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionText, { color: config.iconColor }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: TOKENS.spacing.md - 2,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    width: '100%',
  },
  iconWrap: {
    marginRight: TOKENS.spacing.sm,
    marginTop: 2,
  },
  contentWrap: {
    flex: 1,
  },
  title: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
  description: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.medium,
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    marginLeft: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.xs,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
  },
});
