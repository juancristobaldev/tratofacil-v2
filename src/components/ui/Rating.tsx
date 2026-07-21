import React from 'react';
import { StyleSheet, Text, View, ViewStyle, Pressable } from 'react-native';
import { TOKENS } from '../../theme';
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
    const starIcon = (
      <Icon
        key={i}
        name="Star"
        size={size}
        color={isFilled ? TOKENS.colors.starActive : TOKENS.colors.surface300}
        fill={isFilled ? TOKENS.colors.starActive : 'transparent'}
        style={styles.star}
      />
    );

    if (onRatingChange) {
      stars.push(
        <Pressable key={i} onPress={() => onRatingChange(i)} hitSlop={8}>
          {starIcon}
        </Pressable>
      );
    } else {
      stars.push(starIcon);
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
