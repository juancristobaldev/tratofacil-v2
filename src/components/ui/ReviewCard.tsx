import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import { Rating } from './Rating';

// --- SINGLE REVIEW CARD ---
export interface ReviewCardProps {
  userName: string;
  rating: number;
  comment: string;
  date: string;
  isVerifiedJob?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  userName,
  rating,
  comment,
  date,
  isVerifiedJob = true,
  style,
  testID,
}) => {
  const initial = (userName || 'C').charAt(0).toUpperCase();

  return (
    <View testID={testID} style={[styles.reviewCard, style]}>
      <View style={styles.reviewHeaderRow}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatarInitial}>
            <Text style={styles.reviewerInitialText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.reviewerNameText}>{userName}</Text>
            <View style={styles.reviewDateRow}>
              <Rating rating={rating} size={11} />
              <Text style={styles.reviewDateText}>• {date}</Text>
            </View>
          </View>
        </View>
        {isVerifiedJob && (
          <View style={styles.verifiedWorkBadge}>
            <Text style={styles.verifiedWorkText}>Trabajo verificado</Text>
          </View>
        )}
      </View>
      <Text style={styles.reviewCommentText}>"{comment}"</Text>
    </View>
  );
};

// --- RATING DISTRIBUTION / HISTOGRAM ---
export interface RatingDistributionProps {
  averageRating: number;
  totalReviews: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const RatingDistribution: React.FC<RatingDistributionProps> = ({
  averageRating,
  totalReviews,
  distribution,
  style,
  testID,
}) => {
  const stars: (1 | 2 | 3 | 4 | 5)[] = [5, 4, 3, 2, 1];

  return (
    <View testID={testID} style={[styles.ratingSummaryCard, style]}>
      <View style={styles.ratingScoreCol}>
        <Text style={styles.ratingBigScore}>{averageRating.toFixed(1)}</Text>
        <View style={styles.starsRow}>
          {stars.map((s) => (
            <Icon key={s} name="Star" size={13} color={TOKENS.colors.starActive} />
          ))}
        </View>
        <Text style={styles.ratingOpinionCount}>{totalReviews} opiniones</Text>
      </View>

      <View style={styles.histogramCol}>
        {stars.map((star) => {
          const count = distribution[star] || 0;
          const total = totalReviews || 1;
          const pct = Math.max(
            Math.round((count / total) * 100),
            star === 5 && count === 0 ? 90 : 0,
          );
          return (
            <View key={star} style={styles.histogramRow}>
              <Text style={styles.histogramStarNum}>{star}</Text>
              <View style={styles.histogramTrack}>
                <View style={[styles.histogramFill, { width: `${pct}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Review Card
  reviewCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusCard,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: TOKENS.spacing.sm,
    ...TOKENS.shadows.soft,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  reviewerAvatarInitial: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  reviewerInitialText: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand700,
  },
  reviewerNameText: {
    fontSize: 13.5,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  reviewDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  reviewDateText: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
  verifiedWorkBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: TOKENS.geometry.radiusPill,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  verifiedWorkText: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#047857',
  },
  reviewCommentText: {
    fontSize: 13,
    color: TOKENS.colors.textMain,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Rating Distribution Card
  ratingSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusCard,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    gap: 16,
    ...TOKENS.shadows.soft,
    marginBottom: TOKENS.spacing.md,
  },
  ratingScoreCol: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: TOKENS.colors.surface100,
    minWidth: 100,
  },
  ratingBigScore: {
    fontSize: 34,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    letterSpacing: -1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    marginBottom: 4,
  },
  ratingOpinionCount: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
  histogramCol: {
    flex: 1,
    gap: 5,
  },
  histogramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  histogramStarNum: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    width: 8,
  },
  histogramTrack: {
    flex: 1,
    height: 6,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  histogramFill: {
    height: '100%',
    backgroundColor: TOKENS.colors.starActive,
    borderRadius: 3,
  },
});
