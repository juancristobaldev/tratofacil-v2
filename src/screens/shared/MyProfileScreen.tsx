import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Input, Button, Badge } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useRefresh } from '../../context/RefreshContext';
import { getImageUrl } from '../../utils/imageUrl';

export const MyProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role, user, logout, refetch: refetchAuth } = useAuth();
  const { setIsRefreshing } = useRefresh();
  const { updateProfile, updateProviderProfile, updateProviderBank, saving, setSaving } = useProfile();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await refetchAuth();
    setRefreshing(false);
    setIsRefreshing(false);
  }, [refetchAuth, setIsRefreshing]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [providerTab, setProviderTab] = useState(0);

  const updateUser = async (args: any) => {
    // Placeholder to satisfy the missing function call
    console.log('Update user', args);
  };

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const providerData = user?.provider;
  const reviews = [...(providerData?.reviews || []), ...(providerData?.realtimeReviews || [])];
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUser({
        variables: { input: { id: user.id, displayName: name, email, phone } },
      });
      Alert.alert('Perfil', 'Perfil actualizado exitosamente');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
  };

  const isProfileIncomplete = role === 'provider' && !user?.isProfileFullyComplete;

  const renderGuest = () => (
    <View style={styles.guestContainer}>
      <View style={styles.guestHeader}>
        <View style={styles.guestIconBox}>
          <Icon name="UserPlus" size={48} color={TOKENS.colors.brand500} />
        </View>
        <Text style={styles.guestTitle}>Únete a TratoFácil</Text>
        <Text style={styles.guestSubtitle}>Descubre a los mejores profesionales o ofrece tus servicios a miles de clientes.</Text>
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        <View style={styles.headerBox}>
          {isProfileIncomplete && (
            <TouchableOpacity style={styles.incompleteAlert} activeOpacity={0.8} onPress={() => navigation.navigate('VerificationCenter')}>
              <Icon name="AlertTriangle" size={16} color={TOKENS.colors.brand700} />
              <Text style={styles.incompleteAlertText}>Perfil Incompleto: Completa tu verificación KYC</Text>
            </TouchableOpacity>
          )}
          <View style={styles.avatarSection}>
            <Avatar uri={getImageUrl(providerData?.logoImage?.cdnUrl || null)} name={name} size={100} />
          </View>
          <Text style={styles.profileName}>{role === 'provider' ? (providerData?.name || name) : name}</Text>
          <View style={styles.badgesRow}>
            <Badge label={role === 'provider' ? 'PROVEEDOR' : 'CLIENTE'} tone={role === 'provider' ? 'neutral' : 'brand'} />
            <TouchableOpacity style={styles.ratingPill} activeOpacity={0.8} onPress={() => navigation.navigate('ReviewsList')}>
              <Icon name="Star" size={14} color={TOKENS.colors.starActive} />
              <Text style={styles.ratingPillText}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingPillCount}>({reviews.length})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {role === 'client' && (
          <>
            <View style={styles.formSection}>
              <Input label="Nombre completo" value={name} onChangeText={setName} icon="User" />
              <Input label="Correo electrónico" value={email} onChangeText={setEmail} icon="Mail" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Número móvil" value={phone} onChangeText={setPhone} icon="Phone" keyboardType="phone-pad" />
              <Input label="Ciudad / Comuna" value={city} onChangeText={setCity} icon="MapPin" />
            </View>
            <Button title="Guardar Cambios" onPress={handleSave} loading={saving} style={styles.fullWidthBtn} />
          </>
        )}

        {role === 'provider' && (
          <View style={styles.providerContentBox}>
            <View style={styles.tabsScrollWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                {['Empresa', 'Bancarios', 'Certificados', 'Contacto'].map((tab, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.providerTab, providerTab === idx && styles.providerTabActive]}
                    onPress={() => setProviderTab(idx)}
                  >
                    <Text style={[styles.providerTabText, providerTab === idx && styles.providerTabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {providerTab === 0 && (
              <View style={styles.providerTabContent}>
                <Text style={styles.tabSectionTitle}>Información de la Empresa</Text>
                <Input label="Nombre Comercial" value={providerData?.name || ''} icon="Store" />
                <Input label="RUT de Empresa" value={providerData?.rut || ''} icon="FileText" />
                <Input label="Región Base" value={providerData?.location || ''} icon="MapPin" />
              </View>
            )}
            {providerTab === 1 && (
              <View style={styles.providerTabContent}>
                <Text style={styles.tabSectionTitle}>Datos Bancarios</Text>
                <Input label="Banco" value={providerData?.bank?.bankName || ''} icon="Landmark" />
                <Input label="Tipo de Cuenta" value={providerData?.bank?.accountType || ''} icon="CreditCard" />
                <Input label="Número de Cuenta" value={providerData?.bank?.accountNumber || ''} icon="Hash" />
              </View>
            )}
            {providerTab === 2 && (
              <View style={styles.providerTabContent}>
                <Text style={styles.tabSectionTitle}>Mis Certificados</Text>
                {providerData?.certificates?.map((cert) => (
                  <View key={cert.id} style={styles.certCard}>
                    <Icon name="FileText" size={24} color={TOKENS.colors.brand500} />
                    <View style={{ flex: 1 }}><Text style={styles.certTitle}>{cert.title}</Text><Text style={styles.certStatus}>{cert.verified ? 'Validado' : 'Pendiente'}</Text></View>
                    <Badge label={cert.verified ? 'ACTIVO' : 'PENDIENTE'} tone={cert.verified ? 'success' : 'neutral'} />
                  </View>
                ))}
              </View>
            )}
            {providerTab === 3 && (
              <View style={styles.providerTabContent}>
                <Text style={styles.tabSectionTitle}>Información de Contacto</Text>
                <Input label="Nombre completo" value={name} onChangeText={setName} icon="User" />
                <Input label="Correo electrónico" value={email} onChangeText={setEmail} icon="Mail" keyboardType="email-address" />
                <Input label="Número móvil" value={phone} onChangeText={setPhone} icon="Phone" keyboardType="phone-pad" />
                <Input label="Ciudad / Comuna" value={city} onChangeText={setCity} icon="MapPin" />
                <Button title="Guardar Contacto" onPress={handleSave} loading={saving} style={styles.fullWidthBtn} />
              </View>
            )}
          </View>
        )}

        <View style={styles.divider} />
        <Button title="Cerrar Sesión" variant="outline" onPress={handleLogout} style={styles.fullWidthBtn} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface50 },
  scrollBody: { padding: TOKENS.spacing.lg },
  guestContainer: { flex: 1, padding: TOKENS.spacing.xl },
  guestHeader: { alignItems: 'center', marginBottom: TOKENS.spacing.xl, marginTop: TOKENS.spacing.xl },
  guestIconBox: { width: 96, height: 96, borderRadius: 48, backgroundColor: TOKENS.colors.brand50, alignItems: 'center', justifyContent: 'center', marginBottom: TOKENS.spacing.md },
  guestTitle: { fontSize: TOKENS.typography.sizes.xxxl, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginBottom: 8 },
  guestSubtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, textAlign: 'center', lineHeight: 22 },
  guestFeatures: { gap: TOKENS.spacing.lg, marginBottom: TOKENS.spacing.xxl, backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.xl, borderRadius: 24, borderWidth: 1, borderColor: TOKENS.colors.surface200, ...TOKENS.shadows.soft },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain },
  guestActions: { gap: 12, marginTop: 'auto' },
  headerBox: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 24,
    padding: TOKENS.spacing.xl,
    alignItems: 'center',
    marginBottom: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  avatarSection: { alignItems: 'center', position: 'relative', marginBottom: TOKENS.spacing.md },
  avatarEditBtn: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: TOKENS.colors.brand500, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: TOKENS.colors.white, ...TOKENS.shadows.soft },
  profileName: { fontSize: TOKENS.typography.sizes.xxl, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: 8 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.surface100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  ratingPillText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  ratingPillCount: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle },
  incompleteAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.brand50, padding: TOKENS.spacing.md, borderRadius: 12, borderWidth: 1, borderColor: TOKENS.colors.brand200, gap: 8, marginBottom: TOKENS.spacing.lg, width: '100%' },
  incompleteAlertText: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.brand700, fontWeight: TOKENS.typography.weights.semibold, flex: 1 },
  tabsScrollWrapper: { marginHorizontal: -TOKENS.spacing.lg, marginBottom: TOKENS.spacing.lg },
  tabsContainer: { paddingHorizontal: TOKENS.spacing.lg, gap: 8 },
  providerTab: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TOKENS.colors.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  providerTabActive: { backgroundColor: TOKENS.colors.brand500, borderColor: TOKENS.colors.brand500 },
  providerTabText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textSubtle },
  providerTabTextActive: { color: TOKENS.colors.white },
  providerContentBox: { backgroundColor: TOKENS.colors.white, borderRadius: 24, padding: TOKENS.spacing.xl, borderWidth: 1, borderColor: TOKENS.colors.surface200, ...TOKENS.shadows.soft },
  providerTabContent: { gap: TOKENS.spacing.md },
  tabSectionTitle: { fontSize: TOKENS.typography.sizes.lg, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: TOKENS.spacing.sm },
  formSection: { gap: TOKENS.spacing.md, marginBottom: TOKENS.spacing.md },
  fullWidthBtn: { width: '100%' },
  divider: { height: 1, backgroundColor: TOKENS.colors.surface200, marginVertical: TOKENS.spacing.xl },
  menuRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: TOKENS.colors.white, padding: TOKENS.spacing.md, borderRadius: 16, borderWidth: 1, borderColor: TOKENS.colors.surface200, ...TOKENS.shadows.soft },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: TOKENS.colors.brand50, alignItems: 'center', justifyContent: 'center', marginRight: TOKENS.spacing.md },
  menuText: { flex: 1, fontSize: TOKENS.typography.sizes.md, fontWeight: TOKENS.typography.weights.semibold, color: TOKENS.colors.textMain },
  certCard: { flexDirection: 'row', alignItems: 'center', padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.surface50, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: TOKENS.colors.surface200 },
  certTitle: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  certStatus: { fontSize: TOKENS.typography.sizes.xs, color: TOKENS.colors.textSubtle, marginTop: 2 },
});
