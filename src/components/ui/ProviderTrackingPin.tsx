import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { TOKENS } from '../../theme';
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
    outputRange: [0, 200], // Slightly larger for provider
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
    outputRange: [0, 200],
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
      <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} zIndex={998} tracksViewChanges={false}>
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
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    ...TOKENS.shadows.floating,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
