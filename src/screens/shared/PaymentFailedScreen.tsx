import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button } from '../../components/ui';

export const PaymentFailedScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Icon name="X" size={64} color={TOKENS.colors.white} />
        </View>

        <Text style={styles.title}>No pudimos confirmar tu pago</Text>
        <Text style={styles.subtitle}>
          El pago no se completó o fue rechazado. Si intentaron cobrarte, el monto será revertido automáticamente.
        </Text>

        <View style={styles.infoBox}>
          <Icon name="ShieldCheck" size={24} color={TOKENS.colors.statusError} />
          <Text style={styles.infoText}>Puedes intentar el pago nuevamente cuando quieras.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button title="Volver al inicio" onPress={handleContinue} style={styles.btn} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: TOKENS.colors.statusError,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.xxl,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: TOKENS.spacing.xxl,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textMain,
  },
  footer: {
    padding: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.xxl,
  },
  btn: {
    width: '100%',
  },
});
