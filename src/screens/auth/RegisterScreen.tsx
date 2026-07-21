import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Input, PhoneInput, Icon } from '../../components/ui';
import { useRole } from '../../context/RoleContext';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setRole: setAppRole } = useRole();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'client' | 'provider'>('client');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRegister = () => {
    const tempErrors: Record<string, string> = {};

    if (!name.trim()) tempErrors.name = 'El nombre es obligatorio';
    if (!email.trim() || !email.includes('@')) tempErrors.email = 'Ingresa un correo electrónico válido';
    if (phone.trim().length < 8) tempErrors.phone = 'Ingresa un número móvil de 9 dígitos';

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      return;
    }

    setErrors({});
    setAppRole(selectedRole);
    navigation.replace('MainApp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Crea tu cuenta gratis</Text>
          <Text style={styles.subtitle}>Únete a la comunidad de TratoFácil para contratar o trabajar.</Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.formSection}>
          <Input
            label="Nombre completo"
            placeholder="Ej. Juan Pérez"
            icon="User"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            error={errors.name}
          />

          <Input
            label="Correo electrónico"
            placeholder="Ej. juan.perez@correo.com"
            icon="Mail"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            error={errors.email}
          />

          <PhoneInput
            label="Número móvil"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) setErrors({ ...errors, phone: '' });
            }}
            error={errors.phone}
          />

          {/* Role selector card */}
          <Text style={styles.sectionLabel}>¿Qué perfil deseas usar?</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'client' ? styles.roleCardActive : null,
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedRole('client')}
            >
              <View style={[styles.roleIconCircle, selectedRole === 'client' ? styles.roleIconCircleActive : null]}>
                <Icon name="User" size={20} color={selectedRole === 'client' ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle} />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>Cliente</Text>
                <Text style={styles.roleSubtitle}>Quiero buscar y contratar servicios en mi zona.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'provider' ? styles.roleCardActive : null,
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedRole('provider')}
            >
              <View style={[styles.roleIconCircle, selectedRole === 'provider' ? styles.roleIconCircleActive : null]}>
                <Icon name="Briefcase" size={20} color={selectedRole === 'provider' ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle} />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>Profesional / Técnico</Text>
                <Text style={styles.roleSubtitle}>Quiero ofrecer mis servicios y captar nuevos clientes.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <View style={styles.actionSection}>
          <Button title="Registrarme" onPress={handleRegister} style={styles.submitBtn} />
          
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>¿Ya tienes una cuenta? </Text>
            <Text style={styles.loginLinkAction}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.lg,
  },
  header: {
    height: 48,
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.xs,
  },
  backBtn: {
    padding: TOKENS.spacing.xs,
    marginLeft: -TOKENS.spacing.xs,
  },
  titleSection: {
    marginBottom: TOKENS.spacing.lg,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
  },
  formSection: {
    flex: 1,
    gap: TOKENS.spacing.md,
  },
  sectionLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginTop: 8,
  },
  roleContainer: {
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.geometry.radiusCard,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.white,
  },
  roleCardActive: {
    borderColor: TOKENS.colors.brand500,
    backgroundColor: TOKENS.colors.brand50,
  },
  roleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: TOKENS.spacing.md,
  },
  roleIconCircleActive: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.brand100,
    borderWidth: 1,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 2,
  },
  roleSubtitle: {
    fontSize: TOKENS.typography.sizes.xxs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 14,
  },
  actionSection: {
    alignItems: 'center',
    marginTop: TOKENS.spacing.md,
    gap: TOKENS.spacing.md,
  },
  submitBtn: {
    width: '100%',
  },
  loginLink: {
    flexDirection: 'row',
  },
  loginLinkText: {
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
  },
  loginLinkAction: {
    color: TOKENS.colors.brand500,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
  },
});
