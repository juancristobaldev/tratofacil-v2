import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CustomAlert as Alert } from '../ui/CustomAlert';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Icon } from '../ui/Icon';
import { TOKENS } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { CHILEAN_BANKS, validateRut } from '../../utils/chile';

export interface VerificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requiredScope?: 'basic' | 'bank' | 'full';
  title?: string;
  description?: string;
}

const VerificationCenterModalContent: React.FC<VerificationCenterModalProps> = ({
  visible,
  onClose,
  onSuccess,
  requiredScope = 'basic',
  title = 'Verificación Requerida',
  description = 'Completa la información faltante para continuar. No perderás tu avance.',
}) => {
  const { user, refetch: refetchAuth } = useAuth();
  const {
    updateProfile,
    updateMyBank,
    updateProviderBank,
    sendEmailVerificationCode,
    confirmEmail,
    saving,
  } = useProfile();

  // Missing fields evaluation
  const needsDisplayName = !user?.displayName?.trim();
  const needsBirthday = !user?.birthday;
  const needsPersonal = needsDisplayName || needsBirthday;
  const needsEmail = !user?.emailVerified;
  const hasExistingBank = Boolean(user?.bankAccount || user?.provider?.bank);
  const needsBank = (requiredScope === 'bank' || requiredScope === 'full') && !hasExistingBank;

  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [birthday, setBirthday] = useState(
    user?.birthday
      ? String(user.birthday).slice(0, 10).split('-').reverse().join('/')
      : ''
  );

  // Email verification state
  const [emailCode, setEmailCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Bank state
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankRut, setBankRut] = useState('');
  const [activePicker, setActivePicker] = useState<'bank' | 'account' | null>(null);

  const [localSaving, setLocalSaving] = useState(false);

  // Sync state when modal becomes visible or user updates
  useEffect(() => {
    if (visible && user) {
      if (user.displayName) setDisplayName(user.displayName);
      if (user.birthday) {
        setBirthday(String(user.birthday).slice(0, 10).split('-').reverse().join('/'));
      }
    }
  }, [visible, user]);

  const bankOptions = useMemo(() => {
    return Object.keys(CHILEAN_BANKS).map((b) => ({ value: b, label: b }));
  }, []);

  const accountTypeOptions = useMemo(() => {
    return bankName && CHILEAN_BANKS[bankName]
      ? CHILEAN_BANKS[bankName].map((t) => ({ value: t, label: t }))
      : [];
  }, [bankName]);

  // Handler for sending verification email code
  const handleSendCode = async () => {
    if (!user?.email) {
      Alert.alert('Atención', 'No tienes un correo registrado.');
      return;
    }
    setSendingCode(true);
    try {
      await sendEmailVerificationCode(user.email);
      setCodeSent(true);
      Alert.alert('Código Enviado', `Se envió un código de verificación a ${user.email}`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo enviar el código.');
    } finally {
      setSendingCode(false);
    }
  };

  // Handler for verifying code
  const handleVerifyCode = async () => {
    if (!user?.email || !emailCode.trim()) {
      Alert.alert('Atención', 'Ingresa el código de 6 dígitos.');
      return;
    }
    setVerifyingCode(true);
    try {
      await confirmEmail(emailCode.trim(), user.email);
      setEmailCode('');
      await refetchAuth();
      Alert.alert('Éxito', '¡Correo verificado correctamente!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Código inválido o expirado.');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Main submission handler
  const handleSaveAndContinue = async () => {
    setLocalSaving(true);
    try {
      // 1. Personal details check & update
      if (needsPersonal) {
        if (needsDisplayName && !displayName.trim()) {
          Alert.alert('Dato requerido', 'Por favor ingresa tu nombre o apodo.');
          setLocalSaving(false);
          return;
        }
        if (needsBirthday) {
          if (!birthday || birthday.length !== 10) {
            Alert.alert('Dato requerido', 'Ingresa una fecha de nacimiento válida (DD/MM/AAAA).');
            setLocalSaving(false);
            return;
          }
        }

        let isoBirthday: string | undefined;
        if (birthday && birthday.length === 10) {
          const [dd, mm, yyyy] = birthday.split('/');
          const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`);
          if (isNaN(d.getTime())) {
            Alert.alert('Error', 'La fecha de nacimiento no es válida.');
            setLocalSaving(false);
            return;
          }
          isoBirthday = d.toISOString();
        }

        await updateProfile({
          displayName: displayName.trim() || undefined,
          birthday: isoBirthday,
        });
      }

      // 2. Email verification check
      if (needsEmail && !user?.emailVerified) {
        Alert.alert(
          'Correo no verificado',
          'Debes ingresar y confirmar el código enviado a tu correo antes de continuar.'
        );
        setLocalSaving(false);
        return;
      }

      // 3. Bank details update (if required)
      if (needsBank) {
        if (!bankName || !accountType || !accountNumber.trim() || !bankRut.trim()) {
          Alert.alert('Datos bancarios incompletos', 'Completa todos los campos de tu cuenta bancaria para recibir pagos.');
          setLocalSaving(false);
          return;
        }
        if (!validateRut(bankRut)) {
          Alert.alert('RUT inválido', 'Por favor ingresa un RUT válido para la cuenta bancaria.');
          setLocalSaving(false);
          return;
        }

        const bankPayload = {
          bankName,
          accountType,
          accountNumber: accountNumber.trim(),
          rut: bankRut.trim(),
        };

        if (user?.provider?.id) {
          await updateProviderBank(user.provider.id, bankPayload);
        } else {
          await updateMyBank(bankPayload);
        }
      }

      // 4. Refresh auth context and execute success callback
      await refetchAuth();
      onClose();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Ocurrió un error al guardar tus datos.');
    } finally {
      setLocalSaving(false);
    }
  };

  const isProcessing = saving || localSaving || verifyingCode;

  return (
    <Modal visible={visible} onClose={onClose} showCloseButton={!isProcessing}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Icon name="ShieldCheck" size={32} color={TOKENS.colors.brand500} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* SECTION: PERSONAL DATA */}
          {needsPersonal && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="User" size={18} color={TOKENS.colors.brand500} />
                <Text style={styles.sectionTitle}>Datos Personales</Text>
              </View>

              {needsDisplayName && (
                <View style={styles.fieldGroup}>
                  <Input
                    label="Nombre Completo o Apodo *"
                    placeholder="Ej: Juan Pérez"
                    value={displayName}
                    onChangeText={setDisplayName}
                    icon="User"
                  />
                </View>
              )}

              {needsBirthday && (
                <View style={styles.fieldGroup}>
                  <Input
                    label="Fecha de Nacimiento *"
                    placeholder="DD/MM/AAAA"
                    value={birthday}
                    onChangeText={setBirthday}
                    icon="Calendar"
                    mask="date"
                    helperText="Requerido por normativa legal de pagos."
                  />
                </View>
              )}
            </View>
          )}

          {/* SECTION: EMAIL VERIFICATION */}
          {needsEmail && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="Mail" size={18} color={TOKENS.colors.brand500} />
                <Text style={styles.sectionTitle}>Verificación de Correo</Text>
              </View>

              <Text style={styles.emailNotice}>
                Enviaremos un código a <Text style={styles.boldText}>{user?.email || 'tu correo'}</Text>:
              </Text>

              <View style={styles.emailActionsRow}>
                <Button
                  title={sendingCode ? 'Enviando...' : codeSent ? 'Reenviar Código' : 'Enviar Código OTP'}
                  variant="secondary"
                  size="sm"
                  onPress={handleSendCode}
                  disabled={sendingCode || isProcessing}
                  style={styles.codeButton}
                />
              </View>

              {codeSent && (
                <View style={styles.otpInputContainer}>
                  <Input
                    label="Código de 6 dígitos"
                    placeholder="XXXXXX"
                    maxLength={6}
                    keyboardType="numeric"
                    value={emailCode}
                    onChangeText={setEmailCode}
                    icon="Key"
                    style={styles.otpInput}
                  />
                  <Button
                    title={verifyingCode ? 'Validando...' : 'Confirmar'}
                    variant="primary"
                    size="sm"
                    onPress={handleVerifyCode}
                    disabled={verifyingCode || emailCode.length < 6}
                    style={styles.confirmOtpButton}
                  />
                </View>
              )}
            </View>
          )}

          {/* SECTION: BANK DATA */}
          {needsBank && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="CreditCard" size={18} color={TOKENS.colors.brand500} />
                <Text style={styles.sectionTitle}>Cuenta Bancaria para Pagos</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Banco *</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setActivePicker(activePicker === 'bank' ? null : 'bank')}
                >
                  <Text style={[styles.selectText, !bankName && styles.placeholderText]}>
                    {bankName || 'Seleccionar banco...'}
                  </Text>
                  <Icon name="ChevronDown" size={18} color={TOKENS.colors.textSubtle} />
                </TouchableOpacity>
                {activePicker === 'bank' && (
                  <View style={styles.pickerDropdown}>
                    {bankOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={styles.pickerOption}
                        onPress={() => {
                          setBankName(opt.value);
                          setAccountType('');
                          setActivePicker(null);
                        }}
                      >
                        <Text style={styles.pickerOptionText}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {bankName !== '' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Tipo de Cuenta *</Text>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setActivePicker(activePicker === 'account' ? null : 'account')}
                  >
                    <Text style={[styles.selectText, !accountType && styles.placeholderText]}>
                      {accountType || 'Seleccionar tipo de cuenta...'}
                    </Text>
                    <Icon name="ChevronDown" size={18} color={TOKENS.colors.textSubtle} />
                  </TouchableOpacity>
                  {activePicker === 'account' && (
                    <View style={styles.pickerDropdown}>
                      {accountTypeOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={styles.pickerOption}
                          onPress={() => {
                            setAccountType(opt.value);
                            setActivePicker(null);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Input
                  label="Número de Cuenta *"
                  placeholder="Ej: 123456789"
                  keyboardType="numeric"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  icon="CreditCard"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Input
                  label="RUT del Titular *"
                  placeholder="Ej: 12.345.678-9"
                  value={bankRut}
                  onChangeText={setBankRut}
                  icon="UserCheck"
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title={isProcessing ? 'Guardando...' : 'Guardar y Continuar'}
              variant="primary"
              size="lg"
              onPress={handleSaveAndContinue}
              disabled={isProcessing}
              loading={isProcessing}
              fullWidth
            />
            <Button
              title="Cancelar"
              variant="ghost"
              size="md"
              onPress={onClose}
              disabled={isProcessing}
              style={styles.cancelButton}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const VerificationCenterModal: React.FC<VerificationCenterModalProps> = (props) => {
  if (!props.visible) return null;
  return <VerificationCenterModalContent {...props} />;
};

const styles = StyleSheet.create({
  keyboardContainer: {
    maxHeight: 520,
    width: '100%',
  },
  scrollContent: {
    paddingVertical: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.xs,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  title: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: TOKENS.spacing.md,
    paddingHorizontal: TOKENS.spacing.sm,
  },
  sectionCard: {
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 14,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: TOKENS.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: TOKENS.spacing.sm,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  fieldGroup: {
    marginBottom: TOKENS.spacing.sm,
  },
  inputLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: TOKENS.colors.white,
  },
  selectText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
  },
  placeholderText: {
    color: TOKENS.colors.textMuted,
  },
  pickerDropdown: {
    maxHeight: 140,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 8,
    marginTop: 4,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  pickerOptionText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textMain,
  },
  emailNotice: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  emailActionsRow: {
    marginBottom: 8,
  },
  codeButton: {
    alignSelf: 'flex-start',
  },
  otpInputContainer: {
    marginTop: 8,
    gap: 8,
  },
  otpInput: {
    letterSpacing: 6,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmOtpButton: {
    marginTop: 4,
  },
  actionButtons: {
    marginTop: TOKENS.spacing.sm,
    gap: 8,
  },
  cancelButton: {
    marginTop: 4,
  },
});
