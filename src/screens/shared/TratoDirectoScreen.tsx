import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal as RNModal,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { TOKENS } from '../../theme';
import { Icon, Button, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useCategories } from '../../context/CategoriesContext';
import { DEEP_LINK_CALLBACK } from '../../config/endpoints';
import { RequireAuth } from '../../components/ui/RequireAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uploadImage } from '../../utils/uploadImage';
import { getImageUrl } from '../../utils/imageUrl';

export const TratoDirectoScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<number>(30);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [city, setCity] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [info, setInfo] = useState<string>('');
  const [link, setLink] = useState<string>('');

  const handlePickImage = useCallback(async () => {
    if (uploadingImage) return;
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setUploadingImage(true);
    try {
      const key = await uploadImage(asset, 'ADS');
      setImageKey(key);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingImage(false);
    }
  }, [uploadingImage]);

  const { createAd, createFlowAd } = usePlans();
  const { categories, categoriesLoading } = useCategories();
  const [loading, setLoading] = useState(false);

  const pricePerDay = 1000;

  const calculatePricing = (d: number) => {
    let discountPct = 0;
    if (d >= 365) discountPct = 50;
    else if (d >= 180) discountPct = 40;
    else if (d >= 90) discountPct = 30;

    const basePrice = d * pricePerDay;
    const discountAmount = basePrice * (discountPct / 100);
    const finalPrice = basePrice - discountAmount;

    return { basePrice, discountAmount, discountPct, finalPrice };
  };

  const { basePrice, discountAmount, discountPct, finalPrice } = calculatePricing(days);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CL')}`;
  };

  return (
    <RequireAuth role={role}>
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Gestión de TratoFacil Ads</Text>
          <Text style={styles.subtitle}>Delegue la captación de clientes a TratoFacil.</Text>
          
          <Text style={styles.benefitsTitle}>¿Qué incluye el servicio?</Text>
          
          <View style={styles.benefitCard}>
            <View style={styles.benefitIconBox}>
              <Icon name="Target" size={20} color={TOKENS.colors.brand500} />
            </View>
            <View style={styles.benefitTextCol}>
              <Text style={styles.benefitCardTitle}>Visibilidad Premium</Text>
              <Text style={styles.benefitCardDesc}>
                Publicitaremos tu anuncio a tu rubro objetivo y zona geográfica.
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitCard}>
            <View style={styles.benefitIconBox}>
              <Icon name="BarChart" size={20} color={TOKENS.colors.brand500} />
            </View>
            <View style={styles.benefitTextCol}>
              <Text style={styles.benefitCardTitle}>Trata directamente con los clientes</Text>
              <Text style={styles.benefitCardDesc}>
                Consigue clientes de manera directa, sin intermediarios y sin comisiones por servicio.
              </Text>
            </View>
          </View>
        </View>

        {/* Configuration Section */}
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>Completa tu configuración</Text>
          <Text style={styles.sectionSubtitle}>Diseña tu anuncio y segmenta tu público.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoría <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setShowCategoryPicker(true)}>
              <Text style={[styles.selectBoxText, selectedCategoryName ? styles.selectBoxTextSelected : null]}>
                {selectedCategoryName || 'Selecciona una categoría...'}
              </Text>
              <Icon name="ChevronDown" size={16} color={TOKENS.colors.textSubtle} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Región y Ciudad <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Santiago, Metropolitana"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={city}
              onChangeText={setCity}
            />
          </View>

          <Input
            label="Enlace a tu Web o Red Social *"
            placeholder="https://mitienda.cl"
            value={link}
            onChangeText={setLink}
            leftIcon="Globe"
            containerStyle={styles.inputGroup}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción breve del anuncio <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Ej: Campaña de verano con 20% de descuento..."
              placeholderTextColor={TOKENS.colors.textMuted}
              multiline
              numberOfLines={4}
              value={info}
              onChangeText={setInfo}
            />
          </View>

          {/* Image Uploader */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Imagen de tu Campaña</Text>
            {imageKey ? (
              <View style={styles.imagePreviewBox}>
                <Image source={{ uri: getImageUrl(imageKey) }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageKey('')}>
                  <Icon name="X" size={14} color={TOKENS.colors.statusDanger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage} disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator color={TOKENS.colors.brand500} />
                ) : (
                  <>
                    <Icon name="UploadCloud" size={24} color={TOKENS.colors.textSubtle} />
                    <Text style={styles.uploadText}>Subir foto</Text>
                    <Text style={styles.uploadSubtext}>Elige una imagen desde tu galería</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Days Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duración de la Campaña</Text>
            <View style={styles.daysRow}>
              {[30, 90, 180, 365].map((d) => (
                <TouchableOpacity 
                  key={d} 
                  style={[styles.dayBtn, days === d && styles.dayBtnActive]}
                  onPress={() => setDays(d)}
                >
                  <Text style={[styles.dayBtnText, days === d && styles.dayBtnTextActive]}>
                    {d} días
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pricing Summary */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Precio base ({days} días)</Text>
              <Text style={styles.pricingValue}>{formatPrice(basePrice)}</Text>
            </View>
            {discountPct > 0 && (
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabelDiscount}>Descuento ({discountPct}%)</Text>
                <Text style={styles.pricingValueDiscount}>-{formatPrice(discountAmount)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabelTotal}>Total a Pagar</Text>
              <Text style={styles.pricingValueTotal}>{formatPrice(finalPrice)}</Text>
            </View>
          </View>
          
          <Button 
            title={loading ? 'Procesando...' : 'Pagar Anuncio'} 
            onPress={async () => {
              if (!user?.id) {
                Alert.alert('Error', 'Debes iniciar sesión para crear un anuncio.');
                return;
              }
              if (!selectedCategory || !city || !info || !link) {
                Alert.alert('Error', 'Completa todos los campos requeridos.');
                return;
              }
              setLoading(true);
              try {
                const orderResult = await createAd({
                  categoryId: selectedCategory,
                  city,
                  days,
                  image: imageKey || '',
                  info,
                  link,
                  total: finalPrice,
                });
                if (!orderResult?.id) throw new Error('No se pudo crear el anuncio.');
                const flowResult = await createFlowAd(orderResult.id, `${DEEP_LINK_CALLBACK}?type=ad`);
                if (flowResult?.url) {
                  await Linking.openURL(flowResult.url);
                  Alert.alert('Éxito', 'Tu anuncio ha sido creado. Completa el pago en la ventana abierta.');
                } else {
                  throw new Error('No se pudo iniciar el pago.');
                }
              } catch (err: any) {
                Alert.alert('Error', err.message || 'No se pudo crear el anuncio.');
              } finally {
                setLoading(false);
              }
            }}
            style={styles.payBtn} 
            icon="CreditCard"
          />
        </View>

        <RNModal visible={showCategoryPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecciona una categoría</Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)} style={styles.closeBtn}>
                  <Icon name="X" size={24} color={TOKENS.colors.textMain} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      selectedCategory === cat.id && styles.categoryOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setSelectedCategoryName(cat.name);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.categoryOptionText, selectedCategory === cat.id && styles.categoryOptionTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {categoriesLoading && <Text style={styles.selectBoxText}>Cargando categorías...</Text>}
              </ScrollView>
            </View>
          </View>
        </RNModal>

      </ScrollView>
    </View>
    </RequireAuth>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  container: {
    padding: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.xl,
  },
  headerSection: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.lg,
    borderRadius: 16,
    marginBottom: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginBottom: TOKENS.spacing.lg,
  },
  benefitsTitle: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    textTransform: 'uppercase',
    marginBottom: TOKENS.spacing.md,
  },
  benefitCard: {
    flexDirection: 'row',
    marginBottom: TOKENS.spacing.md,
    gap: 12,
  },
  benefitIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitCardTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  benefitCardDesc: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
    lineHeight: 16,
  },
  configSection: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  sectionTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  sectionSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginBottom: TOKENS.spacing.xl,
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
  required: {
    color: TOKENS.colors.statusDanger,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: TOKENS.geometry.radiusInput,
    paddingHorizontal: TOKENS.spacing.md,
    height: 48,
    backgroundColor: TOKENS.colors.white,
  },
  selectBoxText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMuted,
  },
  textInput: {
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: TOKENS.geometry.radiusInput,
    paddingHorizontal: TOKENS.spacing.md,
    height: 48,
    backgroundColor: TOKENS.colors.white,
    color: TOKENS.colors.textMain,
  },
  textArea: {
    height: 100,
    paddingVertical: TOKENS.spacing.sm,
    textAlignVertical: 'top',
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: TOKENS.colors.surface200,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface50,
    padding: TOKENS.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
  },
  imagePreviewBox: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.surface100,
    position: 'relative',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: TOKENS.geometry.radiusInput,
    backgroundColor: TOKENS.colors.surface50,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    alignItems: 'center',
  },
  dayBtnActive: {
    backgroundColor: TOKENS.colors.brand500,
    borderColor: TOKENS.colors.brand500,
  },
  dayBtnText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  dayBtnTextActive: {
    color: TOKENS.colors.white,
  },
  pricingCard: {
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 12,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.xl,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  pricingValue: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
  },
  pricingLabelDiscount: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.statusSuccess,
  },
  pricingValueDiscount: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.statusSuccess,
  },
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.surface200,
    marginVertical: 12,
  },
  pricingLabelTotal: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  pricingValueTotal: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand600,
  },
  payBtn: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: TOKENS.spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.lg,
  },
  modalTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  closeBtn: {
    padding: 4,
  },
  categoryOption: {
    paddingVertical: TOKENS.spacing.md,
    paddingHorizontal: TOKENS.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: 8,
  },
  categoryOptionActive: {
    borderColor: TOKENS.colors.brand500,
    backgroundColor: TOKENS.colors.brand50,
  },
  categoryOptionText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
  },
  categoryOptionTextActive: {
    color: TOKENS.colors.brand700,
  },
  selectBoxTextSelected: {
    color: TOKENS.colors.textMain,
  },
  helperText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 6,
  },
});
