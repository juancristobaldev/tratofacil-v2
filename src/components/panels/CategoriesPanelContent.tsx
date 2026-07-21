import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Rating, Badge, RotatingHorizontalAd } from '../ui';
import { MOCK_CATEGORIES, MOCK_PROVIDERS, Category } from '../../mocks/mockData';
import { usePanel } from '../../context/PanelContext';

export const CategoriesPanelContent: React.FC = () => {
  const navigation = useNavigation<any>();
  const { panelData } = usePanel();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_CATEGORIES;
    return MOCK_CATEGORIES.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const filteredProviders = useMemo(() => {
    if (!selectedCategory) return [];
    return MOCK_PROVIDERS.filter((p) => p.categorySlug === selectedCategory.slug);
  }, [selectedCategory]);

  const handleCategoryPress = (category: Category) => {
    setSelectedCategory(category);
    if (panelData?.onCategoryPress) {
      panelData.onCategoryPress(category);
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
    if (panelData?.onClearCategory) {
      panelData.onClearCategory();
    }
  };

  return (
    <View style={styles.container}>
      {selectedCategory ? (
        <View style={styles.sheetContent}>
          <TouchableOpacity onPress={handleBack} style={styles.sheetBackBtn}>
            <Icon name="ArrowLeft" size={16} color={TOKENS.colors.brand500} />
            <Text style={styles.sheetBackText}>Todas las categorías</Text>
          </TouchableOpacity>
          <Text style={styles.categoryTitle}>{selectedCategory.name}</Text>
          {filteredProviders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="Inbox" size={40} color={TOKENS.colors.textMuted} />
              <Text style={styles.emptyText}>No hay profesionales disponibles en este momento.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProviders}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProviderProfile', { providerId: item.id })}
                  style={styles.providerCard}
                  activeOpacity={0.9}
                >
                  <Avatar uri={item.avatar} name={item.name} size={48} />
                  <View style={styles.providerInfo}>
                    <View style={styles.providerHeader}>
                      <Text style={styles.providerName} numberOfLines={1}>{item.name}</Text>
                      {item.verified && <Badge label="SEC" tone="success" size="sm" />}
                    </View>
                    <Text style={styles.providerService} numberOfLines={1}>{item.serviceName}</Text>
                    <View style={styles.providerFooter}>
                      <Rating rating={item.rating} size={10} reviewsCount={item.reviewsCount} showText />
                      <Text style={styles.providerPrice}>${item.pricePerHour.toLocaleString('es-CL')}/hr</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
        <View style={styles.sheetContent}>
          {/* Search bar inside sheet content */}
          <View style={styles.sheetSearchBarContainer}>
            <Icon name="Search" size={18} color={TOKENS.colors.brand500} style={styles.searchIcon} />
            <TextInput
              placeholder="Buscar rubros, oficios y profesiones..."
              placeholderTextColor={TOKENS.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="X" size={16} color={TOKENS.colors.textSubtle} />
              </TouchableOpacity>
            ) : null}
          </View>

          {!searchQuery.trim() ? (
            <>
              <Text style={styles.sheetTitle}>Promociones de hoy</Text>
              <RotatingHorizontalAd />
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>Categorías encontradas</Text>
              <ScrollView contentContainerStyle={styles.categoryGrid} showsVerticalScrollIndicator={false}>
                {filteredCategories.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleCategoryPress(item)}
                    style={styles.categoryCard}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryIconCircle}>
                      <Icon
                        name={item.icon as any}
                        size={20}
                        color={item.slug === 'electricidad' ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle}
                      />
                    </View>
                    <Text style={styles.categoryCardText} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: TOKENS.spacing.lg,
  },
  sheetTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 24,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface200,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  categoryCardText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
    flex: 1,
  },
  sheetBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sheetBackText: {
    color: TOKENS.colors.brand500,
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.semibold,
    marginLeft: 4,
  },
  categoryTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  providerCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface200,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  providerName: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    flex: 1,
    marginRight: 8,
  },
  providerService: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginBottom: 4,
  },
  providerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerPrice: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  sheetSearchBarContainer: {
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
});
