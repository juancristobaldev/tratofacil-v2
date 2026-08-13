import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Button, Icon } from '../../components/ui';
import { useRole } from '../../context/RoleContext';
import { useNotification } from '../../context/NotificationContext';
import { useMarketplace } from '../../hooks/useMarketplace';
import { WEB_CALLBACK_URL, DEEP_LINK_CALLBACK } from '../../config/endpoints';
import { useFlow } from '../../hooks/useFlow';
import { getProductCommission } from '../../utils/comission';

export const PurchaseScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { product, shippingData } = route.params || {};
  const { role } = useRole();
  const { showNotification } = useNotification();

  const { createOrder } = useMarketplace();
  const { pay } = useFlow();

  const [isProcessing, setIsProcessing] = useState(false);

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="AlertTriangle" size={48} color={TOKENS.colors.statusError} />
        <Text style={styles.errorText}>Producto no encontrado</Text>
        <Button title="Volver atrás" onPress={() => navigation.goBack()} variant="secondary" />
      </View>
    );
  }

  const commission = getProductCommission(product.price);
  const basePrice = Math.round(product.price / (1 + commission.rate));
  const commissionAmount = product.price - basePrice;

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      const orderResult = await createOrder(
        { productId: parseInt(product.id, 10), quantity: 1 },
        shippingData && !shippingData.shippingDisabled ? {
          street: shippingData.street,
          number: shippingData.number,
          commune: shippingData.city,
          region: shippingData.region,
          phone: shippingData.phone,
          reference: shippingData.additional || '',
        } : {
          street: '', number: '', commune: '', region: '', phone: '',
        },
      );
      const orderProductId = orderResult.id;
      if (orderProductId) {
        const flowResult = await pay({
          type: 'product',
          orderId: orderProductId,
          returnUrl: `${DEEP_LINK_CALLBACK}?type=product`,
        });
        if (flowResult.url) {
          await Linking.openURL(flowResult.url);
          setIsProcessing(false);
          return;
        }
      }
      showNotification({ title: 'Error', message: 'No se pudo iniciar el pago. Intenta de nuevo.', type: 'error' });
    } catch (err: any) {
      showNotification({ title: 'Error', message: err.message || 'Error al procesar el pago.', type: 'error' });
    }
    setIsProcessing(false);
  };

  const handleConfirm = () => {
    if (role === 'guest') {
      // Comprar en el marketplace requiere una cuenta autenticada.
      navigation.navigate('Login');
      return;
    }
    processPayment();
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        {/* PRODUCT SUMMARY */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="Package" size={20} color={TOKENS.colors.brand600} />
            <Text style={styles.cardTitle}>Producto</Text>
          </View>
          <View style={styles.productRow}>
            <View style={styles.imagePlaceholder}>
              <Icon name="Image" size={32} color={TOKENS.colors.surface300} />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productVendor}>Vendedor: <Text style={{ fontWeight: 'bold' }}>{product.provider.name}</Text></Text>
            </View>
          </View>
        </View>

        {/* SHIPPING DATA */}
        {shippingData && !shippingData.shippingDisabled ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="Truck" size={20} color={TOKENS.colors.brand600} />
              <Text style={styles.cardTitle}>Envío</Text>
            </View>
            <Text style={styles.shippingText}>{shippingData.street} {shippingData.number} {shippingData.additional}</Text>
            <Text style={styles.shippingText}>{shippingData.city}, {shippingData.region}</Text>
            <Text style={styles.shippingText}>Recibe: {shippingData.receiverName} ({shippingData.phone})</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="Store" size={20} color={TOKENS.colors.brand600} />
              <Text style={styles.cardTitle}>Retiro en tienda</Text>
            </View>
            <Text style={styles.shippingText}>El vendedor no ofrece despacho para este producto.</Text>
          </View>
        )}

        {/* FINANCIAL SUMMARY */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="Wallet" size={20} color={TOKENS.colors.brand600} />
            <Text style={styles.cardTitle}>Resumen de Pago</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Precio Producto</Text>
            <Text style={styles.summaryValue}>${basePrice.toLocaleString('es-CL')}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Tarifa de Servicio</Text>
              <Text style={styles.summarySubLabel}>{commission.label} ({(commission.rate * 100).toFixed(0)}%)</Text>
            </View>
            <Text style={styles.summaryValue}>+ ${commissionAmount.toLocaleString('es-CL')}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total a Pagar</Text>
            <Text style={styles.totalValue}>${product.price.toLocaleString('es-CL')}</Text>
          </View>

          <View style={styles.paymentMethod}>
            <Icon name="CreditCard" size={24} color={TOKENS.colors.brand600} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.paymentMethodTitle}>Flow / Webpay</Text>
              <Text style={styles.paymentMethodSub}>Pago seguro online</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* FIXED FOOTER */}
      <View style={styles.footer}>
        <Button 
          title={isProcessing ? "Procesando..." : "Ir a Pagar"} 
          icon="ArrowRight"
          onPress={handleConfirm}
          disabled={isProcessing}
        />
        <View style={styles.secureTextRow}>
          <Icon name="ShieldCheck" size={12} color={TOKENS.colors.textSubtle} />
          <Text style={styles.secureText}>Tus datos viajan encriptados</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: 'bold',
    color: TOKENS.colors.textMain,
  },
  scrollBody: {
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
  productRow: {
    flexDirection: 'row',
    gap: TOKENS.spacing.md,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  productVendor: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  shippingText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  summaryLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  summarySubLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKENS.colors.brand500,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.surface100,
    marginVertical: TOKENS.spacing.md,
  },
  totalLabel: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.brand600,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginTop: TOKENS.spacing.lg,
  },
  paymentMethodTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  paymentMethodSub: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  footer: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.md,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
  },
  secureTextRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: TOKENS.spacing.sm,
  },
  secureText: {
    fontSize: 10,
    color: TOKENS.colors.textSubtle,
  },
});
