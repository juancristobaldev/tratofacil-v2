import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { TOKENS } from '../../theme';

const AnimatedMapCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedUserMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export const AnimatedUserMarker: React.FC<AnimatedUserMarkerProps> = ({ coordinate }) => {
  const progress1 = useRef(new Animated.Value(0)).current;
  const progress2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );

    const anim1 = createAnimation(progress1);
    const anim2 = createAnimation(progress2);

    anim1.start();
    
    const timeout = setTimeout(() => {
      anim2.start();
    }, 1250);

    return () => {
      anim1.stop();
      anim2.stop();
      clearTimeout(timeout);
    };
  }, [progress1, progress2]);

  const radius1 = progress1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150], // Expansion from 0 to 150 meters
  });

  const fillColor1 = progress1.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: ['rgba(230, 0, 126, 0)', 'rgba(230, 0, 126, 0.4)', 'rgba(230, 0, 126, 0)'],
  });

  const strokeColor1 = progress1.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: ['rgba(230, 0, 126, 0)', 'rgba(230, 0, 126, 0.6)', 'rgba(230, 0, 126, 0)'],
  });

  const radius2 = progress2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150],
  });

  const fillColor2 = progress2.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: ['rgba(230, 0, 126, 0)', 'rgba(230, 0, 126, 0.4)', 'rgba(230, 0, 126, 0)'],
  });

  const strokeColor2 = progress2.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: ['rgba(230, 0, 126, 0)', 'rgba(230, 0, 126, 0.6)', 'rgba(230, 0, 126, 0)'],
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
      <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={999} tracksViewChanges={false}>
        <View style={styles.container}>
          <View style={styles.dot}>
            <View style={styles.innerDot} />
          </View>
        </View>
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TOKENS.colors.brand500,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: TOKENS.colors.brand500,
  }
});
