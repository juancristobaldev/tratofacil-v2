import React from 'react';
import { StyleSheet, Text, ActivityIndicator, ViewStyle, TextStyle, StyleProp, View, Insets } from 'react-native';
import { TouchableOpacity } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TOKENS, MOTION } from '../../theme';
import { Icon, IconName } from './Icon';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'white'
  | 'danger'
  | 'danger-outline'
  | 'ghost'
  | 'subtle'
  | 'dark';

export type ButtonSize = 'lg' | 'md' | 'sm' | 'xs';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: IconName;
  iconLeft?: IconName;
  iconRight?: IconName;
  iconColor?: string;
  iconSize?: number;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  debugId?: string;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  hitSlop?: Insets | number;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  accessibilityLabel,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  icon,
  iconLeft,
  iconRight,
  iconColor,
  iconSize,
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
  debugId,
  adjustsFontSizeToFit = false,
  minimumFontScale = 0.8,
  hitSlop,
}) => {
  const effectiveIconLeft = iconLeft || icon;

  const getVariantStyles = () => {
    switch (variant) {
      case 'ghost':
        return {
          container: styles.ghostContainer,
          text: styles.ghostText,
          defaultIconColor: TOKENS.colors.brand500,
          loaderColor: TOKENS.colors.brand500,
        };
      case 'subtle':
        return {
          container: styles.subtleContainer,
          text: styles.subtleText,
          defaultIconColor: TOKENS.colors.textMain,
          loaderColor: TOKENS.colors.textSubtle,
        };
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
          defaultIconColor: TOKENS.colors.brand500,
          loaderColor: TOKENS.colors.brand500,
        };
      case 'white':
        return {
          container: styles.whiteContainer,
          text: styles.whiteText,
          defaultIconColor: TOKENS.colors.textMain,
          loaderColor: TOKENS.colors.textSubtle,
        };
      case 'outline':
        return {
          container: styles.outlineContainer,
          text: styles.outlineText,
          defaultIconColor: TOKENS.colors.brand500,
          loaderColor: TOKENS.colors.brand500,
        };
      case 'danger':
        return {
          container: styles.dangerContainer,
          text: styles.dangerText,
          defaultIconColor: TOKENS.colors.white,
          loaderColor: TOKENS.colors.white,
        };
      case 'danger-outline':
        return {
          container: styles.dangerOutlineContainer,
          text: styles.dangerOutlineText,
          defaultIconColor: TOKENS.colors.statusDanger,
          loaderColor: TOKENS.colors.statusDanger,
        };
      case 'dark':
        return {
          container: styles.darkContainer,
          text: styles.darkText,
          defaultIconColor: TOKENS.colors.white,
          loaderColor: TOKENS.colors.white,
        };
      case 'primary':
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          defaultIconColor: TOKENS.colors.white,
          loaderColor: TOKENS.colors.white,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'lg':
        return {
          container: styles.sizeLg,
          text: styles.textLg,
          iconSize: iconSize || 20,
          loaderSize: 'small' as const,
        };
      case 'sm':
        return {
          container: styles.sizeSm,
          text: styles.textSm,
          iconSize: iconSize || 15,
          loaderSize: 'small' as const,
        };
      case 'xs':
        return {
          container: styles.sizeXs,
          text: styles.textXs,
          iconSize: iconSize || 13,
          loaderSize: 'small' as const,
        };
      case 'md':
      default:
        return {
          container: styles.sizeMd,
          text: styles.textMd,
          iconSize: iconSize || 17,
          loaderSize: 'small' as const,
        };
    }
  };

  const currentVariant = getVariantStyles();
  const currentSize = getSizeStyles();

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:BUTTON_PRESS_IN] debugId=${debugId} label=${title}`);
    }
    if (!disabled && !loading) {
      scale.value = withSpring(MOTION.scale.pressed, MOTION.spring.snappy);
    }
  };

  const handlePressOut = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:BUTTON_PRESS_OUT] debugId=${debugId} label=${title}`);
    }
    scale.value = withSpring(1, MOTION.spring.snappy);
  };

  const handlePress = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:BUTTON_PRESS] debugId=${debugId} label=${title} handlerAvailable=${typeof onPress === 'function'}`);
    }
    if (!disabled && !loading) {
      onPress();
    }
  };

  const handleTouchStart = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:BUTTON_TOUCH_START] debugId=${debugId} label=${title}`);
    }
  };

  const isUnavailable = disabled || loading;
  const debugTouchProps = debugId ? ({ onTouchStart: handleTouchStart } as any) : undefined;
  const resolvedIconColor = iconColor || currentVariant.defaultIconColor;

  const resolvedHitSlop = React.useMemo(() => {
    if (hitSlop !== undefined) return hitSlop;
    if (size === 'xs') {
      // visual height 28px -> +16px vertical/horizontal hitSlop ensures WCAG 2.2 AA (44x44pt) target size
      return { top: 8, bottom: 8, left: 8, right: 8 };
    }
    if (size === 'sm') {
      // visual height 36px -> +8px vertical/horizontal hitSlop ensures 44x44pt target size
      return { top: 4, bottom: 4, left: 4, right: 4 };
    }
    return undefined;
  }, [hitSlop, size]);

  return (
    <TouchableOpacity
      testID={testID}
      hitSlop={resolvedHitSlop}
      style={[
        styles.baseContainer,
        currentSize.container,
        currentVariant.container,
        fullWidth ? styles.fullWidth : styles.autoWidth,
        disabled && styles.disabledContainer,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isUnavailable}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isUnavailable, busy: loading }}
      onLayout={(event) => {
        if (__DEV__ && debugId) {
          const { width, height } = event.nativeEvent.layout;
          console.log(`[UI:BUTTON_LAYOUT] debugId=${debugId} width=${width} height=${height}`);
        }
      }}
      {...debugTouchProps}
    >
      <Animated.View style={[styles.contentContainer, animatedStyle]} pointerEvents="none">
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size={currentSize.loaderSize} color={currentVariant.loaderColor} />
          </View>
        ) : (
          <>
            {effectiveIconLeft && (
              <Icon
                name={effectiveIconLeft}
                size={currentSize.iconSize}
                color={disabled ? TOKENS.colors.textMuted : resolvedIconColor}
                style={styles.iconLeft}
              />
            )}
            <Text
              style={[
                styles.baseText,
                currentSize.text,
                currentVariant.text,
                disabled && styles.disabledText,
                textStyle,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              {...(adjustsFontSizeToFit ? { adjustsFontSizeToFit: true, minimumFontScale } : {})}
            >
              {title}
            </Text>
            {iconRight && (
              <Icon
                name={iconRight}
                size={currentSize.iconSize}
                color={disabled ? TOKENS.colors.textMuted : resolvedIconColor}
                style={styles.iconRight}
              />
            )}
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    borderRadius: TOKENS.geometry.radiusInput,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  autoWidth: {
    alignSelf: 'flex-start',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },

  // SIZES
  sizeLg: {
    minHeight: 52,
    paddingVertical: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.lg,
    borderRadius: TOKENS.geometry.radiusCard,
    ...TOKENS.shadows.medium,
  },
  sizeMd: {
    minHeight: 46,
    paddingVertical: TOKENS.spacing.xs + 2,
    paddingHorizontal: TOKENS.spacing.md,
    borderRadius: TOKENS.geometry.radiusInput,
    ...TOKENS.shadows.soft,
  },
  sizeSm: {
    minHeight: 36,
    paddingVertical: TOKENS.spacing.xxs + 2,
    paddingHorizontal: TOKENS.spacing.sm + 2,
    borderRadius: TOKENS.geometry.radiusSm,
  },
  sizeXs: {
    minHeight: 28,
    paddingVertical: 2,
    paddingHorizontal: TOKENS.spacing.xs,
    borderRadius: TOKENS.geometry.radiusSm - 2,
  },

  // TEXT SIZES
  textLg: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
  },
  textMd: {
    fontSize: TOKENS.typography.sizes.sm + 1,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  textSm: {
    fontSize: TOKENS.typography.sizes.xs + 1,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  textXs: {
    fontSize: TOKENS.typography.sizes.xxs + 1,
    fontWeight: TOKENS.typography.weights.medium,
  },

  // VARIANTS
  primaryContainer: {
    backgroundColor: TOKENS.colors.brand700,
  },
  secondaryContainer: {
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
    shadowOpacity: 0,
    elevation: 0,
  },
  outlineContainer: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.brand500,
    shadowOpacity: 0,
    elevation: 0,
  },
  whiteContainer: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  dangerContainer: {
    backgroundColor: TOKENS.colors.statusDanger,
  },
  dangerOutlineContainer: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.statusDanger,
    shadowOpacity: 0,
    elevation: 0,
  },
  darkContainer: {
    backgroundColor: TOKENS.colors.dark900,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  subtleContainer: {
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledContainer: {
    backgroundColor: TOKENS.colors.surface200,
    borderColor: TOKENS.colors.surface200,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.7,
  },

  // TEXT STYLES
  baseText: {
    textAlign: 'center',
    flexShrink: 1,
  },
  primaryText: {
    color: TOKENS.colors.white,
  },
  secondaryText: {
    color: TOKENS.colors.brand700,
  },
  outlineText: {
    color: TOKENS.colors.brand700,
  },
  whiteText: {
    color: TOKENS.colors.textMain,
  },
  dangerText: {
    color: TOKENS.colors.white,
  },
  dangerOutlineText: {
    color: TOKENS.colors.statusDanger,
  },
  darkText: {
    color: TOKENS.colors.white,
  },
  ghostText: {
    color: TOKENS.colors.brand600,
    fontWeight: TOKENS.typography.weights.medium,
  },
  subtleText: {
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.medium,
  },
  disabledText: {
    color: TOKENS.colors.textMuted,
  },

  // ICONS
  iconLeft: {
    marginRight: TOKENS.spacing.xs,
  },
  iconRight: {
    marginLeft: TOKENS.spacing.xs,
  },
});

