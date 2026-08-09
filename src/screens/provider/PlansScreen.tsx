import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';
import { ProviderOnlyGate } from '../../components/ui/ProviderOnlyGate';
import { ProviderPlan } from '../../types/graphql';

interface Plan {
  id: string;
  name: string;
  monthly: number;
  yearly: number;
  commission: string;
  features: string[];
  recommended: boolean;
  planEnum: ProviderPlan;
}

const PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Gratis',
    monthly: 0,
    yearly: 0,
    commission: '20%',
    features: ['Contacto directo', 'Perfil básico', 'Máximo 2 servicios', 'Visibilidad estándar'],
    recommended: false,
    planEnum: ProviderPlan.FREE,
  },
  {
    id: 'plan_pro',
    name: 'PRO',
    monthly: 8990,
    yearly: 87880,
    commission: '10%',
    features: ['Perfil verificado', 'Servicios ilimitados', 'Alta visibilidad', 'Soporte prioritario'],
    recommended: true,
    planEnum: ProviderPlan.TRATOFACIL_SRV_PRO,
  },
  {
    id: 'plan_premium',
    name: 'PREMIUM',
    monthly: 16990,
    yearly: 183880,
    commission: '2%',
    features: ['Perfil verificado VIP', 'Servicios ilimitados', 'Máxima prioridad', 'Marketing destacado', 'Soporte ejecutivo'],
    recommended: false,
    planEnum: ProviderPlan.TRATOFACIL_SRV_PREMIUM,
  },
];

const fmt = (n: number) => n.toLocaleString('es-CL');

