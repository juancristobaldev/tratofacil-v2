import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Modal, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Badge, ErrorState } from '../ui';
import { LocationModal } from '../ui/LocationModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRole } from '../../context/RoleContext';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useRefresh } from '../../context/RefreshContext';
import { getImageUrl } from '../../utils/imageUrl';
import type { CategoryProduct } from '../../types/graphql';

type MarketplaceMainTab = 'Explorar' | 'Mis Pedidos';
type OrdersSubTab = 'Mis Compras' | 'Mis Ventas';

const statusBadge: Record<string, { label: string; tone: 'brand' | 'success' | 'warning' | 'neutral' }> = {
  PENDING: { label: 'PENDIENTE', tone: 'warning' },
  PROCESSING: { label: 'EN CAMINO', tone: 'brand' },
  SUCCESS: { label: 'COMPLETADO', tone: 'success' },
  CANCELLED: { label: 'CANCELADO', tone: 'neutral' },
};

const SelectorDropdown: React.FC<{
  label: string;
  placeholder: string;
  value: string | null;
  options: CategoryProduct[];
  onSelect: (slug: string) => void;
}> = ({ label, placeholder, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.slug === value);

  return (
    <>
      <Text style={styles.selectorLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.selector}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.selectorText, !selected && styles.selectorPlaceholder]}>
          {selected?.name || placeholder}
        </Text>
        <Icon name="ChevronDown" size={18} color={TOKENS.colors.textSubtle} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.selectorOverlay} onPress={() => setOpen(false)}>
          <View style={styles.selectorModal}>
            <View style={styles.selectorModalHeader}>
              <Text style={styles.selectorModalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Icon name="X" size={20} color={TOKENS.colors.textMain} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.selectorOption, item.slug === value && styles.selectorOptionActive]}
                  onPress={() => {
                    onSelect(item.slug);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.selectorOptionText, item.slug === value && styles.selectorOptionTextActive]}>
                    {item.name}
                  </Text>
                  {item.slug === value && (
                    <Icon name="Check" size={18} color={TOKENS.colors.brand500} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export const MarketplaceTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();
  const {
    filteredProducts,
    productsLoading,
    productsError,
    refetchMarketplace,
    parentCategories,
    selectedCategory,
    setSelectedCategory,
    selectedSubCategory,
    setSelectedSubCategory,
    currentSubCategories,
    myOrders,
    mySales,
    myOrdersLoading,
    mySalesLoading,
  } = useMarketplace();

  const { setIsRefreshing } = useRefresh();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetchMarketplace();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetchMarketplace, setIsRefreshing]);

  const [activeMainTab, setActiveMainTab] = useState<MarketplaceMainTab>('Explorar');
  const [activeSubTab, setActiveSubTab] = useState<OrdersSubTab>('Mis Compras');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [location, setLocation] = useState('Providencia, RM');

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    setIsLocationModalOpen(false);
  };

  const searchedProducts = searchQuery
    ? filteredProducts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredProducts;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.mainTabsRow}>
        <TouchableOpacity
          style={[styles.mainTab, activeMainTab === 'Explorar' && styles.mainTabActive]}
          onPress={() => setActiveMainTab('Explorar')}
        >
          <Text style={[styles.mainTabText, activeMainTab === 'Explorar' && styles.mainTabTextActive]}>Explorar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeMainTab === 'Mis Pedidos' && styles.mainTabActive]}
          onPress={() => setActiveMainTab('Mis Pedidos')}
        >
          <Text style={[styles.mainTabText, activeMainTab === 'Mis Pedidos' && styles.mainTabTextActive]}>Mis Pedidos</Text>
        </TouchableOpacity>
      </View>

      {activeMainTab === 'Explorar' ? (
        <>
          <View style={styles.headerBox}>
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Icon name="Search" size={20} color={TOKENS.colors.textSubtle} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Qué necesitas buscar?"
                  placeholderTextColor={TOKENS.colors.textSubtle}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity
                style={styles.locationBtn}
                activeOpacity={0.8}
                onPress={() => setIsLocationModalOpen(true)}
              >
                <Icon name="MapPin" size={20} color={TOKENS.colors.white} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.plansBanner}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Plans')}
            >
              <View style={styles.plansBannerIcon}>
                <Icon name="TrendingUp" size={20} color={TOKENS.colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plansBannerTitle}>Vende más rápido</Text>
                <Text style={styles.plansBannerDesc}>Descubre nuestros planes para vendedores destacados.</Text>
              </View>
              <Icon name="ChevronRight" size={20} color={TOKENS.colors.brand700} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
          >

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filtrar por Categoría</Text>

              <SelectorDropdown
                label="Categoría Principal"
                placeholder="Todas las categorías"
                value={selectedCategory}
                options={parentCategories}
                onSelect={(slug) => setSelectedCategory(slug)}
              />

              {selectedCategory && currentSubCategories.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <SelectorDropdown
                    label="Subcategoría"
                    placeholder={`Todo en ${parentCategories.find((c) => c.slug === selectedCategory)?.name || ''}`}
                    value={selectedSubCategory}
                    options={currentSubCategories}
                    onSelect={(slug) => setSelectedSubCategory(slug === selectedSubCategory ? null : slug)}
                  />
                </View>
              )}
            </View>

            {productsLoading ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cargando...</Text>
                <ActivityIndicator size="large" color={TOKENS.colors.brand500} style={{ paddingVertical: 32 }} />
              </View>
            ) : productsError ? (
              <View style={styles.section}>
                <ErrorState
                  message="No se pudieron cargar los productos. Revisa tu conexión e intenta nuevamente."
                  onRetry={() => refetchMarketplace()}
                />
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {searchedProducts.length === 0
                    ? 'No hay productos'
                    : `Productos${selectedCategory ? ` en ${parentCategories.find((c) => c.slug === selectedCategory)?.name || ''}` : ''} (${searchedProducts.length})`}
                </Text>
                {searchedProducts.length > 0 && (
                  <View style={styles.productsGrid}>
                    {searchedProducts.map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.productCard}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('ProductDetail', { id: product.id })}
                      >
                        <View style={styles.productImagePlaceholder}>
                          {product.images?.[0]?.image?.cdnUrl ? (
                            <Image source={{ uri: getImageUrl(product.images[0].image.cdnUrl) }} style={styles.productImage} />
                          ) : (
                            <Icon name="Image" size={32} color={TOKENS.colors.surface200} />
                          )}
                        </View>
                        <View style={styles.productInfo}>
                          <Text style={styles.productTitle} numberOfLines={2}>{product.name}</Text>
                          <Text style={styles.productPrice}>${product.price.toLocaleString('es-CL')}</Text>
                          <View style={styles.productLocation}>
                            <Icon name="MapPin" size={12} color={TOKENS.colors.textSubtle} />
                            <Text style={styles.productLocationText}>{product.location || 'Sin ubicación'}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.ctaFloat}>
            <Button
              title="Publicar Producto"
              icon="Plus"
              onPress={() => navigation.navigate('PublishProduct')}
              style={styles.ctaBtn}
            />
          </View>
        </>
      ) : (
        <View style={{ flex: 1 }}>
          {role === 'guest' ? (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
              <Icon name="Lock" size={48} color={TOKENS.colors.textSubtle} />
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: TOKENS.colors.textMain, marginTop: 16 }}>
                Acceso Restringido
              </Text>
              <Text style={{ fontSize: 14, color: TOKENS.colors.textSubtle, textAlign: 'center', marginVertical: 12 }}>
                Inicia sesión o regístrate para ver y gestionar tus compras y ventas.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <Button title="Iniciar Sesión" onPress={() => navigation.navigate('Login')} />
                <Button title="Registrarme" variant="secondary" onPress={() => navigation.navigate('Register')} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.subTabsRow}>
                <TouchableOpacity
                  style={[styles.subTab, activeSubTab === 'Mis Compras' && styles.subTabActive]}
                  onPress={() => setActiveSubTab('Mis Compras')}
                >
                  <Text style={[styles.subTabText, activeSubTab === 'Mis Compras' && styles.subTabTextActive]}>Mis Compras</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subTab, activeSubTab === 'Mis Ventas' && styles.subTabActive]}
                  onPress={() => setActiveSubTab('Mis Ventas')}
                >
                  <Text style={[styles.subTabText, activeSubTab === 'Mis Ventas' && styles.subTabTextActive]}>Mis Ventas</Text>
                </TouchableOpacity>
              </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
          >
                {activeSubTab === 'Mis Compras' && (
                  <View style={styles.ordersList}>
                    {myOrdersLoading ? (
                      <Text style={styles.emptyText}>Cargando tus compras...</Text>
                    ) : (myOrders?.products || []).length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Icon name="Package" size={48} color={TOKENS.colors.textMuted} />
                        <Text style={styles.emptyTitle}>No tienes compras aún</Text>
                        <Text style={styles.emptySubtitle}>Explora productos en el marketplace.</Text>
                      </View>
                    ) : (
                      (myOrders?.products || []).map((order) => {
                        const badge = statusBadge[order.status] || { label: order.status, tone: 'neutral' as const };
                        return (
                          <TouchableOpacity
                            key={order.id}
                            style={styles.orderCard}
                            onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
                          >
                            <View style={styles.orderHeader}>
                              <Text style={styles.orderNumber}>Orden #{order.id}</Text>
                              <Badge label={badge.label} tone={badge.tone} />
                            </View>
                            <Text style={styles.orderProductTitle} numberOfLines={2}>{order.product?.name || 'Producto'}</Text>
                            <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</Text>
                            <View style={styles.orderFooter}>
                              <Text style={styles.orderPrice}>${order.total.toLocaleString('es-CL')}</Text>
                              <Icon name="ChevronRight" size={20} color={TOKENS.colors.brand600} />
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                {activeSubTab === 'Mis Ventas' && (
                  <View style={styles.ordersList}>
                    {mySalesLoading ? (
                      <Text style={styles.emptyText}>Cargando tus ventas...</Text>
                    ) : mySales.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Icon name="Package" size={48} color={TOKENS.colors.textMuted} />
                        <Text style={styles.emptyTitle}>No tienes ventas aún</Text>
                        <Text style={styles.emptySubtitle}>Publica un producto para empezar a vender.</Text>
                      </View>
                    ) : (
                      mySales.map((order) => {
                        const badge = statusBadge[order.status] || { label: order.status, tone: 'neutral' as const };
                        const needsShipping = order.status === 'SUCCESS' && !order.shippingCompany;
                        return (
                          <TouchableOpacity
                            key={order.id}
                            style={styles.orderCard}
                            onPress={() => navigation.navigate('ManageSale', { id: order.id })}
                          >
                            <View style={styles.orderHeader}>
                              <Text style={styles.orderNumber}>Orden #{order.id}</Text>
                              <Badge label={badge.label} tone={badge.tone} />
                            </View>
                            <Text style={styles.orderProductTitle} numberOfLines={2}>{order.product?.name || 'Producto'}</Text>
                            <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</Text>
                            {needsShipping && (
                              <View style={styles.actionRequiredBox}>
                                <Icon name="AlertCircle" size={14} color={TOKENS.colors.brand600} />
                                <Text style={styles.actionRequiredText}>Debes gestionar el envío</Text>
                              </View>
                            )}
                            <View style={styles.orderFooter}>
                              <Text style={styles.orderPrice}>${order.total.toLocaleString('es-CL')}</Text>
                              <Icon name="ChevronRight" size={20} color={TOKENS.colors.brand600} />
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      )}

      <LocationModal
        visible={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleLocationChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  headerBox: { backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: TOKENS.spacing.md },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.surface100, borderRadius: 16, paddingHorizontal: TOKENS.spacing.md, height: 50, gap: 8 },
  searchInput: { flex: 1, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain, height: '100%' },
  locationBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: TOKENS.colors.textMain, alignItems: 'center', justifyContent: 'center' },
  plansBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.brand50, padding: TOKENS.spacing.md, borderRadius: 16, borderWidth: 1, borderColor: TOKENS.colors.brand100, gap: 12 },
  plansBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: TOKENS.colors.brand500, alignItems: 'center', justifyContent: 'center' },
  plansBannerTitle: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700 },
  plansBannerDesc: { fontSize: 12, color: TOKENS.colors.textSubtle, marginTop: 2 },
  scrollContent: { padding: TOKENS.spacing.md, paddingBottom: 160 },
  section: { marginBottom: TOKENS.spacing.xl },
  sectionTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: TOKENS.spacing.md, justifyContent: 'space-between' },
  productCard: { width: '47%', backgroundColor: TOKENS.colors.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  productImagePlaceholder: { height: 120, backgroundColor: TOKENS.colors.surface100, alignItems: 'center', justifyContent: 'center' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' as const },
  productInfo: { padding: TOKENS.spacing.md },
  productTitle: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.medium, color: TOKENS.colors.textMain, marginBottom: 4, height: 40 },
  productPrice: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: 8 },
  productLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productLocationText: { fontSize: 10, color: TOKENS.colors.textSubtle },
  ctaFloat: { position: 'absolute', bottom: 90, left: TOKENS.spacing.md, right: TOKENS.spacing.md },
  ctaBtn: { width: '100%' },
  mainTabsRow: { flexDirection: 'row', backgroundColor: TOKENS.colors.white, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface200 },
  mainTab: { flex: 1, paddingVertical: TOKENS.spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mainTabActive: { borderBottomColor: TOKENS.colors.brand500 },
  mainTabText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textSubtle },
  mainTabTextActive: { color: TOKENS.colors.brand600, fontWeight: TOKENS.typography.weights.bold },
  subTabsRow: { flexDirection: 'row', backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.sm, gap: TOKENS.spacing.sm },
  subTab: { flex: 1, paddingVertical: TOKENS.spacing.sm, alignItems: 'center', backgroundColor: TOKENS.colors.white, borderRadius: 8, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  subTabActive: { backgroundColor: TOKENS.colors.brand50, borderColor: TOKENS.colors.brand500 },
  subTabText: { fontSize: TOKENS.typography.sizes.xs, fontWeight: TOKENS.typography.weights.medium, color: TOKENS.colors.textSubtle },
  subTabTextActive: { color: TOKENS.colors.brand600, fontWeight: TOKENS.typography.weights.bold },
  ordersList: { gap: TOKENS.spacing.md },
  orderCard: { backgroundColor: TOKENS.colors.white, borderRadius: 16, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: TOKENS.spacing.sm },
  orderNumber: { fontSize: TOKENS.typography.sizes.xs, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle },
  orderProductTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: 4 },
  orderDate: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, marginBottom: TOKENS.spacing.md },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: TOKENS.spacing.sm, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface100 },
  orderPrice: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  actionRequiredBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.sm, borderRadius: 8, marginBottom: TOKENS.spacing.md, gap: 8 },
  actionRequiredText: { fontSize: TOKENS.typography.sizes.xs, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginTop: 16 },
  emptySubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginTop: 4 },
  emptyText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, textAlign: 'center', padding: 24 },
  selectorLabel: { fontSize: TOKENS.typography.sizes.xs, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle, marginBottom: 6 },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, paddingHorizontal: TOKENS.spacing.md, paddingVertical: 12 },
  selectorText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textMain, flex: 1 },
  selectorPlaceholder: { color: TOKENS.colors.textSubtle },
  selectorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  selectorModal: { backgroundColor: TOKENS.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 32 },
  selectorModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: TOKENS.spacing.lg, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  selectorModalTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  selectorOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: TOKENS.spacing.lg, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface50 },
  selectorOptionActive: { backgroundColor: TOKENS.colors.brand50 },
  selectorOptionText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textMain },
  selectorOptionTextActive: { fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand600 },
});
