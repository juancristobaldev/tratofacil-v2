import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useIsFocused } from '@react-navigation/native';
import { TOKENS, MOTION } from '../../theme';
import { Icon } from './Icon';

interface ProviderPinProps {
  provider: {
    id: string | number;
    name?: string;
    providerName?: string;
    avatar?: string | null;
    rating?: number;
    reviewsCount?: number;
    pricePerHour?: number;
    price?: number;
    verified?: boolean;
    isRealtimeActive?: boolean;
    serviceName?: string;
    categorySlug?: string;
    [key: string]: any;
  };
  coordinate: { latitude: number; longitude: number };
  isSelected: boolean;
  onPress: () => void;
}

export const ProviderPin: React.FC<ProviderPinProps> = ({
  provider,
  coordinate,
  isSelected,
  onPress,
}) => {
  const markerRef = useRef<any>(null);
  const isFocused = useIsFocused();
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Warmup lifecycle trigger whenever screen focus, selection, or provider properties change
  const triggerWarmup = useCallback((durationMs: number = 450) => {
    setTracksViewChanges(true);
    markerRef.current?.redraw?.();
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, durationMs);
    return () => clearTimeout(timer);
  }, []);

  // Reactivate view tracking when returning to the map or when key props mutate
  useEffect(() => {
    if (isFocused) {
      return triggerWarmup(500);
    }
  }, [
    isFocused,
    isSelected,
    provider.id,
    provider.avatar,
    provider.name,
    provider.pricePerHour,
    provider.rating,
    provider.verified,
    provider.isRealtimeActive,
    triggerWarmup,
  ]);

  const displayName = provider.name || provider.providerName || 'Profesional';
  const ratingValue = typeof provider.rating === 'number' && !isNaN(provider.rating) ? provider.rating : 0;
  const reviewsCount = typeof provider.reviewsCount === 'number' ? provider.reviewsCount : 0;
  const priceValue = typeof provider.pricePerHour === 'number' ? provider.pricePerHour : typeof provider.price === 'number' ? provider.price : 0;
  const isVerified = Boolean(provider.verified || provider.certificates?.some((c: any) => c.verified));
  const isRealtimeActive = Boolean(provider.isRealtimeActive);
  const serviceName = provider.serviceName || '';

  const initials = displayName
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || '?';

  return (
    <Marker
      ref={markerRef}
      coordinate={coordinate}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 1.0 }}
      centerOffset={{ x: 0, y: 0 }}
      zIndex={isSelected ? 999 : 100}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <View style={styles.wrapper}>
        {/* Floating Card Body */}
        {isSelected ? (
          <View style={[styles.card, styles.cardSelected]}>
            {/* Avatar with Status & Verified Badges */}
            <View style={styles.avatarContainer}>
              {provider.avatar && !imageError ? (
                <Image
                  source={{ uri: provider.avatar }}
                  style={styles.avatar}
                  onLoad={() => triggerWarmup(250)}
                  onError={() => {
                    setImageError(true);
                    triggerWarmup(250);
                  }}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}

              {/* Realtime Active Glowing Dot */}
              {isRealtimeActive && <View style={styles.onlineDot} />}

              {/* Verified Badge */}
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Icon name="Check" size={7} color={TOKENS.colors.white} />
                </View>
              )}
            </View>

            {/* Provider Detailed Information */}
            <View style={styles.info}>
              {/* 1. Provider Name */}
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>

              {/* 2. Service Underneath the Name */}
              {serviceName ? (
                <Text style={styles.serviceUnderName} numberOfLines={1}>
                  {serviceName}
                </Text>
              ) : null}

              {/* 3. Bottom Row: Rating, Reviews Count, and Price */}
              <View style={styles.metaRow}>
                <View style={styles.ratingBadge}>
                  <Icon name="Star" size={10} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>{ratingValue.toFixed(1)}</Text>
                  {reviewsCount > 0 && (
                    <Text style={styles.reviewsCountText}>({reviewsCount})</Text>
                  )}
                </View>

                {priceValue > 0 && (
                  <>
                    <Text style={styles.separatorDot}>•</Text>
                    <Text style={styles.price}>
                      ${priceValue.toLocaleString('es-CL')}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.compactCard}>
            {/* 1. Precio arriba */}
            <Text style={styles.compactPrice}>
              {priceValue > 0 ? `$${priceValue.toLocaleString('es-CL')}` : 'Consultar'}
            </Text>

            {/* 2. Rating abajo */}
            <View style={styles.compactRatingRow}>
              <Icon name="Star" size={9} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.compactRatingText}>
                {ratingValue > 0 ? ratingValue.toFixed(1) : 'Nuevo'}
              </Text>
              {reviewsCount > 0 && (
                <Text style={styles.compactReviewsText}>({reviewsCount})</Text>
              )}
            </View>
          </View>
        )}

        {/* Pointer Triangle Needle */}
        <View style={styles.arrowContainer}>
          <View style={[styles.arrowBorder, isSelected && styles.arrowBorderSelected]} />
          <View style={styles.arrowFill} />
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  compactCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 58,
  },
  compactPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: TOKENS.colors.brand700,
    letterSpacing: -0.2,
  },
  compactRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  compactRatingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: TOKENS.colors.textMain,
    marginLeft: 2,
  },
  compactReviewsText: {
    fontSize: 8,
    fontWeight: '500',
    color: TOKENS.colors.textSubtle,
    marginLeft: 1,
  },
  cardSelected: {
    borderColor: TOKENS.colors.brand500,
    shadowColor: TOKENS.colors.brand500,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 9,
  },
  avatarContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.surface100,
  },
  avatarPlaceholder: {
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: TOKENS.colors.brand600,
  },
  onlineDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.success500,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.white,
    zIndex: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#0284C7',
    borderWidth: 1.5,
    borderColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  info: {
    justifyContent: 'center',
    maxWidth: 150,
  },
  name: {
    fontSize: 11.5,
    fontWeight: '800',
    color: TOKENS.colors.textMain,
    letterSpacing: -0.2,
  },
  serviceUnderName: {
    fontSize: 9.5,
    fontWeight: '600',
    color: TOKENS.colors.brand600,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 9.5,
    color: TOKENS.colors.textMain,
    marginLeft: 2,
    fontWeight: '700',
  },
  reviewsCountText: {
    fontSize: 8.5,
    color: TOKENS.colors.textSubtle,
    marginLeft: 1.5,
    fontWeight: '500',
  },
  separatorDot: {
    fontSize: 8,
    color: TOKENS.colors.surface300,
    marginHorizontal: 3.5,
  },
  price: {
    fontSize: 10.5,
    fontWeight: '800',
    color: TOKENS.colors.brand700,
  },
  arrowContainer: {
    alignItems: 'center',
    marginTop: -1,
  },
  arrowBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E2E8F0',
  },
  arrowBorderSelected: {
    borderTopColor: TOKENS.colors.brand500,
  },
  arrowFill: {
    position: 'absolute',
    top: -1,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: TOKENS.colors.white,
  },
});
