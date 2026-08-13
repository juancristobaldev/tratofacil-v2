import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { TOKENS } from '../../theme';
import { Avatar, Button, Rating } from '../ui';
import { usePanel } from '../../context/PanelContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = TOKENS.spacing.lg;

interface PreviewProvider {
  id?: string;
  spId?: string;
  name?: string;
  providerName?: string;
  avatar?: string | null;
  rating?: number;
  reviewsCount?: number;
  serviceName?: string;
}

export const ProviderPreviewPanelContent: React.FC = () => {
  const { panelData } = usePanel();
  const onIndexChange = panelData?.onIndexChange;
  const onViewProfile = panelData?.onViewProfile;
  const onDeselect = panelData?.onDeselect;
  const selectedIndex = panelData?.selectedIndex ?? 0;

  const listRef = useRef<FlatList<PreviewProvider>>(null);
  const lastEmittedIndex = useRef<number>(selectedIndex);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  // Si no vienen varios proveedores, mostramos al menos el seleccionado.
  const clampedProviders: PreviewProvider[] = useMemo(
    () => {
      const list: PreviewProvider[] = panelData?.providers || [];
      if (list.length > 0) return list;
      return panelData?.provider ? [panelData.provider] : [];
    },
    [panelData?.providers, panelData?.provider],
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
      if (typeof onIndexChange === 'function') {
        onIndexChange(clampedProviders[index]);
      }
    },
    [clampedProviders, onIndexChange],
  );

  if (clampedProviders.length === 0) return null;
  const showDots = clampedProviders.length > 1;

  const renderItem = ({ item }: { item: PreviewProvider }) => (
    <View style={styles.card}>
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

      <Button
        title="Ver Profesional"
        icon="User"
        onPress={() => typeof onViewProfile === 'function' && onViewProfile(item)}
        style={styles.button}
      />
      <Button
        title="Cancelar"
        variant="outline"
        onPress={() => typeof onDeselect === 'function' && onDeselect()}
        style={[styles.button, styles.cancelButton]}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
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
