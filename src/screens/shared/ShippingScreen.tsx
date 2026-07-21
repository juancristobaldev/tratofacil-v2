import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon } from '../../components/ui';
import { TOKENS } from '../../theme';

export const ShippingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { product } = route.params || {};

  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [additional, setAdditional] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    // Trim values to avoid false negatives with empty spaces
    const r = region.trim();
    const c = city.trim();
    const s = street.trim();
    const num = number.trim();
    const name = receiverName.trim();
    const p = phone.trim();

    if (!r || !c || !s || !num || !name || !p) {
      Alert.alert('Error', 'Por favor, completa los campos obligatorios (*).');
      return;
    }

    const shippingData = {
      region: r,
      city: c,
      street: s,
      number: num,
      additional: additional.trim(),
      receiverName: name,
      phone: p,
    };

    navigation.navigate('Purchase', { product, shippingData });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Datos de Envío</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.instructions}>Ingresa la dirección donde deseas recibir el producto.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Región *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: Región Metropolitana" 
              placeholderTextColor={TOKENS.colors.textMuted}
              value={region} 
              onChangeText={setRegion} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Comuna / Ciudad *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: Santiago" 
              placeholderTextColor={TOKENS.colors.textMuted}
              value={city} 
              onChangeText={setCity} 
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Calle *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ej: Av. Providencia" 
                placeholderTextColor={TOKENS.colors.textMuted}
                value={street} 
                onChangeText={setStreet} 
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Número *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ej: 1234" 
                placeholderTextColor={TOKENS.colors.textMuted}
                value={number} 
                onChangeText={setNumber} 
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Depto / Casa / Info Adicional</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: Depto 502, Torre B" 
              placeholderTextColor={TOKENS.colors.textMuted}
              value={additional} 
              onChangeText={setAdditional} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre de quien recibe *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: Juan Pérez" 
              placeholderTextColor={TOKENS.colors.textMuted}
              value={receiverName} 
              onChangeText={setReceiverName} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono de contacto *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej: +56 9 1234 5678" 
              placeholderTextColor={TOKENS.colors.textMuted}
              value={phone} 
              onChangeText={setPhone} 
              keyboardType="phone-pad"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button 
          title="Continuar al Pago" 
          onPress={handleSubmit} 
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm,
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface200,
  },
  backBtn: {
    padding: TOKENS.spacing.xs,
  },
  headerTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    paddingBottom: 40,
  },
  instructions: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginBottom: TOKENS.spacing.xl,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: TOKENS.spacing.md,
  },
  inputGroup: {
    marginBottom: TOKENS.spacing.lg,
  },
  label: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
    marginBottom: 8,
  },
  input: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    padding: TOKENS.spacing.md,
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textMain,
  },
  footer: {
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.white,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.medium,
  },
});
