import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Icon } from '../../components';
import { useRole } from '../../context/RoleContext';

const JOB_COMMISSION_RATE = 0.10; // Assuming 10% commission

export const PublishJobScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();
  
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [receiveAmount, setReceiveAmount] = useState(0);

  useEffect(() => {
    const priceValue = Number(price) || 0;
    const comm = priceValue * JOB_COMMISSION_RATE;
    setCommissionAmount(comm);
    setReceiveAmount(priceValue - comm);
  }, [price]);

  const handlePublish = () => {
    if (!title || !desc || !region || !city || !price) {
      Alert.alert('Error', 'Por favor, completa todos los campos obligatorios.');
      return;
    }
    // Simulate API call
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  if (role === 'guest') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom, justifyContent: 'center', alignItems: 'center' }]}>
        <Icon name="Lock" size={48} color={TOKENS.colors.textSubtle} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: TOKENS.colors.textMain, marginTop: 16 }}>
          Acceso Restringido
        </Text>
        <Text style={{ fontSize: 14, color: TOKENS.colors.textSubtle, textAlign: 'center', marginHorizontal: 32, marginTop: 8 }}>
          Debes iniciar sesión o registrarte para publicar un trabajo.
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
            Describe lo que necesitas con claridad para encontrar al candidato ideal en tu zona. Los trabajadores podrán postular a tu anuncio.
          </Text>

          {/* SECTION 1: INFO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Briefcase" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>¿Qué necesitas?</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título del anuncio *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ej: Gasfitería urgente, Instalación eléctrica..."
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción detallada *</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Explica qué necesitas exactamente, materiales incluidos, horarios de preferencia..."
                multiline
                numberOfLines={5}
                value={desc}
                onChangeText={setDesc}
              />
            </View>
          </View>

          {/* SECTION 2: LOCATION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="MapPin" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Ubicación del trabajo</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Región *</Text>
              <View style={styles.inputWithIcon}>
                <Icon name="MapPin" size={18} color={TOKENS.colors.textSubtle} />
                <TextInput 
                  style={styles.innerInput} 
                  placeholder="Ej: Región Metropolitana"
                  value={region}
                  onChangeText={setRegion}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ciudad / Comuna *</Text>
              <View style={styles.inputWithIcon}>
                <Icon name="MapPin" size={18} color={TOKENS.colors.textSubtle} />
                <TextInput 
                  style={styles.innerInput} 
                  placeholder="Ej: Santiago Centro"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>
          </View>

          {/* SECTION 3: BUDGET */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="DollarSign" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Presupuesto</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monto que pagarás ($) *</Text>
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
              <Text style={styles.helperText}>Este es el presupuesto total que estás dispuesto a pagar por el trabajo completo.</Text>
            </View>

            {/* Financial Breakdown */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>DESGLOSE FINANCIERO</Text>
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Presupuesto total:</Text>
                <Text style={styles.breakdownValue}>${(Number(price) || 0).toLocaleString("es-CL")}</Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Comisión de plataforma:</Text>
                <Text style={[styles.breakdownValue, { color: TOKENS.colors.error600 }]}>
                  - ${commissionAmount.toLocaleString("es-CL")}
                </Text>
              </View>
              
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.breakdownTotalLabel}>Pago neto para trabajador:</Text>
                <Text style={styles.breakdownTotalValue}>${receiveAmount.toLocaleString("es-CL")}</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* FIXED FOOTER */}
      <View style={styles.fixedFooter}>
        <Text style={styles.footerHint}>Completa todos los campos obligatorios (*)</Text>
        <View style={styles.footerButtons}>
          <Button 
            title="Cancelar" 
            variant="secondary" 
            onPress={() => navigation.goBack()} 
            style={{ flex: 1 }} 
          />
          <Button 
            title="Publicar Trabajo" 
            onPress={handlePublish} 
            disabled={!title || !desc || !region || !city || !price}
            style={{ flex: 2 }} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.white, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginLeft: 12 },
  
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
  helperText: { fontSize: 12, color: TOKENS.colors.textSubtle, marginTop: 8 },
  
  breakdownBox: { backgroundColor: TOKENS.colors.brand50, borderRadius: 12, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.brand200 },
  breakdownTitle: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700, textAlign: 'center', marginBottom: TOKENS.spacing.md, letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle },
  breakdownValue: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.brand200 },
  breakdownTotalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.success700 },

  fixedFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200, ...TOKENS.shadows.medium },
  footerHint: { fontSize: 12, color: TOKENS.colors.textSubtle, textAlign: 'center', marginBottom: TOKENS.spacing.sm },
  footerButtons: { flexDirection: 'row', gap: TOKENS.spacing.md },
});
