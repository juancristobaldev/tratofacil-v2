import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { TOKENS } from '../../theme';
import { Button, Icon, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  CHECK_LOGIN_EMAIL_EXISTS,
  REQUEST_PASSWORD_RESET,
} from '../../graphql/operations/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login, loginLoading, logout } = useAuth();
  const { showNotification } = useNotification();
  const { initialEmail, guestConflict } = route.params || {};

  const [step, setStep] = useState<'email' | 'password' | 'noPassword'>('email');
  const [email, setEmail] = useState('');
  const [checkedEmail, setCheckedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (guestConflict && initialEmail) {
      setEmail(initialEmail);
      showNotification({
        title: 'Cuenta existente',
        message: 'Ya existe una cuenta asociada a este correo. Inicia sesión para continuar.',
        type: 'info',
      });
    }
  }, [guestConflict, initialEmail, showNotification]);

  const [checkEmailExists, { loading: checkingEmail }] = useLazyQuery<{
    checkLoginEmailExists: { exists: boolean; hasPassword: boolean };
  }, { email: string }>(
    CHECK_LOGIN_EMAIL_EXISTS,
    { fetchPolicy: 'network-only' },
  );

  const [requestReset, { loading: requestingReset }] = useMutation<
    { requestPasswordReset: boolean },
    { email: string }
  >(REQUEST_PASSWORD_RESET);

  const handleEmailSubmit = async () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    try {
      const { data } = await checkEmailExists({
        variables: { email: normalizedEmail },
      });

      const result = data?.checkLoginEmailExists;

      if (result?.exists) {
        setCheckedEmail(normalizedEmail);
        setEmail(normalizedEmail);
        if (!result.hasPassword) {
          setStep('noPassword');
        } else {
          setStep('password');
        }
        return;
      }

      // Si no existe, llevar a Register con el email prellenado
      navigation.navigate('Register', { initialEmail: normalizedEmail });
    } catch (err: any) {
      const msg =
        err?.graphQLErrors?.[0]?.message ||
        err?.networkError?.message ||
        'No pudimos validar tu correo. Intenta nuevamente.';
      setError(msg);
    }
  };

  const handleRequestReset = async () => {
    setError('');
    try {
      await requestReset({ variables: { email: checkedEmail || email.trim().toLowerCase() } });
      setResetSent(true);
      setStep('noPassword');
    } catch {
      setError('No pudimos enviar el enlace. Intenta nuevamente.');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      setError('Por favor, ingresa tu contraseña.');
      return;
    }
    setError('');

    try {
      await login((checkedEmail || email).trim().toLowerCase(), password);
      navigation.replace('MainApp');
    } catch (err: any) {
      const msg =
        err?.graphQLErrors?.[0]?.message ||
        err?.networkError?.message ||
        '';

      if (msg.includes('Unauthorized') || msg.includes('found') || msg.toLowerCase().includes('password')) {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError(msg || 'Error al iniciar sesión. Verifica tus credenciales.');
      }
    }
  };

  const handleGuestLogin = async () => {
    await logout();
    navigation.replace('MainApp');
  };

  const handleEditEmail = () => {
    setStep('email');
    setPassword('');
    setError('');
    setResetSent(false);
  };

  const isBusy = checkingEmail || loginLoading || requestingReset;

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient Glow Blobs (Light Premium) */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header navigation */}
          <View style={styles.header}>
            {step !== 'email' ? (
              <TouchableOpacity onPress={handleEditEmail} style={styles.backBtn}>
                <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
              </TouchableOpacity>
            ) : (
              <View />
            )}
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            {/* Header Icon */}
            <View style={styles.iconWrapper}>
              <Icon
                name={step === 'noPassword' && resetSent ? 'Mail' : 'Lock'}
                size={28}
                color={TOKENS.colors.brand500}
              />
            </View>

            <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
            <Text style={styles.welcomeSubtitle}>
              {step === 'email'
                ? 'Ingresa tu correo para continuar de forma segura.'
                : step === 'password'
                ? 'Ingresa tu contraseña para acceder a tu cuenta.'
                : 'Configuración de acceso seguro.'}
            </Text>

            {/* Error Alert Box */}
            {error ? (
              <View style={styles.errorBox}>
                <Icon name="Info" size={16} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Step 1: Email Input */}
            {step === 'email' && (
              <View style={styles.formSection}>
                <Input
                  label="Correo Electrónico"
                  icon="Mail"
                  placeholder="tu@correo.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!isBusy}
                  onSubmitEditing={handleEmailSubmit}
                  returnKeyType="next"
                />
              </View>
            )}

            {/* Step 2: Password Input & Verified Email Pill */}
            {step === 'password' && (
              <View style={styles.formSection}>
                {/* Verified Email Pill */}
                <View style={styles.verifiedPill}>
                  <Icon name="User" size={16} color={TOKENS.colors.textSubtle} />
                  <Text style={styles.verifiedText} numberOfLines={1}>
                    {checkedEmail || email}
                  </Text>
                  <TouchableOpacity onPress={handleEditEmail} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordLabelRow}>
                  <Text style={styles.label}>Contraseña</Text>
                  <TouchableOpacity onPress={handleRequestReset} disabled={requestingReset}>
                    <Text style={styles.forgotText}>¿Olvidaste tu clave?</Text>
                  </TouchableOpacity>
                </View>

                <Input
                  icon="Lock"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  isPassword
                  editable={!isBusy}
                  onSubmitEditing={handlePasswordSubmit}
                  returnKeyType="done"
                />
              </View>
            )}

            {/* Step 3: No Password State */}
            {step === 'noPassword' && (
              <View style={styles.noPasswordSection}>
                {resetSent ? (
                  <View style={styles.noPasswordContent}>
                    <Text style={styles.noPasswordTitle}>Revisa tu correo</Text>
                    <Text style={styles.noPasswordDesc}>
                      Te enviamos un enlace a <Text style={styles.boldText}>{checkedEmail || email}</Text> para que crees tu contraseña.
                    </Text>
                    <TouchableOpacity onPress={handleEditEmail} style={styles.secondaryActionBtn}>
                      <Text style={styles.secondaryActionText}>Volver al inicio</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.noPasswordContent}>
                    <Text style={styles.noPasswordTitle}>Tu cuenta no tiene contraseña</Text>
                    <Text style={styles.noPasswordDesc}>
                      Te enviaremos un enlace a <Text style={styles.boldText}>{checkedEmail || email}</Text> para que puedas crear una.
                    </Text>
                    <View style={styles.noPasswordBtnRow}>
                      <TouchableOpacity
                        onPress={handleEditEmail}
                        style={styles.noPasswordCancelBtn}
                      >
                        <Text style={styles.noPasswordCancelText}>Cambiar correo</Text>
                      </TouchableOpacity>
                      <Button
                        title={requestingReset ? 'Enviando...' : 'Enviar enlace'}
                        onPress={handleRequestReset}
                        disabled={requestingReset}
                        style={styles.noPasswordSubmitBtn}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Main Action Button (For email & password steps) */}
            {step !== 'noPassword' && (
              <Button
                title={
                  checkingEmail
                    ? 'Verificando...'
                    : loginLoading
                    ? 'Iniciando sesión...'
                    : step === 'email'
                    ? 'Continuar'
                    : 'Iniciar Sesión'
                }
                icon={step === 'email' && !checkingEmail ? 'ArrowRight' : undefined}
                onPress={step === 'email' ? handleEmailSubmit : handlePasswordSubmit}
                style={styles.submitBtn}
                disabled={isBusy || (step === 'email' && !email.trim())}
              />
            )}

            {/* Guest Login option */}
            {step === 'email' && (
              <TouchableOpacity
                onPress={handleGuestLogin}
                style={styles.guestLink}
                disabled={isBusy}
              >
                <Text style={styles.guestLinkText}>Continuar como Invitado</Text>
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View style={styles.footerDivider}>
              <Text style={styles.footerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Register', {
                    initialEmail: email.trim().toLowerCase() || undefined,
                  })
                }
                disabled={isBusy}
              >
                <Text style={styles.registerLink}>Regístrate gratis</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // gray-50
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.15,
  },
  blobTopLeft: {
    top: -50,
    left: -50,
    backgroundColor: TOKENS.colors.brand500,
  },
  blobBottomRight: {
    bottom: -50,
    right: -50,
    backgroundColor: '#9333ea', // purple-600 approx
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.xl,
  },
  header: {
    height: 48,
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  backBtn: {
    padding: TOKENS.spacing.xs,
    marginLeft: -TOKENS.spacing.xs,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    shadowColor: TOKENS.colors.textMain,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.xl,
    paddingHorizontal: TOKENS.spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    marginBottom: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.sm,
    color: '#dc2626',
    fontWeight: '500',
  },
  formSection: {
    marginBottom: TOKENS.spacing.xl,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    padding: 12,
    marginBottom: TOKENS.spacing.lg,
  },
  verifiedText: {
    flex: 1,
    marginLeft: 8,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  editBtn: {
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  submitBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    shadowColor: TOKENS.colors.brand500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  guestLink: {
    marginTop: TOKENS.spacing.lg,
    alignItems: 'center',
  },
  guestLinkText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
    textDecorationLine: 'underline',
  },
  noPasswordSection: {
    marginBottom: TOKENS.spacing.xl,
  },
  noPasswordContent: {
    alignItems: 'center',
  },
  noPasswordTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },
  noPasswordDesc: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.lg,
    lineHeight: 20,
  },
  noPasswordBtnRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  noPasswordCancelBtn: {
    flex: 1,
    height: 50,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPasswordCancelText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  noPasswordSubmitBtn: {
    flex: 1,
    height: 50,
  },
  secondaryActionBtn: {
    marginTop: TOKENS.spacing.sm,
    padding: TOKENS.spacing.sm,
  },
  secondaryActionText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand600,
  },
  footerDivider: {
    marginTop: TOKENS.spacing.xl,
    paddingTop: TOKENS.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
  },
  registerLink: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  keyboardView: {
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
});
