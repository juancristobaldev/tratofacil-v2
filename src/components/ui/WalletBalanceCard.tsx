import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

// --- WALLET BALANCE HERO CARD ---
export interface WalletBalanceCardProps {
  balance: number;
  onWithdraw: () => void;
  onRefresh?: () => void;
  currency?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
  balance,
  onWithdraw,
  onRefresh,
  currency = 'CLP',
  style,
  testID,
}) => {
  const isZeroOrNegative = balance <= 0;

  return (
    <View style={[styles.heroBalanceCard, style]} testID={testID}>
      <View style={styles.glowDecor} pointerEvents="none" />
      <Text style={styles.heroLabel}>Saldo disponible</Text>
      <Text style={styles.heroAmount}>${balance.toLocaleString('es-CL')}</Text>
      <View style={styles.heroActionsRow}>
        <TouchableOpacity
          style={[styles.heroWithdrawBtn, isZeroOrNegative && styles.heroBtnDisabled]}
          onPress={onWithdraw}
          activeOpacity={0.9}
          disabled={isZeroOrNegative}
          accessibilityRole="button"
          accessibilityLabel="Retirar dinero"
          accessibilityState={{ disabled: isZeroOrNegative }}
        >
          <Icon name="ArrowDownCircle" size={16} color={TOKENS.colors.white} />
          <Text style={styles.heroWithdrawBtnText}>Retirar dinero</Text>
        </TouchableOpacity>

        {onRefresh && (
          <TouchableOpacity
            style={styles.heroRefreshBtn}
            onPress={onRefresh}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Actualizar billetera"
          >
            <Icon name="RotateCcw" size={16} color={TOKENS.colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// --- TRANSACTION LIST ITEM ---
export interface TransactionListItemProps {
  id: string | number;
  type: 'EARNING' | 'WITHDRAWAL' | 'COMMISSION' | string;
  amount: number;
  description: string;
  date: string | Date;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  type,
  amount,
  description,
  date,
  style,
  onPress,
}) => {
  const isIncome = type === 'EARNING' || amount > 0;
  const isCommission = type === 'COMMISSION';
  const formattedDate = typeof date === 'string'
    ? new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
    : date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

  const getIconConfig = (): { icon: IconName; circleStyle: ViewStyle; iconColor: string } => {
    if (isIncome) {
      return {
        icon: 'ArrowDownLeft',
        circleStyle: styles.txIconIncome,
        iconColor: TOKENS.colors.statusSuccess,
      };
    }
    if (isCommission) {
      return {
        icon: 'Percent',
        circleStyle: styles.txIconCommission,
        iconColor: TOKENS.colors.statusWarning,
      };
    }
    return {
      icon: 'ArrowUpRight',
      circleStyle: styles.txIconWithdraw,
      iconColor: TOKENS.colors.statusError,
    };
  };

  const iconConfig = getIconConfig();

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      style={[styles.transactionCard, style]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.txIconCircle, iconConfig.circleStyle]}>
        <Icon name={iconConfig.icon} size={16} color={iconConfig.iconColor} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {description || 'Transacción'}
        </Text>
        <Text style={styles.txDate}>{formattedDate}</Text>
      </View>
      <Text
        style={[
          styles.txAmount,
          isIncome ? styles.txAmtIncome : isCommission ? styles.txAmtCommission : styles.txAmtWithdraw,
        ]}
      >
        {isIncome ? '+' : '-'}${Math.abs(amount).toLocaleString('es-CL')}
      </Text>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  heroBalanceCard: {
    backgroundColor: TOKENS.colors.dark900,
    borderRadius: TOKENS.geometry.radiusXl,
    padding: TOKENS.spacing.xl,
    marginBottom: TOKENS.spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...TOKENS.shadows.floating,
  },
  glowDecor: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(230, 0, 126, 0.25)',
  },
  heroLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: TOKENS.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.white,
    letterSpacing: -1,
    marginBottom: 20,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroWithdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TOKENS.colors.brand500,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: TOKENS.geometry.radiusInput,
    ...TOKENS.shadows.soft,
  },
  heroBtnDisabled: {
    opacity: 0.5,
  },
  heroWithdrawBtnText: {
    color: TOKENS.colors.white,
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
  },
  heroRefreshBtn: {
    width: 44,
    height: 44,
    borderRadius: TOKENS.geometry.radiusInput,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.geometry.radiusCard,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: TOKENS.spacing.sm,
    ...TOKENS.shadows.soft,
  },
  txIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconIncome: {
    backgroundColor: TOKENS.colors.surfaceSuccess,
  },
  txIconWithdraw: {
    backgroundColor: TOKENS.colors.surfaceError,
  },
  txIconCommission: {
    backgroundColor: TOKENS.colors.surfaceWarning,
  },
  txInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  txTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  txDate: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
    fontWeight: TOKENS.typography.weights.medium,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.extrabold,
    letterSpacing: -0.3,
  },
  txAmtIncome: {
    color: TOKENS.colors.statusSuccess,
  },
  txAmtWithdraw: {
    color: TOKENS.colors.dark900,
  },
  txAmtCommission: {
    color: TOKENS.colors.warning600,
  },
});
