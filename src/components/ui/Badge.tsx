import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { TOKENS } from '../../theme';

interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  tone = 'neutral',
  size = 'md',
  style,
}) => {
  const getStyles = () => {
    switch (tone) {
      case 'brand':
        return {
          container: styles.brandContainer,
          text: styles.brandText,
        };
      case 'success':
        return {
          container: styles.successContainer,
          text: styles.successText,
        };
      case 'warning':
        return {
          container: styles.warningContainer,
          text: styles.warningText,
        };
      case 'error':
        return {
          container: styles.errorContainer,
          text: styles.errorText,
        };
      case 'neutral':
      default:
        return {
          container: styles.neutralContainer,
          text: styles.neutralText,
        };
    }
  };

  const currentStyles = getStyles();

  return (
    <View
      style={[
        styles.baseContainer,
        size === 'sm' ? styles.smContainer : styles.mdContainer,
        currentStyles.container,
        style,
      ]}
    >
      <Text
        style={[
          styles.baseText,
          size === 'sm' ? styles.smText : styles.mdText,
          currentStyles.text,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

interface BadgeCountProps {
  count: number;
  max?: number;
  style?: ViewStyle;
}

export const BadgeCount: React.FC<BadgeCountProps> = ({
  count,
  max = 99,
  style,
}) => {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <View style={[styles.badgeCountContainer, style]}>
      <Text style={styles.badgeCountText}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: TOKENS.geometry.radiusPill,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smContainer: {
    paddingHorizontal: TOKENS.spacing.xxs * 1.5,
    paddingVertical: 2,
  },
  mdContainer: {
    paddingHorizontal: TOKENS.spacing.xs,
    paddingVertical: 4,
  },
  neutralContainer: {
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  brandContainer: {
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  successContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  warningContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  baseText: {
    fontWeight: TOKENS.typography.weights.bold,
  },
  smText: {
    fontSize: TOKENS.typography.sizes.xxs - 1,
  },
  mdText: {
    fontSize: TOKENS.typography.sizes.xxs,
  },
  neutralText: {
    color: TOKENS.colors.textSubtle,
  },
  brandText: {
    color: TOKENS.colors.brand500,
  },
  successText: {
    color: TOKENS.colors.statusSuccess,
  },
  warningText: {
    color: TOKENS.colors.statusWarning,
  },
  errorText: {
    color: TOKENS.colors.statusError,
  },
  badgeCountContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.white,
  },
  badgeCountText: {
    color: TOKENS.colors.white,
    fontSize: 8,
    fontWeight: TOKENS.typography.weights.black,
    textAlign: 'center',
  },
});
