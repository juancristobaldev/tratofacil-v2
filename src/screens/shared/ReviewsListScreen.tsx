import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { EmptyState, ReviewCard, RatingDistribution } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';

interface ReviewItem {
  id: string | number;
  userName: string;
  rating: number;
  comment: string | null;
  date: string;
  isVerifiedJob?: boolean;
}

export const ReviewsListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { role, user, refetch: refetchAuth } = useAuth();
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
  const targetRole = route.params?.role || role;

  const reviews = useMemo<ReviewItem[]>(() => {
    if (reviewsFromParams?.length) {
      return reviewsFromParams;
    }

    if (targetRole === 'client') {
      const clientReviews = user?.reviewsReceived?.map((r: any) => ({
        id: r.id,
        userName: r.provider?.name || 'Profesional verificado',
        rating: r.rating,
        comment: r.comment || 'Calificación por servicio completado.',
        date: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
          : 'Reciente',
        isVerifiedJob: true,
      })) || [];
      return clientReviews;
    }

    const providerReviews = user?.provider?.reviews?.map((r: any) => ({
      id: `p-${r.id}`,
      userName: r.client?.displayName || 'Cliente',
      rating: r.rating,
      comment: r.comment || 'Excelente atención.',
      date: r.createdAt
        ? new Date(r.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Reciente',
      isVerifiedJob: true,
    })) || [];

    const realtimeReviews = user?.provider?.realtimeReviews?.map((r: any) => ({
      id: `rt-${r.id}`,
      userName: r.client?.displayName || 'Cliente',
      rating: r.rating,
      comment: r.comment || 'Servicio en tiempo real finalizado.',
      date: r.createdAt
        ? new Date(r.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Reciente',
      isVerifiedJob: true,
    })) || [];

    return [...realtimeReviews, ...providerReviews];
  }, [reviewsFromParams, targetRole, user]);

  const { avgRating, distribution } = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!reviews.length) {
      return { avgRating: 5.0, distribution: dist };
    }
    let totalScore = 0;
    reviews.forEach((r) => {
      totalScore += r.rating;
      const star = Math.min(Math.max(Math.round(r.rating || 5), 1), 5) as 1 | 2 | 3 | 4 | 5;
      dist[star] = (dist[star] || 0) + 1;
    });
    return {
      avgRating: totalScore / reviews.length,
      distribution: dist,
    };
  }, [reviews]);

  const renderItem = ({ item }: { item: ReviewItem }) => (
    <ReviewCard
      userName={item.userName}
      rating={item.rating}
      comment={item.comment || ''}
      date={item.date}
      isVerifiedJob={item.isVerifiedJob ?? true}
    />
  );

  const emptyDescription = targetRole === 'client'
    ? 'Las opiniones y valoraciones que los profesionales te dejen tras completar un servicio aparecerán aquí.'
    : 'Las opiniones de tus clientes sobre tus servicios completados aparecerán aquí.';

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
        ListHeaderComponent={
          reviews.length > 0 ? (
            <RatingDistribution
              averageRating={avgRating}
              totalReviews={reviews.length}
              distribution={distribution}
              style={styles.headerDistribution}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="MessageSquare"
            title="Sin reseñas aún"
            description={emptyDescription}
          />
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
  },
  headerDistribution: {
    marginBottom: TOKENS.spacing.md,
  },
});
