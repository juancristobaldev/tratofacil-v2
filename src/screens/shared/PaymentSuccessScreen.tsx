import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button } from '../../components/ui';

export const PaymentSuccessScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Extract params
  const { 
    title = '¡Pago Exitoso!', 
    subtitle = 'Tu transacción se ha procesado correctamente.',
    type = 'generic' // can be used later for conditional rendering if needed
  } = route.params || {};

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  };

  const handleBilling = () => {
    // Navigate back to MainApp then to Billing to keep stack clean
    navigation.reset({
      index: 0,
      routes: [
        { name: 'MainApp' },
        { name: 'Billing' }
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <View style={styles.iconCircle}>
          <Icon name="Check" size={64} color={TOKENS.colors.white} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.infoBox}>
          <Icon name="ShieldCheck" size={24} color={TOKENS.colors.brand500} />
          <Text style={styles.infoText}>Transacción 100% segura y respaldada por TratoFácil.</Text>
        </View>

      </View>

      <View style={styles.footer}>
        <Button 
          title="Seguir Navegando" 
          onPress={handleContinue} 
          style={styles.btnPrimary} 
        />
        <Button 
          title="Ir a Facturación" 
          variant="secondary" 
          onPress={handleBilling} 
          style={styles.btnSecondary} 
        />
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
    backgroundColor: TOKENS.colors.statusSuccess,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.xxl,
    shadowColor: TOKENS.colors.statusSuccess,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
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
    backgroundColor: TOKENS.colors.brand50,
    padding: TOKENS.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.brand800,
  },
  footer: {
    padding: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.xxl,
    gap: TOKENS.spacing.md,
  },
  btnPrimary: {
    width: '100%',
  },
  btnSecondary: {
    width: '100%',
  },
});
