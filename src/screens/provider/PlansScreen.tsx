import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useRefresh } from '../../context/RefreshContext';
import { ProviderPlan } from '../../types/graphql';

interface Plan { id: string; name: string; price: string; commission: string; features: string[]; recommended: boolean; color: string; planEnum: ProviderPlan; }

const PLANS: Plan[] = [
  { id: 'plan_bronze', name: 'Plan Bronce', price: 'Gratis', commission: '20%', features: ['Contacto directo', 'Perfil básico', 'Máximo 2 servicios', 'Visibilidad estándar'], recommended: false, color: '#cd7f32', planEnum: ProviderPlan.FREE },
  { id: 'plan_silver', name: 'Plan PRO', price: '$8.990 / mes', commission: '10%', features: ['Perfil verificado', 'Servicios ilimitados', 'Alta visibilidad', 'Soporte prioritario'], recommended: true, color: '#4f46e5', planEnum: ProviderPlan.TRATOFACIL_SRV_PRO },
  { id: 'plan_gold', name: 'Plan PREMIUM', price: '$16.990 / mes', commission: '2%', features: ['Perfil verificado VIP', 'Servicios ilimitados', 'Máxima prioridad', 'Marketing destacado', 'Soporte ejecutivo'], recommended: false, color: '#ffd700', planEnum: ProviderPlan.TRATOFACIL_SRV_PREMIUM },
];

export const PlansScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setIsRefreshing } = useRefresh();

  const currentPlan = user?.planOrders?.[0]?.plan || ProviderPlan.FREE;

  const { subscribe, subscribeLoading: loading, refetch } = usePlans();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetch();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetch, setIsRefreshing]);

  const handleSubscribe = async (plan: Plan) => {
    if (plan.planEnum === currentPlan) return;
    const customerId = user?.flowCustomerId || 'flow_customer';
    try {
      await subscribe({
        plan: plan.planEnum,
        interval: 'MONTHLY',
        type: 'PROVIDER',
        customerId,
      });
      Alert.alert('Suscripción', 'Redirigiendo al pago...');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        <Text style={styles.intro}>Elige el plan que mejor se adapte a tu negocio y comienza a recibir más solicitudes.</Text>
        {PLANS.map((plan) => (
          <Card key={plan.id} style={[styles.planCard, plan.recommended && styles.planCardRecommended]} padded={true}>
            {plan.recommended && <Badge label="RECOMENDADO" tone="brand" size="sm" style={{ alignSelf: 'flex-start', marginBottom: 8 }} />}
            <View style={styles.planHeader}>
              <View style={[styles.planIconCircle, { backgroundColor: plan.color + '20' }]}>
                <Icon name="Crown" size={20} color={plan.color} />
              </View>
              <View style={styles.planTitleCol}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>
            </View>
            <Text style={styles.planCommission}>Comisión: {plan.commission}</Text>
            <View style={styles.planDivider} />
            {plan.features.map((feat, idx) => (
              <View key={idx} style={styles.featureRow}>
                <Icon name="Check" size={14} color={TOKENS.colors.statusSuccess} />
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
            <Button
              title={plan.planEnum === currentPlan ? 'Plan Actual' : loading ? 'Procesando...' : 'Suscribirse'}
              onPress={() => handleSubscribe(plan)}
              variant={plan.planEnum === currentPlan ? 'white' : 'primary'}
              style={styles.subscribeBtn}
              disabled={plan.planEnum === currentPlan || loading}
            />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  scrollBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.md, paddingBottom: 40 },
  intro: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, lineHeight: 18, marginBottom: 4 },
  planCard: { backgroundColor: TOKENS.colors.white },
  planCardRecommended: { borderColor: TOKENS.colors.brand500, borderWidth: 2 },
  planHeader: { flexDirection: 'row', alignItems: 'center' },
  planIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  planTitleCol: { flex: 1, marginLeft: 12 },
  planName: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  planPrice: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginTop: 2 },
  planCommission: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.brand500, fontWeight: 'bold', marginTop: 6 },
  planDivider: { height: 1, backgroundColor: TOKENS.colors.surface100, marginVertical: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textMain, fontWeight: '500' },
  subscribeBtn: { marginTop: 12 },
});
