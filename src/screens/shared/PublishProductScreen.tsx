import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Icon } from '../../components/ui';
import { useRole } from '../../context/RoleContext';
import { useMarketplace } from '../../hooks/useMarketplace';

const PRODUCT_COMMISSION_RATE = 0.05;

export const PublishProductScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role } = useRole();
  
  // Photos
  const [photos, setPhotos] = useState<number[]>([1]); // mock just 1 photo by default

  // Info
  const [category, setCategory] = useState('');
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

  const { createProduct, createLoading: loading } = useMarketplace();

  const handlePublish = async () => {
    if (!title || !price || !category || !region || !city) {
      Alert.alert('Error', 'Por favor, completa los campos obligatorios.');
      return;
    }
    try {
      await createProduct({
        name: title,
        description: desc,
        price: Number(price),
        stock: Number(stock),
        location: `${city}, ${region}`,
        slug: title.toLowerCase().replace(/\s+/g, '-').slice(0, 60),
        categoryProductId: 1,
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
          Debes iniciar sesión o registrarte para publicar un producto.
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

          {/* SECTION 1: PHOTOS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="Camera" size={24} color={TOKENS.colors.brand500} />
              <Text style={styles.sectionTitle}>Fotografías</Text>
            </View>
            <Text style={styles.helperText}>Sube imágenes claras de tu producto. La primera será la portada.</Text>
            
            <View style={styles.photoGrid}>
              {photos.map((_, i) => (
                <View key={i} style={styles.photoBox}>
                  <Icon name="Image" size={32} color={TOKENS.colors.surface200} />
                  {i === 0 && <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>PORTADA</Text></View>}
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoBtn}>
                <Icon name="UploadCloud" size={24} color={TOKENS.colors.textSubtle} />
                <Text style={styles.addPhotoText}>Agregar foto</Text>
              </TouchableOpacity>
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
              <View style={styles.inputWithIcon}>
                <Icon name="Package" size={18} color={TOKENS.colors.textSubtle} />
                <TextInput 
                  style={styles.innerInput} 
                  placeholder="Ej: Herramientas"
                  value={category}
                  onChangeText={setCategory}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título del anuncio *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ej: Taladro Percutor 850W"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción detallada</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Escribe todo lo que el comprador necesita saber: estado, accesorios, etc."
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>¿Cuánto quieres recibir? ($) *</Text>
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
              <Text style={styles.helperText}>Monto libre que recibirás por cada venta.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Stock disponible *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Cantidad"
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
              />
            </View>

            {/* Financial Breakdown (Product) */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>RESUMEN DE PUBLICACIÓN</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tú recibes:</Text>
                <Text style={styles.breakdownValue}>${(Number(price) || 0).toLocaleString("es-CL")}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Comisión por venta ({PRODUCT_COMMISSION_RATE * 100}%):</Text>
                <Text style={[styles.breakdownValue, { color: TOKENS.colors.error600 }]}>+ ${commissionAmount.toLocaleString("es-CL")}</Text>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Región del producto *</Text>
              <View style={styles.inputWithIcon}>
                <Icon name="MapPin" size={18} color={TOKENS.colors.textSubtle} />
                <TextInput style={styles.innerInput} placeholder="Selecciona una región" value={region} onChangeText={setRegion} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ciudad / Comuna *</Text>
              <View style={styles.inputWithIcon}>
                <Icon name="MapPin" size={18} color={TOKENS.colors.textSubtle} />
                <TextInput style={styles.innerInput} placeholder="Selecciona tu ciudad" value={city} onChangeText={setCity} />
              </View>
            </View>

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

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Días para despachar</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={maxDispatchDays} onChangeText={setMaxDispatchDays} />
                  <Text style={styles.helperText}>Días hábiles máximos para entregar al courier.</Text>
                </View>
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
            disabled={loading || !title || !price || !category || !region || !city}
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
  section: { backgroundColor: TOKENS.colors.white, borderRadius: 16, padding: TOKENS.spacing.lg, marginBottom: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.surface100, ...TOKENS.shadows.soft },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: TOKENS.spacing.md, borderBottomWidth: 1, borderBottomColor: TOKENS.colors.surface100, marginBottom: TOKENS.spacing.md },
  sectionTitle: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  photoBox: { width: 100, height: 100, borderRadius: 12, backgroundColor: TOKENS.colors.surface100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: TOKENS.colors.brand500, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coverBadgeText: { color: TOKENS.colors.white, fontSize: 8, fontWeight: 'bold' },
  addPhotoBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface300, borderStyle: 'dashed', backgroundColor: TOKENS.colors.surface50, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addPhotoText: { fontSize: 12, color: TOKENS.colors.textSubtle, fontWeight: TOKENS.typography.weights.semibold },

  inputGroup: { marginBottom: TOKENS.spacing.lg },
  label: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain, marginBottom: 8 },
  input: { backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, padding: TOKENS.spacing.md, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
  textArea: { height: 120, textAlignVertical: 'top' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.white, borderWidth: 1, borderColor: TOKENS.colors.surface200, borderRadius: 12, paddingHorizontal: TOKENS.spacing.md, height: 50, gap: 12 },
  innerInput: { flex: 1, fontSize: TOKENS.typography.sizes.md, color: TOKENS.colors.textMain },
  currencySymbol: { fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle },
  helperText: { fontSize: 11, color: TOKENS.colors.textSubtle, marginTop: 4 },
  
  breakdownBox: { backgroundColor: TOKENS.colors.brand50, borderRadius: 12, padding: TOKENS.spacing.lg, borderWidth: 1, borderColor: TOKENS.colors.brand200 },
  breakdownTitle: { fontSize: 12, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.brand700, textAlign: 'center', marginBottom: TOKENS.spacing.md, letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  breakdownLabel: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle },
  breakdownValue: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotal: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: TOKENS.colors.brand200 },
  breakdownTotalLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  breakdownTotalValue: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.extrabold },

  shippingPayerRow: { flexDirection: 'row', gap: 12 },
  shippingPayerBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 2, borderColor: TOKENS.colors.surface200, backgroundColor: TOKENS.colors.white },
  shippingPayerBtnActive: { borderColor: TOKENS.colors.brand500, backgroundColor: TOKENS.colors.brand50 },
  shippingPayerText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textSubtle },
  shippingPayerTextActive: { color: TOKENS.colors.brand600 },

  fixedFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderTopWidth: 1, borderTopColor: TOKENS.colors.surface200, ...TOKENS.shadows.medium },
  footerHint: { fontSize: 12, color: TOKENS.colors.textSubtle, textAlign: 'center', marginBottom: TOKENS.spacing.sm },
  footerButtons: { flexDirection: 'row', gap: TOKENS.spacing.md },
});
