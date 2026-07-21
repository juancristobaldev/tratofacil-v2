import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, Modal as RNModal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Button, Icon } from '../../components/ui';
import { useRole } from '../../context/RoleContext';

// Mock rule similar to Next.js
const getCommission = (total: number) => {
  if (total <= 50000) return { rate: 0.10, label: 'Tarifa Estándar' };
  return { rate: 0.05, label: 'Tarifa Reducida' };
};

export const PurchaseScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { product, shippingData } = route.params || {};
  const { role, setRole } = useRole();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showGuestCheckout, setShowGuestCheckout] = useState(false);
  const [guestForm, setGuestForm] = useState(() => {
    let defaultPhone = '';
    let defaultName = '';
    let defaultLastName = '';

    if (shippingData && !shippingData.shippingDisabled) {
      defaultPhone = shippingData.phone || '';
      
      if (shippingData.receiverName) {
        const parts = shippingData.receiverName.trim().split(' ');
        defaultName = parts[0] || '';
        defaultLastName = parts.slice(1).join(' ') || '';
      }
    }

    return { name: defaultName, lastName: defaultLastName, email: '', phone: defaultPhone };
  });

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="AlertTriangle" size={48} color={TOKENS.colors.error500} />
        <Text style={styles.errorText}>Producto no encontrado</Text>
        <Button title="Volver atrás" onPress={() => navigation.goBack()} variant="secondary" />
      </View>
    );
  }

  const commission = getCommission(product.price);
  const basePrice = Math.round(product.price / (1 + commission.rate));
  const commissionAmount = product.price - basePrice;

  const processPayment = () => {
    setIsProcessing(true);
    // Simulate API flow and Flow/Webpay integration
    setTimeout(() => {
      setIsProcessing(false);
      navigation.navigate('PaymentSuccess', {
        title: '¡Compra Exitosa!',
        subtitle: 'Tu pago se ha procesado correctamente y el vendedor ha sido notificado.',
        type: 'product'
      });
    }, 2000);
  };

  const handleConfirm = () => {
    if (role === 'guest') {
      setShowGuestCheckout(true);
      return;
    }
    processPayment();
  };

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
        <Text style={styles.headerTitle}>Confirmar Pago</Text>
        <View style={{ width: 40 }} />
      </View>

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

      <RNModal visible={showGuestCheckout} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Datos de Facturación</Text>
            <Text style={styles.modalSubtitle}>Completa tus datos para finalizar la compra.</Text>
            
            <TextInput
              placeholder="Nombre"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={guestForm.name}
              onChangeText={(text) => setGuestForm({ ...guestForm, name: text })}
              style={styles.guestInput}
            />
            <TextInput
              placeholder="Apellido"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={guestForm.lastName}
              onChangeText={(text) => setGuestForm({ ...guestForm, lastName: text })}
              style={styles.guestInput}
            />
            <TextInput
              placeholder="Correo Electrónico"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={guestForm.email}
              onChangeText={(text) => setGuestForm({ ...guestForm, email: text })}
              keyboardType="email-address"
              style={styles.guestInput}
            />
            <TextInput
              placeholder="Teléfono"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={guestForm.phone}
              onChangeText={(text) => setGuestForm({ ...guestForm, phone: text })}
              keyboardType="phone-pad"
              style={styles.guestInput}
            />

            <View style={{ marginTop: 16 }}>
              <Button 
                title="Confirmar y Pagar" 
                onPress={() => {
                  setRole('client');
                  setShowGuestCheckout(false);
                  processPayment();
                }} 
              />
              <Button 
                title="Cancelar" 
                variant="secondary" 
                onPress={() => setShowGuestCheckout(false)} 
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </View>
      </RNModal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: TOKENS.spacing.xl,
  },
  modalTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginBottom: 16,
  },
  guestInput: {
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface50,
    padding: 12,
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    marginBottom: 12,
  },
});
