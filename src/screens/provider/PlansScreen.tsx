import React, { useState, useCallback } from 'react';
import { PlanInterval, SubscriptionType, ProviderPlan } from '../../graphql/generated';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge, IntervalToggle, PlanCard } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';
import { ProviderOnlyGate } from '../../components/ui/ProviderOnlyGate';

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
    planEnum: ProviderPlan.Free,
  },
  {
    id: 'plan_pro',
    name: 'PRO',
    monthly: 8990,
    yearly: 87880,
    commission: '10%',
    features: ['Perfil verificado', 'Servicios ilimitados', 'Alta visibilidad', 'Soporte prioritario'],
    recommended: true,
    planEnum: ProviderPlan.TratofacilSrvPro,
  },
  {
    id: 'plan_premium',
    name: 'PREMIUM',
    monthly: 16990,
    yearly: 183880,
    commission: '2%',
    features: ['Perfil verificado VIP', 'Servicios ilimitados', 'Máxima prioridad', 'Marketing destacado', 'Soporte ejecutivo'],
    recommended: false,
    planEnum: ProviderPlan.TratofacilSrvPremium,
  },
];

export const PlansScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
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
  const [interval, setInterval] = useState<PlanInterval.Monthly | PlanInterval.Yearly>(PlanInterval.Monthly);
  const [refreshing, setRefreshing] = useState(false);

  const currentPlan = providerPlan?.plan || user?.planOrders?.[0]?.plan || ProviderPlan.Free;
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
        type: SubscriptionType.Provider,
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
            await cancelSubscription({ orderId: providerPlan?.id || 0, type: SubscriptionType.Provider });
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
      await reactivateSubscription({ orderId: providerPlan?.id || 0, type: SubscriptionType.Provider });
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
          contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + TOKENS.spacing.lg }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
        >
          <Text style={styles.intro}>Elige el plan que mejor se adapte a tu negocio</Text>

          {/* Segmented Pill selector matching ui-kit.html */}
          <View style={styles.intervalCenterWrapper}>
            <IntervalToggle
              isAnnual={interval === PlanInterval.Yearly}
              onToggle={(annual) => setInterval(annual ? PlanInterval.Yearly : PlanInterval.Monthly)}
              discountLabel="-20%"
            />
          </View>

          {/* Plan Cards */}
          <View style={styles.plansList}>
            {PLANS.map((plan) => {
              const isCurrent = plan.planEnum === currentPlan && currentPlanActive;
              const price = interval === PlanInterval.Monthly ? plan.monthly : plan.yearly;

              return (
                <PlanCard
                  key={plan.id}
                  name={plan.name}
                  price={price}
                  period={interval === PlanInterval.Monthly ? '/mes' : '/año'}
                  commission={plan.commission}
                  features={plan.features}
                  isRecommended={plan.recommended}
                  isCurrent={isCurrent}
                  onSubscribe={() => handleSubscribe(plan)}
                  loading={loading}
                />
              );
            })}
          </View>

          {/* Active Subscription Management Card */}
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
                <Button
                  title="Cancelar Suscripción"
                  variant="outline"
                  onPress={handleCancel}
                  style={styles.subsBtn}
                />
              ) : (
                !isPlanEnded && (
                  <Button
                    title="Reactivar Suscripción"
                    variant="outline"
                    onPress={handleReactivate}
                    style={styles.subsBtn}
                  />
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
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  scrollBody: {
    padding: TOKENS.spacing.md,
    gap: TOKENS.spacing.md,
  },
  intro: {
    fontSize: 13,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginTop: 4,
  },

  // Segmented Pill
  intervalCenterWrapper: {
    alignItems: 'center',
    marginBottom: 4,
  },
  intervalPillContainer: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  intervalPillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalPillBtnActive: {
    backgroundColor: TOKENS.colors.dark900,
  },
  intervalPillText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  intervalPillTextActive: {
    color: TOKENS.colors.white,
  },
  discountBadgeText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },

  // Plan Cards
  plansList: {
    gap: TOKENS.spacing.md,
  },
  planCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
    position: 'relative',
  },
  planCardPro: {
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
    borderRadius: 12,
  },
  popularBadgeText: {
    color: TOKENS.colors.white,
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 16,
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
    fontSize: 28,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    fontWeight: '500',
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
    fontSize: 13,
    color: TOKENS.colors.textMain,
    fontWeight: '500',
  },
  featureTextCommission: {
    fontSize: 13,
    color: TOKENS.colors.textMain,
    fontWeight: '700',
  },
  subscribeBtn: {
    borderRadius: 14,
    height: 48,
  },
  currentPlanBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.surface50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlanBtnText: {
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },

  // Subscription Card
  subscriptionCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginTop: 4,
    ...TOKENS.shadows.soft,
  },
  subsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  subsTitle: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.dark900,
  },
  subsStatus: {
    fontSize: 13,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  subsEnds: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
  },
  subsBtn: {
    marginTop: 12,
    borderRadius: 14,
  },
});
