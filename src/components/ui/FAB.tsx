import React from 'react';
import { StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';
import { TouchableOpacity } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

export interface FABProps {
  icon: IconName;
  label?: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'surface' | 'white';
  size?: 'normal' | 'mini';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const FAB: React.FC<FABProps> = ({
  icon,
  label,
  onPress,
  variant = 'primary',
  size = 'normal',
  style,
  testID,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, TOKENS.animation.springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, TOKENS.animation.springConfig);
  };

  const isExtended = Boolean(label);
  const isMini = size === 'mini' && !isExtended;

  const getVariantStyles = () => {
    switch (variant) {
      case 'dark':
        return {
          container: styles.darkContainer,
          iconColor: TOKENS.colors.white,
          textColor: TOKENS.colors.white,
        };
      case 'surface':
      case 'white':
        return {
          container: styles.whiteContainer,
          iconColor: TOKENS.colors.textMain,
          textColor: TOKENS.colors.textMain,
        };
      case 'primary':
      default:
        return {
          container: styles.primaryContainer,
          iconColor: TOKENS.colors.white,
          textColor: TOKENS.colors.white,
        };
    }
  };

  const variantStyle = getVariantStyles();

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[
          styles.base,
          isExtended ? styles.extended : isMini ? styles.mini : styles.round,
          variantStyle.container,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label || icon}
      >
        <Icon
          name={icon}
          size={isMini ? 18 : 22}
          color={variantStyle.iconColor}
          style={isExtended ? styles.extendedIcon : undefined}
        />
        {isExtended && (
          <Text style={[styles.label, { color: variantStyle.textColor }]} numberOfLines={1}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.floating,
  },
  round: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  mini: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  extended: {
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: TOKENS.spacing.lg,
    borderRadius: TOKENS.geometry.radiusPill,
  },
  extendedIcon: {
    marginRight: TOKENS.spacing.xs + 2,
  },
  label: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
  primaryContainer: {
    backgroundColor: TOKENS.colors.brand500,
  },
  darkContainer: {
    backgroundColor: TOKENS.colors.dark900,
  },
  whiteContainer: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
});
