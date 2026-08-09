import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { UserPlan } from '../../types/graphql';

interface MarketPlan {
  id: string;
  name: string;
  planEnum: UserPlan;
  monthly: number;
  yearly: number;
  maxPublications: string;
  maxPhotos: number;
  recommended: boolean;
  features: string[];
}

const MARKETPLACE_PLANS: MarketPlan[] = [
  {
    id: 'mp_free',
    name: 'Gratis',
    planEnum: UserPlan.FREE,
    monthly: 0,
    yearly: 0,
    maxPublications: '2',
    maxPhotos: 5,
    recommended: false,
    features: ['Compra segura TratoFácil', 'Hasta 2 publicaciones', '5 fotos por publicación'],
  },
  {
    id: 'mp_initial',
    name: 'Inicial',
    planEnum: UserPlan.TRATOFACIL_PUB_INITIAL,
    monthly: 15900,
    yearly: 190800,
    maxPublications: '10',
    maxPhotos: 10,
    recommended: false,
    features: ['Compra segura TratoFácil', 'Hasta 10 publicaciones', '10 fotos por publicación'],
  },
  {
    id: 'mp_pro',
    name: 'Pro',
    planEnum: UserPlan.TRATOFACIL_PUB_PRO,
    monthly: 32900,
    yearly: 324000,
    maxPublications: '50',
    maxPhotos: 10,
    recommended: true,
    features: ['Compra segura TratoFácil', 'Hasta 50 publicaciones', '10 fotos por publicación', '18% descuento anual'],
  },
  {
    id: 'mp_business',
    name: 'Business',
    planEnum: UserPlan.TRATOFACIL_PUB_BUSINESS,
    monthly: 64900,
    yearly: 623000,
    maxPublications: '200',
    maxPhotos: 20,
    recommended: false,
    features: ['Compra segura TratoFácil', 'Hasta 200 publicaciones', '20 fotos por publicación', '20% descuento anual'],
  },
  {
    id: 'mp_full',
    name: 'Full',
    planEnum: UserPlan.TRATOFACIL_PUB_FULL,
    monthly: 104900,
    yearly: 982000,
    maxPublications: 'Ilimitadas',
    maxPhotos: 20,
    recommended: false,
    features: ['Compra segura TratoFácil', 'Publicaciones ilimitadas', '20 fotos por publicación', 'Ejecutivo personalizado'],
  },
];

const fmt = (n: number) => n.toLocaleString('es-CL');

export const MarketplacePlansScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { subscribe, subscribeLoading } = usePlans();
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const currentPlan = user?.marketplacePlanOrders?.[0]?.plan || UserPlan.FREE;
  const currentPlanActive = user?.marketplacePlanOrders?.[0]?.planActive ?? false;

  const handleSelect = async (plan: MarketPlan) => {
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    if (plan.planEnum === UserPlan.FREE) {
      navigation.navigate('MainApp');
      return;
    }
    const hasBasic = !!(user?.displayName && user?.birthday && user?.emailVerified);
    if (!hasBasic) {
      Alert.alert('Perfil incompleto', 'Completa tu perfil antes de suscribirte.');
      navigation.navigate('VerificationCenter');
      return;
    }
    if (!user?.last4CardDigits) {
      Alert.alert('Método de pago', 'Debes vincular una tarjeta antes de suscribirte.');
      navigation.navigate('Billing');
      return;
    }
    try {
      await subscribe({
        plan: plan.planEnum,
        interval,
        type: 'MARKETPLACE',
        customerId: user?.flowCustomerId || String(user.id),
      });
      Alert.alert('Suscripción', 'Suscripción iniciada. Completa el pago para activar tu plan.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo procesar la suscripción.');
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Elige el plan que se adapte a tu volumen de ventas y destaca tus publicaciones.</Text>

        <View style={styles.intervalRow}>
          {(['MONTHLY', 'YEARLY'] as const).map((it) => (
            <TouchableOpacity
              key={it}
              style={[styles.intervalBtn, interval === it && styles.intervalBtnActive]}
              onPress={() => setInterval(it)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.intervalText, interval === it && styles.intervalTextActive]}
              >
                {it === 'MONTHLY' ? 'Mensual' : 'Anual'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {MARKETPLACE_PLANS.map((plan) => {
          const isCurrent = plan.planEnum === currentPlan;
          const price = interval === 'MONTHLY' ? plan.monthly : plan.yearly;
          return (
            <Card key={plan.id} style={[styles.planCard, plan.recommended && styles.planCardRecommended]} padded={true}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                {plan.recommended && <Badge label="RECOMENDADO" tone="brand" />}
              </View>
              <Text style={styles.planPrice}>
                {price === 0 ? 'Gratis' : `$${fmt(price)} / ${interval === 'MONTHLY' ? 'mes' : 'año'}`}
              </Text>
              <Text style={styles.planMeta}>{plan.maxPublications} publicaciones · {plan.maxPhotos} fotos c/u</Text>
              <View style={styles.divider} />
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Icon name="Check" size={14} color={TOKENS.colors.success500} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              {isCurrent && currentPlanActive ? (
                <Button title="Plan Actual" variant="white" disabled onPress={() => {}} style={styles.subscribeBtn} />
              ) : (
                <Button
                  title={subscribeLoading ? 'Procesando...' : 'Suscribirse'}
                  variant={plan.recommended ? 'primary' : 'outline'}
                  onPress={() => handleSelect(plan)}
                  disabled={subscribeLoading}
                  style={styles.subscribeBtn}
                />
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.md, paddingBottom: 40 },
  intro: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, lineHeight: 20, marginBottom: TOKENS.spacing.md },
  intervalRow: { flexDirection: 'row', backgroundColor: TOKENS.colors.surface100, borderRadius: 12, padding: 4, marginBottom: TOKENS.spacing.lg },
  intervalBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  intervalBtnActive: { backgroundColor: TOKENS.colors.brand500 },
  intervalText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle },
  intervalTextActive: { color: TOKENS.colors.white },
  planCard: { backgroundColor: TOKENS.colors.white, marginBottom: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  planCardRecommended: { borderColor: TOKENS.colors.brand500, borderWidth: 2 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain },
  planPrice: { fontSize: TOKENS.typography.sizes.xl, fontWeight: TOKENS.typography.weights.black, color: TOKENS.colors.brand600, marginTop: 8 },
  planMeta: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginTop: 4 },
  divider: { height: 1, backgroundColor: TOKENS.colors.surface100, marginVertical: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textMain, fontWeight: '500', flex: 1 },
  subscribeBtn: { marginTop: 12 },
});
