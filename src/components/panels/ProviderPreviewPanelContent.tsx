import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity } from 'react-native';
import { TOKENS } from '../../theme';
import { Avatar, Rating, EmptyState, Icon, Button, IconButton } from '../ui';
import { BottomSheetFlatList } from '../../bottom-sheet/primitives';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { bottomSheetDebug } from '../../bottom-sheet/core/bottomSheet.debug';
import { useLocation } from '../../context/LocationContext';
import { useNotification } from '../../context/NotificationContext';
import type { ProviderPreviewItem } from '../../bottom-sheet/core/bottomSheet.types';
import type { SheetComponentProps } from '../../bottom-sheet/core/bottomSheet.types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = TOKENS.spacing.lg;

function getMetersBetween(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371e3;
  const dLat = ((la2 - la1) * Math.PI) / 180;
  const dLon = ((lo2 - lo1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatEtaFromMeters(meters: number): string {
  // Estimación urbana promedio (~25 km/h)
  const minutes = Math.max(2, Math.round(meters / 350));
  return `${minutes} min`;
}

export const ProviderPreviewPanelContent: React.FC<SheetComponentProps<'provider_preview'>> = ({
  sheetKey,
  requestId,
  payload,
  isCollapsed = false,
  setIndex,
}) => {
  const { dispatchBottomSheetAction } = useBottomSheet();
  const { location } = useLocation();
  const { showNotification } = useNotification();
  const selectedIndex = payload.selectedIndex ?? 0;

  const listRef = useRef<any>(null);
  const lastEmittedIndex = useRef<number>(selectedIndex);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    bottomSheetDebug('PANEL_MOUNT', { key: sheetKey, requestId });
    return () => {
      bottomSheetDebug('PANEL_UNMOUNT', { key: sheetKey, requestId });
    };
  }, [requestId, sheetKey]);

  // Si no vienen varios proveedores, mostramos al menos el seleccionado.
  const clampedProviders: ProviderPreviewItem[] = useMemo(
    () => {
      const list: ProviderPreviewItem[] = payload.providers || [];
      if (list.length > 0) return list;
      return payload.provider ? [payload.provider] : [];
    },
    [payload.providers, payload.provider],
  );
  const safeIndex = Math.min(Math.max(selectedIndex, 0), clampedProviders.length - 1);

  // Sincronización externa (pin tap en el mapa): hace scroll del carrusel al proveedor.
  useEffect(() => {
    if (clampedProviders.length === 0) return;
    const target = Math.min(Math.max(selectedIndex, 0), clampedProviders.length - 1);
    if (target === lastEmittedIndex.current) return;
    lastEmittedIndex.current = target;
    setActiveIndex(target);
    listRef.current?.scrollToIndex({ index: target, animated: true });
  }, [selectedIndex, clampedProviders.length]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const width = e.nativeEvent.layoutMeasurement.width || SCREEN_WIDTH;
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      if (index === lastEmittedIndex.current || !clampedProviders[index]) return;
      lastEmittedIndex.current = index;
      setActiveIndex(index);
      dispatchBottomSheetAction('provider_preview', 'INDEX_CHANGE', clampedProviders[index], 'PROVIDER_PREVIEW_CAROUSEL');
    },
    [clampedProviders, dispatchBottomSheetAction],
  );

  if (clampedProviders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="Search"
          title="Sin profesionales"
          description="No hay profesionales disponibles para mostrar en este momento."
        />
      </View>
    );
  }

  const showDots = clampedProviders.length > 1;

  const renderItem = ({ item }: { item: ProviderPreviewItem }) => {
    const userCoords = location?.coords;
    const pLat = item.lat ?? item.latitude;
    const pLng = item.lng ?? item.longitude;

    let etaText = '12 min';
    let distanceKmText = '';
    if (userCoords && pLat != null && pLng != null) {
      const distMeters = getMetersBetween(userCoords.latitude, userCoords.longitude, pLat, pLng);
      etaText = formatEtaFromMeters(distMeters);
      distanceKmText = distMeters < 1000 ? `${Math.round(distMeters)}m` : `${(distMeters / 1000).toFixed(1)} km`;
    }

    return (
      <View style={styles.card}>
        <View style={styles.previewCard}>
          {/* Top Row: Provider identity + Rating/ETA + Close affordance */}
          <View style={styles.cardTopRow}>
            <TouchableOpacity
              style={styles.providerMainPressable}
              onPress={() => {
                bottomSheetDebug('PANEL_PRESS', { key: 'provider_preview', requestId, action: 'VIEW_PROFILE', origin: 'PROVIDER_PREVIEW_PANEL' });
                dispatchBottomSheetAction('provider_preview', 'VIEW_PROFILE', item, 'PROVIDER_PREVIEW_PANEL');
              }}
              activeOpacity={0.8}
              accessibilityLabel="Ver perfil del profesional"
              accessibilityRole="button"
            >
              <Avatar uri={item.avatar} name={item.name || item.providerName || ''} size={48} />
              
              <View style={styles.providerInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name || item.providerName || 'Mario R.'}
                </Text>
                <View style={styles.ratingAndEtaRow}>
                  <View style={styles.ratingRow}>
                    <Icon name="Star" size={13} color={TOKENS.colors.starActive} />
                    <Text style={styles.ratingScoreText}>
                      {(item.rating || 4.9).toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.etaInlinePill}>
                    <Icon name="Clock" size={11} color={TOKENS.colors.brand600} />
                    <Text style={styles.etaInlineText}>{etaText}</Text>
                    {Boolean(distanceKmText) && (
                      <Text style={styles.distanceInlineText}>• {distanceKmText}</Text>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Subtle dismiss / close button */}
            <IconButton
              icon="X"
              size="sm"
              variant="ghost"
              accessibilityLabel="Cancelar selección de servicio"
              onPress={() => {
                bottomSheetDebug('PANEL_PRESS', { key: 'provider_preview', requestId, action: 'DESELECT', origin: 'PROVIDER_PREVIEW_PANEL' });
                dispatchBottomSheetAction('provider_preview', 'DESELECT', undefined, 'PROVIDER_PREVIEW_PANEL');
              }}
              style={styles.dismissBtn}
            />
          </View>

          {/* Action Button: Ver Perfil */}
          <Button
            title="Ver perfil del profesional"
            iconRight="ChevronRight"
            size="md"
            onPress={() => {
              bottomSheetDebug('PANEL_PRESS', { key: 'provider_preview', requestId, action: 'VIEW_PROFILE', origin: 'PROVIDER_PREVIEW_PANEL' });
              dispatchBottomSheetAction('provider_preview', 'VIEW_PROFILE', item, 'PROVIDER_PREVIEW_PANEL');
            }}
            style={styles.viewProfileCta}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BottomSheetFlatList
        ref={listRef}
        data={clampedProviders}
        keyExtractor={(p, i) => String(p.id ?? p.spId ?? i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={safeIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={renderItem}
      />

      {showDots && (
        <View style={styles.dotsRow}>
          {clampedProviders.map((p, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    paddingTop: TOKENS.spacing.xs,
  },
  emptyContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_H_PADDING,
    paddingBottom: TOKENS.spacing.lg,
  },
  card: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_H_PADDING,
    paddingBottom: TOKENS.spacing.md,
  },
  previewCard: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 14,
    ...TOKENS.shadows.soft,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerMainPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    letterSpacing: -0.2,
  },
  ratingAndEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingScoreText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  etaInlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: TOKENS.geometry.radiusPill,
  },
  etaInlineText: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.brand700,
  },
  distanceInlineText: {
    fontSize: 11,
    color: TOKENS.colors.brand600,
  },
  dismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileCta: {
    backgroundColor: TOKENS.colors.brand500,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: TOKENS.geometry.radiusInput,
    gap: 6,
    ...TOKENS.shadows.soft,
  },
  viewProfileCtaText: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.surface300,
  },
  dotActive: {
    backgroundColor: TOKENS.colors.brand500,
    width: 20,
  },
  compactContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_H_PADDING,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.sm,
  },
  compactCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    padding: 10,
    ...TOKENS.shadows.soft,
    gap: 8,
  },
  compactProviderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  compactDetailsCol: {
    flex: 1,
  },
  compactName: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  compactRatingAndEta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  compactRatingText: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  compactDot: {
    fontSize: 10,
    color: TOKENS.colors.textMuted,
    marginHorizontal: 1,
  },
  compactEtaText: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.brand700,
  },
  compactDistText: {
    fontSize: 10,
    color: TOKENS.colors.brand600,
  },
  compactActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactProfileBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
  },
  compactDismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.surface100,
  },
});

