import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Card } from '../../components';
import { useRefresh } from '../../context/RefreshContext';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setIsRefreshing } = useRefresh();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    await new Promise<void>((r) => setTimeout(r, 600));
    setRefreshing(false);
    setIsRefreshing(false);
  }, [setIsRefreshing]);

  const handleLogout = () => {
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        <Card style={styles.sectionCard} padded={false}>
          <View style={styles.sectionHeader}><Text style={styles.sectionLabel}>NOTIFICACIONES</Text></View>
          <View style={styles.settingRow}>
            <View><Text style={styles.settingLabel}>Notificaciones Push</Text><Text style={styles.settingDesc}>Recibir alertas de solicitudes y mensajes</Text></View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }} thumbColor={notifications ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View><Text style={styles.settingLabel}>Alertas por Correo</Text><Text style={styles.settingDesc}>Resumen diario de actividad en tu bandeja</Text></View>
            <Switch value={emailAlerts} onValueChange={setEmailAlerts} trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }} thumbColor={emailAlerts ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle} />
          </View>
        </Card>

        <Card style={styles.sectionCard} padded={false}>
          <View style={styles.sectionHeader}><Text style={styles.sectionLabel}>PRIVACIDAD</Text></View>
          <View style={styles.settingRow}>
            <View><Text style={styles.settingLabel}>Compartir ubicación</Text><Text style={styles.settingDesc}>Permite a profesionales cercanos verte en el mapa</Text></View>
            <Switch value={locationSharing} onValueChange={setLocationSharing} trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }} thumbColor={locationSharing ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View><Text style={styles.settingLabel}>Biometría / Huella</Text><Text style={styles.settingDesc}>Acceso rápido con huella digital o Face ID</Text></View>
            <Switch value={biometrics} onValueChange={setBiometrics} trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }} thumbColor={biometrics ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle} />
          </View>
        </Card>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <Icon name="LogOut" size={18} color={TOKENS.colors.statusError} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  scrollBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.md, paddingBottom: 40 },
  sectionCard: { backgroundColor: TOKENS.colors.white },
  sectionHeader: { paddingHorizontal: TOKENS.spacing.md, paddingTop: TOKENS.spacing.md },
  sectionLabel: { fontSize: TOKENS.typography.sizes.xxs, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: TOKENS.spacing.md },
  settingLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  settingDesc: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginTop: 2, maxWidth: 220 },
  divider: { height: 1, backgroundColor: TOKENS.colors.surface100, marginHorizontal: TOKENS.spacing.md },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: TOKENS.spacing.md, marginTop: TOKENS.spacing.sm },
  logoutText: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.statusError },
});
