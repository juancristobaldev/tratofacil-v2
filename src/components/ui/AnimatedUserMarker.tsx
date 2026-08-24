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
  onPress?: () => void;
}

export const AnimatedUserMarker: React.FC<AnimatedUserMarkerProps> = ({ coordinate, onPress }) => {
  const isFocused = useIsFocused();
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const scale1 = useRef(new Animated.Value(0.2)).current;
  const opacity1 = useRef(new Animated.Value(0.6)).current;
  const scale2 = useRef(new Animated.Value(0.2)).current;
  const opacity2 = useRef(new Animated.Value(0.6)).current;

  // Warmup lifecycle for Marker snapshot to ensure complete 360 layout before freezing
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [isFocused, coordinate.latitude, coordinate.longitude]);

  useEffect(() => {
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
        ])
      );

    const anim1 = createPulseAnim(scale1, opacity1);
    const anim2 = createPulseAnim(scale2, opacity2);

    scale1.setValue(0.2);
    opacity1.setValue(0.6);
    anim1.start();

    const timeout = setTimeout(() => {
      scale2.setValue(0.2);
      opacity2.setValue(0.6);
      anim2.start();
    }, MOTION.duration.pulse / 2);

    return () => {
      anim1.stop();
      anim2.stop();
      clearTimeout(timeout);
      scale1.setValue(0.2);
      opacity1.setValue(0.6);
      scale2.setValue(0.2);
      opacity2.setValue(0.6);
    };
  }, [scale1, opacity1, scale2, opacity2]);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
      zIndex={999}
      tracksViewChanges={tracksViewChanges}
      onPress={(e) => {
        e.stopPropagation();
        onPress?.();
      }}
    >
      <View style={styles.container}>
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
        {/* Pin central del usuario */}
        <View style={styles.outerGlow}>
          <View style={styles.whiteRing}>
            <View style={styles.innerDot} />
          </View>
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 0, 126, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(230, 0, 126, 0.45)',
  },
  outerGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(230, 0, 126, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TOKENS.colors.brand500,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: TOKENS.colors.brand500,
  },
});
