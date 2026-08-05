import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, ErrorState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';

export const BillingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setIsRefreshing } = useRefresh();

  const hasCard = !!(user?.last4CardDigits && user?.creditCardType);
  const cardBrand = user?.creditCardType || 'VISA';
  const cardLast4 = user?.last4CardDigits || '****';

  const { paymentHistory: payments, paymentHistoryLoading: loading, paymentHistoryError: error, refetch } = usePlans();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetch();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetch, setIsRefreshing]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={TOKENS.colors.brand500} /></View>;
  }

  if (error) {
    return <ErrorState message="Error al cargar historial de pagos." />;
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        <Text style={styles.subtitle}>Administra tus métodos de pago y revisa tus transacciones.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de Pago Actual</Text>
          {hasCard ? (
            <View style={styles.cardBox}>
              <View style={styles.cardHeader}>
                <Icon name="CreditCard" size={24} color={TOKENS.colors.white} />
                <Text style={styles.cardBrand}>{cardBrand}</Text>
              </View>
              <Text style={styles.cardNumber}>**** **** **** {cardLast4}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardName}>{user?.displayName?.toUpperCase() || 'TITULAR'}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCardBox}>
              <Icon name="CreditCard" size={32} color={TOKENS.colors.textSubtle} />
              <Text style={styles.emptyCardText}>No tienes tarjetas vinculadas</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimas Transacciones</Text>
          {payments.length === 0 ? (
            <Text style={styles.emptyText}>Sin transacciones recientes</Text>
          ) : (
            <View style={styles.transactionsList}>
              {payments.slice(0, 10).map((tx) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIcon}>
                      <Icon name="CreditCard" size={16} color={TOKENS.colors.brand500} />
                    </View>
                    <View>
                      <Text style={styles.txTitle}>{tx.description}</Text>
                      <Text style={styles.txCategory}>{tx.type} • {new Date(tx.createdAt).toLocaleDateString('es-CL')}</Text>
                    </View>
                  </View>
                  <Text style={styles.txAmount}>${Math.abs(tx.amount).toLocaleString('es-CL')}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TOKENS.colors.white },
  scrollBody: { padding: TOKENS.spacing.lg },
  subtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginBottom: TOKENS.spacing.xl,
    lineHeight: 20,
  },
  section: {
    marginBottom: TOKENS.spacing.xl,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  cardBox: {
    backgroundColor: '#1E293B', // Slate 800
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    ...TOKENS.shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardBrand: {
    color: TOKENS.colors.white,
    fontWeight: TOKENS.typography.weights.extrabold,
    fontSize: TOKENS.typography.sizes.lg,
    letterSpacing: 2,
  },
  cardNumber: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.xl,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    color: TOKENS.colors.surface100,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    letterSpacing: 1,
  },
  cardExp: {
    color: TOKENS.colors.surface100,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
  },
  unlinkBtn: {
    position: 'absolute',
    top: TOKENS.spacing.lg,
    right: TOKENS.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unlinkBtnText: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
  },
  emptyCardBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderStyle: 'dashed',
  },
  emptyCardText: {
    marginTop: TOKENS.spacing.sm,
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.sm,
  },
  transactionsList: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.md,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
  },
  txCategory: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  txAmount: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  emptyText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, textAlign: 'center', paddingVertical: 24 },
});
