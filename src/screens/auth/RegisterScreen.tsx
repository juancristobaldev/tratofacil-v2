import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Input, Icon } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types/graphql';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { register, registerLoading } = useAuth();

  const initialEmailParam = (route.params?.initialEmail || '').trim().toLowerCase();
  const isInitialValid = EMAIL_REGEX.test(initialEmailParam);

  const [step, setStep] = useState<'email' | 'password'>(isInitialValid ? 'password' : 'email');
  const [email, setEmail] = useState(initialEmailParam);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params?.initialEmail) {
      const paramEmail = route.params.initialEmail.trim().toLowerCase();
      setEmail(paramEmail);
      if (EMAIL_REGEX.test(paramEmail)) {
        setStep('password');
      }
    }
  }, [route.params?.initialEmail]);

  const handleContinueEmail = () => {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Ingresa tu correo para continuar.');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('El correo electrónico no es válido.');
      return;
    }

    setEmail(normalizedEmail);
    setStep('password');
  };

  const handleRegister = async () => {
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      setError('Ingresa un correo electrónico válido.');
      setStep('email');
      return;
    }

    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      await register({
        email: normalizedEmail,
        password,
        role: Role.CLIENT,
      });
      navigation.replace('MainApp');
    } catch (err: any) {
      const msg =
        err?.graphQLErrors?.[0]?.message ||
        err?.networkError?.message ||
        'Error al registrarse. Intenta nuevamente.';

      if (
        msg.includes('Conflict') ||
        msg.includes('correo electrónico ya está registrado') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('duplicate')
      ) {
        setError('Este correo electrónico ya está registrado.');
        setStep('email');
        return;
      }

      setError(msg);
    }
  };

  const handleEditEmail = () => {
    setStep('email');
    setPassword('');
    setError('');
  };

  const handleBack = () => {
    if (step === 'password' && !isInitialValid) {
      handleEditEmail();
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient Glow Blobs (Light Premium, matching Login) */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header navigation */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
            </TouchableOpacity>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            {/* Header Icon */}
            <View style={styles.iconWrapper}>
              <Icon name="UserPlus" size={28} color={TOKENS.colors.brand500} />
            </View>

            <Text style={styles.welcomeTitle}>Crea tu cuenta</Text>
            <Text style={styles.welcomeSubtitle}>
              Registro único: empieza con tu correo y completa en segundos.
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
                  editable={!registerLoading}
                  onSubmitEditing={handleContinueEmail}
                  returnKeyType="next"
                />

                <Button
                  title="Continuar"
                  icon="ArrowRight"
                  onPress={handleContinueEmail}
                  style={styles.submitBtn}
                  disabled={!email.trim() || registerLoading}
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
                    {email}
                  </Text>
                  <TouchableOpacity onPress={handleEditEmail} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordLabelRow}>
                  <Text style={styles.label}>Crea una contraseña segura</Text>
                </View>

                <Input
                  icon="Lock"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  isPassword
                  editable={!registerLoading}
                  onSubmitEditing={handleRegister}
                  returnKeyType="done"
                />

                <Text style={styles.helperText}>
                  Asegúrate de usar al menos 8 caracteres.
                </Text>

                <Button
                  title={registerLoading ? 'Creando cuenta...' : 'Finalizar registro'}
                  onPress={handleRegister}
                  style={styles.submitBtn}
                  disabled={registerLoading || password.length < 8}
                />
              </View>
            )}

            {/* Footer Links & Legal Note */}
            <View style={styles.footerDivider}>
              <View style={styles.loginRow}>
                <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  disabled={registerLoading}
                >
                  <Text style={styles.loginLinkAction}>Inicia sesión</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.legalNotice}>
                Al registrarte, aceptas nuestros Términos de Servicio y Políticas de Privacidad.
              </Text>
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
    marginBottom: TOKENS.spacing.md,
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
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  helperText: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 6,
    marginLeft: 4,
    marginBottom: TOKENS.spacing.lg,
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
    marginTop: TOKENS.spacing.sm,
  },
  footerDivider: {
    marginTop: TOKENS.spacing.xl,
    paddingTop: TOKENS.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface100,
    alignItems: 'center',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  footerText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
  },
  loginLinkAction: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  legalNotice: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: TOKENS.spacing.sm,
  },
});
