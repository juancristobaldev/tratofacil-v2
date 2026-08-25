import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  Insets,
} from 'react-native';
import { TouchableOpacity } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TOKENS, MOTION } from '../../theme';
import { Icon, IconName } from './Icon';

export type IconButtonVariant =
  | 'surface'
  | 'ghost'
  | 'primary'
  | 'secondary'
  | 'white'
  | 'danger'
  | 'dark';

export type IconButtonSize = 'lg' | 'md' | 'sm' | 'xs';
export type IconButtonShape = 'circle' | 'rounded' | 'square';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: IconButtonShape;
  iconColor?: string;
  iconSize?: number;
  badge?: number | boolean | string;
  badgeColor?: string;
  disabled?: boolean;
  loading?: boolean;
  hitSlop?: Insets | number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  debugId?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 'md',
  shape = 'circle',
  iconColor,
  iconSize,
  badge,
  badgeColor,
  disabled = false,
  loading = false,
  hitSlop,
  style,
  testID,
  debugId,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getVariantStyles = () => {
    switch (variant) {
      case 'ghost':
        return {
          container: styles.variantGhost,
          defaultIconColor: TOKENS.colors.textMain,
          loaderColor: TOKENS.colors.brand500,
        };
      case 'primary':
        return {
          container: styles.variantPrimary,
          defaultIconColor: TOKENS.colors.white,
          loaderColor: TOKENS.colors.white,
        };
      case 'secondary':
        return {
          container: styles.variantSecondary,
          defaultIconColor: TOKENS.colors.brand700,
          loaderColor: TOKENS.colors.brand500,
        };
      case 'white':
        return {
          container: styles.variantWhite,
          defaultIconColor: TOKENS.colors.textMain,
          loaderColor: TOKENS.colors.textSubtle,
        };
      case 'danger':
        return {
          container: styles.variantDanger,
          defaultIconColor: TOKENS.colors.white,
          loaderColor: TOKENS.colors.white,
        };
      case 'dark':
        return {
          container: styles.variantDark,
          defaultIconColor: TOKENS.colors.white,
          loaderColor: TOKENS.colors.white,
        };
      case 'surface':
      default:
        return {
          container: styles.variantSurface,
          defaultIconColor: TOKENS.colors.textMain,
          loaderColor: TOKENS.colors.brand500,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'lg':
        return {
          container: styles.sizeLg,
          iconSize: iconSize || 22,
          defaultHitSlop: undefined,
        };
      case 'sm':
        return {
          container: styles.sizeSm,
          iconSize: iconSize || 16,
          // Guarantee 44x44 minimum touch target for ergonomic fingers
          defaultHitSlop: { top: 6, bottom: 6, left: 6, right: 6 },
        };
      case 'xs':
        return {
          container: styles.sizeXs,
          iconSize: iconSize || 14,
          // Guarantee 44x44 minimum touch target for ergonomic fingers
          defaultHitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
        };
      case 'md':
      default:
        return {
          container: styles.sizeMd,
          iconSize: iconSize || 18,
          defaultHitSlop: { top: 2, bottom: 2, left: 2, right: 2 },
        };
    }
  };

  const getShapeStyles = () => {
    switch (shape) {
      case 'rounded':
        return size === 'xs'
          ? styles.shapeRoundedXs
          : size === 'sm'
          ? styles.shapeRoundedSm
          : styles.shapeRoundedMd;
      case 'square':
        return styles.shapeSquare;
      case 'circle':
      default:
        return styles.shapeCircle;
    }
  };

  const currentVariant = getVariantStyles();
  const currentSize = getSizeStyles();
  const currentShape = getShapeStyles();

  const handlePressIn = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:ICON_BUTTON_PRESS_IN] debugId=${debugId} icon=${icon}`);
    }
    if (!disabled && !loading) {
      scale.value = withSpring(MOTION.scale.pressed, MOTION.spring.snappy);
    }
  };

  const handlePressOut = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:ICON_BUTTON_PRESS_OUT] debugId=${debugId} icon=${icon}`);
    }
    scale.value = withSpring(1, MOTION.spring.snappy);
  };

  const handlePress = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:ICON_BUTTON_PRESS] debugId=${debugId} icon=${icon} handlerAvailable=${typeof onPress === 'function'}`);
    }
    if (!disabled && !loading) {
      onPress();
    }
  };

  const isUnavailable = disabled || loading;
  const resolvedIconColor = iconColor || currentVariant.defaultIconColor;
  const effectiveHitSlop = hitSlop !== undefined ? hitSlop : currentSize.defaultHitSlop;

  const showBadge = badge !== undefined && badge !== false && badge !== null;
  const badgeContent = typeof badge === 'number' || typeof badge === 'string' ? badge : null;

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.baseContainer,
        currentSize.container,
        currentShape,
        currentVariant.container,
        disabled && styles.disabledContainer,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isUnavailable}
      hitSlop={effectiveHitSlop}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || icon}
      accessibilityState={{ disabled: isUnavailable, busy: loading }}
    >
      <Animated.View style={[styles.contentContainer, animatedStyle]} pointerEvents="none">
        {loading ? (
          <ActivityIndicator size="small" color={currentVariant.loaderColor} />
        ) : (
          <Icon
            name={icon}
            size={currentSize.iconSize}
            color={disabled ? TOKENS.colors.textMuted : resolvedIconColor}
          />
        )}
      </Animated.View>

      {showBadge && (
        <View
          style={[
            styles.badgeDot,
            badgeContent !== null && styles.badgeCount,
            badgeColor ? { backgroundColor: badgeColor } : undefined,
          ]}
        >
          {badgeContent !== null && (
            <Text style={styles.badgeText} numberOfLines={1}>
              {badgeContent}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SIZES
  sizeLg: {
    width: 48,
    height: 48,
  },
  sizeMd: {
    width: 40,
    height: 40,
  },
  sizeSm: {
    width: 32,
    height: 32,
  },
  sizeXs: {
    width: 24,
    height: 24,
  },

  // SHAPES
  shapeCircle: {
    borderRadius: TOKENS.geometry.radiusPill,
  },
  shapeRoundedMd: {
    borderRadius: TOKENS.geometry.radiusInput,
  },
  shapeRoundedSm: {
    borderRadius: TOKENS.geometry.radiusSm,
  },
  shapeRoundedXs: {
    borderRadius: TOKENS.geometry.radiusSm - 2,
  },
  shapeSquare: {
    borderRadius: 0,
  },

  // VARIANTS
  variantSurface: {
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  variantGhost: {
    backgroundColor: 'transparent',
  },
  variantPrimary: {
    backgroundColor: TOKENS.colors.brand700,
    ...TOKENS.shadows.soft,
  },
  variantSecondary: {
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
  },
  variantWhite: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  variantDanger: {
    backgroundColor: TOKENS.colors.statusDanger,
  },
  variantDark: {
    backgroundColor: TOKENS.colors.dark900,
  },
  disabledContainer: {
    backgroundColor: TOKENS.colors.surface200,
    borderColor: TOKENS.colors.surface200,
    opacity: 0.6,
  },

  // BADGES
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.brand500,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.white,
  },
  badgeCount: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    top: -4,
    right: -4,
  },
  badgeText: {
    color: TOKENS.colors.white,
    fontSize: 9,
    fontWeight: TOKENS.typography.weights.bold,
  },
});
