import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';

export interface CreditCardPreviewProps {
  cardBrand: string;
  last4: string;
  holderName?: string;
  expiry?: string;
  statusBadge?: string;
  variant?: 'dark' | 'gradient';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const CreditCardPreview: React.FC<CreditCardPreviewProps> = ({
  cardBrand = 'VISA',
  last4 = '****',
  holderName = 'TITULAR',
  expiry,
  statusBadge = 'VINCULADA',
  variant = 'dark',
  style,
  testID,
}) => {
  return (
    <View
      testID={testID}
      style={[
        styles.cardContainer,
        variant === 'dark' ? styles.darkCard : styles.gradientCard,
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <Icon name="CreditCard" size={24} color="#CBD5E1" />
        <Text style={styles.cardBrand}>{cardBrand.toUpperCase()}</Text>
      </View>

      <Text style={styles.cardNumber}>•••• •••• •••• {last4}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.holderColumn}>
          <Text style={styles.cardHolderLabel}>TITULAR</Text>
          <Text style={styles.cardHolderName} numberOfLines={1}>
            {holderName.toUpperCase()}
          </Text>
        </View>
        {expiry ? (
          <View style={styles.expiryColumn}>
            <Text style={styles.cardHolderLabel}>VENCE</Text>
            <Text style={styles.expiryText}>{expiry}</Text>
          </View>
        ) : statusBadge ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{statusBadge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: TOKENS.geometry.radiusCard + 4,
    padding: TOKENS.spacing.lg,
    height: 160,
    justifyContent: 'space-between',
    ...TOKENS.shadows.medium,
    overflow: 'hidden',
  },
  darkCard: {
    backgroundColor: TOKENS.colors.dark900,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  gradientCard: {
    backgroundColor: TOKENS.colors.surface100,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: TOKENS.colors.white,
    fontWeight: TOKENS.typography.weights.black,
    fontSize: 18,
    fontStyle: 'italic',
    letterSpacing: 1.5,
  },
  cardNumber: {
    color: TOKENS.colors.white,
    fontSize: 18,
    letterSpacing: 3,
    fontWeight: TOKENS.typography.weights.bold,
    fontFamily: 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  holderColumn: {
    flex: 1,
    marginRight: TOKENS.spacing.sm,
  },
  cardHolderLabel: {
    fontSize: 9,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardHolderName: {
    color: TOKENS.colors.surface300,
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    letterSpacing: 0.5,
  },
  expiryColumn: {
    alignItems: 'flex-end',
  },
  expiryText: {
    color: TOKENS.colors.surface300,
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    fontFamily: 'monospace',
  },
  statusPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: TOKENS.geometry.radiusPill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.extrabold,
    letterSpacing: 0.5,
  },
});
