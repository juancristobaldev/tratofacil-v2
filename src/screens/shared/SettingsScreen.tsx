import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, RefreshControl, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKENS } from '../../theme';
import { Card, Button, Icon, ToggleSwitch, StatusBanner } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { useRole } from '../../context/RoleContext';
import { useRealtime } from '../../realtime/RealtimeContext';

const PUSH_KEY = 'push_notifications_enabled';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setIsRefreshing } = useRefresh();
  const { user, logout, deleteAccount, refetch: refetchAuth } = useAuth();
  const { role } = useRole();
  const isProvider = role === 'provider';
  const { isRealtimeActive, toggleAvailability } = useRealtime();

  const [notifications, setNotifications] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      '¿Eliminar tu cuenta definitivamente?',
      'Esta acción es permanente e irreversible. Se desactivará tu perfil, perderás el acceso a tus servicios e historial y no podrás recuperar tu cuenta.\n\n¿Estás seguro de continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar definitivamente',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              const success = await deleteAccount();
              if (success) {
                Alert.alert(
                  'Cuenta eliminada',
                  'Tu cuenta ha sido eliminada con éxito.',
                  [
                    {
                      text: 'Aceptar',
                      onPress: () => {
                        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
                      },
                    },
                  ],
                );
              } else {
                Alert.alert('Error', 'No se pudo eliminar la cuenta. Por favor, inténtalo de nuevo.');
              }
            } catch (err: any) {
              const errorMessage = err?.message || 'Ocurrió un error al eliminar tu cuenta.';
              Alert.alert('No se pudo eliminar la cuenta', errorMessage);
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
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
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={TOKENS.colors.brand500}
          />
        }
      >
        {/* Account Info & Preferences Card */}
        <View style={styles.settingsCard}>
          {user?.email && (
            <View style={styles.accountHeader}>
              <Text style={styles.accountHeaderLabel}>Cuenta</Text>
              <Text style={styles.accountHeaderEmail}>{user.email}</Text>
            </View>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingRowLabel}>Notificaciones Push</Text>
              <Text style={styles.settingDesc}>
                Alertas de solicitudes y mensajes
              </Text>
            </View>
            <ToggleSwitch
              value={notifications}
              onValueChange={handleTogglePush}
              disabled={!settingsLoaded}
            />
          </View>

          {isProvider && (
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingRowLabel}>Disponible en el mapa</Text>
                <Text style={styles.settingDesc}>
                  {isRealtimeActive
                    ? 'Visible para clientes cercanos'
                    : 'Oculto para clientes'}
                </Text>
              </View>
              <ToggleSwitch
                value={isRealtimeActive}
                onValueChange={handleToggleAvailability}
              />
            </View>
          )}
        </View>

        {/* App Info Banner */}
        <StatusBanner
          title="TratoFacil.cl v1.0.0"
          description="La plataforma que conecta clientes con profesionales verificados."
          variant="info"
          icon="Info"
        />

        {/* Logout Button matching ui-kit.html */}
        <TouchableOpacity
          testID="logout-button"
          style={styles.logoutDangerBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Icon name="LogOut" size={18} color="#dc2626" />
          <Text style={styles.logoutDangerText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          testID="delete-account-button"
          style={styles.deleteAccountBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <>
              <Icon name="Trash2" size={18} color="#dc2626" />
              <Text style={styles.deleteAccountText}>Eliminar cuenta</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  scrollBody: {
    padding: TOKENS.spacing.md,
    gap: TOKENS.spacing.md,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
  },
  accountHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  accountHeaderLabel: {
    fontSize: 11,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  accountHeaderEmail: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.dark900,
  },
  settingRowValue: {
    fontSize: 13,
    color: TOKENS.colors.textSubtle,
  },
  settingTextCol: {
    flex: 1,
    marginRight: TOKENS.spacing.md,
  },
  settingDesc: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 12,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#1e3a8a',
  },
  infoBannerDesc: {
    fontSize: 12,
    color: '#1d4ed8',
    marginTop: 2,
    lineHeight: 18,
  },

  // Logout Danger Button
  logoutDangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 8,
  },
  logoutDangerText: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#dc2626',
  },

  // Delete Account Button
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.semibold,
    color: '#dc2626',
  },
});
