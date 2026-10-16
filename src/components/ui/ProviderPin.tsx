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
  isMapManipulating?: boolean;
}

const ProviderPinComponent: React.FC<ProviderPinProps> = ({
  provider,
  coordinate,
  isSelected,
  onPress,
  isMapManipulating = false,
}) => {
  const markerRef = useRef<any>(null);
  const isFocused = useIsFocused();
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Warmup lifecycle trigger whenever screen focus, selection, or provider properties change
  const triggerWarmup = useCallback((durationMs: number = 350) => {
    if (isMapManipulating) return;
    setTracksViewChanges(true);
    markerRef.current?.redraw?.();
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [isMapManipulating]);

  // Reactivate view tracking when returning to the map or when key props mutate
  useEffect(() => {
    if (isFocused && !isMapManipulating) {
      return triggerWarmup(350);
    }
  }, [
    isFocused,
    isMapManipulating,
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

  const effectiveTracksViewChanges = !isMapManipulating && tracksViewChanges;

  return (
    <Marker
      ref={markerRef}
      coordinate={coordinate}
      tracksViewChanges={effectiveTracksViewChanges}
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
                  <Icon name="Check" size={8} color={TOKENS.colors.white} />
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
              {priceValue > 0 ? `$${priceValue.toLocaleString('es-CL')}` : 'Ofertar'}
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
          <View style={[styles.arrowBorder, isSelected ? styles.arrowBorderSelected : styles.arrowBorderCompact]} />
          <View style={styles.arrowFill} />
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 9,
    paddingRight: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  compactCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 13,
    paddingVertical: 4.5,
    paddingHorizontal: 8.5,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.14)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    minWidth: 60,
  },
  compactPrice: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
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
    borderWidth: 2,
    borderColor: TOKENS.colors.brand500,
    shadowColor: TOKENS.colors.brand500,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  avatarContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 9,
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
    zIndex: 3,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0284C7',
    borderWidth: 1.5,
    borderColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  info: {
    justifyContent: 'center',
    maxWidth: 155,
  },
  name: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  serviceUnderName: {
    fontSize: 9.5,
    fontWeight: '600',
    color: TOKENS.colors.brand600,
    marginTop: 0.5,
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
    fontSize: 11,
    fontWeight: '800',
    color: TOKENS.colors.brand700,
  },
  arrowContainer: {
    alignItems: 'center',
    marginTop: -0.5,
  },
  arrowBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowBorderCompact: {
    borderTopColor: 'rgba(15, 23, 42, 0.14)',
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

function areProviderPinPropsEqual(
  prev: ProviderPinProps,
  next: ProviderPinProps,
): boolean {
  if (prev.isMapManipulating !== next.isMapManipulating) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if ((prev.onPress == null) !== (next.onPress == null)) return false;

  const latDiff = Math.abs(prev.coordinate.latitude - next.coordinate.latitude);
  const lngDiff = Math.abs(prev.coordinate.longitude - next.coordinate.longitude);
  if (latDiff >= 0.00001 || lngDiff >= 0.00001) return false;

  const p1 = prev.provider;
  const p2 = next.provider;
  if (p1.id !== p2.id) return false;
  if (p1.name !== p2.name) return false;
  if (p1.avatar !== p2.avatar) return false;
  if (p1.rating !== p2.rating) return false;
  if (p1.reviewsCount !== p2.reviewsCount) return false;
  if (p1.pricePerHour !== p2.pricePerHour) return false;
  if (p1.price !== p2.price) return false;
  if (p1.verified !== p2.verified) return false;
  if (p1.isRealtimeActive !== p2.isRealtimeActive) return false;
  if (p1.serviceName !== p2.serviceName) return false;

  return true;
}

export const ProviderPin = React.memo(ProviderPinComponent, areProviderPinPropsEqual);

