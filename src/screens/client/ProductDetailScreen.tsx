import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button } from '../../components/ui';

export const ProductDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { id } = route.params || { id: 1 };

  // Mock product
  const product = {
    id,
    name: 'Taladro Percutor 850W Profesional',
    price: 45000,
    stock: 2,
    description: 'Taladro percutor ideal para uso profesional y doméstico. Incluye maletín y set de brocas.',
    provider: {
      name: 'Ferretería El Maestro',
    },
    images: [
      'https://picsum.photos/400/400?random=10'
    ]
  };

  const handleBuy = () => {
    // Navigate to shipping form
    navigation.navigate('Shipping', { product });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* HEADER BACK BTN */}
        <TouchableOpacity 
          style={[styles.backBtn, { top: insets.top + 10 }]} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
        </TouchableOpacity>

        {/* IMAGE */}
        <Image source={{ uri: product.images[0] }} style={styles.image} />

        {/* DETAILS */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.price}>${product.price.toLocaleString('es-CL')}</Text>
          
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>Stock disponible: {product.stock}</Text>
          </View>

          <View style={styles.providerRow}>
            <View style={styles.providerAvatar}>
              <Icon name="User" size={20} color={TOKENS.colors.white} />
            </View>
            <View>
              <Text style={styles.providerLabel}>Vendedor</Text>
              <Text style={styles.providerName}>{product.provider.name}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM BUY BAR */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || TOKENS.spacing.md }]}>
        <Button 
          title="Comprar" 
          onPress={handleBuy} 
          style={{ flex: 1 }}
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
  backBtn: {
    position: 'absolute',
    left: TOKENS.spacing.md,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 8,
  },
  image: {
    width: '100%',
    height: 350,
    backgroundColor: TOKENS.colors.surface100,
  },
  detailsContainer: {
    padding: TOKENS.spacing.lg,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.brand600,
    marginBottom: TOKENS.spacing.md,
  },
  stockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: TOKENS.spacing.lg,
  },
  stockText: {
    color: TOKENS.colors.brand700,
    fontWeight: TOKENS.typography.weights.bold,
    fontSize: TOKENS.typography.sizes.sm,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 12,
    marginBottom: TOKENS.spacing.lg,
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.textMain,
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
