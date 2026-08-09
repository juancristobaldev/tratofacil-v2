import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '../../components/ui';
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
      Alert.alert('Campos incompletos', 'Por favor llena todos los campos obligatorios (*) para continuar.');
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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.instructions}>Ingresa la dirección donde deseas recibir el producto.</Text>

          <Input 
            label="Región *"
            placeholder="Ej: Región Metropolitana" 
            value={region} 
            onChangeText={setRegion} 
            containerStyle={styles.inputGroup}
          />

          <Input 
            label="Comuna / Ciudad *"
            placeholder="Ej: Santiago" 
            value={city} 
            onChangeText={setCity} 
            containerStyle={styles.inputGroup}
          />

          <View style={styles.row}>
            <Input 
              label="Calle *"
              placeholder="Ej: Av. Providencia" 
              value={street} 
              onChangeText={setStreet} 
              containerStyle={[styles.inputGroup, { flex: 2 }]}
            />
            <Input 
              label="Número *"
              placeholder="Ej: 1234" 
              value={number} 
              onChangeText={setNumber} 
              keyboardType="numeric"
              containerStyle={[styles.inputGroup, { flex: 1 }]}
            />
          </View>

          <Input 
            label="Depto / Casa / Info Adicional"
            placeholder="Ej: Depto 502, Torre B" 
            value={additional} 
            onChangeText={setAdditional} 
            containerStyle={styles.inputGroup}
          />

          <Input 
            label="Nombre de quien recibe *"
            placeholder="Ej: Juan Pérez" 
            value={receiverName} 
            onChangeText={setReceiverName} 
            containerStyle={styles.inputGroup}
          />

          <Input 
            label="Teléfono de contacto *"
            placeholder="Ej: +56 9 1234 5678" 
            value={phone} 
            onChangeText={setPhone} 
            keyboardType="phone-pad"
            containerStyle={styles.inputGroup}
          />

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
  scrollContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 40,
  },
  instructions: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginBottom: TOKENS.spacing.lg,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: TOKENS.spacing.md,
  },
  inputGroup: {
    marginBottom: TOKENS.spacing.md,
  },
  footer: {
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.white,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.medium,
  },
});
