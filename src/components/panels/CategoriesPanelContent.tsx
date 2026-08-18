import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { BottomSheetTextInput, BottomSheetFlatList } from '../../bottom-sheet/primitives';
import { TOKENS } from '../../theme';
import { Icon, RotatingHorizontalAd, EmptyState } from '../ui';
import { useCategories } from '../../context/CategoriesContext';
import { useAds } from '../../hooks/useAds';
import type { TreeNode } from '../../utils/categoryTree';
import { useBottomSheet, usePanelState } from '../../bottom-sheet/core/useBottomSheet';
import { bottomSheetDebug } from '../../bottom-sheet/core/bottomSheet.debug';
import type { SheetComponentProps } from '../../bottom-sheet/core/bottomSheet.types';
import { useBottomNavHeight } from '../layout/bottomNavMetrics';

export const CategoriesPanelContent: React.FC<SheetComponentProps<'categories'>> = ({ sheetKey, requestId, payload }) => {
  const { dispatchBottomSheetAction } = useBottomSheet();
  const [panelState, setPanelState] = usePanelState(sheetKey, { searchQuery: '', showOffline: false });
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
  
  const searchQuery = panelState.searchQuery;
  const setSearchQuery = (text: string) => setPanelState({ ...panelState, searchQuery: text });
  
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
    if (!searchQuery.trim()) return categoryTree;
    const q = searchQuery.trim().toLowerCase();
    const results: TreeNode[] = [];
    for (const node of categoryTree) {
      for (const service of node.services) {
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
      <View
        onTouchStart={() => {
          if (__DEV__) console.log(`[UI:TOUCH_START] sheet=categories action=SELECT_CATEGORY requestId=${requestId ?? 'null'} node=${item.slug}`);
        }}
      >
      <TouchableOpacity
        onPressIn={() => {
          if (__DEV__) console.log(`[UI:BUTTON_PRESS_IN] sheet=categories action=SELECT_CATEGORY requestId=${requestId ?? 'null'} node=${item.slug}`);
        }}
        onPressOut={() => {
          if (__DEV__) console.log(`[UI:BUTTON_PRESS_OUT] sheet=categories action=SELECT_CATEGORY requestId=${requestId ?? 'null'} node=${item.slug}`);
        }}
        onPress={() => {
          if (__DEV__) console.log(`[UI:BUTTON_PRESS] sheet=categories action=SELECT_CATEGORY requestId=${requestId ?? 'null'} node=${item.slug}`);
          handleNodePress(item);
        }}
        style={[
          styles.nodeCard,
          item.type === 'category' && styles.nodeCardCategory,
          (item.type === 'subcategory' || item.type === 'service') && styles.nodeCardSubcategory,
        ]}
        activeOpacity={0.7}
      >
        <Icon
          name="ChevronRight"
          size={18}
          color={TOKENS.colors.textSubtle}
        />
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
          <Text style={styles.nodeCardCount}>
            {item.services.length}
          </Text>
          {item.onlineProviderCount > 0 && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>
                {item.onlineProviderCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      </View>
    ),
    [handleNodePress, requestId],
  );

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={[styles.container]}
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
      <View style={showSearch ? styles.contentFlex : styles.content}>
        <View style={styles.searchBar}>
          <Icon
            name="Search"
            size={18}
            color={TOKENS.colors.brand500}
            style={styles.searchIcon}
          />
          <BottomSheetTextInput
            placeholder="Buscar categorías o servicios..."
            placeholderTextColor={TOKENS.colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              if (selectedCategory && text) {
                dispatchBottomSheetAction('categories', 'CLEAR_CATEGORY', undefined, 'CATEGORIES_SEARCH');
              }
              setSearchQuery(text);
            }}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="X" size={16} color={TOKENS.colors.textSubtle} />
            </TouchableOpacity>
          ) : null}
        </View>

        {hasError ? (
          <EmptyState
            icon="AlertTriangle"
            title="Error al cargar"
            description="No se pudieron cargar las categorías."
          />
        ) : selectedCategory ? (
          <View style={styles.selectedState}>
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedTitle}>
                Filtrando: {selectedCategory.name}
              </Text>
              <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                <Text style={styles.clearBtnText}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !showSearch ? (
          <>
            <Text style={styles.sheetTitle}>Promociones de hoy</Text>
            <RotatingHorizontalAd
              images={horizontal}
              transitionDuration={getTransitionDuration('marketing', 'HORIZONTAL', 6000)}
            />
          </>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {isLoading
                  ? 'Buscando...'
                  : `${visibleNodes.length} resultado${visibleNodes.length !== 1 ? 's' : ''}`}
              </Text>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  showOffline && styles.toggleBtnActive,
                ]}
                onPress={() => setShowOffline(!showOffline)}
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
            </View>

            {isLoading && visibleNodes.length === 0 ? (
              <EmptyState icon="Inbox" title="Buscando..." description="" />
            ) : visibleNodes.length === 0 ? (
              <EmptyState
                icon="Search"
                title="Sin resultados"
                description="No se encontraron categorías ni servicios con ese nombre."
              />
            ) : (
              <BottomSheetFlatList
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                data={visibleNodes}
                renderItem={renderNodeCard}
                keyExtractor={(node) => `node-${node.type}-${node.id}`}
                extraData={visibleNodes}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: TOKENS.spacing.lg,
  },
  contentFlex: {
    paddingHorizontal: TOKENS.spacing.lg,
  },
  sheetTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  searchBar: {
    height: 52,
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
    marginTop: 4,
  },
  searchIcon: {
    marginRight: TOKENS.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: TOKENS.colors.textMain,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    height: '100%',
    padding: 0,
  },

  // Selected state
  selectedState: {
    paddingTop: TOKENS.spacing.md,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  selectedTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.brand600,
    flex: 1,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
  },

  // Results header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  resultsTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 8,
  },
  nodeCardCategory: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.brand200,
  },
  nodeCardSubcategory: {
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  nodeCardBody: {
    flex: 1,
  },
  nodeCardTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  nodeCardParent: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  nodeCardRight: {
    alignItems: 'center',
    gap: 4,
  },
  nodeCardCount: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
  },
  onlineBadge: {
    backgroundColor: TOKENS.colors.statusSuccess,
    borderRadius: 8,
    minWidth: 20,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  onlineBadgeText: {
    fontSize: 9,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.white,
  },
});
