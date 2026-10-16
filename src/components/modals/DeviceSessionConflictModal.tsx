import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { TOKENS } from '../../theme';

export interface DeviceSessionConflictModalProps {
  visible: boolean;
  orderRealtimeId?: number;
  currentActiveDeviceId?: string;
  onContinueHere: () => void;
  onLogoutThisDevice: () => void;
  onClose?: () => void;
}

export const DeviceSessionConflictModal: React.FC<DeviceSessionConflictModalProps> = ({
  visible,
  orderRealtimeId,
  currentActiveDeviceId,
  onContinueHere,
  onLogoutThisDevice,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      onClose={onClose ?? (() => {})}
      showCloseButton={Boolean(onClose)}
    >
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Icon name="Smartphone" size={32} color={TOKENS.colors.warning600} />
        </View>

        <Text style={styles.title}>Sesión activa en otro dispositivo</Text>

        <Text style={styles.description}>
          Esta orden en tiempo real ya está siendo gestionada activamente desde otro
          dispositivo. Para garantizar la precisión del GPS y la seguridad del servicio,
          ¿en qué dispositivo deseas continuar?
        </Text>

        {orderRealtimeId && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>Orden activa #{orderRealtimeId}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            title="Continuar aquí"
            variant="primary"
            size="md"
            iconLeft="ArrowRight"
            onPress={onContinueHere}
            style={styles.primaryButton}
          />

          <Button
            title="Cerrar esta sesión"
            variant="outline"
            size="md"
            iconLeft="LogOut"
            onPress={onLogoutThisDevice}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TOKENS.colors.warning50,
    borderWidth: 1,
    borderColor: TOKENS.colors.warning200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TOKENS.colors.dark900,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  badgeContainer: {
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.textSubtle,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
    borderColor: TOKENS.colors.border,
  },
});
