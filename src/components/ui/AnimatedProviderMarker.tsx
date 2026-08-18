import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Marker, AnimatedRegion } from 'react-native-maps';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';

const AnimatedMarker = Animated.createAnimatedComponent(Marker);

interface AnimatedProviderMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  heading?: number | null;
  text?: string;
}

/**
 * Marker de proveedor con movimiento SUAVE (interpolación de coordenadas),
 * en lugar del re-render/teletransporte que produce parpadeo.
 *
 * - Usa AnimatedRegion: la interpolación corre en el thread nativo del mapa.
 * - Rotación del icono según `heading` (dirección de viaje) cuando está disponible.
 * - `tracksViewChanges` se apaga tras el warmup para no degradar el render del mapa.
 */
export const AnimatedProviderMarker: React.FC<AnimatedProviderMarkerProps> = ({
  coordinate,
  heading,
  text,
}) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const region = useRef(
    new AnimatedRegion({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;
  const rotation = useRef(new Animated.Value(heading ?? 0)).current;

  const currentHeadingRef = useRef<number | null>(heading ?? null);

  useEffect(() => {
    region
      .timing({
        toValue: 1,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 800,
        useNativeDriver: false,
      })
      .start();
  }, [region, coordinate.latitude, coordinate.longitude]);

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 400);
    return () => clearTimeout(timer);
  }, [coordinate.latitude, coordinate.longitude]);

  useEffect(() => {
    if (heading == null || !Number.isFinite(heading)) {
      currentHeadingRef.current = null;
      return;
    }
    const prev = currentHeadingRef.current;
    currentHeadingRef.current = heading;
    if (prev == null) {
      rotation.setValue(heading);
      return;
    }
    // Rotación más corta (normaliza la diferencia a [-180, 180]) para evitar
    // giros en 350° cuando el GPS varía levemente.
    let delta = heading - prev;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    rotation.setValue(prev);
    Animated.timing(rotation, {
      toValue: prev + delta,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [heading, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <AnimatedMarker
      coordinate={region as any}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      zIndex={998}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.container}>
        {text ? (
          <View style={styles.label}>
            <View style={styles.labelDot} />
            <View style={styles.labelTextWrap}>
              <Icon name="Briefcase" size={10} color={TOKENS.colors.white} />
            </View>
          </View>
        ) : null}
        <Animated.View style={[styles.car, { transform: [{ rotate }] }]}>
          <View style={styles.circle}>
            <Icon name="Briefcase" size={18} color={TOKENS.colors.white} />
          </View>
        </Animated.View>
      </View>
    </AnimatedMarker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 56,
    alignItems: 'center',
  },
  car: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    ...TOKENS.shadows.floating,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TOKENS.colors.white,
    marginRight: 4,
  },
  labelTextWrap: {
    backgroundColor: 'rgba(230, 0, 126, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
