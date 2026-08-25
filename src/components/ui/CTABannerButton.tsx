import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { TouchableOpacity } from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

export interface CTABannerButtonProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const CTABannerButton: React.FC<CTABannerButtonProps> = ({
  title,
  subtitle,
  icon = 'Plus',
  onPress,
  style,
  testID,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, TOKENS.animation.springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, TOKENS.animation.springConfig);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[styles.container, style]}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${subtitle || ''}`}
      >
        <View style={styles.leftContent}>
          <View style={styles.iconCircle}>
            <Icon name={icon} size={20} color={TOKENS.colors.white} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <Icon name="ChevronRight" size={20} color={TOKENS.colors.brand500} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
    borderRadius: TOKENS.geometry.radiusCard,
    padding: TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 68,
    ...TOKENS.shadows.soft,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: TOKENS.spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: TOKENS.spacing.sm + 2,
    ...TOKENS.shadows.soft,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: TOKENS.typography.sizes.sm + 1,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
});
