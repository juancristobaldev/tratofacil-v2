import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, RegionCitySelect } from '../../components/ui';
import { TOKENS } from '../../theme';
import { getKeyboardVerticalOffset } from '../../utils/layoutMetrics';

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

  const streetRef = useRef<TextInput>(null);
  const numberRef = useRef<TextInput>(null);
  const additionalRef = useRef<TextInput>(null);
  const receiverNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

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
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={getKeyboardVerticalOffset(false, insets.top)}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.instructions}>Ingresa la dirección donde deseas recibir el producto.</Text>

          <RegionCitySelect
            region={region}
            city={city}
            onRegionChange={setRegion}
            onCityChange={setCity}
            regionLabel="Región *"
            cityLabel="Comuna / Ciudad *"
            regionPlaceholder="Selecciona una región"
            cityPlaceholder="Selecciona tu comuna o ciudad"
            testIDPrefix="shipping"
          />

          <View style={styles.row}>
            <Input 
              ref={streetRef}
              label="Calle *"
              placeholder="Ej: Av. Providencia" 
              value={street} 
              onChangeText={setStreet} 
              returnKeyType="next"
              onSubmitEditing={() => numberRef.current?.focus()}
              containerStyle={[styles.inputGroup, { flex: 2 }]}
            />
            <Input 
              ref={numberRef}
              label="Número *"
              placeholder="Ej: 1234" 
              value={number} 
              onChangeText={setNumber} 
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => additionalRef.current?.focus()}
              containerStyle={[styles.inputGroup, { flex: 1 }]}
            />
          </View>

          <Input 
            ref={additionalRef}
            label="Depto / Casa / Info Adicional"
            placeholder="Ej: Depto 502, Torre B" 
            value={additional} 
            onChangeText={setAdditional} 
            returnKeyType="next"
            onSubmitEditing={() => receiverNameRef.current?.focus()}
            containerStyle={styles.inputGroup}
          />

          <Input 
            ref={receiverNameRef}
            label="Nombre de quien recibe *"
            placeholder="Ej: Juan Pérez" 
            value={receiverName} 
            onChangeText={setReceiverName} 
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            containerStyle={styles.inputGroup}
          />

          <Input 
            ref={phoneRef}
            label="Teléfono de contacto *"
            placeholder="Ej: +56 9 1234 5678" 
            value={phone} 
            onChangeText={setPhone} 
            keyboardType="phone-pad"
            mask="phone"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            containerStyle={styles.inputGroup}
          />

        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, TOKENS.spacing.sm) }]}>
          <Button 
            title="Continuar al Pago" 
            onPress={handleSubmit} 
            style={{ width: '100%' }}
          />
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 120,
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
