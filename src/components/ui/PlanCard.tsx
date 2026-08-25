import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import { Button } from './Button';

export interface PlanCardProps {
  name: string;
  price: number;
  period?: '/mes' | '/año';
  commission: string;
  features: string[];
  isRecommended?: boolean;
  isCurrent?: boolean;
  onSubscribe: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  name,
  price,
  period = '/mes',
  commission,
  features,
  isRecommended = false,
  isCurrent = false,
  onSubscribe,
  loading = false,
  style,
  testID,
}) => {
  const formattedPrice = price === 0 ? '$0' : `$${price.toLocaleString('es-CL')}`;

  return (
    <View
      testID={testID}
      style={[
        styles.planCard,
        isRecommended && styles.planCardRecommended,
        style,
      ]}
    >
      {isRecommended && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
        </View>
      )}

      <Text style={styles.planName}>{name}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.priceAmount}>{formattedPrice}</Text>
        <Text style={styles.pricePeriod}>{period}</Text>
      </View>

      <View style={styles.featuresBox}>
        <View style={styles.featureRow}>
          <Icon name="Check" size={14} color={TOKENS.colors.statusSuccess} />
          <Text style={styles.featureTextCommission}>
            Comisión {commission}
          </Text>
        </View>
        {features.map((feat, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Icon name="Check" size={14} color={TOKENS.colors.statusSuccess} />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>

      {isCurrent ? (
        <TouchableOpacity
          style={styles.currentPlanBtn}
          disabled
          activeOpacity={1}
        >
          <Text style={styles.currentPlanBtnText}>Plan actual</Text>
        </TouchableOpacity>
      ) : (
        <Button
          title={loading ? 'Procesando...' : 'Suscribirse'}
          onPress={onSubscribe}
          variant={isRecommended ? 'primary' : 'outline'}
          style={styles.subscribeBtn}
          disabled={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  planCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusCard + 4,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
    position: 'relative',
  },
  planCardRecommended: {
    borderColor: TOKENS.colors.brand500,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: TOKENS.colors.brand500,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: TOKENS.geometry.radiusPill,
  },
  popularBadgeText: {
    color: TOKENS.colors.white,
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.dark900,
    marginBottom: 4,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 14,
  },
  priceAmount: {
    fontSize: TOKENS.typography.sizes.xxl + 4,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
  featuresBox: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: TOKENS.typography.sizes.sm - 1,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.medium,
  },
  featureTextCommission: {
    fontSize: TOKENS.typography.sizes.sm - 1,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.bold,
  },
  subscribeBtn: {
    borderRadius: TOKENS.geometry.radiusInput + 2,
    height: 48,
  },
  currentPlanBtn: {
    height: 48,
    borderRadius: TOKENS.geometry.radiusInput + 2,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.surface50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanBtnText: {
    fontSize: TOKENS.typography.sizes.sm - 1,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
});
