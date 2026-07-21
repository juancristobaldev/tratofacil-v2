import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { Icon } from './Icon';
import { TOKENS } from '../../theme';
import { useRole } from '../../context/RoleContext';

interface ModalApplyJobProps {
  visible: boolean;
  onClose: () => void;
  job: any; // Using any for mock job data for now
  onSuccessfulApply: (jobId: string) => void;
}

export const ModalApplyJob: React.FC<ModalApplyJobProps> = ({
  visible,
  onClose,
  job,
  onSuccessfulApply,
}) => {
  const { role, setRole } = useRole();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showGuestCheckout, setShowGuestCheckout] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: '', lastName: '', email: '', phone: '' });

  if (!job) return null;

  const processApplication = () => {
    setLoading(true);
    setErrorMsg('');
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onSuccessfulApply(job.id);
      onClose();
    }, 1500);
  };

  const handleSubmit = () => {
    if (role === 'guest') {
      setShowGuestCheckout(true);
      return;
    }
    processApplication();
  };

  return (
    <Modal visible={visible} onClose={onClose} showCloseButton={true}>
      {showGuestCheckout ? (
        <View>
          <Text style={styles.modalTitle}>Datos de Postulante</Text>
          <Text style={styles.warningDesc}>Completa tus datos para crear tu perfil profesional y postular.</Text>
          
          <TextInput
            placeholder="Nombre"
            placeholderTextColor={TOKENS.colors.textMuted}
            value={guestForm.name}
            onChangeText={(text) => setGuestForm({ ...guestForm, name: text })}
            style={styles.guestInput}
          />
          <TextInput
            placeholder="Apellido"
            placeholderTextColor={TOKENS.colors.textMuted}
            value={guestForm.lastName}
            onChangeText={(text) => setGuestForm({ ...guestForm, lastName: text })}
            style={styles.guestInput}
          />
          <TextInput
            placeholder="Correo Electrónico"
            placeholderTextColor={TOKENS.colors.textMuted}
            value={guestForm.email}
            onChangeText={(text) => setGuestForm({ ...guestForm, email: text })}
            keyboardType="email-address"
            style={styles.guestInput}
          />
          <TextInput
            placeholder="Teléfono"
            placeholderTextColor={TOKENS.colors.textMuted}
            value={guestForm.phone}
            onChangeText={(text) => setGuestForm({ ...guestForm, phone: text })}
            keyboardType="phone-pad"
            style={styles.guestInput}
          />

          <View style={[styles.footerActions, { marginTop: 24 }]}>
            <Button 
              title="Cancelar" 
              variant="secondary" 
              onPress={() => setShowGuestCheckout(false)} 
              disabled={loading} 
              style={{ flex: 1 }} 
            />
            <Button 
              title={loading ? "Procesando..." : "Confirmar"} 
              onPress={() => {
                setRole('provider');
                setShowGuestCheckout(false);
                processApplication();
              }} 
              disabled={loading} 
              style={{ flex: 1 }} 
            />
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.modalTitle}>Confirmar Postulación</Text>
          
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Icon name="Info" size={16} color={TOKENS.colors.error600} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.jobPreviewBox}>
            <Text style={styles.previewLabel}>Vas a postular a</Text>
            <Text style={styles.previewTitle} numberOfLines={2}>{job.title}</Text>
            <Text style={styles.previewUser}>
              Publicado por <Text style={{ fontWeight: 'bold' }}>{job.user?.displayName || 'Cliente'}</Text>
            </Text>
          </View>

          <View style={styles.warningsContainer}>
            <View style={styles.warningItem}>
              <View style={[styles.iconBox, { backgroundColor: TOKENS.colors.brand50 }]}>
                <Icon name="MessageCircle" size={18} color={TOKENS.colors.brand600} />
              </View>
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Contacto Directo</Text>
                <Text style={styles.warningDesc}>Al postular, el cliente recibirá una notificación e iniciarán un chat.</Text>
              </View>
            </View>

            <View style={styles.warningItem}>
              <View style={[styles.iconBox, { backgroundColor: TOKENS.colors.success50 }]}>
                <Icon name="DollarSign" size={18} color={TOKENS.colors.success600} />
              </View>
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Acuerdo de Pago</Text>
                <Text style={styles.warningDesc}>Asegúrate de acordar los términos finales en el chat si el precio es a convenir.</Text>
              </View>
            </View>
          </View>

          <View style={styles.footerActions}>
            <Button 
              title="Cancelar" 
              variant="secondary" 
              onPress={onClose} 
              disabled={loading} 
              style={{ flex: 1 }} 
            />
            <Button 
              title={loading ? "Procesando..." : "Confirmar"} 
              onPress={handleSubmit} 
              disabled={loading} 
              style={{ flex: 1 }} 
            />
          </View>
        </>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.error50,
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.error200,
    marginBottom: TOKENS.spacing.md,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.error700,
  },
  jobPreviewBox: {
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    borderRadius: 16,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.lg,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TOKENS.colors.brand600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  previewUser: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  warningsContainer: {
    gap: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.lg,
  },
  warningItem: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface100,
    borderRadius: 12,
    padding: TOKENS.spacing.md,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 2,
  },
  warningDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 16,
  },
  footerActions: {
    flexDirection: 'row',
    gap: TOKENS.spacing.sm,
  },
  guestInput: {
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface50,
    padding: 12,
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    marginTop: 12,
  },
});
