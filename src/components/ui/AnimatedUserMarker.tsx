import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { useIsFocused } from '@react-navigation/native';
import { TOKENS, MOTION } from '../../theme';

const AnimatedMapCircle = Animated.createAnimatedComponent(Circle);

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
  const progress1 = useRef(new Animated.Value(0)).current;
  const progress2 = useRef(new Animated.Value(0)).current;

  // Warmup lifecycle for Marker snapshot to ensure complete 360 layout before freezing
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [isFocused, coordinate.latitude, coordinate.longitude]);

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
    outputRange: [0, 140], // Soft pulse radius in meters
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
    outputRange: [0, 140],
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
        strokeWidth={1}
        zIndex={998}
      />
      <AnimatedMapCircle
        center={coordinate}
        radius={radius2}
        fillColor={fillColor2}
        strokeColor={strokeColor2}
        strokeWidth={1}
        zIndex={998}
      />
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
          <View style={styles.outerGlow}>
            <View style={styles.whiteRing}>
              <View style={styles.innerDot} />
            </View>
          </View>
        </View>
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
