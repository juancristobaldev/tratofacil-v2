import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
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
      flat={true}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.container}>
        {text ? (
          <View style={styles.labelWrapper}>
            <View style={styles.label}>
              <View style={styles.labelDot} />
              <Text style={styles.labelText}>{text}</Text>
            </View>
            <View style={styles.labelArrow} />
          </View>
        ) : null}

        {/* Outer Directional Beacon (rotates with heading) */}
        <Animated.View style={[styles.headingRing, { transform: [{ rotate }] }]}>
          <View style={styles.directionalPointer} />
        </Animated.View>

        {/* Static Provider Core (Icon stays upright and legible) */}
        <View style={styles.pulseRing} />
        <View style={styles.circle}>
          <Icon name="Briefcase" size={17} color={TOKENS.colors.white} />
        </View>
      </View>
    </AnimatedMarker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headingRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
  },
  directionalPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: TOKENS.colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 4,
  },
  pulseRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(230, 0, 126, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(230, 0, 126, 0.35)',
    zIndex: 1,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: TOKENS.colors.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 3,
  },
  labelWrapper: {
    position: 'absolute',
    bottom: 52,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.success500,
    marginRight: 5,
  },
  labelText: {
    color: TOKENS.colors.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  labelArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(15, 23, 42, 0.94)',
    marginTop: -0.5,
  },
});
