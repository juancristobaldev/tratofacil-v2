export interface RatingSummary {
  rating: number;
  count: number;
}

interface ReviewLike {
  rating?: number | null;
}

export function averageRating(
  reviews: (ReviewLike | null | undefined)[] | null | undefined,
): number {
  if (!reviews || reviews.length === 0) return 0;
  const validReviews = reviews.filter(
    (r): r is ReviewLike => r != null && typeof r.rating === 'number',
  );
  if (validReviews.length === 0) return 0;
  const sum = validReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  return sum / validReviews.length;
}

export function reviewsCount(reviews: unknown[] | null | undefined): number {
  if (!reviews) return 0;
  return reviews.filter((r) => r != null).length;
}

/**
 * Resume las reviews según el rol de la persona vista.
 * - 'provider': reviews que recibe de sus clientes (ProviderReview).
 * - 'client'  : reviews que recibe de los proveedores (ClientReview).
 * Devuelve null si no hay reviews (para ocultar el badge en vez de inventar un valor).
 */
export function summarizeForRole(
  target: {
    reviews?: (ReviewLike | null | undefined)[] | null;
    realtimeReviews?: (ReviewLike | null | undefined)[] | null;
    reviewsReceived?: (ReviewLike | null | undefined)[] | null;
    clientReviewsReceived?: (ReviewLike | null | undefined)[] | null;
  } | null | undefined,
  targetRole: 'client' | 'provider',
): RatingSummary | null {
  if (!target) return null;
  const providerSources = [
    ...(target.reviews || []),
    ...(target.realtimeReviews || []),
  ].filter((r): r is ReviewLike => r != null);
  const clientSources = [
    ...(target.reviewsReceived || []),
    ...(target.clientReviewsReceived || []),
  ].filter((r): r is ReviewLike => r != null);
  const reviews = targetRole === 'provider' ? providerSources : clientSources;

  if (!reviews || reviews.length === 0) return null;
  return {
    rating: averageRating(reviews),
    count: reviews.length,
  };
}
