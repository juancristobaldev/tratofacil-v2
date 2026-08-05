import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Icon } from '../../components';
import { useRole } from '../../context/RoleContext';
import { useServices } from '../../hooks/useServices';

const SERVICE_COMMISSION_RATE = 0.10;

export const PublishServiceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();

  const [parentCat, setParentCat] = useState('');
  const [subCat, setSubCat] = useState('');
  const [specificService, setSpecificService] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [hasHomeVisit, setHasHomeVisit] = useState(false);
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [cobroType] = useState('POR SERVICIO COMPLETO');
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [receivingAmount, setReceivingAmount] = useState(0);

  const { createService, createLoading: loading } = useServices();

  useEffect(() => {
    const basePrice = Number(price) || 0;
    const comm = basePrice * SERVICE_COMMISSION_RATE;
    setCommissionAmount(comm);
    setReceivingAmount(basePrice - comm);
  }, [price]);

  const handlePublish = async () => {
    if (!parentCat || !specificService || !region || !city || !price) {
      Alert.alert('Error', 'Por favor, completa los campos obligatorios.');
      return;
    }
    try {
      await createService({
        categoryId: null,
        city,
        description: desc,
        hasHomeVisit,
        price: Number(price),
        slug: specificService.toLowerCase().replace(/\s+/g, '-'),
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (role === 'guest') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom, justifyContent: 'center', alignItems: 'center' }]}>
        <Icon name="Lock" size={48} color={TOKENS.colors.textSubtle} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: TOKENS.colors.textMain, marginTop: 16 }}>
          Acceso Restringido
        </Text>
        <Text style={{ fontSize: 14, color: TOKENS.colors.textSubtle, textAlign: 'center', marginHorizontal: 32, marginTop: 8 }}>
          Debes iniciar sesión o registrarte para publicar un servicio.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <Button title="Iniciar Sesión" onPress={() => navigation.navigate('Login')} />
          <Button title="Registrarme" variant="secondary" onPress={() => navigation.navigate('Register')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.introText}>
            Agrega un nuevo servicio a tu catálogo para que los clientes de tu zona puedan encontrarte y contratarte.
          </Text>

          {/* SECTION 1: WHAT SERVICE */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Briefcase" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>¿Qué servicio ofreces?</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rubro Principal *</Text>
              <TextInput style={styles.input} placeholder="Seleccionar rubro..." value={parentCat} onChangeText={setParentCat} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subcategoría (Opcional)</Text>
              <TextInput style={styles.input} placeholder="Ver todos los del rubro" value={subCat} onChangeText={setSubCat} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Servicio Específico *</Text>
              <TextInput style={styles.input} placeholder="Selecciona el servicio exacto" value={specificService} onChangeText={setSpecificService} />
            </View>
          </View>

          {/* SECTION 2: COVERAGE */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="MapPin" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Cobertura del Servicio</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Región *</Text>
              <View style={styles.inputWithIcon}>
                <Icon name="MapPin" size={18} color={TOKENS.colors.textSubtle} />
                <TextInput style={styles.innerInput} placeholder="Selecciona región" value={region} onChangeText={setRegion} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ciudad / Comuna *</Text>
              <View style={styles.inputWithIcon}>
                <Icon name="MapPin" size={18} color={TOKENS.colors.textSubtle} />
                <TextInput style={styles.innerInput} placeholder="Selecciona tu ciudad" value={city} onChangeText={setCity} />
              </View>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Visitas a domicilio</Text>
                <Text style={styles.toggleDesc}>Activa esta opción si ofreces ir al hogar del cliente.</Text>
              </View>
              <Switch 
                value={hasHomeVisit} 
                onValueChange={setHasHomeVisit} 
                trackColor={{ false: TOKENS.colors.surface200, true: TOKENS.colors.brand500 }}
              />
            </View>
          </View>

          {/* SECTION 3: PRICES AND DETAILS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="DollarSign" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Precios y Detalles</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Forma de Cobro *</Text>
              <View style={styles.inputWithIcon}>
                <TextInput style={styles.innerInput} value={cobroType} editable={false} />
                <Icon name="ChevronDown" size={18} color={TOKENS.colors.textSubtle} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Precio Base ($) *</Text>
              <View style={styles.inputWithIcon}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput 
                  style={[styles.innerInput, { fontWeight: 'bold', fontSize: 18 }]} 
                  placeholder="0"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            {/* Financial Breakdown (Service) */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>RESUMEN FINANCIERO</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cobro al cliente:</Text>
                <Text style={styles.breakdownValue}>${(Number(price) || 0).toLocaleString("es-CL")}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Comisión plataforma:</Text>
                <Text style={[styles.breakdownValue, { color: '#dc2626' }]}>- ${commissionAmount.toLocaleString("es-CL")}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.breakdownTotalLabel}>Ingreso Neto para ti:</Text>
                  <Text style={[styles.breakdownTotalValue, { color: '#16a34a' }]}>${receivingAmount.toLocaleString("es-CL")}</Text>
              </View>
            </View>

            <View style={[styles.inputGroup, { marginTop: TOKENS.spacing.lg }]}>
              <Text style={styles.label}>Descripción para el cliente (Opcional)</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Ej: Materiales e insumos incluidos..."
                multiline
                numberOfLines={4}
                value={desc}
                onChangeText={setDesc}
              />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* FIXED FOOTER */}
      <View style={styles.fixedFooter}>
        <Text style={styles.footerHint}>Completa todos los campos obligatorios (*)</Text>
        <View style={styles.footerButtons}>
          <Button title="Cancelar" variant="secondary" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
          <Button
            title={loading ? 'Publicando...' : 'Publicar Servicio'}
            onPress={handlePublish}
            disabled={loading || !parentCat || !specificService || !region || !city || !price}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.lg, paddingBottom: 120 },
  introText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginBottom: TOKENS.spacing.lg, lineHeight: 20 },
  
  section: { backgroundColor: TOKENS.colors.white, borderRadius: 16, padding: TOKENS.spacing.lg, marginBottom: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.surface100, ...TOKENS.shadows.soft },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100, marginBottom: TOKENS.spacing.md },
  sectionTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  
  inputGroup: { marginBottom: TOKENS.spacing.lg },
  label: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain, marginBottom: 8 },
  input: { backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, padding: TOKENS.spacing.md, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
  textArea: { height: 120, textAlignVertical: 'top' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, paddingHorizontal: TOKENS.spacing.md, height: 50, gap: 12 },
  innerInput: { flex: 1, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
  currencySymbol: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle },
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.md, borderRadius: 12, borderWidth: 1, borderColor: TOKENS.colors.surface100 },
  toggleLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  toggleDesc: { fontSize: 11, color: TOKENS.colors.textSubtle, marginTop: 4 },

  breakdownBox: { backgroundColor: TOKENS.colors.brand50, borderRadius: 12, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.brand100 },
  breakdownTitle: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700, textAlign: 'center', marginBottom: TOKENS.spacing.md, letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle },
  breakdownValue: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.brand100 },
  breakdownTotalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold },

  fixedFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200, ...TOKENS.shadows.soft },
  footerHint: { fontSize: 12, color: TOKENS.colors.textSubtle, textAlign: 'center', marginBottom: TOKENS.spacing.sm },
  footerButtons: { flexDirection: 'row', gap: TOKENS.spacing.md },
});
