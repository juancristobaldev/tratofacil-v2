import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button, Input, Modal, StatusBanner, SelectPickerTrigger } from '../../components';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { CHILEAN_BANKS, validateRut } from '../../utils/chile';
import { KYC_STATUS } from '../../graphql/operations/wallet';
import { useQuery } from '@apollo/client/react';
import { getKeyboardVerticalOffset } from '../../utils/layoutMetrics';

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
      <Text style={[styles.statusBadgeText, isCompleted ? styles.statusCompletedText : styles.statusPendingText]}>
        {isCompleted ? 'Completado' : 'Pendiente'}
      </Text>
    </View>
  );

  const [activePicker, setActivePicker] = useState<'bank' | 'account' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToFocusedField = () => scrollRef.current?.scrollToEnd({ animated: true });

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

  // Dynamic completion percentage calculation
  const totalSteps = isProvider ? 5 : 2;
  const completedCount = isProvider
    ? (completed.personal ? 1 : 0) +
      (completed.email ? 1 : 0) +
      (completed.identity ? 1 : 0) +
      (completed.bank ? 1 : 0) +
      (completed.kyc ? 1 : 0)
    : (completed.personal ? 1 : 0) + (completed.email ? 1 : 0);
  const completionPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={getKeyboardVerticalOffset(false, insets.top)}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Top Progress Banner matching ui-kit.html */}
        <StatusBanner
          title={
            isFullyComplete
              ? 'Perfil 100% Verificado'
              : `Perfil verificado al ${completionPercent}%`
          }
          description={
            isFullyComplete
              ? 'Has completado todos los requisitos. Ya puedes operar sin restricciones.'
              : isProvider
              ? 'Completa los siguientes pasos para activar tu cuenta profesional.'
              : 'Completa tu información para operar de forma segura.'
          }
          variant={isFullyComplete ? 'success' : 'brand'}
          icon="Shield"
        />

        {/* 1. Datos Personales */}
        <View
          style={[
            styles.stepCard,
            !completed.personal && openSections.personal && styles.stepCardActive,
          ]}
        >
          <TouchableOpacity
            style={styles.stepHeader}
            activeOpacity={0.7}
            disabled={completed.personal}
            onPress={() => toggleSection('personal')}
          >
            <View
              style={[
                styles.stepBadge,
                completed.personal
                  ? styles.stepBadgeSuccess
                  : styles.stepBadgeBrand,
              ]}
            >
              {completed.personal ? (
                <Icon name="Check" size={14} color={TOKENS.colors.success600} />
              ) : (
                <Text style={styles.stepBadgeTextBrand}>1</Text>
              )}
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Datos personales</Text>
              <Text style={styles.stepSubtitle}>
                {user?.displayName || 'Nombre, fecha de nacimiento'}
              </Text>
            </View>
            <StatusBadge isCompleted={completed.personal} />
          </TouchableOpacity>

          {openSections.personal && !completed.personal && (
            <View style={styles.accordionBody}>
              <View style={styles.inputGroup}>
                <Input
                  label="Nombre o Apodo"
                  placeholder="Ej: Juan Pérez"
                  value={displayName}
                  onChangeText={setDisplayName}
                  icon="User"
                />
              </View>
              <View style={styles.inputGroup}>
                <Input
                  label="Fecha de Nacimiento"
                  placeholder="DD/MM/AAAA"
                  value={birthday}
                  onChangeText={setBirthday}
                  icon="Calendar"
                  mask="date"
                />
              </View>
              <Button
                title={saving ? 'Guardando...' : 'Confirmar datos'}
                disabled={saving || !user?.id}
                onPress={async () => {
                  try {
                    let isoBirthday: string | undefined;
                    if (birthday && birthday.length === 10) {
                      const [dd, mm, yyyy] = birthday.split('/');
                      const d = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`);
                      isoBirthday = d.toISOString();
                    }
                    await updateProfile({
                      displayName: displayName || undefined,
                      birthday: isoBirthday,
                    });
                    setOpenSections((prev) => ({
                      ...prev,
                      personal: false,
                      email: true,
                    }));
                  } catch {
                    Alert.alert('Error', 'No se pudo guardar.');
                  }
                }}
              />
            </View>
          )}
        </View>

        {/* 2. Correo Verificado */}
        <View
          style={[
            styles.stepCard,
            !completed.email && openSections.email && styles.stepCardActive,
          ]}
        >
          <TouchableOpacity
            style={styles.stepHeader}
            activeOpacity={0.7}
            disabled={completed.email || !completed.personal}
            onPress={() => toggleSection('email')}
          >
            <View
              style={[
                styles.stepBadge,
                completed.email
                  ? styles.stepBadgeSuccess
                  : styles.stepBadgeBrand,
              ]}
            >
              {completed.email ? (
                <Icon name="Check" size={14} color={TOKENS.colors.success600} />
              ) : (
                <Text style={styles.stepBadgeTextBrand}>2</Text>
              )}
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Correo verificado</Text>
              <Text style={styles.stepSubtitle}>
                {user?.email || 'Verificación por código'}
              </Text>
            </View>
            <StatusBadge isCompleted={completed.email} />
          </TouchableOpacity>

          {openSections.email && !completed.email && (
            <View style={styles.accordionBody}>
              <View style={styles.inputGroup}>
                <Input
                  label="Código de Verificación (Enviado a tu correo)"
                  placeholder="XXXXXX"
                  maxLength={6}
                  keyboardType="numeric"
                  icon="Key"
                  style={{ letterSpacing: 8, textAlign: 'center', fontSize: 20 }}
                  value={emailCode}
                  onChangeText={setEmailCode}
                />
              </View>
              <Button
                title={verifying ? 'Verificando...' : 'Confirmar código'}
                disabled={verifying}
                onPress={async () => {
                  if (!user?.email) return;
                  if (!emailCode.trim()) {
                    Alert.alert('Error', 'Ingresa el código recibido por correo.');
                    return;
                  }
                  setVerifying(true);
                  try {
                    await confirmEmail(emailCode.trim(), user.email);
                    setEmailCode('');
                    setOpenSections((prev) => ({
                      ...prev,
                      email: false,
                      identity: isProvider,
                    }));
                  } catch (err: any) {
                    Alert.alert('Error', err.message || 'Código inválido o expirado.');
                  } finally {
                    setVerifying(false);
                  }
                }}
              />
              <Button
                title={sendingCode ? 'Enviando...' : 'Reenviar código'}
                variant="secondary"
                disabled={sendingCode}
                onPress={async () => {
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
                }}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </View>

        {/* Provider Only Sections */}
        {isProvider && (
          <>
            {/* 3. Identidad de Proveedor */}
            <View
              style={[
                styles.stepCard,
                !completed.identity &&
                  openSections.identity &&
                  styles.stepCardActive,
              ]}
            >
              <TouchableOpacity
                style={styles.stepHeader}
                activeOpacity={0.7}
                disabled={completed.identity || !completed.email}
                onPress={() => toggleSection('identity')}
              >
                <View
                  style={[
                    styles.stepBadge,
                    completed.identity
                      ? styles.stepBadgeSuccess
                      : styles.stepBadgeBrand,
                  ]}
                >
                  {completed.identity ? (
                    <Icon name="Check" size={14} color={TOKENS.colors.success600} />
                  ) : (
                    <Text style={styles.stepBadgeTextBrand}>3</Text>
                  )}
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Identidad de proveedor</Text>
                  <Text style={styles.stepSubtitle}>
                    {user?.provider?.name || 'RUT y nombre comercial'}
                  </Text>
                </View>
                <StatusBadge isCompleted={completed.identity} />
              </TouchableOpacity>

              {openSections.identity && !completed.identity && (
                <View style={styles.accordionBody}>
                  <View style={styles.inputGroup}>
                    <Input
                      label="Nombre de Empresa o Fantasía (opcional)"
                      placeholder="Ej: Transportes SPA"
                      value={providerName}
                      onChangeText={setProviderName}
                      icon="Briefcase"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input
                      label="RUT del Proveedor"
                      placeholder="12345678-9"
                      value={providerRut}
                      onChangeText={setProviderRut}
                      icon="FileText"
                      mask="rut"
                    />
                  </View>
                  <Button
                    title={saving ? 'Guardando...' : 'Confirmar identidad'}
                    disabled={saving || !user?.provider?.id}
                    onPress={async () => {
                      if (providerRut && !validateRut(providerRut)) {
                        Alert.alert(
                          'Error',
                          'El RUT ingresado no es válido. Formato esperado: 12345678-9',
                        );
                        return;
                      }
                      try {
                        if (user?.provider?.id && providerName) {
                          await updateProviderProfile(user.provider.id, {
                            name: providerName,
                            rut: providerRut || undefined,
                          });
                          setOpenSections((prev) => ({
                            ...prev,
                            identity: false,
                            bank: true,
                          }));
                        }
                      } catch {
                        Alert.alert('Error', 'No se pudo guardar la identidad.');
                      }
                    }}
                  />
                </View>
              )}
            </View>

            {/* 4. Datos Bancarios */}
            <View
              style={[
                styles.stepCard,
                !completed.bank && openSections.bank && styles.stepCardActive,
              ]}
            >
              <TouchableOpacity
                style={styles.stepHeader}
                activeOpacity={0.7}
                disabled={completed.bank || !completed.identity}
                onPress={() => toggleSection('bank')}
              >
                <View
                  style={[
                    styles.stepBadge,
                    completed.bank
                      ? styles.stepBadgeSuccess
                      : styles.stepBadgeBrand,
                  ]}
                >
                  {completed.bank ? (
                    <Icon name="Check" size={14} color={TOKENS.colors.success600} />
                  ) : (
                    <Text style={styles.stepBadgeTextBrand}>4</Text>
                  )}
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Cuenta bancaria</Text>
                  <Text style={styles.stepSubtitle}>
                    {user?.provider?.bank?.bankName
                      ? `${user.provider.bank.bankName} - ${user.provider.bank.accountType}`
                      : 'Para recibir tus pagos'}
                  </Text>
                </View>
                <StatusBadge isCompleted={completed.bank} />
              </TouchableOpacity>

              {openSections.bank && !completed.bank && (
                <View style={styles.accordionBody}>
                  <View style={styles.inputGroup}>
                    <SelectPickerTrigger
                      label="Banco"
                      value={bankName}
                      placeholder="Selecciona tu banco"
                      onPress={() => setActivePicker('bank')}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <SelectPickerTrigger
                      label="Tipo de Cuenta"
                      value={accountType}
                      placeholder={
                        bankName ? 'Selecciona el tipo' : 'Primero elige banco'
                      }
                      onPress={() => {
                        if (bankName) setActivePicker('account');
                      }}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input
                      label="Número de Cuenta"
                      placeholder="Ej: 123456789"
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      onFocus={scrollToFocusedField}
                      keyboardType="numeric"
                      icon="Hash"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Input
                      label="RUT del Titular"
                      placeholder="12345678-9"
                      value={bankRut}
                      onChangeText={setBankRut}
                      onFocus={scrollToFocusedField}
                      icon="FileText"
                      mask="rut"
                    />
                  </View>
                  <Button
                    title={saving ? 'Guardando...' : 'Guardar cuenta bancaria'}
                    disabled={saving || !user?.provider?.id}
                    onPress={async () => {
                      if (!user?.provider?.id || !bankName || !accountNumber)
                        return;
                      if (!accountType) {
                        Alert.alert('Error', 'Debes seleccionar el tipo de cuenta.');
                        return;
                      }
                      if (
                        validAccountTypes.length > 0 &&
                        !validAccountTypes.includes(accountType)
                      ) {
                        Alert.alert(
                          'Error',
                          'Tipo de cuenta no coincide con el banco.',
                        );
                        return;
                      }
                      if (bankRut && !validateRut(bankRut)) {
                        Alert.alert(
                          'Error',
                          'El RUT bancario ingresado no es válido. Formato esperado: 12345678-9',
                        );
                        return;
                      }
                      try {
                        await updateProviderBank(user.provider.id, {
                          bankName,
                          accountType,
                          accountNumber,
                          rut: bankRut || undefined,
                        });
                        setOpenSections((prev) => ({
                          ...prev,
                          bank: false,
                          kyc: true,
                        }));
                      } catch {
                        Alert.alert(
                          'Error',
                          'No se pudo guardar la cuenta bancaria.',
                        );
                      }
                    }}
                  />
                </View>
              )}
            </View>

            {/* 5. Verificación KYC */}
            <View
              style={[
                styles.stepCard,
                !completed.kyc && openSections.kyc && styles.stepCardActive,
              ]}
            >
              <TouchableOpacity
                style={styles.stepHeader}
                activeOpacity={0.7}
                disabled={completed.kyc || !completed.bank}
                onPress={() => toggleSection('kyc')}
              >
                <View
                  style={[
                    styles.stepBadge,
                    completed.kyc
                      ? styles.stepBadgeSuccess
                      : styles.stepBadgeBrand,
                  ]}
                >
                  {completed.kyc ? (
                    <Icon name="Check" size={14} color={TOKENS.colors.success600} />
                  ) : (
                    <Text style={styles.stepBadgeTextBrand}>5</Text>
                  )}
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Verificación KYC</Text>
                  <Text style={styles.stepSubtitle}>
                    Reconocimiento facial y cédula
                  </Text>
                </View>
                <StatusBadge isCompleted={completed.kyc} />
              </TouchableOpacity>

              {openSections.kyc && !completed.kyc && (
                <View style={styles.accordionBody}>
                  <Text style={styles.kycInstructions}>
                    Necesitamos verificar tu identidad mediante tu cédula de
                    identidad y una selfie.{'\n\n'}
                    Al presionar el botón se abrirá el navegador con el formulario
                    de verificación segura.
                  </Text>
                  {kycSessionId && (
                    <View style={styles.kycPollingBox}>
                      <Icon
                        name="Loader"
                        size={16}
                        color={TOKENS.colors.brand600}
                      />
                      <Text style={styles.kycPollingText}>
                        Esperando verificación...
                      </Text>
                    </View>
                  )}
                  <Button
                    title={
                      kycCreating
                        ? 'Creando sesión...'
                        : 'Iniciar verificación de identidad'
                    }
                    onPress={handleStartKyc}
                    loading={kycCreating}
                    disabled={kycCreating}
                    icon="Shield"
                  />
                </View>
              )}
            </View>

            {completed.personal &&
              completed.email &&
              completed.identity &&
              completed.bank && (
                <View style={{ marginTop: 24, marginBottom: 8 }}>
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
      </KeyboardAvoidingView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  keyboardView: { flex: 1 },
  scrollBody: { padding: TOKENS.spacing.md, gap: TOKENS.spacing.md },

  progressBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  progressBannerBrand: {
    backgroundColor: TOKENS.colors.brand50,
    borderColor: TOKENS.colors.brand100,
  },
  progressBannerSuccess: {
    backgroundColor: TOKENS.colors.success50,
    borderColor: TOKENS.colors.success200,
  },
  progressContent: { flex: 1 },
  progressTitle: {
    fontSize: 13.5,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand700,
  },
  progressDesc: {
    fontSize: 12,
    color: TOKENS.colors.brand600,
    marginTop: 2,
    lineHeight: 18,
  },

  stepCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
  },
  stepCardActive: {
    borderColor: TOKENS.colors.brand200,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeSuccess: {
    backgroundColor: TOKENS.colors.success50,
  },
  stepBadgeBrand: {
    backgroundColor: TOKENS.colors.brand500,
  },
  stepBadgeTextBrand: {
    color: TOKENS.colors.white,
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
  },
  stepInfo: { flex: 1 },
  stepTitle: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  stepSubtitle: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPending: { backgroundColor: TOKENS.colors.surface100 },
  statusCompleted: { backgroundColor: TOKENS.colors.success50 },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.bold,
    letterSpacing: 0.5,
  },
  statusPendingText: { color: TOKENS.colors.textSubtle },
  statusCompletedText: { color: TOKENS.colors.success700 },

  accordionBody: {
    padding: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface100,
  },
  inputGroup: { marginBottom: TOKENS.spacing.md, gap: 6 },

  fieldLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
    marginBottom: 8,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    paddingHorizontal: TOKENS.spacing.md,
    height: 52,
    ...TOKENS.shadows.soft,
  },
  selectFieldDisabled: {
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface100,
  },
  selectFieldText: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textMain,
    fontWeight: TOKENS.typography.weights.medium,
    flex: 1,
    paddingRight: TOKENS.spacing.sm,
  },
  selectFieldPlaceholder: { color: TOKENS.colors.textMuted },

  kycInstructions: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    lineHeight: 20,
    marginBottom: TOKENS.spacing.md,
  },
  kycPollingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.brand50,
    borderRadius: 12,
    marginBottom: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  kycPollingText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.brand700,
    fontWeight: TOKENS.typography.weights.semibold,
  },

  pickerModal: { maxWidth: 340, maxHeight: 480 },
  pickerTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: TOKENS.spacing.md,
  },
  pickerList: { maxHeight: 360 },
  pickerOption: {
    paddingVertical: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  pickerOptionText: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textMain,
  },
});
