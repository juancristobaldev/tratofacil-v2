import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import { Badge } from './Badge';

export type PaymentActionType = 'saved_card' | 'register_card' | 'flow';

export interface PaymentActionCardsProps {
  hasCard: boolean;
  cardBrand?: string;
  cardLast4?: string;
  onPayWithSavedCard?: () => void | Promise<void>;
  onRegisterCard?: () => void | Promise<void>;
  onPayWithFlow: () => void | Promise<void>;
  isProcessing?: boolean;
  activeAction?: PaymentActionType | null;
}

export const PaymentActionCards: React.FC<PaymentActionCardsProps> = ({
  hasCard,
  cardBrand = 'Tarjeta',
  cardLast4 = '****',
  onPayWithSavedCard,
  onRegisterCard,
  onPayWithFlow,
  isProcessing = false,
  activeAction = null,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>MÉTODO DE PAGO</Text>

      {hasCard ? (
        <>
          {/* Card 1: Pagar con Tarjeta Guardada (1-Click) */}
          <TouchableOpacity
            style={[
              styles.actionCard,
              styles.actionCardPrimary,
              activeAction === 'saved_card' && styles.actionCardActive,
            ]}
            onPress={onPayWithSavedCard}
            activeOpacity={0.75}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel={`Pagar con tarjeta ${cardBrand} terminada en ${cardLast4}`}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.iconBox, styles.iconBoxBrand]}>
                <Icon name="CreditCard" size={18} color={TOKENS.colors.brand600} />
              </View>
              <View style={styles.cardTexts}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>
                    {cardBrand} •••• {cardLast4}
                  </Text>
                  <Badge label="1-CLICK" tone="success" size="sm" />
                </View>
                <Text style={styles.cardSubtitle}>Pagar en 1 toque directo</Text>
              </View>
            </View>

            <View style={styles.cardRight}>
              {isProcessing && activeAction === 'saved_card' ? (
                <ActivityIndicator size="small" color={TOKENS.colors.brand600} />
              ) : (
                <Icon name="ChevronRight" size={18} color={TOKENS.colors.brand500} />
              )}
            </View>
          </TouchableOpacity>

          {/* Card 2: Pagar con Flow / Webpay */}
          <TouchableOpacity
            style={[
              styles.actionCard,
              activeAction === 'flow' && styles.actionCardActive,
            ]}
            onPress={onPayWithFlow}
            activeOpacity={0.75}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel="Pagar con Flow o Webpay"
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Icon name="Globe" size={18} color={TOKENS.colors.textSubtle} />
              </View>
              <View style={styles.cardTexts}>
                <Text style={styles.cardTitle}>Pagar con Webpay / Flow</Text>
                <Text style={styles.cardSubtitle}>Débito, crédito o transferencia</Text>
              </View>
            </View>

            <View style={styles.cardRight}>
              {isProcessing && activeAction === 'flow' ? (
                <ActivityIndicator size="small" color={TOKENS.colors.brand600} />
              ) : (
                <Icon name="ChevronRight" size={18} color={TOKENS.colors.textSubtle} />
              )}
            </View>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Card A: Vincular Tarjeta Nueva (1-Tap) */}
          <TouchableOpacity
            style={[
              styles.actionCard,
              styles.actionCardPrimary,
              activeAction === 'register_card' && styles.actionCardActive,
            ]}
            onPress={onRegisterCard}
            activeOpacity={0.75}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel="Vincular tarjeta nueva"
          >
            <View style={styles.cardLeft}>
              <View style={[styles.iconBox, styles.iconBoxBrand]}>
                <Icon name="Plus" size={18} color={TOKENS.colors.brand600} />
              </View>
              <View style={styles.cardTexts}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>Vincular tarjeta nueva</Text>
                  <Badge label="RECOMENDADO" tone="brand" size="sm" />
                </View>
                <Text style={styles.cardSubtitle}>Guarda tu tarjeta para pagos 1-Click</Text>
              </View>
            </View>

            <View style={styles.cardRight}>
              {isProcessing && activeAction === 'register_card' ? (
                <ActivityIndicator size="small" color={TOKENS.colors.brand600} />
              ) : (
                <Icon name="ChevronRight" size={18} color={TOKENS.colors.brand500} />
              )}
            </View>
          </TouchableOpacity>

          {/* Card B: Pagar con Flow / Webpay (1-Tap) */}
          <TouchableOpacity
            style={[
              styles.actionCard,
              activeAction === 'flow' && styles.actionCardActive,
            ]}
            onPress={onPayWithFlow}
            activeOpacity={0.75}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel="Pagar con Flow o Webpay"
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Icon name="Globe" size={18} color={TOKENS.colors.textSubtle} />
              </View>
              <View style={styles.cardTexts}>
                <Text style={styles.cardTitle}>Pagar con Flow / Webpay</Text>
                <Text style={styles.cardSubtitle}>Pago directo sin guardar tarjeta</Text>
              </View>
            </View>

            <View style={styles.cardRight}>
              {isProcessing && activeAction === 'flow' ? (
                <ActivityIndicator size="small" color={TOKENS.colors.brand600} />
              ) : (
                <Icon name="ChevronRight" size={18} color={TOKENS.colors.textSubtle} />
              )}
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
    marginBottom: TOKENS.spacing.sm,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.surface200,
  },
  actionCardPrimary: {
    borderColor: TOKENS.colors.brand200,
    backgroundColor: TOKENS.colors.brand50,
  },
  actionCardActive: {
    borderColor: TOKENS.colors.brand500,
    backgroundColor: TOKENS.colors.brand100,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  iconBoxBrand: {
    borderColor: TOKENS.colors.brand200,
  },
  cardTexts: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  cardSubtitle: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 1,
  },
  cardRight: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
});
