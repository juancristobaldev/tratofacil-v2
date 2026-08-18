import React from 'react';
import { StyleSheet, Text, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { TouchableOpacity } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  debugId?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'white' | 'danger';
  icon?: IconName;
  iconColor?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  debugId,
  variant = 'primary',
  icon,
  iconColor,
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
          loaderColor: TOKENS.colors.brand500,
        };
      case 'white':
        return {
          container: styles.whiteContainer,
          text: styles.whiteText,
          loaderColor: TOKENS.colors.textSubtle,
        };
      case 'outline':
        return {
          container: styles.outlineContainer,
          text: styles.outlineText,
          loaderColor: TOKENS.colors.brand500,
        };
      case 'danger':
        return {
          container: styles.dangerContainer,
          text: styles.dangerText,
          loaderColor: TOKENS.colors.white,
        };
      case 'primary':
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          loaderColor: TOKENS.colors.white,
        };
    }
  };

  const currentStyles = getStyles();

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:BUTTON_PRESS_IN] debugId=${debugId} label=${title}`);
    }
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, TOKENS.animation.springConfig);
    }
  };

  const handlePressOut = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:BUTTON_PRESS_OUT] debugId=${debugId} label=${title}`);
    }
    scale.value = withSpring(1, TOKENS.animation.springConfig);
  };

  const handlePress = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:BUTTON_PRESS] debugId=${debugId} label=${title} handlerAvailable=${typeof onPress === 'function'}`);
    }
    onPress();
  };

  const handleTouchStart = () => {
    if (__DEV__ && debugId) {
      console.log(`[UI:BUTTON_TOUCH_START] debugId=${debugId} label=${title}`);
    }
  };

  const isUnavailable = disabled || loading;
  const debugTouchProps = debugId ? ({ onTouchStart: handleTouchStart } as any) : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.baseContainer,
        currentStyles.container,
        disabled && styles.disabledContainer,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isUnavailable}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={{ disabled: isUnavailable, busy: loading }}
      onLayout={(event) => {
        if (__DEV__ && debugId) {
          const { width, height } = event.nativeEvent.layout;
          console.log(`[UI:BUTTON_LAYOUT] debugId=${debugId} width=${width} height=${height}`);
          console.log(`[UI:BUTTON_TOUCHABLE_LAYOUT] debugId=${debugId} width=${width} height=${height}`);
        }
      }}
      {...debugTouchProps}
    >
      <Animated.View style={[styles.contentContainer, animatedStyle]} pointerEvents="none">
        {loading ? (
          <ActivityIndicator size="small" color={currentStyles.loaderColor} />
        ) : (
          <>
            {icon && (
              <Icon
                name={icon}
                size={16}
                color={iconColor || (variant === 'secondary' ? TOKENS.colors.brand500 : variant === 'white' ? TOKENS.colors.textMain : TOKENS.colors.white)}
                style={styles.icon}
              />
            )}
            <Text 
              style={[styles.baseText, currentStyles.text, disabled && styles.disabledText, textStyle]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {title}
            </Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    minHeight: 52,
    paddingVertical: TOKENS.spacing.sm,
    borderRadius: TOKENS.geometry.radiusInput,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    ...TOKENS.shadows.soft,
    overflow: 'hidden',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryContainer: {
    backgroundColor: TOKENS.colors.brand500,
  },
  secondaryContainer: {
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  outlineContainer: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand500,
  },
  whiteContainer: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  dangerContainer: {
    backgroundColor: TOKENS.colors.statusError,
  },
  disabledContainer: {
    backgroundColor: TOKENS.colors.surface200,
    borderColor: TOKENS.colors.surface200,
    shadowOpacity: 0,
    elevation: 0,
  },
  baseText: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  primaryText: {
    color: TOKENS.colors.white,
  },
  secondaryText: {
    color: TOKENS.colors.brand500,
  },
  outlineText: {
    color: TOKENS.colors.brand500,
  },
  whiteText: {
    color: TOKENS.colors.textMain,
  },
  dangerText: {
    color: TOKENS.colors.white,
  },
  disabledText: {
    color: TOKENS.colors.textMuted,
  },
  icon: {
    marginRight: TOKENS.spacing.xs,
  },
});
