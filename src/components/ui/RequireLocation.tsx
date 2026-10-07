import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { CustomAlert as Alert } from './CustomAlert';
import { TOKENS } from '../../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { LoadingScreen } from './LoadingScreen';
import { useLocation } from '../../context/LocationContext';

interface RequireLocationProps {
  children: React.ReactNode;
}

/**
 * Bloquea localmente sus `children` (no la app entera) mientras no haya permiso/ubicación.
 * Mismo look que el bloqueo global anterior en LocationContext, solo que ahora vive junto
 * a las pantallas que de verdad necesitan `useLocation()`.
 */
export const RequireLocation: React.FC<RequireLocationProps> = ({ children }) => {
  const { permissionStatus, location } = useLocation();

  if (permissionStatus === 'pending') {
    return <LoadingScreen message="Obteniendo ubicación..." />;
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.blockerContainer}>
        <View style={styles.iconCircle}>
          <Icon name="MapPinOff" size={48} color={TOKENS.colors.white} />
        </View>
        <Text style={styles.blockerTitle}>Ubicación Requerida</Text>
        <Text style={styles.blockerSubtitle}>
          TratoFácil necesita acceso a tu ubicación de forma obligatoria para conectar clientes con profesionales cercanos y poder mostrarte en el mapa.
        </Text>
        <Button
          title="Abrir Configuración"
          onPress={() => {
            Linking.openSettings().catch(() => {
              Alert.alert(
                'Atención',
                'No se pudo abrir la configuración del sistema automáticamente. Por favor ve a Ajustes > Aplicaciones > TratoFacil para dar permisos manualmente.'
              );
            });
          }}
          style={styles.blockerBtn}
        />
      </View>
    );
  }

  if (!location) {
    return <LoadingScreen message="Obteniendo ubicación..." />;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  blockerContainer: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TOKENS.spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.xl,
    shadowColor: TOKENS.colors.brand500,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  blockerTitle: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.sm,
    textAlign: 'center',
  },
  blockerSubtitle: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: TOKENS.spacing.xxl,
  },
  blockerBtn: {
    width: '100%',
  },
});
