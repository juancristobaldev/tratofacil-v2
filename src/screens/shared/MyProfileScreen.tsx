import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { TOKENS } from '../../theme';
import {
  Icon,
  Avatar,
  Input,
  Button,
  Badge,
  SettingsMenuCard,
  SegmentedTabs,
  EmptyState,
  ReviewCard,
  RatingDistribution,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useRefresh } from '../../context/RefreshContext';
import { getImageUrl } from '../../utils/imageUrl';
import { uploadImage } from '../../utils/uploadImage';
import { validateRut } from '../../utils/chile';

export const MyProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role, user, logout, refetch: refetchAuth } = useAuth();
  const { setIsRefreshing } = useRefresh();
  const {
    updateProfile,
    updateProviderProfile,
    updateProviderBank,
    addPortfolioItem,
    deletePortfolioItem,
    saving,
  } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Portfolio States
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [portfolioModalVisible, setPortfolioModalVisible] = useState(false);
  const [selectedPortfolioAsset, setSelectedPortfolioAsset] = useState<any>(null);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetchAuth();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetchAuth, setIsRefreshing]);

  // Contact States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Provider States
  const [providerName, setProviderName] = useState('');
  const [providerLocation, setProviderLocation] = useState('');
  const [providerRut, setProviderRut] = useState('');
  
  // Bank States
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankRut, setBankRut] = useState('');

  const [providerTab, setProviderTab] = useState(0);

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
    if (user?.provider) {
      const p = user.provider;
      setProviderName(p.name || '');
      setProviderLocation(p.location || '');
      setProviderRut(p.rut || '');
      
      setBankName(p.bank?.bankName || '');
      setAccountType(p.bank?.accountType || '');
      setAccountNumber(p.bank?.accountNumber || '');
      setBankRut(p.bank?.rut || '');
    }
  }, [user]);

  const providerData = user?.provider;
  const identity = user?.identitys?.[0]?.status;

  // Reviews metrics for client
  const clientReviews = useMemo(() => user?.reviewsReceived || [], [user?.reviewsReceived]);
  const clientReviewCount = clientReviews.length;
  const clientAvgRating = useMemo(() => {
    if (!clientReviewCount) return 5.0;
    const sum = clientReviews.reduce((s: number, r: any) => s + (r.rating || 5), 0);
    return sum / clientReviewCount;
  }, [clientReviews, clientReviewCount]);

  // Reviews metrics for provider
  const providerAllReviews = useMemo(() => {
    const p = user?.provider;
    if (!p) return [];
    const realtimeRevs = (p.realtimeReviews || []).map((r: any) => ({
      id: `rt-${r.id}`,
      userName: r.client?.displayName || 'Cliente',
      rating: r.rating,
      comment: r.comment || 'Servicio en tiempo real finalizado.',
      date: r.createdAt
        ? new Date(r.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Reciente',
      isVerifiedJob: true,
    }));
    const standardRevs = (p.reviews || []).map((r: any) => ({
      id: `p-${r.id}`,
      userName: r.client?.displayName || 'Cliente',
      rating: r.rating,
      comment: r.comment || 'Excelente atención.',
      date: r.createdAt
        ? new Date(r.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Reciente',
      isVerifiedJob: true,
    }));
    return [...realtimeRevs, ...standardRevs];
  }, [user?.provider]);

  const providerReviewCount = providerAllReviews.length;
  const { providerAvgRating, providerDistribution } = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!providerReviewCount) return { providerAvgRating: 5.0, providerDistribution: dist };
    let sum = 0;
    providerAllReviews.forEach((r) => {
      sum += r.rating;
      const star = Math.min(Math.max(Math.round(r.rating || 5), 1), 5) as 1 | 2 | 3 | 4 | 5;
      dist[star] = (dist[star] || 0) + 1;
    });
    return {
      providerAvgRating: sum / providerReviewCount,
      providerDistribution: dist,
    };
  }, [providerAllReviews, providerReviewCount]);

  const handleContactSave = async () => {
    if (!user) return;
    try {
      await updateProfile({ displayName: name, email, phone });
      Alert.alert('Éxito', 'Datos de contacto actualizados');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleProviderSave = async () => {
    if (!providerData?.id) return;
    if (providerRut && !validateRut(providerRut)) {
      Alert.alert('Error', 'RUT de empresa inválido. Formato esperado: 12345678-9');
      return;
    }
    try {
      await updateProviderProfile(providerData.id, {
        name: providerName,
        location: providerLocation,
        rut: providerRut,
      });
      Alert.alert('Éxito', 'Perfil comercial actualizado');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handlePickLogo = async () => {
    if (!providerData?.id) return;
    if (uploadingLogo) return;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setUploadingLogo(true);
    try {
      const key = await uploadImage(asset, 'LOGO');
      await updateProviderProfile(providerData.id, { logoUrl: key });
      Alert.alert('Éxito', 'Foto de perfil actualizada');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePickPortfolio = async () => {
    if (!providerData?.id) return;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setSelectedPortfolioAsset(asset);
    setPortfolioTitle('');
    setPortfolioDescription('');
    setPortfolioModalVisible(true);
  };

  const handleSavePortfolio = async () => {
    if (!selectedPortfolioAsset) return;
    setUploadingPortfolio(true);
    try {
      const key = await uploadImage(selectedPortfolioAsset, 'PORTFOLIO');
      await addPortfolioItem({
        imageUrl: key,
        title: portfolioTitle.trim() || undefined,
        description: portfolioDescription.trim() || undefined,
      });
      setPortfolioModalVisible(false);
      setSelectedPortfolioAsset(null);
      setPortfolioTitle('');
      setPortfolioDescription('');
      Alert.alert('Éxito', 'Caso de éxito agregado a tu galería');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handleDeletePortfolio = (id: number) => {
    Alert.alert(
      'Eliminar caso de éxito',
      '¿Estás seguro de que deseas eliminar esta fotografía de tu galería?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePortfolioItem(id);
              Alert.alert('Éxito', 'Caso de éxito eliminado.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar.');
            }
          },
        },
      ]
    );
  };

  const handleBankSave = async () => {
    if (!providerData?.id) return;
    if (bankRut && !validateRut(bankRut)) {
      Alert.alert('Error', 'RUT de titular inválido. Formato esperado: 12345678-9');
      return;
    }
    try {
      await updateProviderBank(providerData.id, {
        bankName,
        accountType,
        accountNumber,
        rut: bankRut,
      });
      Alert.alert('Éxito', 'Datos bancarios actualizados');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
  };

  const renderGuest = () => (
    <View style={styles.guestContainer}>
      <View style={styles.guestHeader}>
        <View style={styles.guestIconBox}>
          <Icon name="UserPlus" size={48} color={TOKENS.colors.brand500} />
        </View>
        <Text style={styles.guestTitle}>Únete a TratoFácil</Text>
        <Text style={styles.guestSubtitle}>Descubre a los mejores profesionales u ofrece tus servicios a miles de clientes.</Text>
      </View>
      <View style={styles.guestFeatures}>
        <View style={styles.featureRow}><Icon name="Search" size={24} color={TOKENS.colors.brand500} /><Text style={styles.featureText}>Encuentra expertos cerca de ti</Text></View>
        <View style={styles.featureRow}><Icon name="Briefcase" size={24} color={TOKENS.colors.brand500} /><Text style={styles.featureText}>Gestiona tus trabajos y contratos</Text></View>
        <View style={styles.featureRow}><Icon name="Star" size={24} color={TOKENS.colors.brand500} /><Text style={styles.featureText}>Lee reseñas de la comunidad</Text></View>
      </View>
      <View style={styles.guestActions}>
        <Button title="Registrarse ahora" onPress={() => navigation.navigate('Register')} style={styles.fullWidthBtn} />
        <Button title="Ya tengo una cuenta" variant="secondary" onPress={() => navigation.navigate('Login')} style={styles.fullWidthBtn} />
      </View>
    </View>
  );

  if (role === 'guest') {
    return <View style={[styles.container, { paddingBottom: insets.bottom + 80 }]}>{renderGuest()}</View>;
  }

  // Next.js style verification badges
  let statusBadge = null;
  if (role === 'provider') {
    if (identity === 'APPROVED') {
      statusBadge = <View style={[styles.statusPill, styles.statusApproved]}><Icon name="BadgeCheck" size={14} color={TOKENS.colors.success700} /><Text style={styles.statusApprovedText}>Proveedor verificado</Text></View>;
    } else if (identity === 'FAILED') {
      statusBadge = <View style={[styles.statusPill, styles.statusFailed]}><Icon name="BadgeCheck" size={14} color={TOKENS.colors.error700} /><Text style={styles.statusFailedText}>Proveedor no verificado</Text></View>;
    } else {
      statusBadge = <View style={[styles.statusPill, styles.statusPending]}><Icon name="BadgeCheck" size={14} color={TOKENS.colors.warning700} /><Text style={styles.statusPendingText}>Pendiente de verificar</Text></View>;
    }
  } else {
    statusBadge = <View style={[styles.statusPill, styles.statusNeutral]}><Icon name="User" size={14} color={TOKENS.colors.textSubtle} /><Text style={styles.statusNeutralText}>CLIENTE</Text></View>;
  }

  const tabs = [
    { id: 0, label: 'Mi Empresa', icon: 'Store' },
    { id: 1, label: 'Casos de Éxito', icon: 'Camera' },
    { id: 2, label: 'Reseñas', icon: 'Star' },
    { id: 3, label: 'Banco', icon: 'Landmark' },
    { id: 4, label: 'Certificados', icon: 'FileText' },
    { id: 5, label: 'Contacto', icon: 'Phone' },
  ];

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        {/* Profile Hero Card */}
        <View style={styles.heroBox}>
          <View style={styles.heroContent}>
            <View style={styles.avatarWrapper}>
              <Avatar uri={getImageUrl(providerData?.logoImage?.cdnUrl || null)} name={role === 'provider' ? (providerData?.name || name) : name} size={88} />
              {role === 'provider' && (
                <TouchableOpacity style={styles.avatarEditBtn} onPress={handlePickLogo} disabled={uploadingLogo} activeOpacity={0.8}>
                  <Icon name="Camera" size={14} color={TOKENS.colors.brand500} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.heroTextContent}>
              <Text style={styles.heroTitle} numberOfLines={1}>{role === 'provider' ? (providerName || name) : name}</Text>
              <View style={styles.heroBadges}>
                {statusBadge}

                {/* Rating Badge */}
                {role === 'provider' ? (
                  <TouchableOpacity
                    style={[styles.statusPill, styles.ratingPill]}
                    onPress={() => setProviderTab(2)}
                    activeOpacity={0.8}
                  >
                    <Icon name="Star" size={13} color={TOKENS.colors.starActive} />
                    <Text style={styles.ratingPillText}>
                      {providerAvgRating.toFixed(1)} ({providerReviewCount} {providerReviewCount === 1 ? 'reseña' : 'reseñas'})
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.statusPill, styles.ratingPill]}
                    onPress={() => navigation.navigate('ReviewsList', { role: 'client' })}
                    activeOpacity={0.8}
                  >
                    <Icon name="Star" size={13} color={TOKENS.colors.starActive} />
                    <Text style={styles.ratingPillText}>
                      {clientAvgRating.toFixed(1)} ({clientReviewCount} {clientReviewCount === 1 ? 'reseña' : 'reseñas'})
                    </Text>
                  </TouchableOpacity>
                )}

                {role === 'provider' && !!providerLocation && (
                  <View style={styles.locationPill}>
                    <Icon name="MapPin" size={12} color={TOKENS.colors.textSubtle} />
                    <Text style={styles.locationText}>{providerLocation}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Client View */}
        {role === 'client' && (
          <>
            {/* Quick Navigation Card matching ui-kit.html */}
            <SettingsMenuCard
              items={[
                {
                  icon: 'Star',
                  iconColor: '#ca8a04',
                  iconBgColor: '#fefce8',
                  title: 'Mis Reseñas de Servicios',
                  subtitle: clientReviewCount > 0 ? `${clientReviewCount} opiniones de profesionales` : 'Ver opiniones y calificaciones',
                  badge: clientReviewCount > 0 ? `${clientAvgRating.toFixed(1)} ★` : undefined,
                  badgeTone: 'warning',
                  onPress: () => navigation.navigate('ReviewsList', { role: 'client' }),
                },
                {
                  icon: 'ShieldCheck',
                  iconColor: '#2563eb',
                  iconBgColor: '#eff6ff',
                  title: 'Centro de verificación',
                  onPress: () => navigation.navigate('VerificationCenter'),
                },
                {
                  icon: 'Wallet',
                  iconColor: '#16a34a',
                  iconBgColor: '#f0fdf4',
                  title: 'Mi Billetera',
                  onPress: () => navigation.navigate('Wallet'),
                },
                {
                  icon: 'Headphones',
                  iconColor: '#dc2626',
                  iconBgColor: '#fef2f2',
                  title: 'Centro de Ayuda y Soporte',
                  onPress: () => navigation.navigate('Support'),
                },
              ]}
            />

            {/* Contact Form Card */}
            <View style={styles.cardBox}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                  <Icon name="User" size={20} color={TOKENS.colors.brand500} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Datos Personales</Text>
                  <Text style={styles.cardSubtitle}>Información de contacto de tu cuenta.</Text>
                </View>
              </View>
              <View style={styles.formSection}>
                <Input label="Nombre completo" value={name} onChangeText={setName} />
                <Input label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <Input label="Número móvil" value={phone} onChangeText={setPhone} mask="phone" />
              </View>
              <Button title="Guardar Cambios" onPress={handleContactSave} loading={saving} style={styles.saveBtn} />
            </View>
          </>
        )}

        {/* Provider View with Segmented Tabs */}
        {role === 'provider' && (
          <>
            <SegmentedTabs
              tabs={tabs.map((t) => ({ key: t.id, label: t.label }))}
              activeTab={providerTab}
              onTabChange={setProviderTab}
              style={{ marginBottom: TOKENS.spacing.md }}
            />

            <View style={styles.cardBox}>
              {providerTab === 0 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="Store" size={20} color={TOKENS.colors.brand500} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardTitle}>Información de la Empresa</Text>
                      <Text style={styles.cardSubtitle}>Visible para tus clientes en la plataforma.</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    <Input label="Nombre Comercial" value={providerName} onChangeText={setProviderName} />
                    <Input label="RUT de Empresa (o Personal)" value={providerRut} onChangeText={setProviderRut} mask="rut" />
                    <Input label="Ciudad / Comuna (Base)" value={providerLocation} onChangeText={setProviderLocation} />
                  </View>
                  <Button title="Guardar Perfil Comercial" onPress={handleProviderSave} loading={saving} style={styles.saveBtn} />
                </>
              )}

              {providerTab === 1 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="Camera" size={20} color={TOKENS.colors.brand500} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardTitle}>Casos de Éxito y Portafolio</Text>
                      <Text style={styles.cardSubtitle}>
                        Muestra tus mejores trabajos a los clientes que visiten tu perfil.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <Button
                      title="Subir Caso de Éxito"
                      icon="Plus"
                      onPress={handlePickPortfolio}
                      disabled={uploadingPortfolio}
                      style={{ marginBottom: TOKENS.spacing.xs }}
                    />

                    {(!providerData?.portfolio || providerData.portfolio.length === 0) ? (
                      <EmptyState
                        icon="Camera"
                        title="Sin casos de éxito aún"
                        description="Sube fotografías de tus instalaciones, reparaciones o proyectos para generar mayor confianza en tus clientes."
                      />
                    ) : (
                      <View style={styles.portfolioGrid}>
                        {providerData.portfolio.map((item: any, idx: number) => {
                          const itemImgUrl = getImageUrl(item.image?.cdnUrl || item.imageUrl);
                          return (
                            <View key={item.id || idx} style={styles.portfolioCard}>
                              <Image source={{ uri: itemImgUrl }} style={styles.portfolioImg} />
                              <View style={styles.portfolioCardBody}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.portfolioItemTitle} numberOfLines={1}>
                                    {item.title || `Caso de éxito #${idx + 1}`}
                                  </Text>
                                  {item.description ? (
                                    <Text style={styles.portfolioItemDesc} numberOfLines={2}>
                                      {item.description}
                                    </Text>
                                  ) : null}
                                  <Text style={styles.portfolioItemDate}>
                                    {item.createdAt
                                      ? new Date(item.createdAt).toLocaleDateString('es-CL')
                                      : 'Reciente'}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.portfolioDeleteBtn}
                                  onPress={() => handleDeletePortfolio(item.id)}
                                  activeOpacity={0.7}
                                  accessibilityLabel="Eliminar caso de éxito"
                                  accessibilityRole="button"
                                >
                                  <Icon name="Trash2" size={16} color={TOKENS.colors.error700} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </>
              )}

              {providerTab === 2 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="Star" size={20} color={TOKENS.colors.starActive} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardTitle}>Mis Reseñas y Calificaciones</Text>
                      <Text style={styles.cardSubtitle}>Opiniones recibidas de tus clientes en tiempo real.</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    {providerReviewCount > 0 ? (
                      <>
                        <RatingDistribution
                          averageRating={providerAvgRating}
                          totalReviews={providerReviewCount}
                          distribution={providerDistribution}
                          style={{ marginBottom: TOKENS.spacing.md }}
                        />
                        {providerAllReviews.map((rev) => (
                          <ReviewCard
                            key={rev.id}
                            userName={rev.userName}
                            rating={rev.rating}
                            comment={rev.comment || 'Excelente atención.'}
                            date={rev.date}
                            isVerifiedJob={rev.isVerifiedJob}
                          />
                        ))}
                      </>
                    ) : (
                      <EmptyState
                        icon="MessageSquare"
                        title="Sin reseñas aún"
                        description="Tus calificaciones en órdenes en tiempo real aparecerán aquí a medida que completes servicios."
                      />
                    )}
                  </View>
                </>
              )}

              {providerTab === 3 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="Landmark" size={20} color={TOKENS.colors.brand500} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardTitle}>Detalles Bancarios</Text>
                      <Text style={styles.cardSubtitle}>Cuenta donde recibirás transferencias y retiros.</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    <Input label="Banco" value={bankName} onChangeText={setBankName} />
                    <Input label="Tipo de Cuenta" value={accountType} onChangeText={setAccountType} />
                    <Input label="Número de Cuenta" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" />
                    <Input label="RUT Titular" value={bankRut} onChangeText={setBankRut} mask="rut" />
                  </View>
                  <Button title="Guardar Datos Bancarios" onPress={handleBankSave} loading={saving} style={styles.saveBtn} />
                </>
              )}

              {providerTab === 4 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="FileText" size={20} color={TOKENS.colors.brand500} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardTitle}>Mis Certificados</Text>
                      <Text style={styles.cardSubtitle}>Acreditaciones y certificaciones registradas.</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    {(!providerData?.certificates || providerData.certificates.length === 0) && (
                      <Text style={styles.emptyText}>No tienes certificados subidos actualmente.</Text>
                    )}
                    {providerData?.certificates?.map((cert) => (
                      <View key={cert.id} style={styles.certCard}>
                        <View style={styles.certIconCircle}>
                          <Icon name="FileCheck" size={18} color={TOKENS.colors.brand500} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.certTitle}>{cert.title}</Text>
                          <Text style={styles.certStatus}>{cert.verified ? 'Validado por TratoFácil' : 'Pendiente de validación'}</Text>
                        </View>
                        <Badge label={cert.verified ? 'ACTIVO' : 'PENDIENTE'} tone={cert.verified ? 'success' : 'neutral'} />
                      </View>
                    ))}
                  </View>
                </>
              )}

              {providerTab === 5 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="Phone" size={20} color={TOKENS.colors.brand500} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardTitle}>Datos de Contacto</Text>
                      <Text style={styles.cardSubtitle}>Datos directos para avisos y soporte.</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    <Input label="Nombre completo" value={name} onChangeText={setName} />
                    <Input label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                    <Input label="Número móvil" value={phone} onChangeText={setPhone} mask="phone" />
                  </View>
                  <Button title="Guardar Contacto" onPress={handleContactSave} loading={saving} style={styles.saveBtn} />
                </>
              )}
            </View>
          </>
        )}

        <View style={styles.divider} />
        <Button title="Cerrar Sesión" variant="outline" onPress={handleLogout} style={styles.fullWidthBtn} />
      </ScrollView>

      {/* Modal para Subir Caso de Éxito */}
      <Modal
        visible={portfolioModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !uploadingPortfolio && setPortfolioModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Caso de Éxito</Text>
              <TouchableOpacity
                onPress={() => !uploadingPortfolio && setPortfolioModalVisible(false)}
                disabled={uploadingPortfolio}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="X" size={20} color={TOKENS.colors.textSubtle} />
              </TouchableOpacity>
            </View>

            {selectedPortfolioAsset?.uri && (
              <View style={styles.modalPreviewWrapper}>
                <Image source={{ uri: selectedPortfolioAsset.uri }} style={styles.modalPreviewImg} />
              </View>
            )}

            <View style={styles.modalForm}>
              <Input
                label="Título del trabajo (opcional)"
                placeholder="Ej: Instalación de Calefont SEC"
                value={portfolioTitle}
                onChangeText={setPortfolioTitle}
              />
              <Input
                label="Descripción breve (opcional)"
                placeholder="Ej: Cambio de cañerías y prueba de presión"
                value={portfolioDescription}
                onChangeText={setPortfolioDescription}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setPortfolioModalVisible(false)}
                disabled={uploadingPortfolio}
                style={{ flex: 1 }}
              />
              <Button
                title="Publicar en mi galería"
                onPress={handleSavePortfolio}
                loading={uploadingPortfolio}
                style={{ flex: 1 }}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.md },
  
  // Guest
  guestContainer: { flex: 1, padding: TOKENS.spacing.xl },
  guestHeader: { alignItems: 'center', marginBottom: TOKENS.spacing.xl, marginTop: TOKENS.spacing.xl },
  guestIconBox: { width: 88, height: 88, borderRadius: 44, backgroundColor: TOKENS.colors.brand50, alignItems: 'center', justifyContent: 'center', marginBottom: TOKENS.spacing.md },
  guestTitle: { fontSize: TOKENS.typography.sizes.xxl, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginBottom: 8 },
  guestSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, textAlign: 'center', lineHeight: 22 },
  guestFeatures: { gap: TOKENS.spacing.md, marginBottom: TOKENS.spacing.xl, backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.lg, borderRadius: 20, borderWidth: 1, borderColor: TOKENS.colors.surface200, ...TOKENS.shadows.soft },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain },
  guestActions: { gap: 12, marginTop: 'auto' },

  // Hero Section
  heroBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  heroContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 88,
    height: 88,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.medium,
  },
  heroTextContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusApproved: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statusApprovedText: { fontSize: 11, fontWeight: '700', color: '#047857' },
  statusFailed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusFailedText: { fontSize: 11, fontWeight: '700', color: '#b91c1c' },
  statusPending: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  statusPendingText: { fontSize: 11, fontWeight: '700', color: '#b45309' },
  statusNeutral: { backgroundColor: TOKENS.colors.surface100, borderColor: TOKENS.colors.surface200 },
  statusNeutralText: { fontSize: 11, fontWeight: '700', color: TOKENS.colors.textSubtle },
  ratingPill: { backgroundColor: '#fefce8', borderColor: '#fef08a' },
  ratingPillText: { fontSize: 11, fontWeight: '700', color: '#a16207' },

  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: TOKENS.colors.textSubtle,
  },

  // Quick Menu Card
  menuCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    marginBottom: TOKENS.spacing.md,
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  menuDivider: {
    height: 1,
    backgroundColor: TOKENS.colors.surface100,
    marginLeft: 64,
  },

  // Segmented Tabs
  tabsSegmented: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.surface200,
    padding: 4,
    borderRadius: 14,
    marginBottom: TOKENS.spacing.md,
    gap: 4,
  },
  segmentedTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentedTabBtnActive: {
    backgroundColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  segmentedTabText: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  segmentedTabTextActive: {
    color: TOKENS.colors.dark900,
  },

  // Card & Forms
  cardBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
    marginBottom: TOKENS.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
    marginTop: 1,
  },
  formSection: {
    gap: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.lg,
  },
  saveBtn: {
    width: '100%',
  },
  fullWidthBtn: {
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.surface200,
    marginVertical: TOKENS.spacing.md,
  },
  
  emptyText: {
    color: TOKENS.colors.textSubtle,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: TOKENS.spacing.md,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  certIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  certTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  certStatus: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },

  // Portfolio Grid & Cards
  portfolioGrid: {
    gap: TOKENS.spacing.md,
  },
  portfolioCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
  },
  portfolioImg: {
    width: '100%',
    height: 180,
    backgroundColor: TOKENS.colors.surface100,
  },
  portfolioCardBody: {
    padding: TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  portfolioItemTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 2,
  },
  portfolioItemDesc: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    marginBottom: 4,
    lineHeight: 18,
  },
  portfolioItemDate: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textMuted,
  },
  portfolioDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: TOKENS.spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: TOKENS.spacing.md,
  },
  modalTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  modalPreviewWrapper: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.surface100,
  },
  modalPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalForm: {
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: TOKENS.spacing.xs,
  },
});
