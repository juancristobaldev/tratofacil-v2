import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, BackHandler, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import { Button, Icon, RotatingHorizontalAd } from '../../components/ui';
import { useAds } from '../../hooks/useAds';
import { useRole } from '../../context/RoleContext';

export const ServiceSuccessScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { role: userRole } = useRole();
  const { horizontal, getTransitionDuration } = useAds();

  const role = route?.params?.role || userRole || 'client';
  const isProvider = role === 'provider';

  const handleGoHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
  }, [navigation]);

  useEffect(() => {
    const onBackPress = () => {
      handleGoHome();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleGoHome]);

  const title = isProvider
    ? '¡Servicio Completado!'
    : '¡Gracias por preferir\nTrato Fácil!';

  const subtitle = isProvider
    ? 'Has finalizado el servicio y calificado al cliente con éxito. Mantente disponible para recibir nuevas solicitudes.'
    : 'Tu servicio ha finalizado con éxito. Cuando necesites ayuda, ingresa nuevamente y busca tu prestador de servicios.';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, TOKENS.spacing.lg),
            paddingBottom: Math.max(insets.bottom, TOKENS.spacing.lg),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconInner}>
              <Icon name="Check" size={48} color={TOKENS.colors.white} />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.actions}>
            <RotatingHorizontalAd
              images={horizontal}
              transitionDuration={getTransitionDuration('marketing', 'HORIZONTAL', 6000)}
            />
            <Button
              title="Volver al Inicio"
              onPress={handleGoHome}
              accessibilityLabel="Volver al Inicio"
              style={styles.homeBtn}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.lg,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.xl,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    lineHeight: 20,
    marginBottom: TOKENS.spacing.xl,
  },
  actions: {
    width: '100%',
    marginTop: TOKENS.spacing.md,
  },
  homeBtn: {
    marginTop: TOKENS.spacing.md,
  },
});

