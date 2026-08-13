import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, Input, Modal } from '../../components';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { CHILEAN_BANKS, validateRut } from '../../utils/chile';
import { KYC_STATUS } from '../../graphql/operations/wallet';
import { useQuery } from '@apollo/client/react';

type SectionKey = 'personal' | 'email' | 'identity' | 'bank' | 'kyc';

type SectionState = Record<SectionKey, boolean>;

export const VerificationCenterScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, refetch: refetchAuth } = useAuth();
  const {
    updateProfile,
    updateProviderProfile,
    updateProviderBank,
    sendEmailVerificationCode,
    confirmEmail,
    createKycSession,
    saving,
  } = useProfile();

  const isProvider = !!user?.provider;

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [birthday, setBirthday] = useState(user?.birthday ? String(user.birthday).slice(0, 10).split('-').reverse().join('/') : '');
  const [providerName, setProviderName] = useState(user?.provider?.name || '');
  const [providerRut, setProviderRut] = useState(user?.provider?.rut || '');
  const [bankName, setBankName] = useState(user?.provider?.bank?.bankName || '');
  const [accountType, setAccountType] = useState(user?.provider?.bank?.accountType || '');
  const [accountNumber, setAccountNumber] = useState(user?.provider?.bank?.accountNumber || '');
  const [bankRut, setBankRut] = useState(user?.provider?.bank?.rut || '');
  const [emailCode, setEmailCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const [kycSessionId, setKycSessionId] = useState<string | null>(null);
  const [kycCreating, setKycCreating] = useState(false);

  const { data: kycData, stopPolling } = useQuery<{ kycStatus: boolean }>(KYC_STATUS, {
    variables: { session: kycSessionId },
    skip: !kycSessionId,
    pollInterval: 4000,
    fetchPolicy: 'network-only',
  });

  const kycVerified = user?.kycStatus === true;

  useEffect(() => {
    if (kycData?.kycStatus === true && !kycVerified) {
      stopPolling?.();
      setKycSessionId(null);
      refetchAuth();
    }
  }, [kycData?.kycStatus, kycVerified, stopPolling, refetchAuth]);

  const completed = useMemo(() => {
    const personal = !!user?.displayName?.trim() && !!user?.birthday;
    const email = !!user?.emailVerified;
    const identity = !!(user?.provider?.name?.trim() && user?.provider?.rut?.trim());
    const bank = !!user?.provider?.bank;
    const kyc = !!user?.kycStatus;
    return { personal, email, identity, bank, kyc };
  }, [user]);

  const [openSections, setOpenSections] = useState<SectionState>({
    personal: true,
    email: false,
    identity: false,
    bank: false,
    kyc: false,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isFullyComplete = isProvider
    ? user?.isProfileFullyComplete === true
    : (completed.personal && completed.email);

  const StatusBadge = ({ isCompleted }: { isCompleted: boolean }) => (
    <View style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusPending]}>
      <Icon name={isCompleted ? "CheckCircle" : "Clock"} size={12} color={isCompleted ? TOKENS.colors.success700 : TOKENS.colors.warning700} />
      <Text style={[styles.statusBadgeText, isCompleted ? styles.statusCompletedText : styles.statusPendingText]}>
        {isCompleted ? "COMPLETADO" : "PENDIENTE"}
      </Text>
    </View>
  );

  const [activePicker, setActivePicker] = useState<'bank' | 'account' | null>(null);

  const pickerOptions = activePicker === 'bank'
    ? Object.keys(CHILEAN_BANKS).map(b => ({ value: b, label: b }))
    : activePicker === 'account'
      ? (CHILEAN_BANKS[bankName] || []).map(t => ({ value: t, label: t }))
      : [];

  const pickerTitle = activePicker === 'bank' ? 'Banco' : 'Tipo de Cuenta';

  const validAccountTypes = CHILEAN_BANKS[bankName] || [];

  const handleStartKyc = async () => {
    if (!user?.id) return;
    setKycCreating(true);
    try {
      const url = await createKycSession(user.id);
      if (url) {
        const sessionId = url.includes('session=')
          ? url.split('session=')[1]?.split('&')[0] || url
          : url;
        setKycSessionId(sessionId);
        Linking.openURL(url);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo iniciar verificación.');
    } finally {
      setKycCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      
      <ScrollView contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + TOKENS.spacing.lg }]}>
        
        <Text style={styles.pageSubtitle}>
          {isProvider 
            ? "Completa tu perfil profesional para habilitar pagos y aumentar tu visibilidad."
            : "Fortalece tu seguridad y desbloquea operaciones fluidas completando tu perfil."}
        </Text>

        <View style={[styles.summaryBanner, isFullyComplete ? styles.summaryBannerSuccess : styles.summaryBannerPending]}>
          <Icon name="Shield" size={24} color={isFullyComplete ? TOKENS.colors.success600 : TOKENS.colors.brand600} />
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, isFullyComplete && { color: TOKENS.colors.success800 }]}>
              {isFullyComplete ? "Perfil 100% Completo" : "Acción Requerida"}
            </Text>
            <Text style={[styles.summaryDesc, isFullyComplete && { color: TOKENS.colors.success700 }]}>
              {isFullyComplete
                ? "Has completado todos los requisitos. Ya puedes operar sin restricciones."
                : "Aún tienes pasos pendientes. La plataforma limitará ciertas funciones."}
            </Text>
          </View>
        </View>

        {/* 1. Datos Personales */}
        <View style={styles.accordionCard}>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.7}
            disabled={completed.personal}
            onPress={() => toggleSection('personal')}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.accordionTitleRow}>
                <Text style={styles.accordionTitle}>1. Datos Personales</Text>
                <StatusBadge isCompleted={completed.personal} />
              </View>
              <Text style={styles.accordionDesc}>Tu identidad básica para el uso de la plataforma.</Text>
            </View>
            <Icon name={openSections.personal ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
          </TouchableOpacity>

          {openSections.personal && !completed.personal && (
            <View style={styles.accordionBody}>
              <View style={styles.inputGroup}>
                <Input label="Nombre o Apodo" placeholder="Ej: Juan Pérez" value={displayName} onChangeText={setDisplayName} icon="User" />
              </View>
              <View style={styles.inputGroup}>
                <Input label="Fecha de Nacimiento" placeholder="DD/MM/AAAA" value={birthday} onChangeText={setBirthday} icon="Calendar" mask="date" />
              </View>
              <Button title={saving ? 'Guardando...' : 'Confirmar datos'} disabled={saving || !user?.id} onPress={async () => {
                try {
                  let isoBirthday: string | undefined;
                  if (birthday && birthday.length === 10) {
                    const [dd, mm, yyyy] = birthday.split('/');
                    const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`);
                    isoBirthday = d.toISOString();
                  }
                  await updateProfile({ displayName: displayName || undefined, birthday: isoBirthday });
                  setOpenSections(prev => ({ ...prev, personal: false, email: true }));
                } catch {
                  Alert.alert('Error', 'No se pudo guardar.');
                }
              }} />
            </View>
          )}
        </View>

        {/* 2. Correo Verificado */}
        <View style={styles.accordionCard}>
          <TouchableOpacity 
            style={styles.accordionHeader} 
            activeOpacity={0.7}
            disabled={completed.email || !completed.personal}
            onPress={() => toggleSection('email')}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.accordionTitleRow}>
                <Text style={styles.accordionTitle}>2. Correo Verificado</Text>
                <StatusBadge isCompleted={completed.email} />
              </View>
              <Text style={styles.accordionDesc}>Vital para notificaciones y recuperación de cuenta.</Text>
            </View>
            <Icon name={openSections.email ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
          </TouchableOpacity>

          {openSections.email && !completed.email && (
            <View style={styles.accordionBody}>
              <View style={styles.inputGroup}>
                <Input label="Código de Verificación (Enviado a tu correo)" placeholder="XXXXXX" maxLength={6} keyboardType="numeric" icon="Key" style={{ letterSpacing: 8, textAlign: 'center', fontSize: 20 }} value={emailCode} onChangeText={setEmailCode} />
              </View>
              <Button title={verifying ? 'Verificando...' : 'Confirmar código'} disabled={verifying} onPress={async () => {
                if (!user?.email) return;
                if (!emailCode.trim()) {
                  Alert.alert('Error', 'Ingresa el código recibido por correo.');
                  return;
                }
                setVerifying(true);
                try {
                  await confirmEmail(emailCode.trim(), user.email);
                  setEmailCode('');
                  setOpenSections(prev => ({ ...prev, email: false, identity: isProvider }));
                } catch (err: any) {
                  Alert.alert('Error', err.message || 'Código inválido o expirado.');
                } finally {
                  setVerifying(false);
                }
              }} />
              <Button title={sendingCode ? 'Enviando...' : 'Reenviar código'} variant="secondary" disabled={sendingCode} onPress={async () => {
                if (!user?.email) return;
                setSendingCode(true);
                try {
                  await sendEmailVerificationCode(user.email);
                  Alert.alert('Enviado', 'Te enviamos un nuevo código a tu correo.');
                } catch (err: any) {
                  Alert.alert('Error', err.message || 'No se pudo enviar el código.');
                } finally {
                  setSendingCode(false);
                }
              }} style={{ marginTop: 8 }} />
            </View>
          )}
        </View>

        {/* Provider Only Sections */}
        {isProvider && (
          <>
            {/* 3. Identidad de Proveedor */}
            <View style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                activeOpacity={0.7}
                disabled={completed.identity || !completed.email}
                onPress={() => toggleSection('identity')}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.accordionTitleRow}>
                    <Text style={styles.accordionTitle}>3. Identidad de Proveedor</Text>
                    <StatusBadge isCompleted={completed.identity} />
                  </View>
                  <Text style={styles.accordionDesc}>Razón social o nombre público con el que operas.</Text>
                </View>
                <Icon name={openSections.identity ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
              </TouchableOpacity>

              {openSections.identity && !completed.identity && (
                <View style={styles.accordionBody}>
                  <View style={styles.inputGroup}>
                    <Input label="Nombre de Empresa (opcional)" placeholder="Ej: Transportes SPA" value={providerName} onChangeText={setProviderName} icon="Briefcase" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label="RUT del Proveedor" placeholder="12345678-9" value={providerRut} onChangeText={setProviderRut} icon="FileText" mask="rut" />
                  </View>
                  <Button title={saving ? 'Guardando...' : 'Confirmar identidad'} disabled={saving || !user?.provider?.id} onPress={async () => {
                    if (providerRut && !validateRut(providerRut)) {
                      Alert.alert('Error', 'El RUT ingresado no es válido. Formato esperado: 12345678-9');
                      return;
                    }
                    try {
                      if (user?.provider?.id && providerName) {
                        await updateProviderProfile(user.provider.id, { name: providerName, rut: providerRut || undefined });
                        setOpenSections(prev => ({ ...prev, identity: false, bank: true }));
                      }
                    } catch {
                      Alert.alert('Error', 'No se pudo guardar la identidad.');
                    }
                  }} />
                </View>
              )}
            </View>

            {/* 4. Datos Bancarios */}
            <View style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                activeOpacity={0.7}
                disabled={completed.bank || !completed.identity}
                onPress={() => toggleSection('bank')}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.accordionTitleRow}>
                    <Text style={styles.accordionTitle}>4. Datos Bancarios</Text>
                    <StatusBadge isCompleted={completed.bank} />
                  </View>
                  <Text style={styles.accordionDesc}>Para depositar tus ganancias.</Text>
                </View>
                <Icon name={openSections.bank ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
              </TouchableOpacity>

              {openSections.bank && !completed.bank && (
                <View style={styles.accordionBody}>
                  <View style={styles.inputGroup}>
                    <SelectField
                      label="Banco"
                      value={bankName}
                      placeholder="Selecciona tu banco"
                      onPress={() => setActivePicker('bank')}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <SelectField
                      label="Tipo de Cuenta"
                      value={accountType}
                      placeholder={bankName ? 'Selecciona el tipo' : 'Primero elige banco'}
                      disabled={!bankName}
                      onPress={() => setActivePicker('account')}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label="Número de Cuenta" placeholder="Ej: 123456789" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" icon="Hash" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input label="RUT del Titular" placeholder="12345678-9" value={bankRut} onChangeText={setBankRut} icon="FileText" mask="rut" />
                  </View>
                  <Button title={saving ? 'Guardando...' : 'Guardar cuenta bancaria'} disabled={saving || !user?.provider?.id} onPress={async () => {
                    if (!user?.provider?.id || !bankName || !accountNumber) return;
                    if (!accountType) {
                      Alert.alert('Error', 'Debes seleccionar el tipo de cuenta.');
                      return;
                    }
                    if (validAccountTypes.length > 0 && !validAccountTypes.includes(accountType)) {
                      Alert.alert('Error', 'Tipo de cuenta no coincide con el banco.');
                      return;
                    }
                    if (bankRut && !validateRut(bankRut)) {
                      Alert.alert('Error', 'El RUT bancario ingresado no es válido. Formato esperado: 12345678-9');
                      return;
                    }
                    try {
                      await updateProviderBank(user.provider.id, {
                        bankName,
                        accountType,
                        accountNumber,
                        rut: bankRut || undefined,
                      });
                      setOpenSections(prev => ({ ...prev, bank: false, kyc: true }));
                    } catch {
                      Alert.alert('Error', 'No se pudo guardar la cuenta bancaria.');
                    }
                  }} />
                </View>
              )}
            </View>

            {/* 5. Verificación de Identidad (KYC) */}
            <View style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                activeOpacity={0.7}
                disabled={completed.kyc || !completed.bank}
                onPress={() => toggleSection('kyc')}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.accordionTitleRow}>
                    <Text style={styles.accordionTitle}>5. Verificación de Identidad (Opcional)</Text>
                    <StatusBadge isCompleted={completed.kyc} />
                  </View>
                  <Text style={styles.accordionDesc}>Valida tu identidad con reconocimiento facial y escaneo de cédula.</Text>
                </View>
                <Icon name={openSections.kyc ? "ChevronUp" : "ChevronDown"} size={20} color={TOKENS.colors.textSubtle} />
              </TouchableOpacity>

              {openSections.kyc && !completed.kyc && (
                <View style={styles.accordionBody}>
                  <Text style={styles.kycInstructions}>
                    Necesitamos verificar tu identidad mediante tu cédula de identidad y una selfie.{'\n\n'}
                    Al presionar el botón se abrirá el navegador con el formulario de verificación.
                  </Text>
                  {kycSessionId && (
                    <View style={styles.kycPollingBox}>
                      <Icon name="Loader" size={16} color={TOKENS.colors.brand600} />
                      <Text style={styles.kycPollingText}>Esperando verificación...</Text>
                    </View>
                  )}
                  <Button
                    title={kycCreating ? 'Creando sesión...' : 'Iniciar verificación de identidad'}
                    onPress={handleStartKyc}
                    loading={kycCreating}
                    disabled={kycCreating}
                    icon="Shield"
                  />
                </View>
              )}
            </View>

            {(completed.personal && completed.email && completed.identity && completed.bank) && (
              <View style={{ marginTop: 32, marginBottom: 16 }}>
                <Button 
                  title="Crea tu primer servicio" 
                  onPress={() => navigation.navigate('PublishService')} 
                  icon="Plus" 
                  style={{ width: '100%' }}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* PICKER MODAL */}
      <Modal visible={activePicker !== null} onClose={() => setActivePicker(null)} contentStyle={styles.pickerModal}>
        <Text style={styles.pickerTitle}>{pickerTitle}</Text>
        <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
          {pickerOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.pickerOption}
              onPress={() => {
                if (activePicker === 'bank') {
                  setBankName(opt.value);
                  setAccountType('');
                } else if (activePicker === 'account') {
                  setAccountType(opt.value);
                }
                setActivePicker(null);
              }}
            >
              <Text style={styles.pickerOptionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
};

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onPress: () => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, placeholder, disabled, onPress }) => {
  const isDisabled = !!disabled;
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectField, isDisabled && styles.selectFieldDisabled]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectFieldText, !value && styles.selectFieldPlaceholder]}>
          {value || placeholder || 'Seleccionar'}
        </Text>
        <Icon name="ChevronDown" size={18} color={TOKENS.colors.textSubtle} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.lg },
  pageSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, lineHeight: 22 },
  summaryBanner: { flexDirection: 'row', alignItems: 'flex-start', padding: TOKENS.spacing.md, borderRadius: 16, borderWidth: 1, gap: 12 },
  summaryBannerPending: { backgroundColor: TOKENS.colors.brand50, borderColor: TOKENS.colors.brand200 },
  summaryBannerSuccess: { backgroundColor: TOKENS.colors.success50, borderColor: TOKENS.colors.success200 },
  summaryContent: { flex: 1 },
  summaryTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand800, marginBottom: 4 },
  summaryDesc: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.brand700, lineHeight: 18 },
  
  accordionCard: { backgroundColor: TOKENS.colors.white, borderRadius: 16, borderWidth: 1, borderColor: TOKENS.colors.surface200, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: TOKENS.spacing.lg, backgroundColor: TOKENS.colors.white },
  accordionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  accordionTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  accordionDesc: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusPending: { backgroundColor: TOKENS.colors.warning50, borderColor: TOKENS.colors.warning200 },
  statusCompleted: { backgroundColor: TOKENS.colors.success50, borderColor: TOKENS.colors.success200 },
  statusBadgeText: { fontSize: 10, fontWeight: TOKENS.typography.weights.bold, letterSpacing: 0.5 },
  statusPendingText: { color: TOKENS.colors.warning700 },
  statusCompletedText: { color: TOKENS.colors.success700 },

  accordionBody: { padding: TOKENS.spacing.lg, paddingTop: 0, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface100, marginTop: TOKENS.spacing.sm },
  inputGroup: { marginBottom: TOKENS.spacing.md, gap: 6 },

  fieldLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain, marginBottom: 8 },
  selectField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white, borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1, borderColor: TOKENS.colors.surface200,
    paddingHorizontal: TOKENS.spacing.md, height: 52,
    ...TOKENS.shadows.soft,
  },
  selectFieldDisabled: { backgroundColor: TOKENS.colors.surface50, borderColor: TOKENS.colors.surface100 },
  selectFieldText: { fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain, fontWeight: TOKENS.typography.weights.medium, flex: 1, paddingRight: TOKENS.spacing.sm },
  selectFieldPlaceholder: { color: TOKENS.colors.textMuted },

  kycInstructions: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, lineHeight: 20, marginBottom: TOKENS.spacing.md },
  kycPollingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.brand50, borderRadius: 12, marginBottom: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.brand100 },
  kycPollingText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.brand700, fontWeight: TOKENS.typography.weights.semibold },

  pickerModal: { maxWidth: 340, maxHeight: 480 },
  pickerTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md },
  pickerList: { maxHeight: 360 },
  pickerOption: { paddingVertical: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  pickerOptionText: { fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
});
