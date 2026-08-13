import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Alert, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Input, Button, Badge } from '../../components';
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
  const { updateProfile, updateProviderProfile, updateProviderBank, saving } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
    { id: 1, label: 'Banco', icon: 'Landmark' },
    { id: 2, label: 'Certificados', icon: 'FileText' },
    { id: 3, label: 'Contacto', icon: 'Phone' },
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
        <View style={styles.heroBox}>
          <View style={styles.heroContent}>
            <View style={styles.avatarWrapper}>
              <Avatar uri={getImageUrl(providerData?.logoImage?.cdnUrl || null)} name={role === 'provider' ? (providerData?.name || name) : name} size={100} />
              {role === 'provider' && (
                <TouchableOpacity style={styles.avatarEditBtn} onPress={handlePickLogo} disabled={uploadingLogo}>
                  <Icon name="Camera" size={16} color={TOKENS.colors.brand500} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.heroTextContent}>
              <Text style={styles.heroTitle} numberOfLines={1}>{role === 'provider' ? (providerName || name) : name}</Text>
              <View style={styles.heroBadges}>
                {statusBadge}
                {role === 'provider' && (
                  <View style={styles.locationPill}>
                    <Text style={styles.locationText}>{providerLocation || 'Ubicación pendiente'}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {role === 'client' && (
          <View style={styles.cardBox}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <Icon name="User" size={24} color={TOKENS.colors.brand500} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Información de Contacto</Text>
                <Text style={styles.cardSubtitle}>Tus datos personales básicos.</Text>
              </View>
            </View>
            <View style={styles.formSection}>
              <Input label="Nombre completo" value={name} onChangeText={setName} />
              <Input label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Input label="Número móvil" value={phone} onChangeText={setPhone} mask="phone" />
            </View>
            <Button title="Guardar Cambios" onPress={handleContactSave} loading={saving} style={styles.saveBtn} />
          </View>
        )}

        {role === 'provider' && (
          <>
            <View style={styles.tabsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                {tabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.providerTab, providerTab === tab.id && styles.providerTabActive]}
                    onPress={() => setProviderTab(tab.id)}
                  >
                    <Icon name={tab.icon as any} size={16} color={providerTab === tab.id ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle} />
                    <Text style={[styles.providerTabText, providerTab === tab.id && styles.providerTabTextActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.cardBox}>
              {providerTab === 0 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="Store" size={24} color={TOKENS.colors.brand500} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Información de la Empresa</Text>
                      <Text style={styles.cardSubtitle}>Visible para tus clientes.</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    <Input label="Nombre Comercial" value={providerName} onChangeText={setProviderName} />
                    <Input label="RUT de Empresa (o Personal)" value={providerRut} onChangeText={setProviderRut} mask="rut" />
                    <Input label="Ciudad (Base)" value={providerLocation} onChangeText={setProviderLocation} />
                  </View>
                  <Button title="Guardar Perfil Comercial" onPress={handleProviderSave} loading={saving} style={styles.saveBtn} />
                </>
              )}

              {providerTab === 1 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="Landmark" size={24} color={TOKENS.colors.brand500} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Detalles de Facturación</Text>
                      <Text style={styles.cardSubtitle}>Dónde recibirás tus pagos por servicios.</Text>
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

              {providerTab === 2 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="FileText" size={24} color={TOKENS.colors.brand500} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Mis Certificados</Text>
                      <Text style={styles.cardSubtitle}>Documentos validados por TratoFácil.</Text>
                    </View>
                  </View>
                  <View style={styles.formSection}>
                    {(!providerData?.certificates || providerData.certificates.length === 0) && (
                      <Text style={styles.emptyText}>No tienes certificados subidos.</Text>
                    )}
                    {providerData?.certificates?.map((cert) => (
                      <View key={cert.id} style={styles.certCard}>
                        <Icon name="FileText" size={24} color={TOKENS.colors.brand500} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.certTitle}>{cert.title}</Text>
                          <Text style={styles.certStatus}>{cert.verified ? 'Validado' : 'Pendiente'}</Text>
                        </View>
                        <Badge label={cert.verified ? 'ACTIVO' : 'PENDIENTE'} tone={cert.verified ? 'success' : 'neutral'} />
                      </View>
                    ))}
                  </View>
                </>
              )}

              {providerTab === 3 && (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Icon name="Phone" size={24} color={TOKENS.colors.brand500} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Información de Contacto</Text>
                      <Text style={styles.cardSubtitle}>Datos para la comunicación directa.</Text>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.lg },
  
  // Guest
  guestContainer: { flex: 1, padding: TOKENS.spacing.xl },
  guestHeader: { alignItems: 'center', marginBottom: TOKENS.spacing.xl, marginTop: TOKENS.spacing.xl },
  guestIconBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: TOKENS.colors.brand50, alignItems: 'center', justifyContent: 'center', marginBottom: TOKENS.spacing.md },
  guestTitle: { fontSize: TOKENS.typography.sizes.xxxl, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginBottom: 8 },
  guestSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, textAlign: 'center', lineHeight: 22 },
  guestFeatures: { gap: TOKENS.spacing.lg, marginBottom: TOKENS.spacing.xxl, backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.xl, borderRadius: 24, borderWidth: 1, borderColor: TOKENS.colors.surface200, ...TOKENS.shadows.soft },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain },
  guestActions: { gap: 12, marginTop: 'auto' },

  // Hero Section
  heroBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    marginBottom: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  heroContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: TOKENS.spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    marginBottom: 8,
    textAlign: 'center',
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusApproved: { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }, // emerald-100/200
  statusApprovedText: { fontSize: 12, fontWeight: '700', color: '#047857' }, // emerald-700
  statusFailed: { backgroundColor: '#fee2e2', borderColor: '#fecaca' }, // red-100/200
  statusFailedText: { fontSize: 12, fontWeight: '700', color: '#b91c1c' }, // red-700
  statusPending: { backgroundColor: '#fef3c7', borderColor: '#fde68a' }, // amber-100/200
  statusPendingText: { fontSize: 12, fontWeight: '700', color: '#b45309' }, // amber-700
  statusNeutral: { backgroundColor: TOKENS.colors.surface100, borderColor: TOKENS.colors.surface200 },
  statusNeutralText: { fontSize: 12, fontWeight: '700', color: TOKENS.colors.textSubtle },

  locationPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: TOKENS.colors.textSubtle,
  },

  // Tabs
  tabsWrapper: {
    marginHorizontal: -TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.lg,
  },
  tabsContainer: {
    paddingHorizontal: TOKENS.spacing.lg,
    gap: 8,
  },
  providerTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  providerTabActive: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  providerTabText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
  },
  providerTabTextActive: {
    color: TOKENS.colors.brand500,
  },

  // Card & Forms
  cardBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
    marginBottom: TOKENS.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.xl,
    paddingBottom: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
  },
  cardSubtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
  },
  formSection: {
    gap: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.xl,
  },
  saveBtn: {
    width: '100%',
    borderRadius: 12,
    shadowColor: TOKENS.colors.brand500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fullWidthBtn: {
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.surface200,
    marginVertical: TOKENS.spacing.lg,
  },
  
  emptyText: {
    color: TOKENS.colors.textSubtle,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: TOKENS.spacing.lg,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  certTitle: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  certStatus: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
});
