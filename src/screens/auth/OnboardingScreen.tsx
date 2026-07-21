import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Button, Icon, IconName } from '../../components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  id: number;
  title: string;
  description: string;
  icon: IconName;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    title: 'Encuentra Profesionales',
    description: 'Busca electricistas, gasfiteros, pintores y más profesionales calificados en tu comuna en tiempo real.',
    icon: 'Search',
  },
  {
    id: 2,
    title: 'TratoDirecto y Seguro',
    description: 'Conversa en tiempo real con los proveedores, recibe cotizaciones formales y realiza tus pagos de forma segura.',
    icon: 'MessageCircle',
  },
  {
    id: 3,
    title: 'Profesionales Verificados',
    description: 'Revisamos la identidad, antecedentes y certificaciones SEC de nuestros profesionales para garantizar tu tranquilidad.',
    icon: 'ShieldCheck',
  },
];

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeSlide, setActiveSlide] = useState(0);

  const handleNext = () => {
    if (activeSlide < SLIDES.length - 1) {
      setActiveSlide(activeSlide + 1);
    } else {
      navigation.replace('MainApp');
    }
  };

  const handleSkip = () => {
    navigation.replace('MainApp');
  };

  const currentSlide = SLIDES[activeSlide];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {activeSlide < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <View style={styles.contentContainer}>
        {/* Animated Slide Icon */}
        <View style={styles.iconWrapper}>
          <Icon name={currentSlide.icon} size={72} color={TOKENS.colors.brand500} />
        </View>

        {/* Slide Texts */}
        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.description}>{currentSlide.description}</Text>
      </View>

      <View style={styles.footer}>
        {/* Slide Indicators */}
        <View style={styles.indicatorsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === activeSlide ? styles.indicatorActive : styles.indicatorInactive,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <Button
          title={activeSlide === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}
          onPress={handleNext}
          style={styles.nextBtn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  header: {
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.lg,
  },
  skipText: {
    color: TOKENS.colors.textSubtle,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.xl,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.xl,
    ...TOKENS.shadows.soft,
  },
  title: {
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  description: {
    fontSize: TOKENS.typography.sizes.md,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: TOKENS.typography.weights.medium,
  },
  footer: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.lg,
    alignItems: 'center',
    gap: TOKENS.spacing.lg,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },
  indicatorActive: {
    width: 20,
    backgroundColor: TOKENS.colors.brand500,
  },
  indicatorInactive: {
    width: 6,
    backgroundColor: TOKENS.colors.surface300,
  },
  nextBtn: {
    width: '100%',
  },
});
