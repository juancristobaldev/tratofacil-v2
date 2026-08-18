import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';
import { TOKENS } from '../../theme';
import { Avatar, Button, Rating, EmptyState } from '../ui';
import { BottomSheetFlatList } from '../../bottom-sheet/primitives';
import { useBottomSheet } from '../../bottom-sheet/core/useBottomSheet';
import { bottomSheetDebug } from '../../bottom-sheet/core/bottomSheet.debug';
import type { ProviderPreviewItem } from '../../bottom-sheet/core/bottomSheet.types';
import type { SheetComponentProps } from '../../bottom-sheet/core/bottomSheet.types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = TOKENS.spacing.lg;

export const ProviderPreviewPanelContent: React.FC<SheetComponentProps<'provider_preview'>> = ({ sheetKey, requestId, payload }) => {
  const { dispatchBottomSheetAction } = useBottomSheet();
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

  const renderItem = ({ item }: { item: ProviderPreviewItem }) => (
    <View
      style={styles.card}
      onTouchStart={() => {
        if (__DEV__) console.log(`[UI:TOUCH_START] sheet=provider_preview action=CARD requestId=${requestId ?? 'null'}`);
      }}
    >
      <View style={styles.providerRow}>
        <Avatar uri={item.avatar} name={item.name || item.providerName || ''} size={56} />
        <View style={styles.providerInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name || item.providerName}
          </Text>
          <Rating
            rating={item.rating || 0}
            size={13}
            showText
            textSuffix="reseñas"
            reviewsCount={item.reviewsCount}
          />
          {item.serviceName ? (
            <Text style={styles.service} numberOfLines={1}>
              {item.serviceName}
            </Text>
          ) : null}
        </View>
      </View>

      <View onTouchStart={() => { if (__DEV__) console.log(`[UI:TOUCH_START] sheet=provider_preview action=VIEW_PROFILE requestId=${requestId ?? 'null'} target=wrapper`); }}>
        <Button
          title="Ver Profesional"
          icon="User"
          debugId="provider_preview:view_profile"
          onPress={() => {
            bottomSheetDebug('PANEL_PRESS', { key: 'provider_preview', requestId, action: 'VIEW_PROFILE', origin: 'PROVIDER_PREVIEW_PANEL' });
            dispatchBottomSheetAction('provider_preview', 'VIEW_PROFILE', item, 'PROVIDER_PREVIEW_PANEL');
          }}
          style={styles.button}
        />
      </View>
      <View onTouchStart={() => { if (__DEV__) console.log(`[UI:TOUCH_START] sheet=provider_preview action=DESELECT requestId=${requestId ?? 'null'} target=wrapper`); }}>
        <Button
          title="Cancelar"
          variant="outline"
          debugId="provider_preview:deselect"
          onPress={() => {
            bottomSheetDebug('PANEL_PRESS', { key: 'provider_preview', requestId, action: 'DESELECT', origin: 'PROVIDER_PREVIEW_PANEL' });
            dispatchBottomSheetAction('provider_preview', 'DESELECT', undefined, 'PROVIDER_PREVIEW_PANEL');
          }}
          style={[styles.button, styles.cancelButton]}
        />
      </View>
      {__DEV__ ? (
        <Pressable
          onTouchStart={() => console.log(`[TEST:NATIVE_TOUCH] sheet=provider_preview requestId=${requestId ?? 'null'}`)}
          onPressIn={() => console.log(`[TEST:NATIVE_PRESS_IN] sheet=provider_preview requestId=${requestId ?? 'null'}`)}
          onPressOut={() => console.log(`[TEST:NATIVE_PRESS_OUT] sheet=provider_preview requestId=${requestId ?? 'null'}`)}
          onPress={() => console.log(`[TEST:NATIVE_PRESS] sheet=provider_preview requestId=${requestId ?? 'null'}`)}
          style={styles.nativePressProbe}
        >
          <Text style={styles.nativePressProbeText}>TEST PRESS</Text>
        </Pressable>
      ) : null}
    </View>
  );

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
  },
  emptyContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_H_PADDING,
    paddingBottom: TOKENS.spacing.lg,
  },
  card: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_H_PADDING,
    paddingBottom: TOKENS.spacing.lg,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  providerInfo: {
    flex: 1,
    marginLeft: TOKENS.spacing.md,
  },
  name: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  service: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  button: {
    width: SCREEN_WIDTH - CARD_H_PADDING * 2,
  },
  cancelButton: {
    marginTop: TOKENS.spacing.sm,
  },
  nativePressProbe: {
    marginTop: TOKENS.spacing.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surface100,
  },
  nativePressProbeText: {
    color: TOKENS.colors.textSubtle,
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: TOKENS.spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.surface300,
  },
  dotActive: {
    backgroundColor: TOKENS.colors.brand500,
    width: 18,
  },
});
