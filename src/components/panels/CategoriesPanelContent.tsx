import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { TouchableOpacity as RNGHTouchableOpacity } from 'react-native-gesture-handler';
import { BottomSheetFlatList, SheetHeader } from '../../bottom-sheet/primitives';
import { TOKENS } from '../../theme';
import { Icon, RotatingHorizontalAd, EmptyState } from '../ui';
import { useCategories } from '../../context/CategoriesContext';
import { useAds } from '../../hooks/useAds';
import type { TreeNode } from '../../utils/categoryTree';
import { useBottomSheet, usePanelState } from '../../bottom-sheet/core/useBottomSheet';
import { bottomSheetDebug } from '../../bottom-sheet/core/bottomSheet.debug';
import type { SheetComponentProps } from '../../bottom-sheet/core/bottomSheet.types';
import { useBottomNavHeight } from '../layout/bottomNavMetrics';

export const CategoriesPanelContent: React.FC<SheetComponentProps<'categories'>> = ({
  sheetKey,
  requestId,
  payload,
  isCollapsed = false,
  setIndex,
}) => {
  const { dispatchBottomSheetAction } = useBottomSheet();
  const [panelState, setPanelState] = usePanelState(sheetKey, { showOffline: false });
  // DEV-only measurement probe (Fase 0) — no layout change
  const rootRef = useRef<View>(null);
  const { height: winH } = useWindowDimensions();
  const navHeight = useBottomNavHeight();

  useEffect(() => {
    bottomSheetDebug('PANEL_MOUNT', { key: sheetKey, requestId });
    return () => {
      bottomSheetDebug('PANEL_UNMOUNT', { key: sheetKey, requestId });
    };
  }, [requestId, sheetKey]);
  
  const searchQuery = payload.searchQuery ?? '';
  
  const showOffline = panelState.showOffline;
  const setShowOffline = (val: boolean) => setPanelState({ ...panelState, showOffline: val });

  const {
    categoryTree,
    servicesLoading,
    categoriesLoading,
    mainLoading,
    servicesError,
    categoriesError,
    mainError,
  } = useCategories();

  const hasError = !!(servicesError || categoriesError || mainError);
  const isLoading = servicesLoading || categoriesLoading || mainLoading;

  const selectedCategory = payload.selectedCategory;

  const { horizontal, getTransitionDuration } = useAds();

  const visibleNodes = useMemo(() => {
    const tree = categoryTree || [];
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.trim().toLowerCase();
    const results: TreeNode[] = [];
    for (const node of tree) {
      for (const service of (node.services || [])) {
        if (service.name.toLowerCase().includes(q)) {
          const sps = service.serviceProviders || [];
          results.push({
            id: service.id,
            name: service.name,
            slug: `service-${service.id}`,
            type: 'service' as const,
            parentName: node.name,
            services: [service],
            providerCount: sps.length,
            onlineProviderCount: sps.filter((sp: any) => sp.provider?.isRealtimeActive).length,
          });
        }
      }
    }
    return results;
  }, [categoryTree, searchQuery]);

  const showSearch = searchQuery.trim().length > 0;

  const handleNodePress = useCallback(
    (node: TreeNode) => {
      Keyboard.dismiss();
      bottomSheetDebug('PANEL_PRESS', { key: 'categories', requestId, action: 'SELECT_CATEGORY', origin: 'CATEGORIES_PANEL' });
      dispatchBottomSheetAction('categories', 'SELECT_CATEGORY', {
        id: String(node.id),
        name: node.name,
        slug: node.slug,
        icon: 'Grid',
        subcategories: [],
      }, 'CATEGORIES_PANEL');
    },
    [dispatchBottomSheetAction, requestId],
  );

  const handleClear = useCallback(() => {
    dispatchBottomSheetAction('categories', 'CLEAR_CATEGORY', undefined, 'CATEGORIES_PANEL');
  }, [dispatchBottomSheetAction]);

  const renderNodeCard = useCallback(
    ({ item }: { item: TreeNode }) => (
      <RNGHTouchableOpacity
        onPress={() => {
          if (__DEV__) console.log(`[UI:BUTTON_PRESS] sheet=categories action=SELECT_CATEGORY requestId=${requestId ?? 'null'} node=${item.slug}`);
          handleNodePress(item);
        }}
        style={[
          styles.nodeCard,
          item.type === 'category' && styles.nodeCardCategory,
          (item.type === 'subcategory' || item.type === 'service') && styles.nodeCardSubcategory,
        ]}
        activeOpacity={0.75}
      >
        <View style={styles.nodeIconCircle}>
          <Icon
            name={item.type === 'category' ? 'Grid' : 'Briefcase'}
            size={18}
            color={TOKENS.colors.brand500}
          />
        </View>
        <View style={styles.nodeCardBody}>
          <Text style={styles.nodeCardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          {item.parentName ? (
            <Text style={styles.nodeCardParent} numberOfLines={1}>
              {item.parentName}
            </Text>
          ) : null}
        </View>
        <View style={styles.nodeCardRight}>
          {item.onlineProviderCount > 0 ? (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineBadgeText}>
                {item.onlineProviderCount} online
              </Text>
            </View>
          ) : (
            <Text style={styles.nodeCardCount}>
              {item.services.length} serv.
            </Text>
          )}
          <Icon
            name="ChevronRight"
            size={16}
            color={TOKENS.colors.textMuted}
          />
        </View>
      </RNGHTouchableOpacity>
    ),
    [handleNodePress, requestId],
  );

  if (isCollapsed) {
    return (
      <View style={styles.compactContainer}>
        {selectedCategory ? (
          <View style={styles.compactSelectedRow}>
            <TouchableOpacity
              style={styles.compactSelectedLeft}
              onPress={() => setIndex?.(1)}
              activeOpacity={0.8}
              accessibilityLabel="Expandir filtro de categoría"
              accessibilityRole="button"
            >
              <View style={styles.compactSelectedIconCircle}>
                <Icon name="CheckCircle" size={14} color={TOKENS.colors.brand500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.compactSelectedLabel}>Filtrando por</Text>
                <Text style={styles.compactSelectedTitle} numberOfLines={1}>
                  {selectedCategory.name}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactClearBtn}
              onPress={handleClear}
              activeOpacity={0.8}
              accessibilityLabel="Limpiar filtro de categoría"
              accessibilityRole="button"
            >
              <Text style={styles.compactClearBtnText}>Limpiar</Text>
              <Icon name="X" size={12} color={TOKENS.colors.brand700} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.compactPromoCard}
            onPress={() => setIndex?.(1)}
            activeOpacity={0.8}
            accessibilityLabel="Expandir catálogo de servicios"
            accessibilityRole="button"
          >
            <View style={styles.compactPromoLeft}>
              <View style={styles.compactPromoIconCircle}>
                <Icon name={searchQuery ? 'Search' : 'Grid'} size={15} color={TOKENS.colors.brand500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.compactPromoText} numberOfLines={1}>
                  {searchQuery ? `Buscando "${searchQuery}"` : 'Explorar servicios y categorías'}
                </Text>
                <Text style={styles.compactPromoSubtext} numberOfLines={1}>
                  {searchQuery
                    ? `${visibleNodes.length} resultado${visibleNodes.length !== 1 ? 's' : ''}`
                    : 'Toca para ver el catálogo'}
                </Text>
              </View>
            </View>
            <Icon name="ChevronUp" size={18} color={TOKENS.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const renderSearchHeader = () => (
    <View style={styles.searchStickyHeader}>
      <SheetHeader
        title={isLoading ? 'Buscando...' : `${visibleNodes.length} resultado${visibleNodes.length !== 1 ? 's' : ''}`}
        subtitle={searchQuery ? `Servicios para "${searchQuery}"` : undefined}
        trailing={
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              showOffline && styles.toggleBtnActive,
            ]}
            onPress={() => setShowOffline(!showOffline)}
            activeOpacity={0.8}
            accessibilityLabel="Filtrar profesionales online"
          >
            <Text
              style={[
                styles.toggleBtnText,
                showOffline && styles.toggleBtnTextActive,
              ]}
            >
              {showOffline ? 'Solo Online' : 'Todos'}
            </Text>
          </TouchableOpacity>
        }
      />
    </View>
  );

  if (showSearch) {
    return (
      <BottomSheetFlatList
        ref={rootRef as any}
        collapsable={false}
        style={styles.searchList}
        showsVerticalScrollIndicator={true}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.searchListContent}
        data={hasError || isLoading ? [] : visibleNodes}
        renderItem={renderNodeCard}
        keyExtractor={(node) => `node-${node.type}-${node.id}`}
        extraData={visibleNodes}
        ListHeaderComponent={renderSearchHeader}
        stickyHeaderIndices={[0]}
        ListEmptyComponent={
          hasError ? (
            <EmptyState
              icon="AlertTriangle"
              title="Error al cargar"
              description="No se pudieron cargar las categorías."
            />
          ) : isLoading ? (
            <EmptyState icon="Inbox" title="Buscando..." description="" />
          ) : (
            <EmptyState
              icon="Search"
              title="Sin resultados"
              description="No se encontraron categorías ni servicios con ese nombre."
            />
          )
        }
        onLayout={() => {
          if (!__DEV__) return;
          console.log('[BS:MEASURE]', {
            key: sheetKey,
            mode: 'search_list',
            navTop: winH - navHeight,
            windowHeight: winH,
          });
        }}
      />
    );
  }

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={styles.container}
      onLayout={() => {
        if (!__DEV__) return;
        rootRef.current?.measureInWindow((x, y, w, h) => {
          console.log('[BS:MEASURE]', {
            key: sheetKey,
            contentTop: y,
            contentBottom: y + h,
            contentHeight: h,
            navTop: winH - navHeight,
            windowHeight: winH,
            overlapPx: y + h - (winH - navHeight),
          });
        });
      }}
    >
      <View style={styles.content}>
        {hasError ? (
          <EmptyState
            icon="AlertTriangle"
            title="Error al cargar"
            description="No se pudieron cargar las categorías."
          />
        ) : selectedCategory ? (
          <View style={styles.selectedState}>
            <View style={styles.selectedHeaderCard}>
              <View style={styles.selectedLeft}>
                <View style={styles.selectedIconCircle}>
                  <Icon name="CheckCircle" size={16} color={TOKENS.colors.brand500} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedLabel}>Filtrando por</Text>
                  <Text style={styles.selectedTitle} numberOfLines={1}>
                    {selectedCategory.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
                <Text style={styles.clearBtnText}>Limpiar</Text>
                <Icon name="X" size={12} color={TOKENS.colors.brand700} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.promoSection}>
            <RotatingHorizontalAd
              images={horizontal}
              transitionDuration={getTransitionDuration('marketing', 'HORIZONTAL', 6000)}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    paddingTop: TOKENS.spacing.xs,
  },
  content: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: 8,
  },
  promoSection: {
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.dark900,
    marginBottom: TOKENS.spacing.sm,
    letterSpacing: -0.3,
  },

  // Selected state
  selectedState: {
    paddingTop: TOKENS.spacing.xxs,
    marginBottom: TOKENS.spacing.sm,
  },
  selectedHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    borderRadius: 16,
    padding: 12,
    paddingHorizontal: 14,
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  selectedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
  },
  selectedLabel: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },

  // Results header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  resultsTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  toggleBtnActive: {
    backgroundColor: TOKENS.colors.brand50,
    borderColor: TOKENS.colors.brand500,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  toggleBtnTextActive: {
    color: TOKENS.colors.brand600,
  },

  // Node cards
  searchStickyHeader: {
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TOKENS.colors.surface200,
    zIndex: 10,
  },
  searchList: {
    flexGrow: 0,
  },
  searchListContent: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: 4,
    paddingTop: 4,
  },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 12,
    marginBottom: 8,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  nodeCardCategory: {
    borderColor: TOKENS.colors.surface200,
  },
  nodeCardSubcategory: {
    borderColor: TOKENS.colors.surface200,
  },
  nodeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCardBody: {
    flex: 1,
  },
  nodeCardTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  nodeCardParent: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
    fontWeight: TOKENS.typography.weights.medium,
  },
  nodeCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nodeCardCount: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TOKENS.colors.success50,
    borderWidth: 1,
    borderColor: TOKENS.colors.success200,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.statusSuccess,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.success700,
  },
  compactContainer: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.xs,
    paddingBottom: TOKENS.spacing.sm,
  },
  compactSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 12,
  },
  compactSelectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  compactSelectedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
  },
  compactSelectedLabel: {
    fontSize: 9,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
    textTransform: 'uppercase',
  },
  compactSelectedTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  compactClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
  },
  compactClearBtnText: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },
  compactPromoCard: {
    height: 50,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom:10
  },
  compactPromoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  compactPromoIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  compactPromoText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  compactPromoSubtext: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
    marginTop: 1,
  },
});
