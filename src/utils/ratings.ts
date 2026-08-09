export interface RatingSummary {
  rating: number;
  count: number;
}

interface ReviewLike {
  rating?: number | null;
}

export function averageRating(reviews: ReviewLike[] | null | undefined): number {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + (r?.rating || 0), 0);
  return sum / reviews.length;
}

export function reviewsCount(reviews: unknown[] | null | undefined): number {
  return reviews?.length ?? 0;
}

/**
 * Resume las reviews según el rol de la persona vista.
 * - 'provider': reviews que recibe de sus clientes (ProviderReview).
 * - 'client'  : reviews que recibe de los proveedores (ClientReview).
 * Devuelve null si no hay reviews (para ocultar el badge en vez de inventar un valor).
 */
export function summarizeForRole(
  target: {
    reviews?: ReviewLike[] | null;
    realtimeReviews?: ReviewLike[] | null;
    reviewsReceived?: ReviewLike[] | null;
  } | null | undefined,
  targetRole: 'client' | 'provider',
): RatingSummary | null {
  if (!target) return null;
  const providerSources = [...(target.reviews || []), ...(target.realtimeReviews || [])];
  const reviews =
    targetRole === 'provider' ? providerSources : target.reviewsReceived;

  if (!reviews || reviews.length === 0) return null;
  return {
    rating: averageRating(reviews),
    count: reviews.length,
  };
}
