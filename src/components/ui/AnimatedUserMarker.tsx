import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';

interface AnimatedUserMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export const AnimatedUserMarker: React.FC<AnimatedUserMarkerProps> = ({ coordinate }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.out(Easing.ease),
      }),
      -1,
      false
    );
  }, []);

  const haloStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [1, 3], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, [0, 1], [0.8, 0], Extrapolation.CLAMP);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={999}>
      <View style={styles.container}>
        <Animated.View style={[styles.halo, haloStyle]} />
        <View style={styles.dot} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(236, 72, 153, 0.4)', // Pink
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EC4899', // Pink solid
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
});
