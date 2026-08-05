import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Icon, RotatingHorizontalAd } from '../../components/ui';
import { useAds } from '../../hooks/useAds';

export const ServiceSuccessScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { horizontal, getTransitionDuration } = useAds();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconInner}>
            <Icon name="Check" size={48} color={TOKENS.colors.white} />
          </View>
        </View>
        
        <Text style={styles.title}>¡Gracias por preferir{'\n'}Trato Fácil!</Text>
        <Text style={styles.subtitle}>
          Cuando tengas problemas solo ingresa nuevamente y busca tu prestador de servicios.
        </Text>
      </View>

      <View style={styles.footer}>
        {/* We reuse the Ad component which will rotate, but we can assume it shows PROPERTY */}
        <RotatingHorizontalAd 
          images={horizontal} 
          transitionDuration={getTransitionDuration('marketing', 'HORIZONTAL', 6000)}
        />
        <Button
          title="Volver al Inicio"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] })}
          style={styles.homeBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
    paddingHorizontal: TOKENS.spacing.lg,
  },
  content: {
    flex: 1,
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
  },
  footer: {
    paddingBottom: TOKENS.spacing.xl,
  },
  homeBtn: {
    marginTop: TOKENS.spacing.md,
  },
});
