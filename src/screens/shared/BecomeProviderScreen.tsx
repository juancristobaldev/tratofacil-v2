import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const BENEFITS = [
  {
    icon: 'Briefcase' as const,
    title: 'Recibe solicitudes',
    desc: 'Los clientes cercanos podrán solicitarte servicios en tiempo real.',
  },
  {
    icon: 'Wallet' as const,
    title: 'Cobra por tu trabajo',
    desc: 'Gestiona tus ganancias y recibe pagos de forma segura.',
  },
  {
    icon: 'TrendingUp' as const,
    title: 'Haz crecer tu negocio',
    desc: 'Publica servicios, sube certificados y destaca en tu zona.',
  },
];

export const BecomeProviderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, becomeProvider } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBecomeProvider = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await becomeProvider();
      Alert.alert(
        'Cuenta profesional activada',
        'Ahora completa tu perfil para empezar a recibir solicitudes.',
        [{ text: 'Continuar', onPress: () => navigation.navigate('VerificationCenter') }],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No pudimos activar tu cuenta de proveedor. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBox}>
          <View style={styles.heroIconBox}>
            <Icon name="Zap" size={40} color={TOKENS.colors.white} />
          </View>
          <Text style={styles.title}>Hazte Profesional</Text>
          <Text style={styles.subtitle}>
            Ofrece tus servicios en TratoFácil, recibe solicitudes de clientes cerca de ti y cobra por tu trabajo.
          </Text>
        </View>

        <View style={styles.benefitsBox}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIconBox}>
                <Icon name={b.icon} size={20} color={TOKENS.colors.brand600} />
              </View>
              <View style={styles.benefitTextCol}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {user?.provider && (
          <View style={styles.infoBox}>
            <Icon name="Info" size={18} color={TOKENS.colors.brand600} />
            <Text style={styles.infoText}>
              Ya tienes una cuenta profesional. Completa tu perfil para empezar.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={TOKENS.colors.brand500} />
            <Text style={styles.loadingText}>Activando cuenta profesional...</Text>
          </View>
        ) : (
          <Button title="Activar Cuenta Profesional" icon="Zap" onPress={handleBecomeProvider} />
        )}
        <Button
          title="Volver"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={{ marginTop: TOKENS.spacing.sm }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.lg, paddingBottom: 120 },
  heroBox: { alignItems: 'center', marginTop: TOKENS.spacing.xl, marginBottom: TOKENS.spacing.xl },
  heroIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.lg,
    ...TOKENS.shadows.soft,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.sm,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: TOKENS.spacing.md,
  },
  benefitsBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
    marginBottom: TOKENS.spacing.lg,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: TOKENS.spacing.lg, gap: 12 },
  benefitIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextCol: { flex: 1 },
  benefitTitle: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  benefitDesc: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, marginTop: 2, lineHeight: 16 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.brand50,
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.brand700, fontWeight: TOKENS.typography.weights.medium },
  footer: { padding: TOKENS.spacing.lg, backgroundColor: TOKENS.colors.white, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 14 },
  loadingText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, fontWeight: TOKENS.typography.weights.medium },
});