export const PlansScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, role } = useAuth();
  const hasProvider = !!user?.provider;
  const { setIsRefreshing } = useRefresh();

  const {
    providerPlan,
    subscribe,
    subscribeLoading: loading,
    cancelSubscription,
    reactivateSubscription,
    refetch,
  } = usePlans();
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [refreshing, setRefreshing] = useState(false);

  const currentPlan = providerPlan?.plan || user?.planOrders?.[0]?.plan || ProviderPlan.FREE;
  const currentPlanActive = providerPlan?.planActive ?? false;
  const subscriptionFlowId = providerPlan?.subscriptionFlowId;
  const planEndsAt = providerPlan?.planEndsAt;

  const isPlanEnded = planEndsAt ? new Date(planEndsAt).getTime() < Date.now() : false;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetch();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetch, setIsRefreshing]);

  const handleSubscribe = async (plan: Plan) => {
    if (plan.planEnum === currentPlan) return;
    const customerId = user?.flowCustomerId;
    if (!customerId) {
      Alert.alert('Atención', 'Debes vincular una tarjeta antes de suscribirte.');
      navigation.navigate('Billing');
      return;
    }
    try {
      await subscribe({
        plan: plan.planEnum,
        interval,
        type: 'PROVIDER',
        customerId,
      });
      Alert.alert('Suscripción', 'Redirigiendo al pago...');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCancel = () => {
    if (!subscriptionFlowId) return;
    Alert.alert('Cancelar suscripción', '¿Seguro que deseas cancelar tu suscripción?', [
      { text: 'No' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelSubscription({ subscriptionFlowId, type: 'PROVIDER' });
            Alert.alert('Cancelada', 'Tu suscripción quedó cancelada. Conservarás el plan hasta la fecha de vencimiento.');
            refetch();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleReactivate = async () => {
    if (!subscriptionFlowId) return;
    try {
      await reactivateSubscription({ subscriptionFlowId, type: 'PROVIDER' });
      Alert.alert('Reactivada', 'Tu suscripción fue reactivada.');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ProviderOnlyGate hasProvider={hasProvider} role={role}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
        >
          <Text style={styles.intro}>Elige el plan que mejor se adapte a tu negocio y comienza a recibir más solicitudes.</Text>

          <View style={styles.intervalRow}>
            {(['MONTHLY', 'YEARLY'] as const).map((it) => (
              <TouchableOpacity
                key={it}
                style={[styles.intervalBtn, interval === it && styles.intervalBtnActive]}
                onPress={() => setInterval(it)}
                activeOpacity={0.8}
              >
                <Text style={[styles.intervalText, interval === it && styles.intervalTextActive]}>
                  {it === 'MONTHLY' ? 'Mensual' : 'Anual'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {PLANS.map((plan) => {
            const isCurrent = plan.planEnum === currentPlan;
            const price = interval === 'MONTHLY' ? plan.monthly : plan.yearly;
            return (
              <Card key={plan.id} style={[styles.planCard, plan.recommended && styles.planCardRecommended]} padded={true}>
                {plan.recommended && <Badge label="RECOMENDADO" tone="brand" size="sm" style={{ alignSelf: 'flex-start', marginBottom: 8 }} />}
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                </View>
                <Text style={styles.planPrice}>
                  {price === 0 ? 'Gratis' : `$${fmt(price)} / ${interval === 'MONTHLY' ? 'mes' : 'año'}`}
                </Text>
                <Text style={styles.planCommission}>Comisión: {plan.commission}</Text>
                <View style={styles.planDivider} />
                {plan.features.map((feat, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Icon name="Check" size={14} color={TOKENS.colors.statusSuccess} />
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
                {isCurrent && currentPlanActive ? (
                  <Button title="Plan Actual" variant="white" disabled onPress={() => {}} style={styles.subscribeBtn} />
                ) : (
                  <Button
                    title={loading ? 'Procesando...' : 'Suscribirse'}
                    onPress={() => handleSubscribe(plan)}
                    variant={plan.recommended ? 'primary' : 'outline'}
                    style={styles.subscribeBtn}
                    disabled={loading}
                  />
                )}
              </Card>
            );
          })}

          {subscriptionFlowId && (
            <View style={styles.subscriptionCard}>
              <View style={styles.subsHeader}>
                <Icon name="Crown" size={20} color={TOKENS.colors.brand600} />
                <Text style={styles.subsTitle}>Mi suscripción</Text>
              </View>
              <Text style={styles.subsStatus}>
                Plan actual: {currentPlan.replace('TRATOFACIL_SRV_', '') || 'FREE'}{' '}
                {currentPlanActive ? '(Activo)' : isPlanEnded ? '(Finalizado)' : '(Cancelado)'}
              </Text>
              {planEndsAt && (
                <Text style={styles.subsEnds}>
                  Vence el {new Date(planEndsAt).toLocaleDateString('es-CL')}
                </Text>
              )}
              {currentPlanActive ? (
                <Button title="Cancelar Suscripción" variant="outline" onPress={handleCancel} style={styles.subsBtn} />
              ) : (
                !isPlanEnded && (
                  <Button title="Reactivar Suscripción" variant="outline" onPress={handleReactivate} style={styles.subsBtn} />
                )
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </ProviderOnlyGate>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  scrollBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.md, paddingBottom: 40 },
  intro: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 18, marginBottom: 4 },
  intervalRow: { flexDirection: 'row', backgroundColor: TOKENS.colors.surface50, borderRadius: 12, padding: 4, marginBottom: TOKENS.spacing.sm, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  intervalBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  intervalBtnActive: { backgroundColor: TOKENS.colors.brand500 },
  intervalText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle },
  intervalTextActive: { color: TOKENS.colors.white },
  planCard: { backgroundColor: TOKENS.colors.white },
  planCardRecommended: { borderColor: TOKENS.colors.brand500, borderWidth: 2 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  planPrice: { fontSize: TOKENS.typography.sizes.xl, fontWeight: TOKENS.typography.weights.black, color: TOKENS.colors.brand600, marginTop: 8 },
  planCommission: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.brand500, fontWeight: 'bold', marginTop: 6 },
  planDivider: { height: 1, backgroundColor: TOKENS.colors.surface100, marginVertical: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textMain, fontWeight: '500' },
  subscribeBtn: { marginTop: 12 },
  subscriptionCard: { backgroundColor: TOKENS.colors.white, borderRadius: 16, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.surface200, marginTop: TOKENS.spacing.sm },
  subsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  subsTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  subsStatus: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textMain, fontWeight: TOKENS.typography.weights.semibold },
  subsEnds: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, marginTop: 4 },
  subsBtn: { marginTop: TOKENS.spacing.md },
});
