import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, Avatar, Rating } from '../../components/ui';

export const OrderDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { id } = route.params || { id: 1 };

  // Mock Traceability Data
  const order = {
    id: `100${id}`,
    date: '12 de Junio, 2024',
    product: {
      name: 'Taladro Percutor Industrial 850W',
      price: 45000,
      shippingPrice: 3500,
    },
    seller: {
      id: 99,
      name: 'Ferretería El Maestro',
      rating: 4.8,
      reviews: 120,
    },
    shipping: {
      address: 'Av. Providencia 1234, Depto 502',
      status: 'EN CAMINO',
      tracking: 'CL-9988776655'
    }
  };

  const steps = [
    { label: 'Pago Aprobado', completed: true },
    { label: 'Preparando Envío', completed: true },
    { label: 'En Camino', completed: true, active: true },
    { label: 'Entregado', completed: false }
  ];

  const total = order.product.price + order.product.shippingPrice;

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
        <Text style={styles.headerTitle}>Detalle del Pedido</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.orderNumber}>Orden #{order.id}</Text>
          <Text style={styles.orderDate}>{order.date}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.productName}>{order.product.name}</Text>
          <Text style={styles.productPrice}>${order.product.price.toLocaleString('es-CL')}</Text>
        </View>

        {/* TRACEABILITY / TIMELINE */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="Truck" size={20} color={TOKENS.colors.brand600} />
            <Text style={styles.cardTitle}>Estado del Envío</Text>
          </View>
          <Text style={styles.trackingText}>Seguimiento: {order.shipping.tracking}</Text>

          <View style={styles.timeline}>
            {steps.map((step, index) => (
              <View key={index} style={styles.timelineStep}>
                <View style={styles.timelineIconBox}>
                  {step.completed ? (
                    <Icon name="Check" size={12} color={TOKENS.colors.white} />
                  ) : (
                    <View style={styles.timelineEmptyDot} />
                  )}
                  <View style={[
                    styles.timelineDotBg, 
                    step.completed ? styles.timelineDotBgCompleted : null,
                    step.active ? styles.timelineDotBgActive : null
                  ]} />
                </View>
                <Text style={[
                  styles.timelineLabel, 
                  step.active && styles.timelineLabelActive,
                  !step.completed && !step.active && styles.timelineLabelPending
                ]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
          
          <View style={styles.addressBox}>
            <Icon name="MapPin" size={16} color={TOKENS.colors.textSubtle} />
            <Text style={styles.addressText}>{order.shipping.address}</Text>
          </View>
        </View>

        {/* SELLER PROFILE */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="Store" size={20} color={TOKENS.colors.brand600} />
            <Text style={styles.cardTitle}>Vendedor</Text>
          </View>
          
          <View style={styles.sellerRow}>
            <Avatar uri={null} name={order.seller.name} size={48} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{order.seller.name}</Text>
              <View style={styles.ratingRow}>
                <Rating rating={order.seller.rating} size={14} showText textSuffix={`(${order.seller.reviews} reseñas)`} />
              </View>
            </View>
          </View>

          <Button 
            title="Ver Perfil del Vendedor" 
            variant="outline" 
            onPress={() => navigation.navigate('ProviderProfile', { providerId: order.seller.id })} 
            style={{ marginTop: TOKENS.spacing.md }}
          />
        </View>

        {/* FINANCIAL SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen de Pago</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Producto</Text>
            <Text style={styles.summaryValue}>${order.product.price.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Envío</Text>
            <Text style={styles.summaryValue}>${order.product.shippingPrice.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Pagado</Text>
            <Text style={styles.totalValue}>${total.toLocaleString('es-CL')}</Text>
          </View>
        </View>
        
      </ScrollView>

      {/* FOOTER ACTION */}
      <View style={styles.footer}>
        <Button title="Recibí mi Producto" icon="CheckCircle" style={styles.confirmBtn} />
      </View>
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
  orderNumber: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    textTransform: 'uppercase',
  },
  orderDate: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
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
  trackingText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.semibold,
    marginBottom: TOKENS.spacing.lg,
  },
  timeline: {
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: TOKENS.colors.surface200,
    marginLeft: 8,
    marginBottom: TOKENS.spacing.lg,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: -17,
  },
  timelineIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timelineDotBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface300,
    zIndex: -1,
  },
  timelineDotBgCompleted: {
    backgroundColor: TOKENS.colors.success500,
  },
  timelineDotBgActive: {
    backgroundColor: TOKENS.colors.brand500,
  },
  timelineEmptyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.white,
  },
  timelineLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  timelineLabelActive: {
    color: TOKENS.colors.brand600,
  },
  timelineLabelPending: {
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.regular,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    gap: 8,
  },
  addressText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    flex: 1,
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
  }
});
