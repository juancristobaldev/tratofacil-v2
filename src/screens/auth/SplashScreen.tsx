import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKENS } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const ONBOARDING_KEY = '@tratofacil_onboarding_done';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { authResolved, isGuest } = useAuth();
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      if (!authResolved) return;

      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);

      if (isGuest) {
        navigation.replace('SetPassword');
      } else if (onboardingDone === 'true') {
        navigation.replace('MainApp');
      } else {
        navigation.replace('Onboarding');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [authResolved, isGuest]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 260,
    height: 90,
  },
});
