import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { TOKENS, MOTION } from '../../theme';
import { Icon } from './Icon';

const AnimatedMapCircle = Animated.createAnimatedComponent(Circle);

interface ProviderTrackingPinProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  text?: string;
}

export const ProviderTrackingPin: React.FC<ProviderTrackingPinProps> = ({ coordinate }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const progress1 = useRef(new Animated.Value(0)).current;
  const progress2 = useRef(new Animated.Value(0)).current;

  // Warmup lifecycle for Marker snapshot
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [coordinate.latitude, coordinate.longitude]);

  useEffect(() => {
    const createAnimation = (value: Animated.Value) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: MOTION.duration.pulse,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: false,
        })
      );

    const anim1 = createAnimation(progress1);
    const anim2 = createAnimation(progress2);

    anim1.start();
    
    const timeout = setTimeout(() => {
      anim2.start();
    }, 1200);

    return () => {
      anim1.stop();
      anim2.stop();
      clearTimeout(timeout);
    };
  }, [progress1, progress2]);

  const radius1 = progress1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180], // Slightly larger for provider in transit
  });

  const fillColor1 = progress1.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: ['rgba(230, 0, 126, 0)', 'rgba(230, 0, 126, 0.25)', 'rgba(230, 0, 126, 0)'],
  });

  const strokeColor1 = progress1.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: ['rgba(230, 0, 126, 0)', 'rgba(230, 0, 126, 0.5)', 'rgba(230, 0, 126, 0)'],
  });

  const radius2 = progress2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const fillColor2 = progress2.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: ['rgba(230, 0, 126, 0)', 'rgba(230, 0, 126, 0.25)', 'rgba(230, 0, 126, 0)'],
  });

  const strokeColor2 = progress2.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: ['rgba(230, 0, 126, 0)', 'rgba(230, 0, 126, 0.5)', 'rgba(230, 0, 126, 0)'],
  });

  return (
    <>
      <AnimatedMapCircle
        center={coordinate}
        radius={radius1}
        fillColor={fillColor1}
        strokeColor={strokeColor1}
        strokeWidth={1.5}
        zIndex={997}
      />
      <AnimatedMapCircle
        center={coordinate}
        radius={radius2}
        fillColor={fillColor2}
        strokeColor={strokeColor2}
        strokeWidth={1.5}
        zIndex={997}
      />
      <Marker
        coordinate={coordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        centerOffset={{ x: 0, y: 0 }}
        zIndex={998}
        tracksViewChanges={tracksViewChanges}
      >
        <View style={styles.container}>
          <View style={styles.circle}>
            <View style={styles.iconContainer}>
              <Icon name="Briefcase" size={16} color={TOKENS.colors.white} />
            </View>
          </View>
        </View>
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    backgroundColor: TOKENS.colors.brand500,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
    ...TOKENS.shadows.floating,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
