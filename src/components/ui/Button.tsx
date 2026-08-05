import React from 'react';
import { StyleSheet, Text, ActivityIndicator, ViewStyle, TextStyle, StyleProp, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
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
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, TOKENS.animation.springConfig);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, TOKENS.animation.springConfig);
  };

  return (
    <Animated.View
      style={[
        styles.baseContainer,
        currentStyles.container,
        disabled && styles.disabledContainer,
        style,
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={styles.contentContainer} pointerEvents="none">
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
            <Text style={[styles.baseText, currentStyles.text, disabled && styles.disabledText, textStyle]}>
              {title}
            </Text>
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    height: 52,
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
    height: '100%',
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
