import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Input, Icon } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { usePanel } from '../../context/PanelContext';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';

export const GuestCheckoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setSession } = useAuth();
  const { location } = useLocation();
  const { openPanel } = usePanel();
  const { guestCreateContactRequest } = useTimeRealServices();

  const provider = route.params?.provider;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const lat = location?.coords?.latitude ?? -33.42098;
      const lng = location?.coords?.longitude ?? -70.60862;

      const result = await guestCreateContactRequest({
        guestEmail: email.trim().toLowerCase(),
        guestPhone: phone.trim(),
        guestName: name.trim(),
        serviceProviderId: provider.serviceProviderId,
        clientLat: lat,
        clientLng: lng,
      });

      await setSession(result.accessToken, result.user as any);

      navigation.goBack();
      openPanel('focus_client', {
        providerId: provider.id,
        serviceProviderId: provider.serviceProviderId,
        provider,
        isRealtimeActive: true,
        orderAlreadyCreated: true,
        pendingOrderId: result.order.id,
      });
    } catch (err: any) {
      const msg = err?.graphQLErrors?.[0]?.message || err?.message || 'Error al enviar la solicitud. Intenta nuevamente.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
            error={errors.name}
          />

          <Input
            label="Correo electrónico"
            placeholder="Ej: juan@correo.cl"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Teléfono"
            placeholder="Ej: 912345678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    paddingBottom: 40,
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
