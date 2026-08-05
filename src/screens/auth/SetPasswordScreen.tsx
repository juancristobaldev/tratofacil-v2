import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { TOKENS } from '../../theme';

export const SetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setGuestPassword, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await setGuestPassword(password);
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } catch {
      setError('No se pudo crear la contraseña. Intenta nuevamente.');
    }
    setLoading(false);
  };

  const handleSkip = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Crea tu contraseña</Text>
        <Text style={styles.subtitle}>
          Tu cuenta fue creada como invitado. Configura una contraseña para proteger tu acceso y disfrutar de todas las funciones.
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          placeholder="Nueva contraseña (mín. 8 caracteres)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <Input
          placeholder="Confirmar contraseña"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          style={styles.input}
        />

        <Button
          title={loading ? 'Creando...' : 'Crear contraseña'}
          onPress={handleSubmit}
          disabled={loading || password.length < 8 || confirm.length < 8}
          style={styles.submitBtn}
        />

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Saltar por ahora</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.white },
  content: { flex: 1, padding: TOKENS.spacing.xl, justifyContent: 'center' },
  title: { fontSize: TOKENS.typography.sizes.xxl, fontWeight: TOKENS.typography.weights.extrabold, color: TOKENS.colors.textMain, textAlign: 'center', marginBottom: TOKENS.spacing.md },
  subtitle: { fontSize: TOKENS.typography.sizes.sm, color: TOKENS.colors.textSubtle, textAlign: 'center', marginBottom: TOKENS.spacing.xl, lineHeight: 20 },
  errorBox: { backgroundColor: '#fef2f2', padding: TOKENS.spacing.md, borderRadius: 12, marginBottom: TOKENS.spacing.md },
  errorText: { color: '#dc2626', fontSize: TOKENS.typography.sizes.sm },
  input: { marginBottom: TOKENS.spacing.md },
  submitBtn: { marginTop: TOKENS.spacing.md },
  skipBtn: { alignSelf: 'center', marginTop: TOKENS.spacing.xl, paddingVertical: TOKENS.spacing.md, paddingHorizontal: TOKENS.spacing.lg },
  skipText: { color: TOKENS.colors.textSubtle, fontSize: TOKENS.typography.sizes.sm, fontWeight: TOKENS.typography.weights.semibold },
});
