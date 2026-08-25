import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity } from 'react-native';
import { TOKENS } from '../../theme';
import { Avatar, Rating, EmptyState, Icon } from '../ui';
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

export const ProviderPreviewPanelContent: React.FC<SheetComponentProps<'provider_preview'>> = ({ sheetKey, requestId, payload }) => {
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

    const subtitleText = distanceKmText 
      ? `A ${distanceKmText} de tu ubicación actual`
      : 'A tu domicilio en Av. Providencia';

    return (
      <View
        style={styles.card}
        onTouchStart={() => {
          if (__DEV__) console.log(`[UI:TOUCH_START] sheet=provider_preview action=CARD requestId=${requestId ?? 'null'}`);
        }}
      >
        {/* 1. LLEGADA ESTIMADA CARD */}
        <View style={styles.etaCard}>
          <View style={styles.etaInfoCol}>
            <Text style={styles.etaHeaderLabel}>LLEGADA ESTIMADA</Text>
            <Text style={styles.etaValueText}>{etaText}</Text>
            <Text style={styles.etaSubtitleText} numberOfLines={1}>
              {subtitleText}
            </Text>
          </View>

          <View style={styles.etaIconCircle}>
            <Icon name="MapPin" size={22} color={TOKENS.colors.brand500} />
          </View>
        </View>

        {/* 2. PROFILE CARD */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => {
            bottomSheetDebug('PANEL_PRESS', { key: 'provider_preview', requestId, action: 'VIEW_PROFILE', origin: 'PROVIDER_PREVIEW_PANEL' });
            dispatchBottomSheetAction('provider_preview', 'VIEW_PROFILE', item, 'PROVIDER_PREVIEW_PANEL');
          }}
          activeOpacity={0.85}
          accessibilityLabel="Ver perfil del profesional"
          accessibilityRole="button"
        >
          <Avatar uri={item.avatar} name={item.name || item.providerName || ''} size={52} />
          
          <View style={styles.providerInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name || item.providerName || 'Mario R.'}
            </Text>
            <View style={styles.ratingRow}>
              <Icon name="Star" size={14} color={TOKENS.colors.starActive} />
              <Text style={styles.ratingScoreText}>
                {(item.rating || 4.9).toFixed(1)}
              </Text>
            </View>
          </View>

          {/* Action button on right: Ver -> ProviderProfileScreen */}
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => {
              bottomSheetDebug('PANEL_PRESS', { key: 'provider_preview', requestId, action: 'VIEW_PROFILE', origin: 'PROVIDER_PREVIEW_PANEL' });
              dispatchBottomSheetAction('provider_preview', 'VIEW_PROFILE', item, 'PROVIDER_PREVIEW_PANEL');
            }}
            activeOpacity={0.85}
            accessibilityLabel="Ver perfil del profesional"
            accessibilityRole="button"
          >
            <Text style={styles.viewBtnText}>Ver</Text>
            <Icon name="ChevronRight" size={14} color={TOKENS.colors.white} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 3. CANCELAR BUTTON */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            bottomSheetDebug('PANEL_PRESS', { key: 'provider_preview', requestId, action: 'DESELECT', origin: 'PROVIDER_PREVIEW_PANEL' });
            dispatchBottomSheetAction('provider_preview', 'DESELECT', undefined, 'PROVIDER_PREVIEW_PANEL');
          }}
          activeOpacity={0.85}
          accessibilityLabel="Cancelar selección de servicio"
          accessibilityRole="button"
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
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
    paddingBottom: 24,
    gap: 12,
  },

  // 1. ETA CARD
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...TOKENS.shadows.soft,
  },
  etaInfoCol: {
    flex: 1,
    paddingRight: 10,
  },
  etaHeaderLabel: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  etaValueText: {
    fontSize: 28,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand500,
    marginTop: 2,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  etaSubtitleText: {
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
  },
  etaIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. PROFILE CARD
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...TOKENS.shadows.soft,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingScoreText: {
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  viewBtn: {
    backgroundColor: TOKENS.colors.brand700,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 4,
    ...TOKENS.shadows.soft,
  },
  viewBtnText: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },

  // 3. CANCEL BUTTON
  cancelBtn: {
    width: '100%',
    height: 52,
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: TOKENS.colors.brand700,
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.bold,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 16,
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
});


