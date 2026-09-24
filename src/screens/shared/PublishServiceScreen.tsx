import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Input, Icon, Modal, RegionCitySelect } from '../../components/ui';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { useServices } from '../../hooks/useServices';
import { GET_CATEGORIES } from '../../graphql/operations/categories';
import { GET_PROVIDER_PLAN } from '../../graphql/operations/services';
import { useQuery } from '@apollo/client/react';
import { getServiceRate } from '../../utils/comission';
import { containsPhoneNumber } from '../../utils/chile';
import { getKeyboardVerticalOffset } from '../../utils/layoutMetrics';

const FORMAS_DE_COBRO = ['POR SERVICIO COMPLETO', 'POR HORA', 'METRO CUADRADO'];

type PickerType =
  | 'parent'
  | 'child'
  | 'service'
  | 'cobro'
  | null;

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  services?: { id: number; name: string; slug: string }[];
}

interface SelectOption {
  value: string;
  label: string;
  extraValue?: number;
}

export const PublishServiceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();
  const { user } = useAuth();
  const hasProvider = !!user?.provider;

  const { data: catData, loading: catLoading } = useQuery<{
    categories: Category[];
  }>(GET_CATEGORIES);
  const { data: planData } = useQuery<{ myProviderPlan?: { plan: string } | null }>(
    GET_PROVIDER_PLAN,
  );

  const [parentCatId, setParentCatId] = useState<number | ''>('');
  const [childCatId, setChildCatId] = useState<number | ''>('');
  const [selectedServiceSlug, setSelectedServiceSlug] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [city, setCity] = useState('');
  const [hasHomeVisit, setHasHomeVisit] = useState(false);
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [cobroType, setCobroType] = useState(FORMAS_DE_COBRO[0]);

  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToFocusedField = () => scrollRef.current?.scrollToEnd({ animated: true });

  const { createService, createLoading: loading } = useServices();

  const categories = useMemo(
    () => catData?.categories || [],
    [catData],
  );
  const plan = planData?.myProviderPlan?.plan || 'FREE';

  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

  const childCategories = useMemo(() => {
    if (parentCatId === '') return [];
    return categories.filter((c) => c.parentId === parentCatId);
  }, [categories, parentCatId]);

  const availableServices = useMemo(() => {
    if (childCatId !== '') {
      const childCat = categories.find((c) => c.id === childCatId);
      return childCat?.services || [];
    }
    if (parentCatId !== '') {
      const children = categories.filter((c) => c.parentId === parentCatId);
      if (children.length > 0) {
        return children.flatMap((c) => c.services || []);
      }
      const parentCat = categories.find((c) => c.id === parentCatId);
      return parentCat?.services || [];
    }
    return [];
  }, [categories, parentCatId, childCatId]);

  const selectedCategoryId = useMemo(() => {
    if (!selectedServiceSlug) return undefined;
    const cat = categories.find((c) =>
      (c.services || []).some((s) => s.slug === selectedServiceSlug),
    );
    return cat?.id;
  }, [categories, selectedServiceSlug]);

  const rate = getServiceRate(plan);
  const priceVal = parseInt(price.replace(/\./g, ''), 10) || 0;
  const commissionAmount = Math.floor(priceVal * rate);
  const receivingAmount = priceVal - commissionAmount;

  const pickerOptions: SelectOption[] = (() => {
    switch (activePicker) {
      case 'parent':
        return mainCategories.map((c) => ({
          value: String(c.id),
          label: c.name,
          extraValue: c.id,
        }));
      case 'child':
        return childCategories.map((c) => ({
          value: String(c.id),
          label: c.name,
          extraValue: c.id,
        }));
      case 'service':
        return availableServices.map((s) => ({
          value: s.slug,
          label: s.name,
        }));
      case 'cobro':
        return FORMAS_DE_COBRO.map((f) => ({ value: f, label: f }));
      default:
        return [];
    }
  })();

  const pickerTitle = {
    parent: 'Rubro Principal',
    child: 'Subcategoría',
    service: 'Servicio Específico',
    cobro: 'Forma de Cobro',
  }[activePicker ?? 'parent'];

  const handleSelectOption = (opt: SelectOption) => {
    switch (activePicker) {
      case 'parent':
        setParentCatId(opt.extraValue ?? '');
        setChildCatId('');
        setSelectedServiceSlug('');
        break;
      case 'child':
        setChildCatId(opt.extraValue ?? '');
        setSelectedServiceSlug('');
        break;
      case 'service':
        setSelectedServiceSlug(opt.value);
        break;
      case 'cobro':
        setCobroType(opt.value);
        break;
    }
    setActivePicker(null);
  };

  const parentLabel =
    mainCategories.find((c) => c.id === parentCatId)?.name || '';
  const childLabel = childCategories.find((c) => c.id === childCatId)?.name || '';
  const serviceLabel =
    availableServices.find((s) => s.slug === selectedServiceSlug)?.name || '';

  const handlePublish = async () => {
    if (!user?.isProfileComplete) {
      Alert.alert('Perfil incompleto', 'Completa tu perfil de proveedor antes de publicar un servicio.');
      navigation.navigate('MyProfile');
      return;
    }
    if (!selectedServiceSlug || !city || priceVal <= 0) {
      Alert.alert('Error', 'Por favor completa los campos obligatorios: Servicio, Ciudad y Precio.');
      return;
    }
    if (containsPhoneNumber(desc)) {
      Alert.alert('Error', 'No puedes incluir números telefónicos en la descripción');
      return;
    }
    const finalDesc = `Forma de cobro: ${cobroType}\n${desc}`;
    try {
      await createService({
        categoryId: selectedCategoryId!,
        city,
        description: finalDesc,
        hasHomeVisit,
        price: priceVal,
        slug: selectedServiceSlug,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
      navigation.navigate('Plans');
    }
  };

  useEffect(() => {
    if (role === 'guest') {
      navigation.replace('Login');
      return;
    }
    if (!hasProvider) {
      navigation.replace('BecomeProvider');
    }
  }, [role, hasProvider, navigation]);

  if (role === 'guest' || !hasProvider) {
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
            Agrega un nuevo servicio a tu catálogo para que los clientes de tu zona puedan encontrarte y contratarte.
          </Text>

          {/* SECTION 1: WHAT SERVICE */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Briefcase" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>¿Qué servicio ofreces?</Text>
            </View>

            <SelectField
              label="Rubro Principal *"
              value={parentLabel}
              placeholder="Seleccionar rubro..."
              disabled={catLoading}
              onPress={() => setActivePicker('parent')}
            />

            {childCategories.length > 0 && (
              <SelectField
                label="Subcategoría (Opcional)"
                value={childLabel}
                placeholder="Ver todos los del rubro"
                onPress={() => setActivePicker('child')}
              />
            )}

            <SelectField
              label="Servicio Específico *"
              value={serviceLabel}
              placeholder={
                availableServices.length === 0 && parentCatId !== ''
                  ? 'No hay servicios en esta categoría'
                  : 'Selecciona el servicio exacto'
              }
              disabled={parentCatId === '' || availableServices.length === 0}
              onPress={() => setActivePicker('service')}
            />
          </View>

          {/* SECTION 2: COVERAGE */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="MapPin" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Cobertura del Servicio</Text>
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
              testIDPrefix="publish-service"
            />

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

            <SelectField
              label="Forma de Cobro *"
              value={cobroType}
              onPress={() => setActivePicker('cobro')}
            />

            <Input
              label="Precio Base ($) *"
              placeholder="0"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              onFocus={scrollToFocusedField}
              leftIcon="DollarSign"
              containerStyle={styles.inputGroup}
            />

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>RESUMEN FINANCIERO</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cobro al cliente:</Text>
                <Text style={styles.breakdownValue}>${priceVal.toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Comisión plataforma (Plan {plan}):</Text>
                <Text style={[styles.breakdownValue, { color: TOKENS.colors.statusDanger }]}>- ${commissionAmount.toLocaleString('es-CL')}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.breakdownTotalLabel}>Ingreso Neto para ti:</Text>
                <Text style={[styles.breakdownTotalValue, { color: TOKENS.colors.statusSuccess }]}>${receivingAmount.toLocaleString('es-CL')}</Text>
              </View>
            </View>

            <View style={[styles.inputGroup, { marginTop: TOKENS.spacing.md }]}>
              <Text style={styles.label}>Descripción para el cliente (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ej: Materiales e insumos incluidos, garantía del trabajo..."
                placeholderTextColor={TOKENS.colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={200}
                value={desc}
                onChangeText={setDesc}
                onFocus={scrollToFocusedField}
              />
            </View>
          </View>
        </ScrollView>

        {/* FIXED FOOTER INSIDE KEYBOARD AVOIDING VIEW */}
        <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, TOKENS.spacing.sm) }]}>
          <Text style={styles.footerHint}>Completa todos los campos obligatorios (*)</Text>
          <Button
            title={loading ? 'Publicando...' : 'Publicar Servicio'}
            onPress={handlePublish}
            loading={loading}
            disabled={loading || !selectedServiceSlug || !city || priceVal <= 0}
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>

      {/* PICKER MODAL */}
      <Modal visible={activePicker !== null} onClose={() => setActivePicker(null)} contentStyle={styles.pickerModal}>
        <Text style={styles.pickerTitle}>{pickerTitle}</Text>
        <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
          {pickerOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.pickerOption}
              onPress={() => handleSelectOption(opt)}
            >
              <Text style={styles.pickerOptionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
};

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onPress: () => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, placeholder, disabled, onPress }) => {
  const isDisabled = !!disabled;
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectField, isDisabled && styles.selectFieldDisabled]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectFieldText, !value && styles.selectFieldPlaceholder]}>
          {value || placeholder || 'Seleccionar'}
        </Text>
        <Icon name="ChevronDown" size={18} color={TOKENS.colors.textSubtle} />
      </TouchableOpacity>
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

  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    paddingHorizontal: TOKENS.spacing.md,
    height: 52,
    ...TOKENS.shadows.soft,
  },
  selectFieldDisabled: {
    backgroundColor: TOKENS.colors.surface50,
    borderColor: TOKENS.colors.surface100,
  },
  selectFieldText: { fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain, fontWeight: TOKENS.typography.weights.medium, flex: 1, paddingRight: TOKENS.spacing.sm },
  selectFieldPlaceholder: { color: TOKENS.colors.textMuted },

  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.md, borderRadius: 12, borderWidth: 1, borderColor: TOKENS.colors.surface100 },
  toggleLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  toggleDesc: { fontSize: 11, color: TOKENS.colors.textSubtle, marginTop: 4 },

  breakdownBox: { backgroundColor: TOKENS.colors.brand50, borderRadius: 12, padding: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.brand100, marginTop: TOKENS.spacing.sm },
  breakdownTitle: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700, textAlign: 'center', marginBottom: TOKENS.spacing.md, letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, flexShrink: 1, marginRight: 8 },
  breakdownValue: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.brand100 },
  breakdownTotalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold },

  fixedFooter: { backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200, ...TOKENS.shadows.medium },
  footerHint: { fontSize: 12, color: TOKENS.colors.textSubtle, textAlign: 'center', marginBottom: TOKENS.spacing.sm },

  pickerModal: { maxWidth: 340, maxHeight: 480 },
  pickerTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md },
  pickerList: { maxHeight: 360 },
  pickerOption: { paddingVertical: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  pickerOptionText: { fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
});
