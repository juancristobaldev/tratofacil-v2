import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Avatar, Input, Button, Badge } from '../../components';
import { useRole } from '../../context/RoleContext';

export const MyProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { role, setRole } = useRole();
  
  const [providerTab, setProviderTab] = useState(0);

  // States
  const [name, setName] = useState('Juan Pérez');
  const [email, setEmail] = useState('juan.perez@correo.com');
  const [phone, setPhone] = useState('987654321');
  const [city, setCity] = useState('Santiago, Providencia');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); Alert.alert('Perfil', 'Perfil actualizado exitosamente'); }, 1000);
  };

  const handleLogout = () => {
    setRole('guest');
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  };

  const renderGuest = () => (
    <View style={styles.guestContainer}>
      <View style={styles.guestHeader}>
        <View style={styles.guestIconBox}>
          <Icon name="UserPlus" size={48} color={TOKENS.colors.brand500} />
        </View>
        <Text style={styles.guestTitle}>Únete a TratoFácil</Text>
        <Text style={styles.guestSubtitle}>
          Descubre a los mejores profesionales o ofrece tus servicios a miles de clientes.
        </Text>
      </View>

      <View style={styles.guestFeatures}>
        <View style={styles.featureRow}>
          <Icon name="Search" size={24} color={TOKENS.colors.brand500} />
          <Text style={styles.featureText}>Encuentra expertos cerca de ti</Text>
        </View>
        <View style={styles.featureRow}>
          <Icon name="Briefcase" size={24} color={TOKENS.colors.brand500} />
          <Text style={styles.featureText}>Gestiona tus trabajos y contratos</Text>
        </View>
        <View style={styles.featureRow}>
          <Icon name="Star" size={24} color={TOKENS.colors.brand500} />
          <Text style={styles.featureText}>Lee reseñas de la comunidad</Text>
        </View>
      </View>

      <View style={styles.guestActions}>
        <Button title="Registrarse ahora" onPress={() => navigation.navigate('Register')} style={styles.fullWidthBtn} />
        <Button title="Ya tengo una cuenta" variant="secondary" onPress={() => navigation.navigate('Login')} style={styles.fullWidthBtn} />
      </View>
    </View>
  );

  const renderClientFields = () => (
    <View style={styles.formSection}>
      <Input label="Nombre completo" value={name} onChangeText={setName} icon="User" />
      <Input label="Correo electrónico" value={email} onChangeText={setEmail} icon="Mail" keyboardType="email-address" autoCapitalize="none" />
      <Input label="Número móvil" value={phone} onChangeText={setPhone} icon="Phone" keyboardType="phone-pad" />
      <Input label="Ciudad / Comuna" value={city} onChangeText={setCity} icon="MapPin" />
    </View>
  );

  const renderProviderCompany = () => (
    <View style={styles.providerTabContent}>
      <Text style={styles.tabSectionTitle}>Información de la Empresa</Text>
      <Input label="Nombre Comercial" value="Reparaciones JP" icon="Store" />
      <Input label="RUT de Empresa" value="76.123.456-7" icon="FileText" />
      <Input label="Región Base" value="Región Metropolitana" icon="MapPin" />
      <Button title="Guardar Empresa" onPress={handleSave} loading={saving} style={styles.fullWidthBtn} />
    </View>
  );

  const renderProviderBank = () => (
    <View style={styles.providerTabContent}>
      <Text style={styles.tabSectionTitle}>Datos Bancarios</Text>
      <Input label="Banco" value="Banco Santander" icon="Landmark" />
      <Input label="Tipo de Cuenta" value="Cuenta Corriente" icon="CreditCard" />
      <Input label="Número de Cuenta" value="123456789" icon="Hash" />
      <Button title="Guardar Banco" onPress={handleSave} loading={saving} style={styles.fullWidthBtn} />
    </View>
  );

  const renderProviderCertificates = () => (
    <View style={styles.providerTabContent}>
      <Text style={styles.tabSectionTitle}>Mis Certificados</Text>
      <View style={styles.certCard}>
        <Icon name="FileText" size={24} color={TOKENS.colors.brand500} />
        <View style={{ flex: 1 }}>
          <Text style={styles.certTitle}>Certificado Eléctrico SEC (Clase A)</Text>
          <Text style={styles.certStatus}>Validado</Text>
        </View>
        <Badge label="ACTIVO" tone="success" />
      </View>
      <Button title="Subir nuevo certificado" variant="secondary" icon="Upload" style={styles.fullWidthBtn} />
    </View>
  );

  if (role === 'guest') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + 80 }]}>
        {renderGuest()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
        
        {/* Header (Avatar & Badges) */}
        <View style={styles.headerBox}>
          {role === 'provider' && (
            <TouchableOpacity 
              style={styles.incompleteAlert} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('VerificationCenter')}
            >
              <Icon name="AlertTriangle" size={16} color={TOKENS.colors.brand700} />
              <Text style={styles.incompleteAlertText}>Perfil Incompleto: Completa tu verificación KYC</Text>
            </TouchableOpacity>
          )}

          <View style={styles.avatarSection}>
            <Avatar uri={null} name={name} size={100} />
            <TouchableOpacity style={styles.avatarEditBtn} activeOpacity={0.8}>
              <Icon name="Camera" size={18} color={TOKENS.colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{role === 'provider' ? 'Reparaciones JP' : name}</Text>
          <View style={styles.badgesRow}>
            {role === 'provider' ? (
              <Badge label="PROVEEDOR" tone="neutral" />
            ) : (
              <Badge label="CLIENTE" tone="brand" />
            )}
            
            <TouchableOpacity 
              style={styles.ratingPill} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ReviewsList')}
            >
              <Icon name="Star" size={14} color={TOKENS.colors.starActive} />
              <Text style={styles.ratingPillText}>4.8</Text>
              <Text style={styles.ratingPillCount}>(14)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Tabs (Only for Provider) */}
        {role === 'provider' && (
          <View style={styles.tabsScrollWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
              {[
                { id: 0, label: 'Mi Empresa', icon: 'Store' },
                { id: 1, label: 'Banco', icon: 'Landmark' },
                { id: 2, label: 'Certificados', icon: 'FileText' },
                { id: 3, label: 'Contacto', icon: 'Phone' },
              ].map(t => (
                <TouchableOpacity 
                  key={t.id} 
                  style={[styles.providerTab, providerTab === t.id && styles.providerTabActive]}
                  onPress={() => setProviderTab(t.id)}
                >
                  <Icon name={t.icon as any} size={16} color={providerTab === t.id ? TOKENS.colors.white : TOKENS.colors.textSubtle} />
                  <Text style={[styles.providerTabText, providerTab === t.id && styles.providerTabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        {role === 'client' && (
          <>
            {renderClientFields()}
            <Button title="Guardar Cambios" onPress={handleSave} loading={saving} style={styles.fullWidthBtn} />
          </>
        )}

        {role === 'provider' && (
          <View style={styles.providerContentBox}>
            {providerTab === 0 && renderProviderCompany()}
            {providerTab === 1 && renderProviderBank()}
            {providerTab === 2 && renderProviderCertificates()}
            {providerTab === 3 && (
              <View style={styles.providerTabContent}>
                <Text style={styles.tabSectionTitle}>Información de Contacto</Text>
                {renderClientFields()}
                <Button title="Guardar Contacto" onPress={handleSave} loading={saving} style={styles.fullWidthBtn} />
              </View>
            )}
          </View>
        )}

        <View style={styles.divider} />
        
        <Button 
          title="Cerrar Sesión" 
          variant="outline" 
          onPress={handleLogout} 
          style={styles.fullWidthBtn} 
        />

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
  guestTitle: { fontSize: TOKENS.typography.sizes.h1, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, marginBottom: 8 },
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
  profileName: { fontSize: TOKENS.typography.sizes.h2, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain, marginBottom: 8 },
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
