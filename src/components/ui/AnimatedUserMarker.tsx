import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Marker } from 'react-native-maps';
import { useIsFocused } from '@react-navigation/native';
import { TOKENS, MOTION } from '../../theme';

interface AnimatedUserMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  heading?: number | null;
  onPress?: () => void;
  isMapManipulating?: boolean;
}

const AnimatedUserMarkerComponent: React.FC<AnimatedUserMarkerProps> = ({
  coordinate,
  heading,
  onPress,
  isMapManipulating = false,
}) => {
  const isFocused = useIsFocused();
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const initialWarmupDoneRef = useRef(false);
  const scale1 = useRef(new Animated.Value(0.2)).current;
  const opacity1 = useRef(new Animated.Value(0.6)).current;
  const scale2 = useRef(new Animated.Value(0.2)).current;
  const opacity2 = useRef(new Animated.Value(0.6)).current;

  // Warmup inicial de un solo disparo: genera el bitmap nativo nítido y luego congela
  // para que el hilo GPU de MapKit / GoogleMaps mueva el marcador a 60/120 FPS sin desfase.
  useEffect(() => {
    if (isMapManipulating) {
      setTracksViewChanges(false);
      return;
    }

    let isMounted = true;
    if (!initialWarmupDoneRef.current && isFocused) {
      setTracksViewChanges(true);
      const timer = setTimeout(() => {
        if (!isMounted) return;
        initialWarmupDoneRef.current = true;
        setTracksViewChanges(false);
      }, 200);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [isFocused, isMapManipulating]);

  useEffect(() => {
    let isMounted = true;
    const createPulseAnim = (scaleVal: Animated.Value, opacityVal: Animated.Value) =>
      Animated.loop(
        Animated.parallel([
          Animated.timing(scaleVal, {
            toValue: 2.2,
            duration: MOTION.duration.pulse,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(opacityVal, {
            toValue: 0,
            duration: MOTION.duration.pulse,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]),
      );

    const anim1 = createPulseAnim(scale1, opacity1);
    const anim2 = createPulseAnim(scale2, opacity2);

    scale1.setValue(0.2);
    opacity1.setValue(0.6);
    anim1.start();

    const timeout = setTimeout(() => {
      if (!isMounted) return;
      scale2.setValue(0.2);
      opacity2.setValue(0.6);
      anim2.start();
    }, MOTION.duration.pulse / 2);

    return () => {
      isMounted = false;
      anim1.stop();
      anim2.stop();
      clearTimeout(timeout);
      scale1.setValue(0.2);
      opacity1.setValue(0.6);
      scale2.setValue(0.2);
      opacity2.setValue(0.6);
    };
  }, [scale1, opacity1, scale2, opacity2]);

  const effectiveTracksViewChanges = !isMapManipulating && tracksViewChanges;
  const hasHeading = heading != null && Number.isFinite(heading) && heading >= 0;

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      zIndex={999}
      flat={true}
      tracksViewChanges={effectiveTracksViewChanges}
      onPress={(e) => {
        e.stopPropagation();
        onPress?.();
      }}
    >
      <View style={styles.container}>
        {/* Haz direccional de orientación (Heading Beam estilo Uber) */}
        {hasHeading && (
          <View
            style={[
              styles.headingContainer,
              { transform: [{ rotate: `${heading}deg` }] },
            ]}
          >
            <View style={styles.headingBeam} />
          </View>
        )}

        {/* Anillo de pulso exterior 1 */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              opacity: opacity1,
              transform: [{ scale: scale1 }],
            },
          ]}
        />
        {/* Anillo de pulso exterior 2 */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              opacity: opacity2,
              transform: [{ scale: scale2 }],
            },
          ]}
        />

        {/* Halo estático exterior de profundidad (visible siempre aun congelado) */}
        <View style={styles.ambientHalo} />

        {/* Pin central del usuario con centro geométrico exacto */}
        <View style={styles.outerGlow}>
          <View style={styles.whiteRing}>
            <View style={styles.innerDot} />
          </View>
        </View>
      </View>
    </Marker>
  );
};

function areUserMarkerPropsEqual(
  prev: AnimatedUserMarkerProps,
  next: AnimatedUserMarkerProps,
): boolean {
  if (prev.isMapManipulating !== next.isMapManipulating) return false;
  if ((prev.onPress == null) !== (next.onPress == null)) return false;
  if (prev.heading !== next.heading) return false;

  const latDiff = Math.abs(prev.coordinate.latitude - next.coordinate.latitude);
  const lngDiff = Math.abs(prev.coordinate.longitude - next.coordinate.longitude);

  // Ignorar micro-ruido de GPS < 1 metro (0.00001°) para prevenir re-renders durante paneos
  return latDiff < 0.00001 && lngDiff < 0.00001;
}

export const AnimatedUserMarker = React.memo(AnimatedUserMarkerComponent, areUserMarkerPropsEqual);

const styles = StyleSheet.create({
  container: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingContainer: {
    position: 'absolute',
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headingBeam: {
    position: 'absolute',
    top: 6,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(230, 0, 126, 0.35)',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 0, 126, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(230, 0, 126, 0.38)',
  },
  ambientHalo: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(230, 0, 126, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 0, 126, 0.22)',
    zIndex: 2,
  },
  outerGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(230, 0, 126, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  whiteRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 6,
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: TOKENS.colors.brand500,
  },
});

