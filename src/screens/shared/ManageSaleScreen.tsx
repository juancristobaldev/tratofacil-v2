import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, Avatar, Rating, Badge } from '../../components/ui';

export const ManageSaleScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { id } = route.params || { id: 3 };

  // Mock Sale Data
  const sale = {
    id: `200${id}`,
    date: '10 de Junio, 2024',
    status: id === 3 ? 'VENDIDO - POR ENVIAR' : 'PUBLICADO',
    product: {
      name: 'Set de Destornilladores Profesionales',
      price: 12500,
    },
    buyer: id === 3 ? {
      id: 88,
      name: 'Juan Pérez',
      rating: 4.5,
      reviews: 12,
    } : null,
    shippingInfo: id === 3 ? {
      type: 'Despacho a Domicilio',
      address: 'Av. Libertador Bernardo O\'Higgins 123',
      city: 'Santiago Centro',
      phone: '+56 9 8765 4321',
      buyerPaidShipping: 2000,
    } : null
  };

  const earnings = sale.product.price * 0.95; // 5% commission mock

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Button 
          title="" 
          icon="ArrowLeft" 
          variant="secondary" 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
        />
        <Text style={styles.headerTitle}>Gestionar Venta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SUMMARY */}
        <View style={styles.card}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>Orden #{sale.id}</Text>
            <Badge label={sale.status} tone={id === 3 ? 'success' : 'neutral'} />
          </View>
          <Text style={styles.orderDate}>Publicado el {sale.date}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.productName}>{sale.product.name}</Text>
          <Text style={styles.productPrice}>${sale.product.price.toLocaleString('es-CL')}</Text>
        </View>

        {sale.buyer && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="User" size={20} color={TOKENS.colors.brand600} />
              <Text style={styles.cardTitle}>Comprador</Text>
            </View>
            
            <View style={styles.sellerRow}>
              <Avatar uri={null} name={sale.buyer.name} size={48} />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{sale.buyer.name}</Text>
                <View style={styles.ratingRow}>
                  <Rating rating={sale.buyer.rating} size={14} showText textSuffix={`(${sale.buyer.reviews} reseñas)`} />
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: TOKENS.spacing.md }}>
              <Button 
                title="Ver Perfil" 
                variant="outline" 
                onPress={() => navigation.navigate('ProviderProfile', { providerId: sale.buyer!.id })} 
                style={{ flex: 1 }}
              />
              <Button 
                title="Mensaje" 
                icon="MessageCircle"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {sale.shippingInfo && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="Truck" size={20} color={TOKENS.colors.brand600} />
              <Text style={styles.cardTitle}>Datos de Entrega</Text>
            </View>
            <Text style={styles.shippingType}>{sale.shippingInfo.type}</Text>
            <Text style={styles.shippingText}>{sale.shippingInfo.address}</Text>
            <Text style={styles.shippingText}>{sale.shippingInfo.city}</Text>
            <Text style={styles.shippingText}>Tel: {sale.shippingInfo.phone}</Text>

            <View style={styles.actionRequiredBox}>
              <Icon name="AlertCircle" size={14} color={TOKENS.colors.warning600} />
              <Text style={styles.actionRequiredText}>Debes enviar este producto antes de 48h</Text>
            </View>
          </View>
        )}

        {/* EARNINGS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen de Ganancias</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Precio de Venta</Text>
            <Text style={styles.summaryValue}>${sale.product.price.toLocaleString('es-CL')}</Text>
          </View>
          {sale.shippingInfo && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cobro por Envío</Text>
              <Text style={styles.summaryValue}>${sale.shippingInfo.buyerPaidShipping.toLocaleString('es-CL')}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Comisión de plataforma (5%)</Text>
            <Text style={[styles.summaryValue, { color: TOKENS.colors.error600 }]}>
              -${(sale.product.price - earnings).toLocaleString('es-CL')}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Ganancia Total</Text>
            <Text style={styles.totalValue}>${(earnings + (sale.shippingInfo?.buyerPaidShipping || 0)).toLocaleString('es-CL')}</Text>
          </View>
        </View>

      </ScrollView>

      {/* FOOTER ACTION */}
      {id === 3 ? (
        <View style={styles.footer}>
          <Button title="Confirmar Envío o Entrega" icon="CheckCircle" style={styles.confirmBtn} />
        </View>
      ) : (
        <View style={styles.footer}>
          <Button title="Editar Publicación" variant="outline" icon="Edit" style={styles.confirmBtn} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  backBtn: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
  },
  card: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    padding: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
  },
  orderDate: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.surface100,
    marginVertical: TOKENS.spacing.md,
  },
  productName: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  productPrice: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.brand600,
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: TOKENS.spacing.md,
  },
  cardTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  shippingType: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  shippingText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  summaryValue: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
  },
  totalLabel: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  totalValue: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.brand600,
  },
  footer: {
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.white,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
  },
  confirmBtn: {
    width: '100%',
  },
  actionRequiredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.warning50,
    padding: TOKENS.spacing.sm,
    borderRadius: 8,
    marginTop: TOKENS.spacing.md,
    gap: 8,
  },
  actionRequiredText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.warning700,
  }
});
