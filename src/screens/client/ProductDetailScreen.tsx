import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, IconButton, ErrorState } from '../../components/ui';
import { useMarketplace } from '../../hooks/useMarketplace';
import { getImageUrl } from '../../utils/imageUrl';

export const ProductDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { id } = route.params || { id: 1 };

  const { selectedProduct: apiProduct, productLoading: loading, productError: error, fetchProduct } = useMarketplace();

  useEffect(() => {
    if (id) fetchProduct(parseInt(String(id), 10));
  }, [id, fetchProduct]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const product = useMemo(() => {
    const p = apiProduct;
    if (p) {
      const rawImages = (p.images || [])
        .map((img: any) => img?.url || img?.image?.cdnUrl || '')
        .filter(Boolean);
      const images = rawImages.length > 0 ? rawImages : ['https://picsum.photos/400/400?random=10'];

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock ?? 0,
        description: p.description || '',
        provider: {
          id: p.user?.provider?.id ?? null,
          name: p.user?.provider?.name || p.user?.displayName || 'Vendedor',
        },
        images,
        shippingDisabled: p.shippingDisabled ?? p.categoryProduct?.shippingDisabled ?? false,
      };
    }
    return {
      id,
      name: 'Cargando...',
      price: 0,
      stock: 0,
      description: '',
      provider: { id: null, name: '' },
      images: ['https://picsum.photos/400/400?random=10'],
      shippingDisabled: false,
    };
  }, [apiProduct, id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="No se pudo cargar el producto."
        onRetry={() => navigation.goBack()}
      />
    );
  }

  const isOutOfStock = product.stock <= 0;

  const handleBuy = () => {
    if (isOutOfStock) return;
    if (product.shippingDisabled) {
      navigation.navigate('Purchase', { product, shippingData: { shippingDisabled: true } });
    } else {
      navigation.navigate('Shipping', { product });
    }
  };

  const handleOpenSeller = () => {
    if (product.provider.id) {
      navigation.navigate('ProviderProfile', { providerId: product.provider.id });
    }
  };

  const activeImageUri = getImageUrl(product.images[activeImageIndex] || product.images[0]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* HEADER BACK BTN */}
        <IconButton 
          icon="ArrowLeft"
          variant="white"
          size="md"
          accessibilityLabel="Volver al listado de productos"
          style={[styles.backBtn, { top: insets.top + 10 }]} 
          onPress={() => navigation.goBack()}
        />

        {/* IMAGE HERO */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: activeImageUri }} style={styles.image} resizeMode="cover" />
          {product.images.length > 1 && (
            <View style={styles.carouselPagination}>
              {product.images.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setActiveImageIndex(idx)}
                  style={[
                    styles.paginationDot,
                    activeImageIndex === idx && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* THUMBNAIL STRIP IF MULTIPLE */}
        {product.images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailStrip}
          >
            {product.images.map((uri, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveImageIndex(idx)}
                style={[
                  styles.thumbnailBox,
                  activeImageIndex === idx && styles.thumbnailBoxActive,
                ]}
              >
                <Image source={{ uri: getImageUrl(uri) }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* DETAILS */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.price}>${product.price.toLocaleString('es-CL')}</Text>
          
          <View style={styles.badgesRow}>
            <View style={[styles.stockBadge, isOutOfStock && styles.stockBadgeOutOfStock]}>
              <Icon
                name={isOutOfStock ? 'AlertCircle' : 'CheckCircle'}
                size={14}
                color={isOutOfStock ? TOKENS.colors.statusError : TOKENS.colors.textSubtle}
              />
              <Text style={[styles.stockText, isOutOfStock && styles.stockTextOutOfStock]}>
                {isOutOfStock ? 'Producto Agotado' : `Stock disponible: ${product.stock}`}
              </Text>
            </View>

            <View style={[styles.stockBadge, { backgroundColor: product.shippingDisabled ? TOKENS.colors.warning50 : TOKENS.colors.success50 }]}>
              <Icon name={product.shippingDisabled ? 'Store' : 'Truck'} size={14} color={product.shippingDisabled ? TOKENS.colors.warning700 : TOKENS.colors.success700} />
              <Text style={[styles.stockText, { color: product.shippingDisabled ? TOKENS.colors.warning700 : TOKENS.colors.success700, marginLeft: 6 }]}>
                {product.shippingDisabled ? 'Solo Retiro en Tienda' : 'Despacho a Domicilio'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.providerRow}
            onPress={handleOpenSeller}
            disabled={!product.provider.id}
            activeOpacity={0.7}
          >
            <View style={styles.providerAvatar}>
              <Icon name="Store" size={20} color={TOKENS.colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.providerLabel}>Vendido por</Text>
              <Text style={styles.providerName}>{product.provider.name}</Text>
            </View>
            {product.provider.id && (
              <View style={styles.viewSellerBadge}>
                <Text style={styles.viewSellerText}>Ver Vitrina</Text>
                <Icon name="ChevronRight" size={14} color={TOKENS.colors.brand600} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{product.description || 'Sin descripción detallada por el vendedor.'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM BUY BAR */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || TOKENS.spacing.md }]}>
        <Button 
          title={isOutOfStock ? 'Producto Agotado' : 'Comprar Ahora'} 
          size="lg"
          disabled={isOutOfStock}
          icon={isOutOfStock ? 'AlertCircle' : 'ShoppingBag'}
          onPress={handleBuy} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
  },
  backBtn: {
    position: 'absolute',
    left: TOKENS.spacing.md,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 8,
  },
  imageContainer: {
    width: '100%',
    height: 350,
    position: 'relative',
    backgroundColor: TOKENS.colors.surface100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  carouselPagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: TOKENS.colors.white,
  },
  thumbnailStrip: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    gap: 8,
    backgroundColor: TOKENS.colors.surface50,
  },
  thumbnailBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailBoxActive: {
    borderColor: TOKENS.colors.brand500,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: TOKENS.spacing.md,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.sm,
  },
  price: {
    fontSize: TOKENS.typography.sizes.xxxl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.brand600,
    marginBottom: TOKENS.spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: TOKENS.spacing.lg,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockBadgeOutOfStock: {
    backgroundColor: TOKENS.colors.surfaceError,
  },
  stockText: {
    color: TOKENS.colors.brand700,
    fontWeight: TOKENS.typography.weights.bold,
    fontSize: TOKENS.typography.sizes.sm,
  },
  stockTextOutOfStock: {
    color: TOKENS.colors.statusError,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: TOKENS.spacing.lg,
  },
  providerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: TOKENS.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerLabel: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  providerName: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  viewSellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewSellerText: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
  },
  section: {
    marginBottom: TOKENS.spacing.lg,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.sm,
  },
  description: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.md,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.medium,
  }
});
