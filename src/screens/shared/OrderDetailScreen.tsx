import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Avatar, Rating, ErrorState, ServiceTimeline, TimelineStep } from '../../components/ui';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useRefresh } from '../../context/RefreshContext';

export const OrderDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params || { id: 1 };
  const { setIsRefreshing } = useRefresh();

  const {
    myOrders: ordersObj,
    myOrdersLoading: loading,
    myOrdersError: error,
    confirmOrderReceipt,
    refetchOrders,
  } = useMarketplace();

  const [isReceiving, setIsReceiving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetchOrders();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetchOrders, setIsRefreshing]);

  const order = useMemo(() => {
    const productOrder = ordersObj?.products?.find((o) => o.id === parseInt(String(id), 10));
    if (productOrder) {
      return {
        id: String(productOrder.id),
        date: new Date(productOrder.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
        product: {
          name: productOrder.product.name,
          price: productOrder.unitPrice,
          shippingPrice: 0,
          shippingDisabled: (productOrder.product as any).shippingDisabled ?? false,
        },
        seller: {
          id: productOrder.product.user?.id ?? null,
          name: productOrder.product.user?.provider?.name || productOrder.product.user?.displayName || 'Vendedor',
          rating: 0,
          reviews: 0,
        },
        shipping: {
          address: productOrder.shippingInfo
            ? `${productOrder.shippingInfo.street} ${productOrder.shippingInfo.number}, ${productOrder.shippingInfo.commune}`
            : 'Dirección no disponible',
          status: productOrder.status,
          tracking: productOrder.trackingCode || 'Pendiente',
        },
      };
    }
    return null;
  }, [ordersObj, id]);

  const timelineSteps: TimelineStep[] = useMemo(() => {
    if (!order) return [];
    if (order.product.shippingDisabled) {
      return [
        {
          time: 'Paso 1',
          title: 'Pago Aprobado',
          description: 'El pago ha sido acreditado exitosamente.',
          iconName: 'CheckCircle',
          status: 'completed',
        },
        {
          time: 'Paso 2',
          title: 'Compra Completada',
          description: order.shipping.status === 'COMPLETED' ? 'Producto listo para retiro.' : 'Esperando confirmación del vendedor.',
          iconName: 'Package',
          status: order.shipping.status === 'COMPLETED' ? 'completed' : 'current',
        },
      ];
    }
    return [
      {
        time: 'Paso 1',
        title: 'Pago Aprobado',
        description: 'El pago ha sido acreditado exitosamente.',
        iconName: 'CheckCircle',
        status: 'completed',
      },
      {
        time: 'Paso 2',
        title: 'Preparando Envío',
        description: order.shipping.status !== 'PENDING' ? 'Producto empaquetado y listo.' : 'El vendedor está preparando tu paquete.',
        iconName: 'Package',
        status: order.shipping.status !== 'PENDING' ? 'completed' : 'current',
      },
      {
        time: 'Paso 3',
        title: 'En Camino',
        description: `Seguimiento: ${order.shipping.tracking}`,
        iconName: 'Truck',
        status: order.shipping.status === 'SUCCESS' || order.shipping.status === 'COMPLETED' ? 'completed' : order.shipping.status === 'PROCESSING' ? 'current' : 'pending',
      },
      {
        time: 'Paso 4',
        title: 'Entregado',
        description: order.shipping.status === 'COMPLETED' ? 'Entregado en destino.' : 'Pendiente de entrega en destino.',
        iconName: 'Home',
        status: order.shipping.status === 'COMPLETED' ? 'completed' : 'pending',
      },
    ];
  }, [order]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={TOKENS.colors.brand500} /></View>;
  }

  if (error) {
    return <ErrorState message="No se pudo cargar el detalle de la orden." />;
  }

  if (!order) {
    return <ErrorState message="Orden no encontrada." onRetry={() => navigation.goBack()} />;
  }

  const total = order.product.price;

  return (
    <View style={styles.container}>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        
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

          <ServiceTimeline steps={timelineSteps} />
          
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
              {order.seller.reviews > 0 && (
                <View style={styles.ratingRow}>
                  <Rating rating={order.seller.rating} size={14} showText textSuffix={`(${order.seller.reviews} reseñas)`} />
                </View>
              )}
            </View>
          </View>

          {order.seller.id && (
            <Button 
              title="Ver Perfil del Vendedor" 
              variant="outline" 
              onPress={() => navigation.navigate('ProviderProfile', { providerId: order.seller.id })} 
              style={{ marginTop: TOKENS.spacing.md }}
            />
          )}
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
      {order.shipping.status !== 'COMPLETED' && order.shipping.status !== 'SUCCESS' && (
        <View style={styles.footer}>
          <Button title={isReceiving ? 'Confirmando...' : 'Recibí mi Producto'} icon="CheckCircle" disabled={isReceiving} onPress={async () => {
            setIsReceiving(true);
            try {
              await confirmOrderReceipt(parseInt(String(id), 10));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo confirmar la recepción.');
            } finally {
              setIsReceiving(false);
            }
          }} style={styles.confirmBtn} />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
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
    marginBottom: TOKENS.spacing.md,
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
