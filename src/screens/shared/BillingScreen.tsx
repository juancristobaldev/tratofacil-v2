import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, ErrorState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';
import { REGISTER_CARD_CALLBACK_URL } from '../../config/endpoints';

export const BillingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setIsRefreshing } = useRefresh();

  const hasCard = !!(user?.last4CardDigits && user?.creditCardType);
  const cardBrand = user?.creditCardType || 'VISA';
  const cardLast4 = user?.last4CardDigits || '****';

  const {
    paymentHistory: payments,
    paymentHistoryLoading: loading,
    paymentHistoryError: error,
    registerCard,
    providerPlan,
    marketplacePlan,
    cancelSubscription,
    reactivateSubscription,
    refetch,
  } = usePlans();

  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetch();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetch, setIsRefreshing]);

  const handleRegisterCard = async () => {
    if (registering) return;
    setRegistering(true);
    try {
      const result = await registerCard(REGISTER_CARD_CALLBACK_URL);
      if (result.alreadyRegistered) {
        Alert.alert('Tarjeta', 'Ya tienes una tarjeta vinculada.');
      } else if (result.url) {
        await Linking.openURL(result.url);
      } else {
        Alert.alert('Error', 'No se pudo iniciar el registro de la tarjeta.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo vincular la tarjeta.');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancel = (flowId: string, type: 'PROVIDER' | 'MARKETPLACE') => {
    Alert.alert('Cancelar suscripción', '¿Seguro que deseas cancelar esta suscripción?', [
      { text: 'No' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelSubscription({ subscriptionFlowId: flowId, type });
            Alert.alert('Cancelada', 'Suscripción cancelada.');
            refetch();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleReactivate = async (flowId: string, type: 'PROVIDER' | 'MARKETPLACE') => {
    try {
      await reactivateSubscription({ subscriptionFlowId: flowId, type });
      Alert.alert('Reactivada', 'Suscripción reactivada.');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={TOKENS.colors.brand500} /></View>;
  }

  if (error) {
    return <ErrorState message="Error al cargar historial de pagos." />;
  }

  const renderSubscription = (
    plan: { planActive: boolean; planEndsAt: string | null; subscriptionFlowId: string | null; plan: string } | null,
    type: 'PROVIDER' | 'MARKETPLACE'
  ) => {
    if (!plan || !plan.subscriptionFlowId) return null;
    const ended = plan.planEndsAt ? new Date(plan.planEndsAt).getTime() < Date.now() : false;
    return (
      <View style={styles.subscriptionBox}>
        <View style={styles.subsHeader}>
          <Icon name="Crown" size={20} color={TOKENS.colors.brand600} />
          <Text style={styles.subsPlan}>
            {type === 'PROVIDER' ? plan.plan.replace('TRATOFACIL_SRV_', '') : plan.plan.replace('TRATOFACIL_PUB_', '') || 'FREE'}
          </Text>
        </View>
        <Text style={styles.subsStatus}>
          {plan.planActive ? 'Activa' : ended ? 'Finalizada' : 'Cancelada'}
        </Text>
        {plan.planEndsAt && (
          <Text style={styles.subsEnds}>Vence el {new Date(plan.planEndsAt).toLocaleDateString('es-CL')}</Text>
        )}
        {plan.planActive ? (
          <Button title="Cancelar Suscripción" variant="outline" onPress={() => handleCancel(plan.subscriptionFlowId!, type)} style={styles.subsBtn} />
        ) : (
          !ended && (
            <Button title="Reactivar Suscripción" variant="outline" onPress={() => handleReactivate(plan.subscriptionFlowId!, type)} style={styles.subsBtn} />
          )
        )}
      </View>
    );
  };

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
          <Button
            title={hasCard ? 'Cambiar Tarjeta' : 'Vincular Tarjeta'}
            icon="CreditCard"
            variant={hasCard ? 'outline' : 'primary'}
            loading={registering}
            disabled={registering}
            onPress={handleRegisterCard}
            style={styles.cardBtn}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suscripciones</Text>
          {renderSubscription(providerPlan, 'PROVIDER')}
          {renderSubscription(marketplacePlan, 'MARKETPLACE')}
          {(!providerPlan?.subscriptionFlowId && !marketplacePlan?.subscriptionFlowId) && (
            <Text style={styles.emptyText}>Sin suscripciones activas</Text>
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
  cardBtn: { marginTop: TOKENS.spacing.md },
  subscriptionBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: TOKENS.spacing.md,
  },
  subsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  subsPlan: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  subsStatus: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textMain, fontWeight: TOKENS.typography.weights.semibold },
  subsEnds: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, marginTop: 4 },
  subsBtn: { marginTop: TOKENS.spacing.md },
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
