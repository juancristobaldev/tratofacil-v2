import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, EmptyState, Rating } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';

interface ReviewItem {
  id: string | number;
  userName: string;
  rating: number;
  comment: string | null;
  date: string;
}

export const ReviewsListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { user, refetch: refetchAuth } = useAuth();
  const { setIsRefreshing } = useRefresh();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetchAuth();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetchAuth, setIsRefreshing]);

  const reviewsFromParams: ReviewItem[] | undefined = route.params?.reviews;

  const reviews = useMemo<ReviewItem[]>(() => {
    if (reviewsFromParams?.length) {
      return reviewsFromParams;
    }
    const providerReviews = user?.provider?.reviews?.map((r) => ({
      id: r.id,
      userName: r.client?.displayName || 'Cliente',
      rating: r.rating,
      comment: r.comment,
      date: new Date(r.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' }),
    })) || [];
    const realtimeReviews = user?.provider?.realtimeReviews?.map((r) => ({
      id: `rt-${r.id}`,
      userName: user?.displayName || 'Cliente',
      rating: r.rating,
      comment: r.comment,
      date: new Date(r.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' }),
    })) || [];
    return [...providerReviews, ...realtimeReviews];
  }, [reviewsFromParams, user]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const renderItem = ({ item }: { item: ReviewItem }) => (
    <View style={styles.reviewCard}>
      <View style={styles.revHeader}>
        <View style={styles.revUserRow}>
          <Avatar uri={null} name={item.userName} size={40} />
          <View>
            <Text style={styles.revName}>{item.userName}</Text>
            <Text style={styles.revDate}>{item.date}</Text>
          </View>
        </View>
        <View style={styles.revRatingBadge}>
          <Icon name="Star" size={14} color={TOKENS.colors.starActive} />
          <Text style={styles.revRatingText}>{item.rating}</Text>
        </View>
      </View>
      {item.comment ? <Text style={styles.revText}>{item.comment}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <Text style={styles.ratingNumber}>{avgRating.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              <Rating rating={avgRating} size={24} />
            </View>
            <Text style={styles.reviewCount}>Basado en {reviews.length} reseñas</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="MessageSquare" title="Sin reseñas aún" description="Las reseñas de tus clientes aparecerán aquí." />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  listContent: {
    padding: TOKENS.spacing.md,
    gap: TOKENS.spacing.md,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: TOKENS.spacing.xl,
    paddingVertical: TOKENS.spacing.md,
  },
  ratingNumber: {
    fontSize: 56,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  reviewCard: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  revHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: TOKENS.spacing.md,
  },
  revUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
  },
  revName: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  revDate: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  revRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  revRatingText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  revText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    lineHeight: 20,
  },
});
