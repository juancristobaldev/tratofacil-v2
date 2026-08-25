import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import { Badge } from './Badge';

export type PaymentMethod = 'saved_card' | 'register_card' | 'webpay';

export interface PaymentMethodSelectorProps {
  hasCard: boolean;
  cardBrand?: string;
  cardLast4?: string;
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  hasCard,
  cardBrand = 'Tarjeta',
  cardLast4 = '****',
  selectedMethod,
  onSelectMethod,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>MÉTODO DE PAGO</Text>

      {hasCard ? (
        <>
          {/* Opción 1: Tarjeta Vinculada */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedMethod === 'saved_card' && styles.optionCardActive,
            ]}
            onPress={() => onSelectMethod('saved_card')}
            activeOpacity={0.8}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedMethod === 'saved_card', disabled }}
            accessibilityLabel={`Tarjeta ${cardBrand} terminada en ${cardLast4}`}
          >
            <View style={styles.optionLeft}>
              <View
                style={[
                  styles.optionIconBox,
                  selectedMethod === 'saved_card' && styles.optionIconBoxActive,
                ]}
              >
                <Icon
                  name="CreditCard"
                  size={18}
                  color={
                    selectedMethod === 'saved_card'
                      ? TOKENS.colors.brand600
                      : TOKENS.colors.textSubtle
                  }
                />
              </View>
              <View style={styles.optionTexts}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>
                    {cardBrand} •••• {cardLast4}
                  </Text>
                  <Badge label="1-CLICK" tone="success" size="sm" />
                </View>
                <Text style={styles.optionSubtitle}>
                  Pago instantáneo sin salir de la app
                </Text>
              </View>
            </View>
            <View style={styles.radioOuter}>
              {selectedMethod === 'saved_card' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Opción 2: Flow / Webpay */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedMethod === 'webpay' && styles.optionCardActive,
            ]}
            onPress={() => onSelectMethod('webpay')}
            activeOpacity={0.8}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedMethod === 'webpay', disabled }}
            accessibilityLabel="Webpay o Flow"
          >
            <View style={styles.optionLeft}>
              <View
                style={[
                  styles.optionIconBox,
                  selectedMethod === 'webpay' && styles.optionIconBoxActive,
                ]}
              >
                <Icon
                  name="Globe"
                  size={18}
                  color={
                    selectedMethod === 'webpay'
                      ? TOKENS.colors.brand600
                      : TOKENS.colors.textSubtle
                  }
                />
              </View>
              <View style={styles.optionTexts}>
                <Text style={styles.optionTitle}>Webpay / Flow</Text>
                <Text style={styles.optionSubtitle}>
                  Débito, crédito u otros medios de pago
                </Text>
              </View>
            </View>
            <View style={styles.radioOuter}>
              {selectedMethod === 'webpay' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Opción A: CTA Vincular Tarjeta */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedMethod === 'register_card' && styles.optionCardActive,
            ]}
            onPress={() => onSelectMethod('register_card')}
            activeOpacity={0.8}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedMethod === 'register_card', disabled }}
            accessibilityLabel="Vincular tarjeta nueva"
          >
            <View style={styles.optionLeft}>
              <View
                style={[
                  styles.optionIconBox,
                  selectedMethod === 'register_card' && styles.optionIconBoxActive,
                ]}
              >
                <Icon
                  name="Plus"
                  size={18}
                  color={
                    selectedMethod === 'register_card'
                      ? TOKENS.colors.brand600
                      : TOKENS.colors.brand500
                  }
                />
              </View>
              <View style={styles.optionTexts}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Vincular tarjeta nueva</Text>
                  <Badge label="RECOMENDADO" tone="brand" size="sm" />
                </View>
                <Text style={styles.optionSubtitle}>
                  Guarda tu tarjeta para pagos 1-Click
                </Text>
              </View>
            </View>
            <View style={styles.radioOuter}>
              {selectedMethod === 'register_card' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Opción B: Webpay Directo */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedMethod === 'webpay' && styles.optionCardActive,
            ]}
            onPress={() => onSelectMethod('webpay')}
            activeOpacity={0.8}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedMethod === 'webpay', disabled }}
            accessibilityLabel="Pagar con Flow o Webpay"
          >
            <View style={styles.optionLeft}>
              <View
                style={[
                  styles.optionIconBox,
                  selectedMethod === 'webpay' && styles.optionIconBoxActive,
                ]}
              >
                <Icon
                  name="Globe"
                  size={18}
                  color={
                    selectedMethod === 'webpay'
                      ? TOKENS.colors.brand600
                      : TOKENS.colors.textSubtle
                  }
                />
              </View>
              <View style={styles.optionTexts}>
                <Text style={styles.optionTitle}>Pagar con Flow / Webpay</Text>
                <Text style={styles.optionSubtitle}>
                  Pago único directo sin guardar tarjeta
                </Text>
              </View>
            </View>
            <View style={styles.radioOuter}>
              {selectedMethod === 'webpay' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: TOKENS.spacing.md,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.surface200,
  },
  optionCardActive: {
    borderColor: TOKENS.colors.brand500,
    backgroundColor: TOKENS.colors.brand50,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  optionIconBoxActive: {
    borderColor: TOKENS.colors.brand200,
    backgroundColor: TOKENS.colors.white,
  },
  optionTexts: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  optionSubtitle: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: TOKENS.colors.surface300,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.brand500,
  },
});
