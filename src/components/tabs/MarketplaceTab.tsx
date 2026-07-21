import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Badge } from '../ui';
import { LocationModal } from '../ui/LocationModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRole } from '../../context/RoleContext';

type MarketplaceMainTab = 'Explorar' | 'Mis Pedidos';
type OrdersSubTab = 'Mis Compras' | 'Mis Ventas';

export const MarketplaceTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();

  const [activeMainTab, setActiveMainTab] = useState<MarketplaceMainTab>('Explorar');
  const [activeSubTab, setActiveSubTab] = useState<OrdersSubTab>('Mis Compras');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Herramientas');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [location, setLocation] = useState('Providencia, RM');

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    setIsLocationModalOpen(false);
  };

  const categories = [
    { id: 'Herramientas', icon: 'Tool' },
    { id: 'Materiales', icon: 'Package' },
    { id: 'Maquinaria', icon: 'Truck' },
    { id: 'Seguridad', icon: 'Shield' },
    { id: 'Otros', icon: 'Box' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* MAIN TABS */}
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
          {/* SEARCH & LOCATION */}
          <View style={styles.headerBox}>
            <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Icon name="Search" size={20} color={TOKENS.colors.textSubtle} />
            <TextInput
              style={styles.searchInput}
              placeholder="¿Qué necesitas buscar?"
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

        {/* CTA PLANES */}
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CATEGORIES CAROUSEL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.catCard, activeCategory === cat.id && styles.catCardActive]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <View style={[styles.catIconBox, activeCategory === cat.id && styles.catIconBoxActive]}>
                  <Icon name={cat.icon as any} size={24} color={activeCategory === cat.id ? TOKENS.colors.white : TOKENS.colors.textMain} />
                </View>
                <Text style={[styles.catText, activeCategory === cat.id && styles.catTextActive]}>{cat.id}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* RECENT PRODUCTS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos Recientes en {activeCategory}</Text>
          <View style={styles.productsGrid}>
            {[1, 2, 3, 4].map((item) => (
              <TouchableOpacity 
                key={item} 
                style={styles.productCard} 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ProductDetail', { id: item })}
              >
                <View style={styles.productImagePlaceholder}>
                  <Icon name="Image" size={32} color={TOKENS.colors.surface200} />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={2}>Taladro Percutor Industrial 850W</Text>
                  <Text style={styles.productPrice}>$ 45.000</Text>
                  <View style={styles.productLocation}>
                    <Icon name="MapPin" size={12} color={TOKENS.colors.textSubtle} />
                    <Text style={styles.productLocationText}>Santiago Centro</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

          {/* CTA FLOATING */}
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
        /* MIS PEDIDOS CONTENT */
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
              {/* SUB TABS */}
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

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {activeSubTab === 'Mis Compras' && (
                  <View style={styles.ordersList}>
                    {[1, 2].map(item => (
                      <TouchableOpacity 
                        key={item} 
                        style={styles.orderCard}
                        onPress={() => navigation.navigate('OrderDetail', { id: item })}
                      >
                        <View style={styles.orderHeader}>
                          <Text style={styles.orderNumber}>Orden #100{item}</Text>
                          <Badge label="EN CAMINO" tone="brand" />
                        </View>
                        <Text style={styles.orderProductTitle} numberOfLines={2}>Taladro Percutor Industrial 850W</Text>
                        <Text style={styles.orderDate}>Comprado el 12 de Junio</Text>
                        <View style={styles.orderFooter}>
                          <Text style={styles.orderPrice}>$45.000</Text>
                          <Icon name="ChevronRight" size={20} color={TOKENS.colors.brand600} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {activeSubTab === 'Mis Ventas' && (
                  <View style={styles.ordersList}>
                    {[3, 4].map(item => (
                      <TouchableOpacity 
                        key={item} 
                        style={styles.orderCard}
                        onPress={() => navigation.navigate('ManageSale', { id: item })}
                      >
                        <View style={styles.orderHeader}>
                          <Text style={styles.orderNumber}>Orden #200{item}</Text>
                          <Badge label={item === 3 ? 'VENDIDO - POR ENVIAR' : 'PUBLICADO'} tone={item === 3 ? 'success' : 'neutral'} />
                        </View>
                        <Text style={styles.orderProductTitle} numberOfLines={2}>Set de Destornilladores</Text>
                        <Text style={styles.orderDate}>Publicado el 10 de Junio</Text>
                        {item === 3 && (
                          <View style={styles.actionRequiredBox}>
                            <Icon name="AlertCircle" size={14} color={TOKENS.colors.warning600} />
                            <Text style={styles.actionRequiredText}>Debes gestionar el envío</Text>
                          </View>
                        )}
                        <View style={styles.orderFooter}>
                          <Text style={styles.orderPrice}>$12.500</Text>
                          <Icon name="ChevronRight" size={20} color={TOKENS.colors.brand600} />
                        </View>
                      </TouchableOpacity>
                    ))}
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
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  headerBox: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: TOKENS.spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 16,
    paddingHorizontal: TOKENS.spacing.md,
    height: 50,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textMain,
    height: '100%',
  },
  locationBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.textMain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.brand50,
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
    gap: 12,
  },
  plansBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansBannerTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },
  plansBannerDesc: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 160,
  },
  section: {
    marginBottom: TOKENS.spacing.xl,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  categoriesScroll: {
    gap: 16,
  },
  catCard: {
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  catCardActive: {},
  catIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  catIconBoxActive: {
    backgroundColor: TOKENS.colors.brand500,
    borderColor: TOKENS.colors.brand500,
  },
  catText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
  },
  catTextActive: {
    color: TOKENS.colors.brand600,
    fontWeight: TOKENS.typography.weights.bold,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TOKENS.spacing.md,
    justifyContent: 'space-between',
  },
  productCard: {
    width: '47%',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  productImagePlaceholder: {
    height: 120,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: TOKENS.spacing.md,
  },
  productTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
    height: 40,
  },
  productPrice: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 8,
  },
  productLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productLocationText: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
  },
  ctaFloat: {
    position: 'absolute',
    bottom: 90,
    left: TOKENS.spacing.md,
    right: TOKENS.spacing.md,
  },
  ctaBtn: {
    width: '100%',
    ...TOKENS.shadows.medium,
  },
  mainTabsRow: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface200,
  },
  mainTab: {
    flex: 1,
    paddingVertical: TOKENS.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabActive: {
    borderBottomColor: TOKENS.colors.brand500,
  },
  mainTabText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  mainTabTextActive: {
    color: TOKENS.colors.brand600,
    fontWeight: TOKENS.typography.weights.bold,
  },
  subTabsRow: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.sm,
    gap: TOKENS.spacing.sm,
  },
  subTab: {
    flex: 1,
    paddingVertical: TOKENS.spacing.sm,
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  subTabActive: {
    backgroundColor: TOKENS.colors.brand50,
    borderColor: TOKENS.colors.brand500,
  },
  subTabText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
  },
  subTabTextActive: {
    color: TOKENS.colors.brand600,
    fontWeight: TOKENS.typography.weights.bold,
  },
  ordersList: {
    gap: TOKENS.spacing.md,
  },
  orderCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  orderNumber: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  orderProductTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginBottom: TOKENS.spacing.md,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface100,
  },
  orderPrice: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  actionRequiredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.warning50,
    padding: TOKENS.spacing.sm,
    borderRadius: 8,
    marginBottom: TOKENS.spacing.md,
    gap: 8,
  },
  actionRequiredText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.warning700,
  }
});
