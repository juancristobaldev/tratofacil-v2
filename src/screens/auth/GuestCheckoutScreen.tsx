import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLazyQuery } from '@apollo/client/react';
import { TOKENS } from '../../theme';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { CHECK_LOGIN_EMAIL_EXISTS } from '../../graphql/operations/auth';
import { reverseGeocode } from '../../utils/geocode';

export const GuestCheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setSession } = useAuth();
  const { location, refreshLocation } = useLocation();
  const { guestCreateContactRequest } = useRealtime();

  const [checkEmailExists] = useLazyQuery<{
    checkLoginEmailExists: { exists: boolean; hasPassword: boolean };
  }>(CHECK_LOGIN_EMAIL_EXISTS, { fetchPolicy: 'network-only' });

  const provider = route.params?.provider;
  const description = route.params?.description;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    const tempErrors: Record<string, string> = {};

    if (!name.trim()) tempErrors.name = 'El nombre es obligatorio';
    if (!email.trim() || !email.includes('@')) tempErrors.email = 'Ingresa un correo electrónico válido';
    if (phone.trim().length < 8) tempErrors.phone = 'Ingresa un número móvil válido';

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const lat = location?.coords?.latitude;
      const lng = location?.coords?.longitude;

      if (lat == null || lng == null) {
        refreshLocation();
        Alert.alert('Ubicación requerida', 'No pudimos obtener tu ubicación. Intenta nuevamente en un momento.');
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { data: emailData } = await checkEmailExists({
        variables: { email: normalizedEmail },
      });

      if (emailData?.checkLoginEmailExists?.exists) {
        navigation.replace('Login', { initialEmail: normalizedEmail, guestConflict: true });
        return;
      }

      let resolvedAddress: string | undefined = undefined;
      try {
        const addr = await reverseGeocode(lat, lng);
        if (addr) resolvedAddress = addr;
      } catch {}

      const result = await guestCreateContactRequest({
        guestEmail: normalizedEmail,
        guestPhone: phone.trim(),
        guestName: name.trim(),
        serviceProviderId: provider.serviceProviderId,
        clientLat: lat,
        clientLng: lng,
        clientAddress: resolvedAddress,
        clientDescription: description,
      });

      await setSession(result.accessToken, result.user as any);

      navigation.navigate('MainApp', { screen: 'Home' });
    } catch (err: any) {
      const conflict =
        err?.graphQLErrors?.[0]?.extensions?.status === 409 ||
        /ya existe una cuenta/i.test(err?.graphQLErrors?.[0]?.message || '');
      if (conflict) {
        navigation.replace('Login', { initialEmail: email.trim().toLowerCase(), guestConflict: true });
        return;
      }
      const msg = err?.graphQLErrors?.[0]?.message || err?.message || 'Error al enviar la solicitud. Intenta nuevamente.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Datos de contacto</Text>
            <Text style={styles.subtitle}>
              Completa tus datos para solicitar el servicio de {provider?.name || 'el profesional'}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nombre completo"
              placeholder="Ej: Juan Pérez"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errors.name}
            />

            <Input
              ref={emailRef}
              label="Correo electrónico"
              placeholder="Ej: juan@correo.cl"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              error={errors.email}
            />

            <Input
              ref={phoneRef}
              label="Teléfono"
              placeholder="Ej: 912345678"
              value={phone}
              onChangeText={setPhone}
              mask="phone"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              error={errors.phone}
            />

            <Button
              title="Solicitar servicio"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    paddingBottom: 80,
  },
  header: {
    marginBottom: TOKENS.spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: TOKENS.spacing.xl,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginTop: TOKENS.spacing.xs,
    lineHeight: 20,
  },
  form: {
    gap: TOKENS.spacing.md,
  },
  submitBtn: {
    marginTop: TOKENS.spacing.lg,
  },
});
