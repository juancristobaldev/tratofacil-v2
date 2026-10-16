import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, Badge, PaymentActionCards } from '../../components/ui';
import { VerificationCenterModal } from '../../components/modals/VerificationCenterModal';
import type { PaymentActionType } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { useNotification } from '../../context/NotificationContext';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useFlow } from '../../hooks/useFlow';
import { usePlans } from '../../hooks/usePlans';
import { CARD_DEEP_LINK_CALLBACK, DEEP_LINK_CALLBACK } from '../../config/endpoints';
import { getProductCommission } from '../../utils/comission';

export const PurchaseScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { product, shippingData } = route.params || {};
  const { user } = useAuth();
  const { role } = useRole();
  const { showNotification } = useNotification();
  const { registerCard } = usePlans();

  const { createOrder } = useMarketplace();
  const { pay, payWithSavedCard } = useFlow();

  const hasSavedCard = Boolean(user?.cardActive && user?.last4CardDigits && user?.creditCardType);
  const cardBrand = user?.creditCardType || 'Tarjeta';
  const cardLast4 = user?.last4CardDigits || '****';

  const [activeAction, setActiveAction] = useState<PaymentActionType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'flow' | 'saved_card' | null>(null);

  const isProfileIncomplete = Boolean(user && user.emailVerified === false);

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="AlertTriangle" size={48} color={TOKENS.colors.statusError} />
        <Text style={styles.errorText}>Producto no encontrado</Text>
        <Button title="Volver atrás" onPress={() => navigation.goBack()} variant="secondary" />
      </View>
    );
  }

  const { basePrice, commissionAmount, rate, label } = getProductCommission(product.price);
  const commission = { rate, label };

  const handlePayWithSavedCard = async () => {
    if (role === 'guest') {
      navigation.navigate('Login');
      return;
    }
    if (user && user.emailVerified === false) {
      setPendingAction('saved_card');
      setShowVerificationModal(true);
      return;
    }
    setActiveAction('saved_card');
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
        } : null,
      );
      const orderProductId = orderResult?.id;
      if (!orderProductId) throw new Error('No se pudo generar la orden de compra.');

      await payWithSavedCard('product', orderProductId);
      showNotification({
        title: '¡Compra exitosa!',
        message: 'Tu pago fue procesado con tu tarjeta guardada.',
        type: 'success',
      });
      navigation.navigate('PaymentSuccess', {
        title: '¡Compra exitosa!',
        subtitle: `Tu pedido de "${product.name}" ha sido procesado correctamente.`,
        type: 'product',
      });
    } catch (err: any) {
      const msg = err?.graphQLErrors?.[0]?.message || err?.message || '';
      if (msg.includes('datos personales') || msg.includes('verificar tu correo') || msg.includes('verificación')) {
        setPendingAction('saved_card');
        setShowVerificationModal(true);
      } else {
        showNotification({ title: 'Error', message: msg || 'Error al procesar el pago.', type: 'error' });
      }
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
    }
  };

  const handlePayWithFlow = async () => {
    if (role === 'guest') {
      navigation.navigate('Login');
      return;
    }
    if (user && user.emailVerified === false) {
      setPendingAction('flow');
      setShowVerificationModal(true);
      return;
    }
    setActiveAction('flow');
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
        } : null,
      );
      const orderProductId = orderResult?.id;
      if (!orderProductId) throw new Error('No se pudo generar la orden de compra.');

      const flowResult = await pay({
        type: 'product',
        orderId: orderProductId,
        returnUrl: `${DEEP_LINK_CALLBACK}?type=product`,
      });
      if (flowResult.url) {
        setIsProcessing(false);
        setActiveAction(null);
        return;
      }
      showNotification({ title: 'Error', message: 'No se pudo iniciar el pago. Intenta de nuevo.', type: 'error' });
    } catch (err: any) {
      const msg = err?.graphQLErrors?.[0]?.message || err?.message || '';
      if (msg.includes('datos personales') || msg.includes('verificar tu correo') || msg.includes('verificación')) {
        setPendingAction('flow');
        setShowVerificationModal(true);
      } else {
        showNotification({ title: 'Error', message: msg || 'Error al procesar el pago.', type: 'error' });
      }
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
    }
  };

  const handleRegisterCard = async () => {
    if (role === 'guest') {
      navigation.navigate('Login');
      return;
    }
    setActiveAction('register_card');
    setIsProcessing(true);
    try {
        const result = await registerCard(CARD_DEEP_LINK_CALLBACK);
      if (result?.alreadyRegistered) {
        showNotification({ title: 'Tarjeta', message: 'Ya tienes una tarjeta vinculada.', type: 'info' });
      } else if (result?.url) {
        await Linking.openURL(result.url);
      } else {
        showNotification({ title: 'Error', message: 'No se pudo iniciar el registro de la tarjeta.', type: 'error' });
      }
    } catch (err: any) {
      showNotification({ title: 'Error', message: err?.message || 'Error al vincular tarjeta.', type: 'error' });
    } finally {
      setIsProcessing(false);
      setActiveAction(null);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        {/* PROACTIVE EARLY WARNING: NON-BLOCKING */}
        {isProfileIncomplete && (
          <TouchableOpacity
            style={styles.earlyWarningCard}
            activeOpacity={0.85}
            onPress={() => setShowVerificationModal(true)}
          >
            <View style={styles.earlyWarningIconCircle}>
              <Icon name="ShieldCheck" size={18} color={TOKENS.colors.brand500} />
            </View>
            <View style={styles.earlyWarningTextContent}>
              <Text style={styles.earlyWarningTitle}>Completa tu perfil para agilizar el pago</Text>
              <Text style={styles.earlyWarningSubtitle}>Toca aquí para ingresar tus datos sin salir de la pantalla.</Text>
            </View>
            <Icon name="ChevronRight" size={18} color={TOKENS.colors.brand500} />
          </TouchableOpacity>
        )}

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
              <Text style={styles.productVendor}>Vendedor: <Text style={styles.productVendorName}>{product.provider.name}</Text></Text>
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
            <Text style={styles.shippingText}>Contacto: {shippingData.phone}</Text>
          </View>
        ) : shippingData?.shippingDisabled ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="Store" size={20} color={TOKENS.colors.warning600} />
              <Text style={styles.cardTitle}>Modalidad de Entrega</Text>
            </View>
            <Text style={styles.shippingText}>Retiro presencial / Sin despacho a domicilio</Text>
            <Text style={[styles.shippingText, { color: TOKENS.colors.textSubtle, marginTop: 4 }]}>
              Este producto no incluye despacho. Deberás coordinar el retiro directamente con el vendedor tras confirmar el pago.
            </Text>
          </View>
        ) : null}

        {/* PRICE SUMMARY */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="DollarSign" size={20} color={TOKENS.colors.brand600} />
            <Text style={styles.cardTitle}>Resumen</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Precio del producto</Text>
            <Text style={styles.summaryValue}>${basePrice.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Comisión por servicio ({Math.round(commission.rate * 100)}%)
            </Text>
            <Text style={styles.summaryValue}>${commissionAmount.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.totalValue}>${product.price.toLocaleString('es-CL')}</Text>
          </View>
        </View>

        {/* PAYMENT METHOD */}
        <View style={styles.paymentSection}>
          <PaymentActionCards
            hasCard={hasSavedCard}
            cardBrand={cardBrand}
            cardLast4={cardLast4}
            onPayWithSavedCard={handlePayWithSavedCard}
            onRegisterCard={handleRegisterCard}
            onPayWithFlow={handlePayWithFlow}
            isProcessing={isProcessing}
            activeAction={activeAction}
          />
        </View>

      </ScrollView>

      {/* FIXED FOOTER */}
      <View style={styles.footer}>
        <View style={styles.secureTextRow}>
          <Icon name="ShieldCheck" size={14} color={TOKENS.colors.brand600} />
          <Text style={styles.secureText}>Pago 100% seguro y encriptado por Flow.cl</Text>
        </View>
      </View>

      {/* IN-CONTEXT VERIFICATION MODAL (ZERO ADVANCE LOSS) */}
      <VerificationCenterModal
        visible={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          setPendingAction(null);
        }}
        onSuccess={() => {
          setShowVerificationModal(false);
          const act = pendingAction;
          setPendingAction(null);
          if (act === 'saved_card') {
            handlePayWithSavedCard();
          } else if (act === 'flow') {
            handlePayWithFlow();
          }
        }}
        requiredScope="basic"
        title="Completa tus datos de compra"
        description="Solo necesitamos confirmar tus datos para procesar el pago. Tu compra y dirección se mantendrán intactas."
      />
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
  paymentSection: {
    marginBottom: TOKENS.spacing.md,
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
  productVendorName: {
    fontWeight: 'bold',
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
  paymentSectionTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginTop: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.xs,
  },
  paymentOptionsList: {
    gap: TOKENS.spacing.sm,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  paymentOptionSelected: {
    borderColor: TOKENS.colors.brand500,
    backgroundColor: 'rgba(238, 77, 45, 0.04)',
  },
  paymentOptionRadio: {
    marginRight: TOKENS.spacing.sm,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: TOKENS.colors.surface300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: TOKENS.colors.brand500,
    borderWidth: 5,
    backgroundColor: TOKENS.colors.white,
  },
  cardHeaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.xs,
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
  paymentMethodText: {
    flex: 1,
    marginLeft: 12,
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
  earlyWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.brand200,
    borderRadius: 14,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
    gap: 12,
  },
  earlyWarningIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earlyWarningTextContent: {
    flex: 1,
  },
  earlyWarningTitle: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand800,
    marginBottom: 2,
  },
  earlyWarningSubtitle: {
    fontSize: 11,
    color: TOKENS.colors.brand700,
    lineHeight: 15,
  },
});
