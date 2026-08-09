import React, { useRef } from 'react';
import { StyleSheet, Text, View, ViewStyle, Pressable, Animated } from 'react-native';
import { TOKENS, MOTION } from '../../theme';
import { Icon } from './Icon';

interface RatingProps {
  rating: number;
  max?: number;
  size?: number;
  reviewsCount?: number;
  showText?: boolean;
  textSuffix?: string;
  onRatingChange?: (rating: number) => void;
  style?: ViewStyle;
}

const AnimatedStarItem: React.FC<{
  index: number;
  isFilled: boolean;
  size: number;
  onPress: () => void;
}> = ({ isFilled, size, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: MOTION.scale.bouncePop,
        duration: MOTION.duration.instant,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 10,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name="Star"
          size={size}
          color={isFilled ? TOKENS.colors.starActive : TOKENS.colors.surface300}
          fill={isFilled ? TOKENS.colors.starActive : 'transparent'}
          style={styles.star}
        />
      </Animated.View>
    </Pressable>
  );
};

export const Rating: React.FC<RatingProps> = ({
  rating,
  max = 5,
  size = 14,
  reviewsCount,
  showText = false,
  textSuffix,
  onRatingChange,
  style,
}) => {
  const stars = [];

  for (let i = 1; i <= max; i++) {
    const isFilled = i <= Math.round(rating);

    if (onRatingChange) {
      stars.push(
        <AnimatedStarItem
          key={i}
          index={i}
          isFilled={isFilled}
          size={size}
          onPress={() => onRatingChange(i)}
        />
      );
    } else {
      stars.push(
        <Icon
          key={i}
          name="Star"
          size={size}
          color={isFilled ? TOKENS.colors.starActive : TOKENS.colors.surface300}
          fill={isFilled ? TOKENS.colors.starActive : 'transparent'}
          style={styles.star}
        />
      );
    }
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>{stars}</View>
      {showText && (
        <Text style={styles.text}>
          {rating.toFixed(1)}
          {reviewsCount !== undefined && ` (${reviewsCount}${textSuffix ? ` ${textSuffix}` : ''})`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  text: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginLeft: 6,
  },
});
