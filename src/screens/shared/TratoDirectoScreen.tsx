import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Icon, Button } from '../../components/ui';
import { useRole } from '../../context/RoleContext';

export const TratoDirectoScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const [days, setDays] = useState<number>(30);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [link, setLink] = useState<string>('');
  const [hasImage, setHasImage] = useState(false);

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
        
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
            <TouchableOpacity style={styles.selectBox}>
              <Text style={styles.selectBoxText}>Selecciona una categoría...</Text>
              <Icon name="ChevronDown" size={16} color={TOKENS.colors.textSubtle} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Región y Ciudad <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.selectBox}>
              <Text style={styles.selectBoxText}>Selecciona una ubicación...</Text>
              <Icon name="ChevronDown" size={16} color={TOKENS.colors.textSubtle} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Enlace a tu Web o Red Social <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder="https://mitienda.cl"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={link}
              onChangeText={setLink}
            />
          </View>

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
            <Text style={styles.label}>Sube la Imagen de tu Campaña <Text style={styles.required}>*</Text></Text>
            {!hasImage ? (
              <TouchableOpacity style={styles.uploadBox} onPress={() => setHasImage(true)}>
                <Icon name="UploadCloud" size={32} color={TOKENS.colors.textSubtle} />
                <Text style={styles.uploadText}>Haz clic aquí para seleccionar</Text>
                <Text style={styles.uploadSubtext}>Soporta JPG, PNG</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.imagePreviewBox}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600&auto=format&fit=crop' }}
                  style={styles.previewImage}
                />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setHasImage(false)}>
                  <Icon name="X" size={16} color={TOKENS.colors.statusDanger} />
                </TouchableOpacity>
              </View>
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
            title="Pagar Anuncio" 
            onPress={() => {}} 
            style={styles.payBtn} 
            leftIcon="CreditCard"
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface100,
  },
  container: {
    padding: TOKENS.spacing.md,
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
});
