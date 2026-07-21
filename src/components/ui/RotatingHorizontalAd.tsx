import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { TOKENS } from '../../theme';

const AD_SLIDES = [
  {
    badge: "CyberDay",
    title: "Hasta 50% dcto.",
    desc: "en miles de productos\nfalabella.",
    buttonText: "Ver ofertas",
    colors: ['#3b278a', '#2a1b64'],
    textColor: '#ffffff',
  },
  {
    badge: "SKBERG MOTORS",
    title: "Tu próximo auto\nte espera",
    desc: "",
    buttonText: "Cotiza ahora",
    colors: ['#1e293b', '#0f172a'],
    textColor: '#ffffff',
  },
  {
    badge: "PROPERTY",
    title: "Encuentra la propiedad\nde tus sueños",
    desc: "Asesoría personalizada\n100% online",
    buttonText: "Ver propiedades",
    colors: ['#e2e8f0', '#cbd5e1'],
    textColor: '#0f172a',
  }
];

export const RotatingHorizontalAd: React.FC = () => {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIndex((prev) => (prev + 1) % AD_SLIDES.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const slide = AD_SLIDES[index];

  return (
    <View style={[styles.container, { backgroundColor: slide.colors[0] }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.textContainer}>
          <Text style={[styles.badgeText, { color: slide.textColor === '#ffffff' ? TOKENS.colors.white : TOKENS.colors.brand500 }]}>{slide.badge}</Text>
          <Text style={[styles.title, { color: slide.textColor }]}>{slide.title}</Text>
          {slide.desc ? <Text style={[styles.desc, { color: slide.textColor }]}>{slide.desc}</Text> : null}
          <View style={styles.button}>
            <Text style={styles.buttonText}>{slide.buttonText}</Text>
          </View>
        </View>
        <View style={styles.indicatorContainer}>
          {AD_SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 120,
    borderRadius: 16,
    marginVertical: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  desc: {
    fontSize: 11,
    marginBottom: 10,
    opacity: 0.9,
  },
  button: {
    backgroundColor: TOKENS.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: TOKENS.colors.brand500,
    fontSize: 10,
    fontWeight: 'bold',
  },
  indicatorContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#ffffff',
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
