import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Switch, Image, ActivityIndicator } from 'react-native';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { TOKENS } from '../../theme';
import { Button, Input, Icon, Modal, RegionCitySelect } from '../../components/ui';
import { VerificationCenterModal } from '../../components/modals/VerificationCenterModal';
import { useRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../hooks/useMarketplace';
import { uploadImage } from '../../utils/uploadImage';
import { getImageUrl } from '../../utils/imageUrl';
import { containsPhoneNumber } from '../../utils/chile';
import { MARKETPLACE_LIMITS, getProductPriceBreakdown } from '../../utils/comission';
import { getKeyboardVerticalOffset } from '../../utils/layoutMetrics';
import { FIND_ALL_CATEGORIES, PRODUCTS_COUNT_BY_USER } from '../../graphql/operations/products';
import { useQuery } from '@apollo/client/react';

const DELIVERY_TYPE = 'Despacho a domicilio';
const CONFIRMATION_DAYS_AHEAD = 3;

export const PublishProductScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();
  const { user } = useAuth();

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const hasBank = Boolean(user?.bankAccount || user?.provider?.bank);
  const hasBasic = Boolean(user?.displayName?.trim() && user?.birthday && user?.emailVerified);
  const isProfileReady = hasBasic && hasBank;

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');

  const descInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToFocusedField = () => scrollRef.current?.scrollToEnd({ animated: true });

  const [selectedRegion, setSelectedRegion] = useState('');
  const [city, setCity] = useState('');
  const [shippingPayer, setShippingPayer] = useState<'Comprador' | 'Vendedor'>('Comprador');
  const [maxDispatchDays, setMaxDispatchDays] = useState('3');
  const [shippingDisabled, setShippingDisabled] = useState(false);

  const [parentCatId, setParentCatId] = useState<number | ''>('');
  const [categoryProductId, setCategoryProductId] = useState<number | ''>('');

  const [activePicker, setActivePicker] = useState<'parent' | 'child' | null>(null);

  const { createProduct, createLoading: loading } = useMarketplace();

  const { data: catData } = useQuery<{ findAllCategory: any[] }>(FIND_ALL_CATEGORIES);
  const categories = useMemo(() => catData?.findAllCategory || [], [catData]);

  const marketplacePlan = useMemo(() => {
    const orders = user?.marketplacePlanOrders;
    if (orders && orders.length && orders[0]?.planActive) return orders[0]?.plan;
    return 'FREE';
  }, [user]);

  const limits = MARKETPLACE_LIMITS[marketplacePlan as keyof typeof MARKETPLACE_LIMITS] ?? MARKETPLACE_LIMITS.FREE;
  const maxPhotos = limits.maxPhotos;

  const { data: countData } = useQuery<{ productsByUser: any[] }>(PRODUCTS_COUNT_BY_USER, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: 'network-only',
  });
  const productCount = countData?.productsByUser?.length || 0;
  const isAtPublicationLimit = productCount >= limits.maxPublications && limits.maxPublications !== Infinity;

  const rootCategories = useMemo(() => categories.filter((c: any) => !c.parentId), [categories]);
  const availableChildren = useMemo(() => {
    if (parentCatId === '') return [];
    return categories.filter((c: any) => c.parentId === parentCatId);
  }, [categories, parentCatId]);

  const selectedCategoryObj = categories.find((c: any) => c.id === categoryProductId);
  const categoryShippingDisabled = selectedCategoryObj?.shippingDisabled ?? false;

  const breakdown = getProductPriceBreakdown(Number(price) || 0);

  const availableChildCount = availableChildren.length;

  useEffect(() => {
    if (parentCatId !== '' && availableChildren.length === 0) {
      setCategoryProductId(parentCatId);
    }
  }, [parentCatId, availableChildren]);

  const handlePickPhotos = async () => {
    if (uploading) return;
    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      Alert.alert('Límite alcanzado', `Puedes subir máximo ${maxPhotos} fotos según tu plan.`);
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: remaining,
    });
    if (result.didCancel) return;
    const assets = result.assets || [];
    if (!assets.length) return;
    setUploading(true);
    try {
      const keys: string[] = [];
      for (const asset of assets) {
        const key = await uploadImage(asset, 'PRODUCT');
        keys.push(key);
      }
      setPhotos((prev) => [...prev, ...keys]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!title || !price || categoryProductId === '') {
      Alert.alert('Error', 'Por favor, completa los campos obligatorios marcados con asterisco (*).');
      return;
    }
    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum <= 0) {
      Alert.alert('Error', 'Por favor, ingresa un stock válido mayor a cero.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Error', 'Debes subir al menos 1 imagen del producto.');
      return;
    }
    if (!shippingDisabled && !city) {
      Alert.alert('Error', 'Por favor selecciona una ubicación para tu producto.');
      return;
    }
    if (containsPhoneNumber(desc)) {
      Alert.alert('Error', 'No puedes incluir números telefónicos en la descripción');
      return;
    }

    const slug = `${title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const basePrice = Number(price) || 0;

    const input: any = {
      name: title,
      slug,
      description: desc,
      location: shippingDisabled ? '' : city,
      price: basePrice,
      basePrice,
      stock: stockNum,
      categoryProductId: Number(categoryProductId),
      imageUrls: photos,
      shippingDisabled: shippingDisabled || categoryShippingDisabled,
    };

    if (!shippingDisabled && !categoryShippingDisabled) {
      const confirmationDate = new Date();
      confirmationDate.setDate(confirmationDate.getDate() + CONFIRMATION_DAYS_AHEAD);
      input.conditions = {
        deliveryType: DELIVERY_TYPE,
        shippingPayer,
        maxDispatchDays: parseInt(maxDispatchDays, 10) || 3,
        confirmationDeadline: confirmationDate.toISOString(),
      };
    }

    if (!isProfileReady) {
      setShowVerificationModal(true);
      return;
    }

    try {
      await createProduct(input);
      Alert.alert('Éxito', '¡Tu producto ha sido publicado correctamente!');
      navigation.goBack();
    } catch (err: any) {
      const message = err?.graphQLErrors?.[0]?.message || err.message || '';
      if (message.includes('LIMIT_PRODUCTS_ALERT')) {
        Alert.alert('Límite alcanzado', 'Has alcanzado el límite de publicaciones de tu plan. Actualiza tu plan para seguir publicando productos.');
        navigation.navigate('MarketplacePlans');
      } else if (message.includes('verificación') || message.includes('verificacion') || message.includes('cuenta bancaria')) {
        setShowVerificationModal(true);
      } else if (message.includes('Ya existe un producto') || message.includes('slug')) {
        Alert.alert('Error', 'Ya tienes un producto con un nombre similar. Intenta con otro título.');
      } else {
        Alert.alert('Error', message || 'Ha ocurrido un error inesperado.');
      }
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

  const pickerOptions: { value: string; label: string }[] = (() => {
    switch (activePicker) {
      case 'parent':
        return rootCategories.map((c: any) => ({ value: String(c.id), label: c.name }));
      case 'child':
        return availableChildren.map((c: any) => ({ value: String(c.id), label: c.name }));
      default:
        return [];
    }
  })();

  const pickerTitle = { parent: 'Categoría', child: 'Subcategoría' }[activePicker ?? 'parent'];

  const parentLabel = rootCategories.find((c: any) => c.id === parentCatId)?.name || '';
  const childLabel = availableChildren.find((c: any) => c.id === categoryProductId)?.name || '';

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={getKeyboardVerticalOffset(true, insets.top)}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">

          {isAtPublicationLimit && (
            <View style={styles.limitBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.limitBannerText}>Has alcanzado el límite de {limits.maxPublications} publicaciones de tu plan actual.</Text>
              </View>
              <TouchableOpacity style={styles.limitBannerBtn} onPress={() => navigation.navigate('MarketplacePlans')}>
                <Text style={styles.limitBannerBtnText}>Mejorar Plan</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PROACTIVE EARLY WARNING: BANK & PROFILE */}
          {!isProfileReady && (
            <TouchableOpacity
              style={styles.earlyWarningCard}
              activeOpacity={0.85}
              onPress={() => setShowVerificationModal(true)}
            >
              <View style={styles.earlyWarningIconBox}>
                <Icon name="CreditCard" size={20} color={TOKENS.colors.brand500} />
              </View>
              <View style={styles.earlyWarningContent}>
                <Text style={styles.earlyWarningTitle}>Datos de cobro pendientes</Text>
                <Text style={styles.earlyWarningSub}>Configura tu cuenta bancaria para recibir tus pagos sin salir de esta pantalla ni perder tus fotos.</Text>
              </View>
              <Icon name="ChevronRight" size={18} color={TOKENS.colors.brand500} />
            </TouchableOpacity>
          )}

          {/* SECTION 1: PHOTOS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Camera" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Fotografías</Text>
            </View>
            <Text style={styles.helperText}>Sube hasta {maxPhotos} fotos. La primera será la portada de tu anuncio.</Text>
            <View style={styles.photoGrid}>
              {photos.map((key, i) => (
                <View key={key} style={styles.photoBox}>
                  <Image source={{ uri: getImageUrl(key) }} style={styles.photoPreview} resizeMode="cover" />
                  {i === 0 && <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>PORTADA</Text></View>}
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotos((prev) => prev.filter((p) => p !== key))}>
                    <Icon name="X" size={14} color={TOKENS.colors.statusDanger} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < maxPhotos && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickPhotos} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color={TOKENS.colors.brand500} />
                  ) : (
                    <>
                      <Icon name="UploadCloud" size={24} color={TOKENS.colors.textSubtle} />
                      <Text style={styles.addPhotoText}>Agregar foto</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* SECTION 2: INFO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Info" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Información del producto</Text>
            </View>

            <View style={styles.inputGroup}>
              <SelectField label="Categoría *" value={parentLabel} placeholder="Seleccionar categoría principal..." onPress={() => setActivePicker('parent')} />
            </View>

            {availableChildCount > 0 && (
              <View style={styles.inputGroup}>
                <SelectField label="Subcategoría" value={childLabel} placeholder="Seleccionar subcategoría..." onPress={() => setActivePicker('child')} />
              </View>
            )}

            <Input
              label="Título del anuncio *"
              placeholder="Ej: Cámara Sony A7III con lente..."
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              onSubmitEditing={() => descInputRef.current?.focus()}
              containerStyle={styles.inputGroup}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Descripción detallada</Text>
              <TextInput
                ref={descInputRef}
                style={[styles.textAreaInput]}
                placeholder="Escribe todo lo que el comprador necesita saber: estado, accesorios, etc."
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

          {/* SECTION 3: PRICE AND STOCK */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="DollarSign" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Precio y Disponibilidad</Text>
            </View>

            <Input label="¿Cuánto quieres recibir? ($) *" placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} onFocus={scrollToFocusedField} leftIcon="DollarSign" helperText="Este es el monto libre que recibirás por cada venta." containerStyle={styles.inputGroup} />

            <Input label="Stock disponible *" placeholder="Cantidad" keyboardType="numeric" value={stock} onChangeText={setStock} onFocus={scrollToFocusedField} containerStyle={styles.inputGroup} />

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>RESUMEN DE PUBLICACIÓN</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tú recibes:</Text>
                <Text style={styles.breakdownValue}>${(Number(price) || 0).toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Comisión por venta ({breakdown.rate * 100}%):</Text>
                <Text style={[styles.breakdownValue, { color: TOKENS.colors.statusDanger }]}>+ ${breakdown.commission.toLocaleString('es-CL')}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.breakdownTotalLabel}>Precio final cliente:</Text>
                <Text style={[styles.breakdownTotalValue, { color: TOKENS.colors.brand700 }]}>${breakdown.total.toLocaleString('es-CL')}</Text>
              </View>
            </View>
          </View>

          {/* SECTION 4: LOCATION & LOGISTICS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Truck" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Ubicación y Entrega</Text>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Producto sin envío (solo retiro)</Text>
                <Text style={styles.toggleDesc}>El comprador deberá retirar el producto en tu ubicación</Text>
              </View>
              <Switch value={shippingDisabled} onValueChange={setShippingDisabled} trackColor={{ false: TOKENS.colors.surface200, true: TOKENS.colors.brand500 }} />
            </View>

            {!shippingDisabled && (
              <>
                <RegionCitySelect
                  region={selectedRegion}
                  city={city}
                  onRegionChange={setSelectedRegion}
                  onCityChange={setCity}
                  regionLabel="Región del producto *"
                  cityLabel="Ciudad / Comuna *"
                  regionPlaceholder="Selecciona una región"
                  cityPlaceholder="Selecciona tu ciudad o comuna"
                  testIDPrefix="publish-product"
                />

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>¿Quién paga el envío?</Text>
                  <View style={styles.payerRow}>
                    {['Comprador', 'Vendedor'].map((option) => (
                      <TouchableOpacity key={option} style={[styles.payerBtn, shippingPayer === option && styles.payerBtnActive]} onPress={() => setShippingPayer(option as any)}>
                        <Text style={[styles.payerText, shippingPayer === option && styles.payerTextActive]}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Input label="Días para despachar" keyboardType="numeric" value={maxDispatchDays} onChangeText={setMaxDispatchDays} onFocus={scrollToFocusedField} helperText="Días hábiles máximos para entregar al courier." containerStyle={styles.inputGroup} />
              </>
            )}
          </View>
        </ScrollView>

        {/* FIXED FOOTER INSIDE KEYBOARD AVOIDING VIEW */}
        <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, TOKENS.spacing.sm) }]}>
          <Text style={styles.footerHint}>Completa todos los campos obligatorios (*)</Text>
          <Button
            title={loading ? 'Publicando...' : 'Publicar Ahora'}
            onPress={handlePublish}
            loading={loading}
            disabled={loading || !title || !price || categoryProductId === '' || (isAtPublicationLimit) || (!shippingDisabled && !city)}
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
            <TouchableOpacity key={opt.value} style={styles.pickerOption} onPress={() => {
              switch (activePicker) {
                case 'parent':
                  setParentCatId(Number(opt.value));
                  setCategoryProductId('');
                  break;
                case 'child':
                  setCategoryProductId(Number(opt.value));
                  break;
              }
              setActivePicker(null);
            }}>
              <Text style={styles.pickerOptionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>

      {/* IN-CONTEXT VERIFICATION MODAL */}
      <VerificationCenterModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={() => {
          setShowVerificationModal(false);
          Alert.alert('Datos actualizados', 'Tus datos fueron guardados exitosamente. Ya puedes publicar tu producto.');
        }}
        requiredScope="full"
        title="Datos para recibir pagos"
        description="Configura tu cuenta bancaria y datos personales para recibir el dinero de tus ventas. Tus fotos y datos del producto no se perderán."
      />
    </View>
  );
};

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onPress: () => void;
  containerStyle?: any;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, placeholder, disabled, onPress, containerStyle }) => {
  const isDisabled = !!disabled;
  return (
    <View style={containerStyle}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={[styles.selectField, isDisabled && styles.selectFieldDisabled]} onPress={onPress} disabled={isDisabled} activeOpacity={0.7}>
        <Text style={[styles.selectFieldText, !value && styles.selectFieldPlaceholder]}>{value || placeholder || 'Seleccionar'}</Text>
        <Icon name="ChevronDown" size={18} color={TOKENS.colors.textSubtle} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.md, paddingBottom: 160 },
  section: { backgroundColor: TOKENS.colors.white, borderRadius: 16, padding: TOKENS.spacing.md, marginBottom: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.surface100, ...TOKENS.shadows.soft },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100, marginBottom: TOKENS.spacing.md },
  sectionTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  helperText: { fontSize: 11, color: TOKENS.colors.textSubtle, marginTop: 4 },

  limitBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, padding: TOKENS.spacing.md, marginBottom: TOKENS.spacing.md, gap: 12 },
  limitBannerText: { fontSize: TOKENS.typography.sizes.sm, color: '#92400e', fontWeight: TOKENS.typography.weights.semibold, flex: 1 },
  limitBannerBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#d97706', borderRadius: 8 },
  limitBannerBtnText: { fontSize: TOKENS.typography.sizes.xs, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.white },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  photoBox: { width: 100, height: 100, borderRadius: 12, backgroundColor: TOKENS.colors.surface100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  removePhotoBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: TOKENS.colors.white, alignItems: 'center', justifyContent: 'center', ...TOKENS.shadows.soft },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: TOKENS.colors.brand500, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coverBadgeText: { color: TOKENS.colors.white, fontSize: 8, fontWeight: 'bold' },
  addPhotoBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface300, borderStyle: 'dashed', backgroundColor: TOKENS.colors.surface50, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addPhotoText: { fontSize: 12, color: TOKENS.colors.textSubtle, fontWeight: TOKENS.typography.weights.semibold },

  inputGroup: { marginBottom: TOKENS.spacing.md },
  fieldLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain, marginBottom: 8 },
  textAreaInput: { backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, padding: TOKENS.spacing.md, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain, height: 120, textAlignVertical: 'top' },

  breakdownBox: { backgroundColor: TOKENS.colors.brand50, borderRadius: 12, padding: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.brand200, marginTop: TOKENS.spacing.sm },
  breakdownTitle: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700, textAlign: 'center', marginBottom: TOKENS.spacing.md, letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle },
  breakdownValue: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.brand200 },
  breakdownTotalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold },

  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.surface50, padding: TOKENS.spacing.md, borderRadius: 12, borderWidth: 1, borderColor: TOKENS.colors.surface100, marginBottom: TOKENS.spacing.md },
  toggleLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  toggleDesc: { fontSize: 11, color: TOKENS.colors.textSubtle, marginTop: 4 },

  payerRow: { flexDirection: 'row', gap: 12 },
  payerBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface200, backgroundColor: TOKENS.colors.white },
  payerBtnActive: { borderColor: TOKENS.colors.brand500, backgroundColor: TOKENS.colors.brand50 },
  payerText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle },
  payerTextActive: { color: TOKENS.colors.brand600 },

  fixedFooter: { backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200, ...TOKENS.shadows.medium },
  footerHint: { fontSize: 12, color: TOKENS.colors.textSubtle, textAlign: 'center', marginBottom: TOKENS.spacing.sm },

  selectField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: TOKENS.colors.white, borderRadius: TOKENS.geometry.radiusInput, borderWidth: 1, borderColor: TOKENS.colors.surface200, paddingHorizontal: TOKENS.spacing.md, height: 52, ...TOKENS.shadows.soft },
  selectFieldDisabled: { backgroundColor: TOKENS.colors.surface50, borderColor: TOKENS.colors.surface100 },
  selectFieldText: { fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain, fontWeight: TOKENS.typography.weights.medium, flex: 1, paddingRight: TOKENS.spacing.sm },
  selectFieldPlaceholder: { color: TOKENS.colors.textMuted },

  pickerModal: { maxWidth: 340, maxHeight: 480 },
  pickerTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.md },
  pickerList: { maxHeight: 360 },
  pickerOption: { paddingVertical: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100 },
  pickerOptionText: { fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
  earlyWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.brand50,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.brand200,
    borderRadius: 14,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
    gap: 12,
  },
  earlyWarningIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earlyWarningContent: {
    flex: 1,
  },
  earlyWarningTitle: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.brand800,
    marginBottom: 2,
  },
  earlyWarningSub: {
    fontSize: 11,
    color: TOKENS.colors.brand700,
    lineHeight: 15,
  },
});
