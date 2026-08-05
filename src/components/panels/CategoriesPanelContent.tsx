import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, RotatingHorizontalAd, EmptyState } from '../ui';
import { useCategories } from '../../hooks/useCategories';
import { useAds } from '../../hooks/useAds';
import { usePanel } from '../../context/PanelContext';
import type { TreeNode } from '../../utils/categoryTree';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_PANEL_HEIGHT = SCREEN_HEIGHT * 0.75;

function matchText(target: string, query: string): boolean {
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q) || q.includes(t)) return true;
  const tWords = t.split(/\s+/);
  const qWords = q.split(/\s+/);
  return qWords.some((qw) =>
    tWords.some(
      (tw) => tw.startsWith(qw) || qw.startsWith(tw) || tw.includes(qw),
    ),
  );
}

export const CategoriesPanelContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOffline, setShowOffline] = useState(false);

  const {
    categoryTree,
    servicesLoading,
    categoriesLoading,
    mainLoading,
    servicesError,
    categoriesError,
    mainError,
    refetchServicesByCategory,
  } = useCategories();

  const hasError = !!(servicesError || categoriesError || mainError);
  const isLoading = servicesLoading || categoriesLoading || mainLoading;

  const { clearPanel, panelData } = usePanel();
  const selectedCategory = panelData?.selectedCategory;
  const onCategoryPress = panelData?.onCategoryPress;
  const onClearCategory = panelData?.onClearCategory;

  const { horizontal, getTransitionDuration } = useAds();

  const visibleNodes = useMemo(() => {
    if (!searchQuery.trim()) return categoryTree;
    const q = searchQuery.trim().toLowerCase();
    return categoryTree.filter((node) => matchText(node.name, q));
  }, [categoryTree, searchQuery]);

  const showSearch = searchQuery.trim().length > 0;

  const handleNodePress = useCallback(
    (node: TreeNode) => {
      console.log('[DEBUG:CATEGORIES] TAP:', node.name, '| slug:', node.slug, '| type:', node.type);
      onCategoryPress?.({
        id: String(node.id),
        name: node.name,
        slug: node.slug,
        icon: 'Grid',
        subcategories: [],
      });
      clearPanel();
    },
    [onCategoryPress, clearPanel],
  );

  const handleClear = useCallback(() => {
    onClearCategory?.();
    clearPanel();
  }, [onClearCategory, clearPanel]);

  const renderNodeCard = (node: TreeNode) => (
    <TouchableOpacity
      key={`node-${node.type}-${node.id}`}
      onPress={() => handleNodePress(node)}
      style={[
        styles.nodeCard,
        node.type === 'category' && styles.nodeCardCategory,
        node.type === 'subcategory' && styles.nodeCardSubcategory,
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
          {node.name}
        </Text>
        {node.type === 'subcategory' && node.parentName ? (
          <Text style={styles.nodeCardParent} numberOfLines={1}>
            {node.parentName}
          </Text>
        ) : null}
      </View>
      <View style={styles.nodeCardRight}>
        <Text style={styles.nodeCardCount}>
          {node.services.length}
        </Text>
        {node.onlineProviderCount > 0 && (
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>
              {node.onlineProviderCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { maxHeight: MAX_PANEL_HEIGHT }]}>
      <View style={showSearch ? styles.contentFlex : styles.content}>
        <View style={styles.searchBar}>
          <Icon
            name="Search"
            size={18}
            color={TOKENS.colors.brand500}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Buscar categorías o servicios..."
            placeholderTextColor={TOKENS.colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              if (selectedCategory && text) {
                onClearCategory?.();
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
            {isLoading && visibleNodes.length === 0 ? (
              <EmptyState
                icon="Inbox"
                title="Cargando categorías..."
                description=""
              />
            ) : (
              <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              >
                {visibleNodes.map(renderNodeCard)}
              </ScrollView>
            )}
          </>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {isLoading
                  ? 'Buscando...'
                  : `${visibleNodes.length} categoría${visibleNodes.length !== 1 ? 's' : ''}`}
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
                description="No se encontraron categorías con ese nombre."
              />
            ) : (
              <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              >
                {visibleNodes.map(renderNodeCard)}
              </ScrollView>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  content: {
    paddingHorizontal: TOKENS.spacing.lg,
  },
  contentFlex: {
    flex: 1,
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
