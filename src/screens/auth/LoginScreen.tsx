import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Icon } from '../../components/ui';
import { useRole } from '../../context/RoleContext';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setRole } = useRole();
  const [step, setStep] = useState<'identifier' | 'password'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleIdentifierSubmit = () => {
    const val = identifier.trim();
    if (!val) {
      setError('Por favor, ingresa tu correo electrónico o teléfono.');
      return;
    }
    setError('');
    setStep('password');
  };

  const handlePasswordSubmit = () => {
    if (!password) {
      setError('Por favor, ingresa tu contraseña.');
      return;
    }
    setError('');
    // Simulate login success
    setRole('client');
    navigation.replace('MainApp');
  };

  const handleGuestLogin = () => {
    setRole('guest');
    navigation.replace('MainApp');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative Blobs (Premium Vibe) */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            {step === 'password' ? (
              <TouchableOpacity onPress={() => setStep('identifier')} style={styles.backBtn}>
                <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
              </TouchableOpacity>
            ) : (
              <View />
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <Icon name="Lock" size={28} color={TOKENS.colors.brand500} />
            </View>
            <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
            <Text style={styles.welcomeSubtitle}>
              {step === 'identifier'
                ? 'Ingresa tu correo o teléfono para continuar de forma segura.'
                : 'Ingresa tu contraseña para acceder a tu cuenta.'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="Info" size={16} color={TOKENS.colors.error600} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.formSection}>
              {step === 'identifier' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Correo Electrónico o Teléfono</Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="User" size={20} color={TOKENS.colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="tu@correo.com o +569..."
                      placeholderTextColor={TOKENS.colors.textMuted}
                      value={identifier}
                      onChangeText={(text) => {
                        setIdentifier(text);
                        if (error) setError('');
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.passwordSection}>
                  <View style={styles.verifiedPill}>
                    <Icon name="User" size={16} color={TOKENS.colors.textSubtle} />
                    <Text style={styles.verifiedText} numberOfLines={1}>{identifier}</Text>
                    <TouchableOpacity onPress={() => setStep('identifier')} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Editar</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.passwordLabelRow}>
                      <Text style={styles.label}>Contraseña</Text>
                      <TouchableOpacity>
                        <Text style={styles.forgotText}>¿Olvidaste tu clave?</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrapper}>
                      <Icon name="Lock" size={20} color={TOKENS.colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={TOKENS.colors.textMuted}
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (error) setError('');
                        }}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                        <Icon name={showPassword ? "EyeOff" : "Eye"} size={20} color={TOKENS.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <Button
              title={step === 'identifier' ? 'Continuar' : 'Iniciar Sesión'}
              icon={step === 'identifier' ? 'ArrowRight' : undefined}
              onPress={step === 'identifier' ? handleIdentifierSubmit : handlePasswordSubmit}
              style={styles.submitBtn}
            />

            {step === 'identifier' && (
              <TouchableOpacity onPress={handleGuestLogin} style={styles.guestLink}>
                <Text style={styles.guestLinkText}>Continuar como Invitado</Text>
              </TouchableOpacity>
            )}

            <View style={styles.footerDivider}>
              <Text style={styles.footerText}>
                ¿No tienes cuenta?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
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
    backgroundColor: TOKENS.colors.error50,
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    marginBottom: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.error100,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.error700,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: TOKENS.spacing.xl,
  },
  inputGroup: {
    marginBottom: TOKENS.spacing.md,
  },
  label: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textMain,
    height: '100%',
  },
  passwordSection: {},
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
  forgotText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  eyeBtn: {
    padding: 4,
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
});
