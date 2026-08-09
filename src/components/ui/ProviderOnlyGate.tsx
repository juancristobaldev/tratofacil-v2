import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button } from './index';

interface ProviderOnlyGateProps {
  /** Si el usuario es provider o tiene perfil de provider. */
  hasProvider: boolean;
  /** Rol activo del usuario. */
  role: string;
  children: React.ReactNode;
}

/**
 * Pantalla de bloqueo para secciones exclusivas de proveedores.
 * Si el usuario no es provider, muestra un CTA para hacerse profesional.
 */
export const ProviderOnlyGate: React.FC<ProviderOnlyGateProps> = ({
  hasProvider,
  role,
  children,
}) => {
  const navigation = useNavigation<any>();

  if (role === 'provider' && hasProvider) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Icon name="Briefcase" size={44} color={TOKENS.colors.brand500} />
      </View>
      <Text style={styles.title}>Sección exclusiva para Profesionales</Text>
      <Text style={styles.subtitle}>
        Esta sección está disponible solo para profesionales de TratoFácil. Activa tu cuenta para acceder.
      </Text>
      <Button
        title={hasProvider ? 'Completa tu Perfil' : 'Hazte Profesional'}
        icon={hasProvider ? 'ShieldCheck' : 'Zap'}
        onPress={() =>
          navigation.navigate(hasProvider ? 'VerificationCenter' : 'BecomeProvider')
        }
        style={styles.cta}
      />
      <Button
        title="Volver"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.back}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: TOKENS.spacing.xl,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.lg,
  },
  title: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: TOKENS.spacing.xl,
  },
  cta: { width: '100%', marginBottom: TOKENS.spacing.sm },
  back: { width: '100%' },
});
