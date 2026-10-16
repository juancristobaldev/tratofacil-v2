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
import { CREATE_CERTIFICATE } from '../../graphql/operations/providers';
import { uploadImage } from '../../utils/uploadImage';
import { launchImageLibrary } from 'react-native-image-picker';
import { useQuery, useMutation } from '@apollo/client/react';
import { getKeyboardVerticalOffset } from '../../utils/layoutMetrics';

type SectionKey = 'personal' | 'antecedentes' | 'email' | 'identity' | 'bank' | 'clientBank' | 'kyc';

type SectionState = Record<SectionKey, boolean>;

export const VerificationCenterScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, refetch: refetchAuth } = useAuth();
  const {
    updateProfile,
    updateProviderProfile,
    updateProviderBank,
    updateMyBank,
    sendEmailVerificationCode,
    confirmEmail,
    createKycSession,
    saving,
  } = useProfile();

  const isProvider = !!user?.provider;

  const [createCertificateMut, { loading: uploadingCert }] = useMutation(CREATE_CERTIFICATE);
  const [certLocalLoading, setCertLocalLoading] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [birthday, setBirthday] = useState(user?.birthday ? String(user.birthday).slice(0, 10).split('-').reverse().join('/') : '');
  const [providerName, setProviderName] = useState(user?.provider?.name || '');
  const [providerRut, setProviderRut] = useState(user?.provider?.rut || '');
  const [bankName, setBankName] = useState(user?.provider?.bank?.bankName || '');
  const [accountType, setAccountType] = useState(user?.provider?.bank?.accountType || '');
  const [accountNumber, setAccountNumber] = useState(user?.provider?.bank?.accountNumber || '');
  const [bankRut, setBankRut] = useState(user?.provider?.bank?.rut || '');
  const [clientBankName, setClientBankName] = useState(user?.bankAccount?.bankName || '');
  const [clientAccountType, setClientAccountType] = useState(user?.bankAccount?.accountType || '');
  const [clientAccountNumber, setClientAccountNumber] = useState(user?.bankAccount?.accountNumber || '');
  const [clientBankRut, setClientBankRut] = useState(user?.bankAccount?.rut || '');
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

  const antecedentesCert = useMemo(() => {
    const certs = user?.provider?.certificates || [];
    return certs.find(
      (c: any) => c && typeof c.title === 'string' && /antecedente/i.test(c.title)
    );
  }, [user?.provider?.certificates]);

  const antecedentesUploaded = Boolean(antecedentesCert);
  const antecedentesApproved = Boolean(antecedentesCert?.verified);

  const completed = useMemo(() => {
    const personal = Boolean(user?.displayName?.trim() && user?.birthday);
    const antecedentes = isProvider ? antecedentesApproved : true;
    const email = Boolean(user?.emailVerified);
    const identity = Boolean(user?.provider?.name?.trim() && user?.provider?.rut?.trim());
    const bank = Boolean(user?.provider?.bank);
    const clientBank = Boolean(
      user?.bankAccount?.bankName &&
      user?.bankAccount?.accountType &&
      user?.bankAccount?.accountNumber &&
      user?.bankAccount?.rut
    );
    const kyc = Boolean(user?.kycStatus);
    return { personal, antecedentes, email, identity, bank, clientBank, kyc };
  }, [user, isProvider, antecedentesApproved]);

  const [openSections, setOpenSections] = useState<SectionState>({
    personal: true,
    antecedentes: false,
    email: false,
    identity: false,
    bank: false,
    clientBank: false,
    kyc: false,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isFullyComplete = isProvider
    ? user?.isProfileFullyComplete === true
    : (completed.personal && completed.email);

  const handleUploadAntecedentes = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });
      if (result.didCancel || !result.assets || !result.assets[0]) {
        return;
      }
      setCertLocalLoading(true);
      const asset = result.assets[0];
      const key = await uploadImage(asset, 'CERTIFICATE');
      await createCertificateMut({
        variables: {
          input: {
            title: 'Certificado de Antecedentes',
            institution: 'Registro Civil de Chile',
            year: new Date().getFullYear(),
            fileUrl: key,
          },
        },
      });
      await refetchAuth();
      Alert.alert(
        'Certificado Enviado',
        'Tu Certificado de Antecedentes fue recibido y está en revisión por nuestro equipo de administración. Mientras tanto, puedes continuar completando los demás pasos.'
      );
      setOpenSections(prev => ({
        ...prev,
        antecedentes: false,
        email: true,
      }));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo subir el certificado.');
    } finally {
      setCertLocalLoading(false);
    }
  };

  const StatusBadge = ({ isCompleted }: { isCompleted: boolean }) => (
    <View style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusPending]}>
      <Text style={[styles.statusBadgeText, isCompleted ? styles.statusCompletedText : styles.statusPendingText]}>
        {isCompleted ? 'Completado' : 'Pendiente'}
      </Text>
    </View>
  );

  const [activePicker, setActivePicker] = useState<'bank' | 'account' | 'clientBank' | 'clientAccount' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToFocusedField = () => scrollRef.current?.scrollToEnd({ animated: true });

  const pickerOptions = (activePicker === 'bank' || activePicker === 'clientBank')
    ? Object.keys(CHILEAN_BANKS).map(b => ({ value: b, label: b }))
    : activePicker === 'account'
      ? (CHILEAN_BANKS[bankName] || []).map(t => ({ value: t, label: t }))
      : activePicker === 'clientAccount'
        ? (CHILEAN_BANKS[clientBankName] || []).map(t => ({ value: t, label: t }))
        : [];

  const pickerTitle = (activePicker === 'bank' || activePicker === 'clientBank') ? 'Banco' : 'Tipo de Cuenta';

  const validAccountTypes = CHILEAN_BANKS[bankName] || [];
  const validClientAccountTypes = CHILEAN_BANKS[clientBankName] || [];

  const handleSaveClientBank = async () => {
    if (!clientBankName || !clientAccountNumber.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa tu banco y número de cuenta.');
      return;
    }
    if (!clientAccountType) {
      Alert.alert('Error', 'Debes seleccionar el tipo de cuenta.');
      return;
    }
    if (validClientAccountTypes.length > 0 && !validClientAccountTypes.includes(clientAccountType)) {
      Alert.alert('Error', 'Tipo de cuenta no coincide con el banco seleccionado.');
      return;
    }
    if (clientBankRut && !validateRut(clientBankRut)) {
      Alert.alert('Error', 'El RUT bancario ingresado no es válido. Formato esperado: 12345678-9');
      return;
    }
    try {
      await updateMyBank({
        bankName: clientBankName,
        accountType: clientAccountType,
        accountNumber: clientAccountNumber.trim(),
        rut: clientBankRut.trim() || undefined,
      });
      await refetchAuth();
      Alert.alert('Éxito', 'Cuenta bancaria guardada correctamente.');
      setOpenSections(prev => ({ ...prev, clientBank: false }));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar la cuenta bancaria.');
    }
  };

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
  const totalSteps = isProvider ? 6 : 2;
  const completedCount = isProvider
    ? (completed.personal ? 1 : 0) +
      (completed.antecedentes ? 1 : 0) +
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
                      antecedentes: isProvider,
                      email: !isProvider,
                    }));
                  } catch {
                    Alert.alert('Error', 'No se pudo guardar.');
                  }
                }}
              />
            </View>
          )}
        </View>

        {/* 2. Certificado de Antecedentes (Solo Proveedores - Obligatorio después del Paso 1) */}
        {isProvider && (
          <View
            style={[
              styles.stepCard,
              !completed.antecedentes &&
                openSections.antecedentes &&
                styles.stepCardActive,
            ]}
          >
            <TouchableOpacity
              style={styles.stepHeader}
              activeOpacity={0.7}
              disabled={completed.antecedentes}
              onPress={() => toggleSection('antecedentes')}
            >
              <View
                style={[
                  styles.stepBadge,
                  completed.antecedentes
                    ? styles.stepBadgeSuccess
                    : styles.stepBadgeBrand,
                ]}
              >
                {completed.antecedentes ? (
                  <Icon name="Check" size={14} color={TOKENS.colors.success600} />
                ) : (
                  <Text style={styles.stepBadgeTextBrand}>2</Text>
                )}
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>Certificado de antecedentes</Text>
                <Text style={styles.stepSubtitle}>
                  {antecedentesApproved
                    ? 'Aprobado por administración'
                    : antecedentesUploaded
                    ? 'En revisión por administración'
                    : 'Emitido por Registro Civil (PDF o imagen)'}
                </Text>
              </View>
              {antecedentesApproved ? (
                <View style={[styles.statusBadge, styles.statusCompleted]}>
                  <Text style={[styles.statusBadgeText, styles.statusCompletedText]}>
                    Completado
                  </Text>
                </View>
              ) : antecedentesUploaded ? (
                <View style={[styles.statusBadge, styles.statusReview]}>
                  <Text style={[styles.statusBadgeText, styles.statusReviewText]}>
                    En revisión
                  </Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusPending]}>
                  <Text style={[styles.statusBadgeText, styles.statusPendingText]}>
                    Pendiente
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {openSections.antecedentes && !completed.antecedentes && (
              <View style={styles.accordionBody}>
                {antecedentesUploaded ? (
                  <View style={styles.certReviewBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="Clock" size={16} color="#b45309" />
                      <Text style={styles.certReviewTitle}>
                        En revisión por administración
                      </Text>
                    </View>
                    <Text style={styles.certReviewDesc}>
                      Hemos recibido tu certificado. Nuestro equipo de administración lo validará a la brevedad para habilitar tus servicios en tiempo real. Mientras tanto, puedes continuar completando los siguientes pasos.
                    </Text>
                    <Button
                      title={certLocalLoading || uploadingCert ? 'Subiendo...' : 'Subir otro documento'}
                      variant="secondary"
                      disabled={certLocalLoading || uploadingCert}
                      onPress={handleUploadAntecedentes}
                      icon="Upload"
                      style={{ marginTop: 8 }}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={styles.kycInstructions}>
                      Para ofrecer servicios en tiempo real y proteger la seguridad de la comunidad, es obligatorio adjuntar tu Certificado de Antecedentes para Fines Especiales emitido por el Registro Civil de Chile.
                    </Text>
                    <View style={styles.certTipBox}>
                      <Icon name="Info" size={16} color={TOKENS.colors.brand600} />
                      <Text style={styles.certTipText}>
                        Puedes descargarlo de forma gratuita e inmediata en registrocivil.cl con tu ClaveÚnica.
                      </Text>
                    </View>
                    <Button
                      title={certLocalLoading || uploadingCert ? 'Subiendo...' : 'Subir certificado de antecedentes'}
                      disabled={certLocalLoading || uploadingCert}
                      onPress={handleUploadAntecedentes}
                      icon="Upload"
                    />
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* 3 (o 2 en cliente). Correo Verificado */}
        <View
          style={[
            styles.stepCard,
            !completed.email && openSections.email && styles.stepCardActive,
          ]}
        >
          <TouchableOpacity
            style={styles.stepHeader}
            activeOpacity={0.7}
            disabled={completed.email}
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
                <Text style={styles.stepBadgeTextBrand}>{isProvider ? '3' : '2'}</Text>
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
                      clientBank: !isProvider,
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

        {/* Client Only Section: 3. Datos Bancarios Opcionales */}
        {!isProvider && (
          <View
            style={[
              styles.stepCard,
              !completed.clientBank && openSections.clientBank && styles.stepCardActive,
            ]}
          >
            <TouchableOpacity
              style={styles.stepHeader}
              activeOpacity={0.7}
              disabled={completed.clientBank}
              onPress={() => toggleSection('clientBank')}
            >
              <View
                style={[
                  styles.stepBadge,
                  completed.clientBank
                    ? styles.stepBadgeSuccess
                    : styles.stepBadgeBrand,
                ]}
              >
                {completed.clientBank ? (
                  <Icon name="Check" size={14} color={TOKENS.colors.success600} />
                ) : (
                  <Text style={styles.stepBadgeTextBrand}>3</Text>
                )}
              </View>
              <View style={styles.stepInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.stepTitle}>Cuenta bancaria</Text>
                  {!completed.clientBank && (
                    <View style={styles.optionalBadge}>
                      <Text style={styles.optionalBadgeText}>OPCIONAL</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.stepSubtitle}>
                  {user?.bankAccount?.bankName
                    ? `${user.bankAccount.bankName} - ${user.bankAccount.accountType}`
                    : 'Para recibir transferencias de trabajos o ventas'}
                </Text>
              </View>
              <StatusBadge isCompleted={completed.clientBank} />
            </TouchableOpacity>

            {openSections.clientBank && !completed.clientBank && (
              <View style={styles.accordionBody}>
                <View style={styles.infoCallout}>
                  <Icon name="Info" size={18} color={TOKENS.colors.brand600} />
                  <Text style={styles.infoCalloutText}>
                    Si postulas a un trabajo (InstaJob) o vendes en Marketplace, necesitamos tu cuenta bancaria para transferirte el dinero de forma segura. TratoFácil nunca realizará cargos ni cobros automáticos a esta cuenta.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <SelectPickerTrigger
                    label="Banco"
                    value={clientBankName}
                    placeholder="Selecciona tu banco"
                    onPress={() => setActivePicker('clientBank')}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <SelectPickerTrigger
                    label="Tipo de Cuenta"
                    value={clientAccountType}
                    placeholder={clientBankName ? 'Selecciona el tipo' : 'Primero elige banco'}
                    onPress={() => {
                      if (clientBankName) setActivePicker('clientAccount');
                    }}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Input
                    label="Número de Cuenta"
                    placeholder="Ej: 123456789"
                    value={clientAccountNumber}
                    onChangeText={setClientAccountNumber}
                    onFocus={scrollToFocusedField}
                    keyboardType="numeric"
                    icon="Hash"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Input
                    label="RUT del Titular"
                    placeholder="12345678-9"
                    value={clientBankRut}
                    onChangeText={setClientBankRut}
                    onFocus={scrollToFocusedField}
                    icon="FileText"
                    mask="rut"
                  />
                </View>
                <Button
                  title={saving ? 'Guardando...' : 'Guardar cuenta bancaria'}
                  disabled={saving}
                  onPress={handleSaveClientBank}
                />
              </View>
            )}
          </View>
        )}

        {/* Client Only: Become Provider CTA Banner */}
        {!isProvider && (
          <View style={styles.becomeProviderBanner}>
            <View style={styles.becomeProviderHeader}>
              <View style={styles.becomeProviderIconBox}>
                <Icon name="Zap" size={20} color={TOKENS.colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.becomeProviderTitle}>
                  ¿Quieres ofrecer tus servicios en TratoFácil?
                </Text>
                <Text style={styles.becomeProviderDesc}>
                  Conviértete en profesional y accede a miles de clientes que buscan tus habilidades en tu zona.
                </Text>
              </View>
            </View>
            <Button
              title="Convertirse en Proveedor"
              onPress={() => navigation.navigate('BecomeProvider')}
              variant="primary"
              size="sm"
              icon="ArrowRight"
              style={{ marginTop: 12, alignSelf: 'flex-start' }}
            />
          </View>
        )}

        {/* Provider Only Sections */}
        {isProvider && (
          <>
            {/* 4. Identidad de Proveedor */}
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
                disabled={completed.identity}
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
                    <Text style={styles.stepBadgeTextBrand}>4</Text>
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

            {/* 5. Datos Bancarios */}
            <View
              style={[
                styles.stepCard,
                !completed.bank && openSections.bank && styles.stepCardActive,
              ]}
            >
              <TouchableOpacity
                style={styles.stepHeader}
                activeOpacity={0.7}
                disabled={completed.bank}
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
                    <Text style={styles.stepBadgeTextBrand}>5</Text>
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

            {/* 6. Verificación KYC */}
            <View
              style={[
                styles.stepCard,
                !completed.kyc && openSections.kyc && styles.stepCardActive,
              ]}
            >
              <TouchableOpacity
                style={styles.stepHeader}
                activeOpacity={0.7}
                disabled={completed.kyc}
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
                    <Text style={styles.stepBadgeTextBrand}>6</Text>
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
                  {antecedentesApproved ? (
                    <Button
                      title="Crea tu primer servicio"
                      onPress={() => navigation.navigate('PublishService')}
                      icon="Plus"
                      style={{ width: '100%' }}
                    />
                  ) : antecedentesUploaded ? (
                    <View style={styles.antecedentesPendingCard}>
                      <Icon name="Clock" size={20} color="#b45309" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.antecedentesPendingTitle}>
                          Certificado en revisión por administración
                        </Text>
                        <Text style={styles.antecedentesPendingDesc}>
                          Tu Certificado de Antecedentes está siendo validado. Podrás crear y publicar tus servicios en cuanto sea aprobado.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Button
                      title="Sube tu Certificado para publicar"
                      variant="secondary"
                      onPress={() => {
                        setOpenSections((prev) => ({ ...prev, antecedentes: true }));
                      }}
                      icon="FileText"
                      style={{ width: '100%' }}
                    />
                  )}
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
                } else if (activePicker === 'clientBank') {
                  setClientBankName(opt.value);
                  setClientAccountType('');
                } else if (activePicker === 'clientAccount') {
                  setClientAccountType(opt.value);
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
  statusReview: { backgroundColor: '#fef3c7' },
  statusReviewText: { color: '#b45309' },

  certReviewBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 6,
    marginBottom: 8,
  },
  certReviewTitle: {
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#92400e',
  },
  certReviewDesc: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 18,
  },
  certTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: TOKENS.colors.brand50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
    marginBottom: TOKENS.spacing.md,
  },
  certTipText: {
    flex: 1,
    fontSize: 12,
    color: TOKENS.colors.brand700,
    lineHeight: 17,
  },

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
  optionalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  optionalBadgeText: {
    fontSize: 9,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#1d4ed8',
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    padding: 12,
    marginBottom: TOKENS.spacing.md,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  becomeProviderBanner: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand200,
    padding: 16,
    marginTop: 8,
    ...TOKENS.shadows.soft,
  },
  becomeProviderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  becomeProviderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  becomeProviderTitle: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    marginBottom: 4,
  },
  becomeProviderDesc: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
  },
  antecedentesPendingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 14,
  },
  antecedentesPendingTitle: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#92400e',
    marginBottom: 4,
  },
  antecedentesPendingDesc: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 18,
  },
});
