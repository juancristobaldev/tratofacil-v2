import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';
import { launchImageLibrary } from 'react-native-image-picker';
import { useQuery } from '@apollo/client/react';
import { TOKENS } from '../../theme';
import { Icon, Button, Input, RegionCitySelect, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../hooks/usePlans';
import { useFlow } from '../../hooks/useFlow';
import { useCategories } from '../../context/CategoriesContext';
import { DEEP_LINK_CALLBACK } from '../../config/endpoints';
import { RequireAuth } from '../../components/ui/RequireAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uploadImage } from '../../utils/uploadImage';
import { getImageUrl } from '../../utils/imageUrl';
import { getKeyboardVerticalOffset } from '../../utils/layoutMetrics';
import { GET_MY_ADS } from '../../graphql/operations/ads';
import type { Ads, Category } from '../../graphql/generated';

type ScreenTab = 'create' | 'my_ads';

export const TratoDirectoScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const [screenTab, setScreenTab] = useState<ScreenTab>('create');
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<number>(30);
  const [couponCode, setCouponCode] = useState<string>('');

  const hasSavedCard = Boolean(
    user?.cardActive && user?.last4CardDigits && user?.creditCardType
  );
  const [paymentMethod, setPaymentMethod] = useState<'saved_card' | 'flow'>(
    hasSavedCard ? 'saved_card' : 'flow'
  );

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [info, setInfo] = useState<string>('');
  const [link, setLink] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { createAd, createFlowAd } = usePlans();
  const { payWithSavedCard } = useFlow();
  const { categories, categoriesLoading } = useCategories();

  const {
    data: myAdsData,
    loading: myAdsLoading,
    refetch: refetchMyAds,
  } = useQuery<{ getMyAds: Ads[] }>(GET_MY_ADS, {
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  });

  const myAdsList = myAdsData?.getMyAds || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.id) {
        await refetchMyAds();
      }
    } finally {
      setRefreshing(false);
    }
  }, [refetchMyAds, user?.id]);

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

  const pricePerDay = 1000;

  const calculatePricing = (d: number) => {
    let discountPct = 0;
    if (d >= 365) discountPct = 50;
    else if (d >= 180) discountPct = 40;
    else if (d >= 90) discountPct = 30;

    const basePrice = d * pricePerDay;
    const discountAmount = Math.round(basePrice * (discountPct / 100));
    const finalPrice = basePrice - discountAmount;

    return { basePrice, discountAmount, discountPct, finalPrice };
  };

  const { basePrice, discountAmount, discountPct, finalPrice } = calculatePricing(days);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CL')}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getAdStatusMeta = (expiredAtStr?: string | null, orderStatus?: string) => {
    if (!expiredAtStr) {
      if (orderStatus === 'PROCESSING') {
        return { label: 'EN PROCESO', bg: TOKENS.colors.brand50, color: TOKENS.colors.brand700 };
      }
      return { label: 'ACTIVO', bg: '#ECFDF5', color: TOKENS.colors.statusSuccess };
    }
    const isExpired = new Date(expiredAtStr) < new Date();
    if (isExpired) {
      return { label: 'EXPIRADO', bg: TOKENS.colors.surface200, color: TOKENS.colors.textSubtle };
    }
    if (orderStatus === 'PROCESSING') {
      return { label: 'EN PROCESO', bg: TOKENS.colors.brand50, color: TOKENS.colors.brand700 };
    }
    return { label: 'ACTIVO', bg: '#ECFDF5', color: TOKENS.colors.statusSuccess };
  };

  const flatCategories = useMemo(() => {
    const items: Array<{ id: number; name: string; isSub: boolean }> = [];
    categories.forEach((cat) => {
      items.push({ id: cat.id, name: cat.name, isSub: false });
      if (cat.subCategories && cat.subCategories.length > 0) {
        cat.subCategories.forEach((sub: Category) => {
          if (sub?.id && sub?.name) {
            items.push({ id: sub.id, name: `${cat.name} → ${sub.name}`, isSub: true });
          }
        });
      }
    });
    return items;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return flatCategories;
    const q = categorySearchQuery.trim().toLowerCase();
    return flatCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [flatCategories, categorySearchQuery]);

  const handlePayAd = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Debes iniciar sesión para crear un anuncio.');
      return;
    }
    if (!selectedCategory || !region || !city || !info.trim() || !link.trim()) {
      Alert.alert('Error', 'Completa todos los campos requeridos antes de continuar.');
      return;
    }
    setLoading(true);
    try {
      const orderResult = await createAd({
        categoryId: selectedCategory,
        city,
        days,
        image: imageKey || '',
        info: info.trim(),
        link: link.trim(),
        total: finalPrice,
        couponCode: couponCode.trim() || undefined,
      });

      if (!orderResult?.id) throw new Error('No se pudo crear la orden del anuncio.');

      if (paymentMethod === 'saved_card' && hasSavedCard) {
        await payWithSavedCard('ad', orderResult.id);
        Alert.alert(
          '¡Pago Exitoso!',
          'Tu anuncio ha sido pagado con tu tarjeta guardada y ya está en proceso de activación.'
        );
        setScreenTab('my_ads');
        refetchMyAds();
        return;
      }

      const flowResult = await createFlowAd(orderResult.id, `${DEEP_LINK_CALLBACK}?type=ad`);
      if (flowResult?.url) {
        await Linking.openURL(flowResult.url);
        Alert.alert(
          'Procesando Pago',
          'Completa el pago en la pasarela externa. Cuando finalices, regresarás automáticamente a la app.'
        );
      } else {
        throw new Error('No se pudo iniciar el pago con Flow.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireAuth role={role}>
      <View style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={getKeyboardVerticalOffset(false, insets.top)}
        >
          {/* Segmented Switch */}
          <View style={styles.tabBarWrapper}>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabButton, screenTab === 'create' && styles.tabButtonActive]}
                onPress={() => setScreenTab('create')}
              >
                <Icon
                  name="Sparkles"
                  size={16}
                  color={screenTab === 'create' ? TOKENS.colors.brand600 : TOKENS.colors.textSubtle}
                />
                <Text style={[styles.tabButtonText, screenTab === 'create' && styles.tabButtonTextActive]}>
                  Crear Anuncio
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, screenTab === 'my_ads' && styles.tabButtonActive]}
                onPress={() => setScreenTab('my_ads')}
              >
                <Icon
                  name="Layers"
                  size={16}
                  color={screenTab === 'my_ads' ? TOKENS.colors.brand600 : TOKENS.colors.textSubtle}
                />
                <Text style={[styles.tabButtonText, screenTab === 'my_ads' && styles.tabButtonTextActive]}>
                  Mis Anuncios {myAdsList.length > 0 ? `(${myAdsList.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 80 }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={TOKENS.colors.brand500}
              />
            }
          >
            {screenTab === 'create' ? (
              <>
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
                    <Text style={styles.label}>
                      Categoría o Subcategoría <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.selectBox}
                      onPress={() => setShowCategoryPicker(true)}
                    >
                      <Text
                        style={[
                          styles.selectBoxText,
                          selectedCategoryName ? styles.selectBoxTextSelected : null,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedCategoryName || 'Selecciona una categoría...'}
                      </Text>
                      <Icon name="ChevronDown" size={16} color={TOKENS.colors.textSubtle} />
                    </TouchableOpacity>
                  </View>

                  <RegionCitySelect
                    region={region}
                    city={city}
                    onRegionChange={setRegion}
                    onCityChange={setCity}
                    regionLabel="Región *"
                    cityLabel="Ciudad / Comuna *"
                    regionPlaceholder="Selecciona una región"
                    cityPlaceholder="Selecciona tu ciudad o comuna"
                    testIDPrefix="trato-directo"
                  />

                  <Input
                    label="Enlace a tu Web o Red Social *"
                    placeholder="https://mitienda.cl"
                    value={link}
                    onChangeText={setLink}
                    leftIcon="Globe"
                    containerStyle={styles.inputGroup}
                  />

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Descripción breve del anuncio <Text style={styles.required}>*</Text>
                    </Text>
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
                        <TouchableOpacity
                          style={styles.removeImageBtn}
                          onPress={() => setImageKey('')}
                        >
                          <Icon name="X" size={14} color={TOKENS.colors.statusDanger} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadBox}
                        onPress={handlePickImage}
                        disabled={uploadingImage}
                      >
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

                  {/* Coupon Code Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cupón de Descuento (Opcional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="EJ: VERANO2026"
                      placeholderTextColor={TOKENS.colors.textMuted}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      value={couponCode}
                      onChangeText={(t) => setCouponCode(t.toUpperCase().trim())}
                    />
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

                  {/* Payment Method Selector */}
                  {hasSavedCard && (
                    <View style={styles.paymentMethodGroup}>
                      <Text style={styles.label}>Método de Pago</Text>
                      <TouchableOpacity
                        style={[
                          styles.paymentOption,
                          paymentMethod === 'saved_card' && styles.paymentOptionActive,
                        ]}
                        onPress={() => setPaymentMethod('saved_card')}
                      >
                        <View style={styles.paymentOptionLeft}>
                          <Icon
                            name="CreditCard"
                            size={20}
                            color={
                              paymentMethod === 'saved_card'
                                ? TOKENS.colors.brand600
                                : TOKENS.colors.textSubtle
                            }
                          />
                          <View>
                            <Text style={styles.paymentOptionTitle}>
                              Tarjeta Guardada (•••• {user?.last4CardDigits})
                            </Text>
                            <Text style={styles.paymentOptionSubtitle}>
                              Pago seguro en 1 toque sin salir de la app
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            paymentMethod === 'saved_card' && styles.radioCircleActive,
                          ]}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.paymentOption,
                          paymentMethod === 'flow' && styles.paymentOptionActive,
                        ]}
                        onPress={() => setPaymentMethod('flow')}
                      >
                        <View style={styles.paymentOptionLeft}>
                          <Icon
                            name="Globe"
                            size={20}
                            color={
                              paymentMethod === 'flow'
                                ? TOKENS.colors.brand600
                                : TOKENS.colors.textSubtle
                            }
                          />
                          <View>
                            <Text style={styles.paymentOptionTitle}>Webpay / Flow</Text>
                            <Text style={styles.paymentOptionSubtitle}>
                              Débito, Crédito o Transferencia externa
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            paymentMethod === 'flow' && styles.radioCircleActive,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Button
                    title={
                      loading
                        ? 'Procesando...'
                        : paymentMethod === 'saved_card' && hasSavedCard
                        ? 'Pagar con Tarjeta Guardada'
                        : 'Pagar con Webpay / Flow'
                    }
                    onPress={handlePayAd}
                    disabled={loading}
                    style={styles.payBtn}
                    icon="CreditCard"
                  />
                </View>
              </>
            ) : (
              /* My Ads View */
              <View style={styles.myAdsSection}>
                <View style={styles.myAdsHeader}>
                  <Text style={styles.sectionTitle}>Tus Campañas Publicitarias</Text>
                  <Text style={styles.sectionSubtitle}>
                    Monitorea la vigencia y visibilidad de tus anuncios publicados.
                  </Text>
                </View>

                {myAdsLoading && !refreshing ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
                    <Text style={styles.loadingText}>Cargando tus anuncios...</Text>
                  </View>
                ) : myAdsList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyIconBox}>
                      <Icon name="Sparkles" size={32} color={TOKENS.colors.brand500} />
                    </View>
                    <Text style={styles.emptyTitle}>Aún no tienes anuncios activos</Text>
                    <Text style={styles.emptyDesc}>
                      Publica un anuncio en TratoDirecto para llegar a miles de usuarios sin pagar comisiones por servicio.
                    </Text>
                    <Button
                      title="Crear mi primer anuncio"
                      onPress={() => setScreenTab('create')}
                      style={styles.emptyBtn}
                      icon="Sparkles"
                    />
                  </View>
                ) : (
                  myAdsList.map((ad) => {
                    const order = ad.orders?.[0];
                    if (!order) return null;
                    const statusMeta = getAdStatusMeta(ad.expiredAt, order.status);
                    const imageSource = order.imageRelation?.cdnUrl
                      ? { uri: order.imageRelation.cdnUrl }
                      : order.image
                      ? { uri: getImageUrl(order.image) }
                      : null;

                    return (
                      <View key={ad.id} style={styles.adCard}>
                        <View style={styles.adCardHeader}>
                          <Text style={styles.adCardCategory} numberOfLines={1}>
                            {order.category?.name || 'TratoDirecto'}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                              {statusMeta.label}
                            </Text>
                          </View>
                        </View>

                        {imageSource && (
                          <View style={styles.adCardImageBox}>
                            <Image source={imageSource} style={styles.adCardImage} />
                          </View>
                        )}

                        <Text style={styles.adCardInfo}>{order.info}</Text>

                        <View style={styles.adCardDetailsGrid}>
                          <View style={styles.adDetailItem}>
                            <Icon name="Calendar" size={14} color={TOKENS.colors.textSubtle} />
                            <Text style={styles.adDetailText}>{order.days} días</Text>
                          </View>
                          <View style={styles.adDetailItem}>
                            <Icon name="MapPin" size={14} color={TOKENS.colors.textSubtle} />
                            <Text style={styles.adDetailText}>{order.city}</Text>
                          </View>
                          <View style={styles.adDetailItem}>
                            <Icon name="Clock" size={14} color={TOKENS.colors.textSubtle} />
                            <Text style={styles.adDetailText}>Vence: {formatDate(ad.expiredAt)}</Text>
                          </View>
                        </View>

                        {order.link ? (
                          <TouchableOpacity
                            style={styles.adLinkButton}
                            onPress={() => Linking.openURL(order.link).catch(() => {})}
                          >
                            <Icon name="Globe" size={14} color={TOKENS.colors.brand600} />
                            <Text style={styles.adLinkText} numberOfLines={1}>
                              {order.link}
                            </Text>
                            <Icon name="ExternalLink" size={12} color={TOKENS.colors.brand600} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Category Picker Modal */}
        <Modal
          visible={showCategoryPicker}
          onClose={() => {
            setShowCategoryPicker(false);
            setCategorySearchQuery('');
          }}
          contentStyle={styles.categoryPickerModalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecciona una categoría</Text>
          </View>

          {/* Buscador de categorías en vivo */}
          <View style={styles.categorySearchBox}>
            <Icon name="Search" size={16} color={TOKENS.colors.textSubtle} />
            <TextInput
              placeholder="Buscar rubro o categoría..."
              placeholderTextColor={TOKENS.colors.textSubtle}
              value={categorySearchQuery}
              onChangeText={setCategorySearchQuery}
              style={styles.categorySearchInput}
              clearButtonMode="while-editing"
            />
          </View>

          <ScrollView style={styles.categoryPickerScrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryOption,
                  selectedCategory === cat.id && styles.categoryOptionActive,
                  cat.isSub && styles.categoryOptionSub,
                ]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setSelectedCategoryName(cat.name);
                  setShowCategoryPicker(false);
                  setCategorySearchQuery('');
                }}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategory === cat.id && styles.categoryOptionTextActive,
                    cat.isSub && styles.categoryOptionTextSub,
                  ]}
                >
                  {cat.name}
                </Text>
                {selectedCategory === cat.id && (
                  <Icon name="Check" size={16} color={TOKENS.colors.brand600} />
                )}
              </TouchableOpacity>
            ))}
            {filteredCategories.length === 0 && !categoriesLoading && (
              <View style={styles.emptyCategoriesBox}>
                <Text style={styles.emptyCategoriesText}>No se encontraron categorías coincidentes.</Text>
              </View>
            )}
            {categoriesLoading && <Text style={styles.selectBoxText}>Cargando categorías...</Text>}
          </ScrollView>
        </Modal>
      </View>
    </RequireAuth>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  keyboardView: {
    flex: 1,
  },
  tabBarWrapper: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingTop: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.xs,
    backgroundColor: TOKENS.colors.surface50,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.surface200,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  tabButtonText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  tabButtonTextActive: {
    color: TOKENS.colors.brand700,
    fontWeight: TOKENS.typography.weights.bold,
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
    aspectRatio: 16 / 9,
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
  paymentMethodGroup: {
    marginBottom: TOKENS.spacing.lg,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: TOKENS.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.white,
    marginBottom: 8,
  },
  paymentOptionActive: {
    borderColor: TOKENS.colors.brand500,
    backgroundColor: TOKENS.colors.brand50,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  paymentOptionSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: TOKENS.colors.surface300,
  },
  radioCircleActive: {
    borderColor: TOKENS.colors.brand600,
    backgroundColor: TOKENS.colors.brand600,
  },
  payBtn: {
    width: '100%',
  },
  categoryPickerModalContent: {
    maxWidth: 440,
    maxHeight: '85%',
    padding: TOKENS.spacing.lg,
    borderRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  categorySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    paddingVertical: 0,
  },
  categoryPickerScrollView: {
    maxHeight: 280,
  },
  emptyCategoriesBox: {
    paddingVertical: TOKENS.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCategoriesText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
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
  categoryOptionSub: {
    marginLeft: 16,
    borderColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.surface50,
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
  categoryOptionTextSub: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  categoryOptionTextActive: {
    color: TOKENS.colors.brand700,
  },
  selectBoxTextSelected: {
    color: TOKENS.colors.textMain,
  },
  myAdsSection: {
    gap: 12,
  },
  myAdsHeader: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: 4,
  },
  centerBox: {
    padding: TOKENS.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
  },
  emptyCard: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  emptyDesc: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyBtn: {
    width: '100%',
  },
  adCard: {
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    gap: 12,
    ...TOKENS.shadows.soft,
  },
  adCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adCardCategory: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  adCardImageBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.surface100,
  },
  adCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  adCardInfo: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textMain,
    lineHeight: 20,
  },
  adCardDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface100,
  },
  adDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adDetailText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
  },
  adLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TOKENS.colors.brand50,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  adLinkText: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.brand700,
    flex: 1,
  },
});
