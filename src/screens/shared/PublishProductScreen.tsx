import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Switch, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { TOKENS } from '../../theme';
import { Button, Input, Icon } from '../../components/ui';
import { useRole } from '../../context/RoleContext';
import { useMarketplace } from '../../hooks/useMarketplace';
import { uploadImage } from '../../utils/uploadImage';
import { getImageUrl } from '../../utils/imageUrl';

const PRODUCT_COMMISSION_RATE = 0.05;

export const PublishProductScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();
  
  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Info
  const [category, setCategory] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  // Price & Stock
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');

  // Location & Logistics
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [shippingPayer, setShippingPayer] = useState<'Comprador' | 'Vendedor'>('Comprador');
  const [maxDispatchDays, setMaxDispatchDays] = useState('3');
  const [shippingDisabled, setShippingDisabled] = useState(false);

  // Breakdown
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const basePrice = Number(price) || 0;
    const comm = basePrice * PRODUCT_COMMISSION_RATE;
    setCommissionAmount(comm);
    setTotalPrice(basePrice + comm);
  }, [price]);

  const { createProduct, createLoading: loading, parentCategories } = useMarketplace();

  const handlePickPhotos = async () => {
    if (uploading) return;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 4 - photos.length,
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
    if (!title || !price || !category) {
      Alert.alert('Error', 'Por favor, completa los campos obligatorios.');
      return;
    }
    if (!shippingDisabled && (!region || !city)) {
      Alert.alert('Error', 'Por favor, selecciona región y ciudad.');
      return;
    }
    try {
      await createProduct({
        name: title,
        description: desc,
        price: Number(price),
        stock: Number(stock),
        location: shippingDisabled ? undefined : `${city}, ${region}`,
        slug: title.toLowerCase().replace(/\s+/g, '-').slice(0, 60),
        categoryProductId: category,
        shippingDisabled,
        imageUrls: photos,
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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">

          {/* SECTION 1: PHOTOS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Camera" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Fotografías</Text>
            </View>
            <Text style={styles.helperText}>Sube imágenes claras de tu producto. La primera será la portada.</Text>
            
            <View style={styles.photoGrid}>
              {photos.map((key, i) => (
                <View key={key} style={styles.photoBox}>
                  <Image source={{ uri: getImageUrl(key) }} style={styles.photoPreview} resizeMode="cover" />
                  {i === 0 && <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>PORTADA</Text></View>}
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setPhotos((prev) => prev.filter((p) => p !== key))}
                  >
                    <Icon name="X" size={14} color={TOKENS.colors.statusDanger} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 4 && (
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
              <Text style={styles.label}>Categoría *</Text>
              <View style={styles.categoryChips}>
                {parentCategories.map((c) => {
                  const active = category === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() => setCategory(c.id)}
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Input 
              label="Título del anuncio *"
              placeholder="Ej: Taladro Percutor 850W"
              value={title}
              onChangeText={setTitle}
              containerStyle={styles.inputGroup}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción detallada</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Escribe todo lo que el comprador necesita saber: estado, accesorios, etc."
                placeholderTextColor={TOKENS.colors.textMuted}
                multiline
                numberOfLines={4}
                value={desc}
                onChangeText={setDesc}
              />
            </View>
          </View>

          {/* SECTION 3: PRICE AND STOCK */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="DollarSign" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Precio y Disponibilidad</Text>
            </View>

            <Input 
              label="¿Cuánto quieres recibir? ($) *"
              placeholder="0"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              leftIcon="DollarSign"
              helperText="Monto libre que recibirás por cada venta."
              containerStyle={styles.inputGroup}
            />

            <Input 
              label="Stock disponible *"
              placeholder="Cantidad"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
              containerStyle={styles.inputGroup}
            />

            {/* Financial Breakdown (Product) */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>RESUMEN DE PUBLICACIÓN</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tú recibes:</Text>
                <Text style={styles.breakdownValue}>${(Number(price) || 0).toLocaleString("es-CL")}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Comisión por venta ({PRODUCT_COMMISSION_RATE * 100}%):</Text>
                <Text style={[styles.breakdownValue, { color: TOKENS.colors.statusDanger }]}>+ ${commissionAmount.toLocaleString("es-CL")}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={styles.breakdownTotalLabel}>Precio final cliente:</Text>
                <Text style={[styles.breakdownTotalValue, { color: TOKENS.colors.brand700 }]}>${totalPrice.toLocaleString("es-CL")}</Text>
              </View>
            </View>
          </View>

          {/* SECTION 4: LOCATION & LOGISTICS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Truck" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Ubicación y Entrega</Text>
            </View>

            <Input 
              label={`Región del producto ${shippingDisabled ? '' : '*'}`}
              placeholder="Selecciona una región"
              value={region}
              onChangeText={setRegion}
              leftIcon="MapPin"
              containerStyle={styles.inputGroup}
              editable={!shippingDisabled}
            />

            <Input 
              label={`Ciudad / Comuna ${shippingDisabled ? '' : '*'}`}
              placeholder="Selecciona tu ciudad"
              value={city}
              onChangeText={setCity}
              leftIcon="MapPin"
              containerStyle={styles.inputGroup}
              editable={!shippingDisabled}
            />

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Sin Despacho (Solo Retiro)</Text>
                  <Text style={styles.helperText}>Activa esto si el comprador debe retirar el producto en tu ubicación.</Text>
                </View>
                <Switch 
                  value={shippingDisabled} 
                  onValueChange={setShippingDisabled} 
                  trackColor={{ false: TOKENS.colors.surface200, true: TOKENS.colors.brand500 }}
                />
              </View>
            </View>

            {!shippingDisabled && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>¿Quién paga el envío?</Text>
                  <View style={styles.shippingPayerRow}>
                    {['Comprador', 'Vendedor'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.shippingPayerBtn, shippingPayer === option && styles.shippingPayerBtnActive]}
                        onPress={() => setShippingPayer(option as any)}
                      >
                        <Text style={[styles.shippingPayerText, shippingPayer === option && styles.shippingPayerTextActive]}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Input 
                  label="Días para despachar"
                  keyboardType="numeric"
                  value={maxDispatchDays}
                  onChangeText={setMaxDispatchDays}
                  helperText="Días hábiles máximos para entregar al courier."
                  containerStyle={styles.inputGroup}
                />
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* FIXED FOOTER */}
      <View style={styles.fixedFooter}>
        <Text style={styles.footerHint}>Completa todos los campos obligatorios (*)</Text>
        <View style={styles.footerButtons}>
          <Button title="Cancelar" variant="secondary" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
          <Button
            title={loading ? 'Publicando...' : 'Publicar Ahora'}
            onPress={handlePublish}
            disabled={loading || !title || !price || !category || (!shippingDisabled && (!region || !city))}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.md, paddingBottom: 120 },
  section: { backgroundColor: TOKENS.colors.white, borderRadius: 16, padding: TOKENS.spacing.md, marginBottom: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.surface100, ...TOKENS.shadows.soft },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100, marginBottom: TOKENS.spacing.md },
  sectionTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  photoBox: { width: 100, height: 100, borderRadius: 12, backgroundColor: TOKENS.colors.surface100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  removePhotoBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: TOKENS.colors.white, alignItems: 'center', justifyContent: 'center', ...TOKENS.shadows.soft },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: TOKENS.colors.brand500, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coverBadgeText: { color: TOKENS.colors.white, fontSize: 8, fontWeight: 'bold' },
  addPhotoBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface300, borderStyle: 'dashed', backgroundColor: TOKENS.colors.surface50, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addPhotoText: { fontSize: 12, color: TOKENS.colors.textSubtle, fontWeight: TOKENS.typography.weights.semibold },

  inputGroup: { marginBottom: TOKENS.spacing.md },
  label: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain, marginBottom: 8 },
  input: { backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, padding: TOKENS.spacing.md, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
  textArea: { height: 120, textAlignVertical: 'top' },
  helperText: { fontSize: 11, color: TOKENS.colors.textSubtle, marginTop: 4 },
  
  breakdownBox: { backgroundColor: TOKENS.colors.brand50, borderRadius: 12, padding: TOKENS.spacing.md, borderWidth: 1, borderColor: TOKENS.colors.brand200, marginTop: TOKENS.spacing.sm },
  breakdownTitle: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700, textAlign: 'center', marginBottom: TOKENS.spacing.md, letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle },
  breakdownValue: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.brand200 },
  breakdownTotalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold },

  shippingPayerRow: { flexDirection: 'row', gap: 12 },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: TOKENS.colors.surface300, backgroundColor: TOKENS.colors.white },
  categoryChipActive: { borderColor: TOKENS.colors.brand500, backgroundColor: TOKENS.colors.brand50 },
  categoryChipText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textSubtle },
  categoryChipTextActive: { color: TOKENS.colors.brand600 },
  shippingPayerBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface200, backgroundColor: TOKENS.colors.white },
  shippingPayerBtnActive: { borderColor: TOKENS.colors.brand500, backgroundColor: TOKENS.colors.brand50 },
  shippingPayerText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle },
  shippingPayerTextActive: { color: TOKENS.colors.brand600 },

  fixedFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200, ...TOKENS.shadows.medium },
  footerHint: { fontSize: 12, color: TOKENS.colors.textSubtle, textAlign: 'center', marginBottom: TOKENS.spacing.sm },
  footerButtons: { flexDirection: 'row', gap: TOKENS.spacing.md },
});
