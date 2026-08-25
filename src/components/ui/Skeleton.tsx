import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  DimensionValue,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TOKENS } from '../../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = TOKENS.geometry.radiusSm,
  circle = false,
  style,
  testID,
}) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if ((globalThis as any).process?.env?.NODE_ENV === 'test') {
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.85, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const actualWidth = circle ? height : width;
  const actualRadius = circle && typeof height === 'number' ? height / 2 : borderRadius;

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.skeleton,
        {
          width: actualWidth,
          height,
          borderRadius: actualRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.cardHeader}>
        <Skeleton circle height={48} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="40%" height={14} style={{ marginBottom: 6 }} />
          <Skeleton width="25%" height={10} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="80%" height={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: TOKENS.colors.surface200,
  },
  cardContainer: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusCard,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    padding: TOKENS.spacing.md,
    ...TOKENS.shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: TOKENS.spacing.sm,
  },
  cardBody: {
    gap: 4,
  },
});
