import React from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Card, Badge } from '../../components';

interface Plan { id: string; name: string; price: string; commission: string; features: string[]; recommended: boolean; color: string; }

const PLANS: Plan[] = [
  { id: 'plan_bronze', name: 'Plan Bronce', price: 'Gratis', commission: '10% de comisión por servicio', features: ['Contacto directo con clientes', 'Perfil básico', 'Historial de trabajos', 'Soporte estándar'], recommended: false, color: '#cd7f32' },
  { id: 'plan_silver', name: 'Plan Plata', price: '$14.990 / mes', commission: '5% de comisión por servicio', features: ['Contacto ilimitado con clientes', 'Destacado medio en búsquedas', 'Soporte prioritario 24/7', 'Estadísticas de perfil avanzadas'], recommended: true, color: '#c0c0c0' },
  { id: 'plan_gold', name: 'Plan Oro', price: '$29.990 / mes', commission: '0% de comisión por servicio (100% tuyo)', features: ['Todo lo del Plan Plata', 'Máxima prioridad en búsquedas', 'Perfil verificado premium', 'Soporte ejecutivo dedicado'], recommended: false, color: '#ffd700' },
];

export const PlansScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleSubscribe = (planId: string) => {
    Alert.alert('Suscripción', `Has seleccionado el plan ${planId}. En un entorno real se iniciaría el flujo de pago.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.planCommission}>{plan.commission}</Text>
            <View style={styles.planDivider} />
            {plan.features.map((feat, idx) => (
              <View key={idx} style={styles.featureRow}>
                <Icon name="Check" size={14} color={TOKENS.colors.statusSuccess} />
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
            <Button title={plan.id === 'plan_bronze' ? 'Plan Actual' : 'Suscribirse'} onPress={() => handleSubscribe(plan.id)} variant={plan.id === 'plan_bronze' ? 'white' : 'primary'} style={styles.subscribeBtn} />
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
