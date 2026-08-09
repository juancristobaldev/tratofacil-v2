import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKENS } from '../../theme';
import { Card, Button } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { useRole } from '../../context/RoleContext';
import { useTimeRealServices } from '../../hooks/useTimeRealServices';

const PUSH_KEY = 'push_notifications_enabled';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setIsRefreshing } = useRefresh();
  const { logout, refetch: refetchAuth } = useAuth();
  const { role } = useRole();
  const isProvider = role === 'provider';
  const { isRealtimeActive, toggleAvailability } = useTimeRealServices();

  const [notifications, setNotifications] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar preferencias guardadas
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PUSH_KEY);
        if (stored !== null) setNotifications(stored === 'true');
      } catch {}
      setSettingsLoaded(true);
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setIsRefreshing(true);
    try {
      await refetchAuth();
    } catch {}
    finally {
      setRefreshing(false);
      setIsRefreshing(false);
    }
  }, [refetchAuth, setIsRefreshing]);

  const handleTogglePush = async (value: boolean) => {
    setNotifications(value);
    try {
      await AsyncStorage.setItem(PUSH_KEY, String(value));
    } catch {}
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } finally {
            navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
          }
        },
      },
    ]);
  };

  const handleToggleAvailability = async (value: boolean) => {
    try {
      await toggleAvailability(value);
      Alert.alert(
        value ? 'Disponible' : 'Oculto',
        value
          ? 'Ahora los clientes pueden encontrarte en el mapa.'
          : 'Dejaste de estar visible en el mapa.',
      );
    } catch {
      Alert.alert('Error', 'No se pudo actualizar tu disponibilidad.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollBody, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.brand500} />}
      >
        <Card style={styles.sectionCard} padded={false}>
          <View style={styles.sectionHeader}><Text style={styles.sectionLabel}>NOTIFICACIONES</Text></View>
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Notificaciones Push</Text>
              <Text style={styles.settingDesc}>Recibir alertas de solicitudes y mensajes</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleTogglePush}
              disabled={!settingsLoaded}
              trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }}
              thumbColor={notifications ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle}
            />
          </View>
        </Card>

        {isProvider && (
          <Card style={styles.sectionCard} padded={false}>
            <View style={styles.sectionHeader}><Text style={styles.sectionLabel}>PRIVACIDAD</Text></View>
            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Disponible en el mapa</Text>
                <Text style={styles.settingDesc}>
                  {isRealtimeActive ? 'Visible para clientes cercanos' : 'Oculto para clientes'}
                </Text>
              </View>
              <Switch
                value={isRealtimeActive}
                onValueChange={handleToggleAvailability}
                trackColor={{ false: TOKENS.colors.surface300, true: TOKENS.colors.brand100 }}
                thumbColor={isRealtimeActive ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle}
              />
            </View>
          </Card>
        )}

        <View style={styles.actionsBox}>
          <Button title="Cerrar Sesión" variant="outline" icon="LogOut" onPress={handleLogout} style={styles.logoutBtn} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.surface100 },
  scrollBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.md },
  sectionCard: { backgroundColor: TOKENS.colors.white },
  sectionHeader: { paddingHorizontal: TOKENS.spacing.md, paddingTop: TOKENS.spacing.md },
  sectionLabel: { fontSize: TOKENS.typography.sizes.xxs, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: TOKENS.spacing.md },
  settingTextCol: { flex: 1, marginRight: TOKENS.spacing.md },
  settingLabel: { fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.bold, color: TOKENS.colors.textMain },
  settingDesc: { fontSize: TOKENS.typography.sizes.xxs, color: TOKENS.colors.textSubtle, marginTop: 2 },
  actionsBox: { marginTop: TOKENS.spacing.sm },
  logoutBtn: { width: '100%' },
});
