import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Input, Icon, RegionCitySelect } from '../../components/ui';
import { useRole } from '../../context/RoleContext';
import { useJobs } from '../../hooks/useJobs';
import { containsPhoneNumber } from '../../utils/chile';
import { JOB_COMMISSION_RATE } from '../../utils/comission';
import { getKeyboardVerticalOffset } from '../../utils/layoutMetrics';

export const PublishJobScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');

  const descInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToFocusedField = () => scrollRef.current?.scrollToEnd({ animated: true });

  const { createJob, createLoading: loading } = useJobs();

  const priceValue = Number(price) || 0;
  const commissionAmount = priceValue * JOB_COMMISSION_RATE;
  const receiveAmount = priceValue - commissionAmount;

  const handlePublish = async () => {
    if (!title || !desc || !selectedRegion || !city || !price) {
      Alert.alert('Error', 'Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (containsPhoneNumber(desc)) {
      Alert.alert('Error', 'No puedes incluir números telefónicos en la descripción');
      return;
    }
    try {
      await createJob({
        title,
        description: desc,
        price: Number(price),
        location: city,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  useEffect(() => {
    if (role === 'guest') {
      navigation.replace('Login');
    }
  }, [role, navigation]);

  if (role === 'guest') {
    return null;
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={getKeyboardVerticalOffset(true, insets.top)}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.introText}>
            Describe lo que necesitas con claridad para encontrar al candidato ideal en tu zona. Los trabajadores podrán postular a tu anuncio.
          </Text>

          {/* SECTION 1: INFO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Briefcase" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>¿Qué necesitas?</Text>
            </View>

            <Input
              label="Título del anuncio *"
              placeholder="Ej: Gasfitería urgente, Instalación eléctrica..."
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              onSubmitEditing={() => descInputRef.current?.focus()}
              containerStyle={styles.inputGroup}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción detallada *</Text>
              <TextInput
                ref={descInputRef}
                style={[styles.input, styles.textArea]}
                placeholder="Explica qué necesitas exactamente, materiales incluidos, horarios de preferencia..."
                placeholderTextColor={TOKENS.colors.textMuted}
                multiline
                numberOfLines={5}
                maxLength={200}
                value={desc}
                onChangeText={setDesc}
                onFocus={scrollToFocusedField}
              />
            </View>
          </View>

          {/* SECTION 2: LOCATION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="MapPin" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Ubicación del trabajo</Text>
            </View>

            <RegionCitySelect
              region={selectedRegion}
              city={city}
              onRegionChange={setSelectedRegion}
              onCityChange={setCity}
              regionLabel="Región *"
              cityLabel="Ciudad / Comuna *"
              regionPlaceholder="Selecciona una región"
              cityPlaceholder="Selecciona tu ciudad o comuna"
              testIDPrefix="publish-job"
            />
          </View>

          {/* SECTION 3: BUDGET */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="DollarSign" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Presupuesto</Text>
            </View>

            <Input label="Monto que pagarás ($) *" placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} onFocus={scrollToFocusedField} leftIcon="DollarSign" helperText="Este es el presupuesto total que estás dispuesto a pagar por el trabajo completo." containerStyle={styles.inputGroup} />

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>DESGLOSE FINANCIERO</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Presupuesto total:</Text>
                <Text style={styles.breakdownValue}>${priceValue.toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Comisión de plataforma:</Text>
                <Text style={[styles.breakdownValue, { color: TOKENS.colors.statusDanger }]}>- ${commissionAmount.toLocaleString('es-CL')}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.breakdownTotalLabel}>Pago neto para trabajador:</Text>
                <Text style={styles.breakdownTotalValue}>${receiveAmount.toLocaleString('es-CL')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* FOOTER INSIDE KEYBOARD AVOIDING VIEW */}
        <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, TOKENS.spacing.sm) }]}>
          <Text style={styles.footerHint}>Completa todos los campos obligatorios (*)</Text>
          <Button
            title={loading ? 'Publicando...' : 'Publicar Trabajo'}
            onPress={handlePublish}
            loading={loading}
            disabled={loading || !title || !desc || !selectedRegion || !city || !price}
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.md, paddingBottom: 140 },
  introText: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, marginBottom: TOKENS.spacing.md, lineHeight: 20 },

  section: { backgroundColor: TOKENS.colors.white, borderRadius: 16, padding: TOKENS.spacing.md, marginBottom: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.surface100, ...TOKENS.shadows.soft },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100, marginBottom: TOKENS.spacing.md },
  sectionTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },

  inputGroup: { marginBottom: TOKENS.spacing.md },
  label: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain, marginBottom: 8 },
  input: { backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, padding: TOKENS.spacing.md, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
  textArea: { height: 120, textAlignVertical: 'top' },

  selectField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: TOKENS.colors.white, borderRadius: TOKENS.geometry.radiusInput, borderWidth: 1, borderColor: TOKENS.colors.surface200, paddingHorizontal: TOKENS.spacing.md, height: 52, ...TOKENS.shadows.soft },
  selectFieldDisabled: { backgroundColor: TOKENS.colors.surface50, borderColor: TOKENS.colors.surface100 },
  selectFieldText: { fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain, fontWeight: TOKENS.typography.weights.medium, flex: 1, paddingRight: TOKENS.spacing.sm },
  selectFieldPlaceholder: { color: TOKENS.colors.textMuted },

  breakdownBox: { backgroundColor: TOKENS.colors.brand50, borderRadius: 12, padding: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.brand200, marginTop: TOKENS.spacing.sm },
  breakdownTitle: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700, textAlign: 'center', marginBottom: TOKENS.spacing.md, letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle },
  breakdownValue: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.brand200 },
  breakdownTotalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.success700 },

  fixedFooter: { backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200, ...TOKENS.shadows.medium },
  footerHint: { fontSize: 12, color: TOKENS.colors.textSubtle, textAlign: 'center', marginBottom: TOKENS.spacing.sm },

  pickerModal: { maxWidth: 340, maxHeight: 480 },
  pickerTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md },
  pickerList: { maxHeight: 360 },
  pickerOption: { paddingVertical: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  pickerOptionText: { fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
});
