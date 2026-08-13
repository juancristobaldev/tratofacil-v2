import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button } from './index';

interface RequireAuthProps {
  /** Rol activo del usuario ('guest' | 'client' | 'provider'). */
  role: string;
  children: React.ReactNode;
}

/**
 * Bloqueo para secciones que solo requieren sesión iniciada (cualquier rol),
 * a diferencia de `ProviderOnlyGate` que exige específicamente rol proveedor.
 * `role === 'guest'` significa "nadie logueado" (ver AuthContext).
 */
export const RequireAuth: React.FC<RequireAuthProps> = ({ role, children }) => {
  const navigation = useNavigation<any>();

  if (role !== 'guest') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Icon name="Sparkles" size={44} color={TOKENS.colors.brand500} />
      </View>
      <Text style={styles.title}>Inicia sesión para promocionar tu negocio</Text>
      <Text style={styles.subtitle}>
        Crea una cuenta o inicia sesión para publicar tu anuncio en TratoFácil.
      </Text>
      <Button
        title="Iniciar Sesión"
        icon="LogIn"
        onPress={() => navigation.navigate('Login')}
        style={styles.cta}
      />
      <Button
        title="Registrarme"
        variant="outline"
        onPress={() => navigation.navigate('Register')}
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
