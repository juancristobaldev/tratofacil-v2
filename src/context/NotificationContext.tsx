import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, SafeAreaView, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TOKENS } from '../theme';
import { Icon } from '../components/ui/Icon';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
  duration?: number; // ms
}

interface NotificationContextProps {
  showNotification: (options: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  showNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationOptions | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(1);

  const hideNotification = useCallback(() => {
    translateY.value = withSpring(-150, { damping: 20, stiffness: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(setNotification)(null);
      }
    });
  }, [translateY, opacity]);

  const showNotification = useCallback((options: NotificationOptions) => {
    setNotification(options);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try { Vibration.vibrate(50); } catch {}

    // Reset values
    translateY.value = -150;
    opacity.value = 0;
    progress.value = 1;

    // Enter animation
    translateY.value = withSpring(0, { damping: 15, stiffness: 150, mass: 0.8 });
    opacity.value = withTiming(1, { duration: 200 });

    const duration = options.duration || 4000;
    
    // Progress bar animation
    progress.value = withTiming(0, { duration: duration, easing: Easing.linear });

    timeoutRef.current = setTimeout(() => {
      hideNotification();
    }, duration);
  }, [hideNotification, progress, opacity, translateY]);

  const value = useMemo(() => ({ showNotification }), [showNotification]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
      } else {
        // Elastic pull down
        translateY.value = e.translationY * 0.3;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -20 || e.velocityY < -500) {
        runOnJS(hideNotification)();
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {notification && (
        <View style={styles.container} pointerEvents="box-none">
          <SafeAreaView pointerEvents="box-none">
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.notificationPill, animatedStyle]}>
                <View style={styles.contentRow}>
                  <View style={[
                    styles.iconBox,
                    notification.type === 'error' && styles.iconBoxError,
                    notification.type === 'success' && styles.iconBoxSuccess,
                    notification.type === 'info' && styles.iconBoxInfo,
                  ]}>
                    <Icon 
                      name={
                        notification.type === 'error' ? 'AlertCircle' :
                        notification.type === 'success' ? 'CheckCircle' :
                        'Info'
                      } 
                      size={20} 
                      color={TOKENS.colors.white} 
                    />
                  </View>
                  <View style={styles.textContent}>
                    <Text style={styles.title}>{notification.title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
                  </View>
                </View>
                
                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                  <Animated.View style={[
                    styles.progressBar,
                    notification.type === 'error' && styles.progressBarError,
                    notification.type === 'success' && styles.progressBarSuccess,
                    notification.type === 'info' && styles.progressBarInfo,
                    progressStyle
                  ]} />
                </View>
              </Animated.View>
            </GestureDetector>
          </SafeAreaView>
        </View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: TOKENS.spacing.md,
    paddingTop: TOKENS.spacing.md,
  },
  notificationPill: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    ...TOKENS.shadows.floating,
    marginHorizontal: TOKENS.spacing.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.surface300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: TOKENS.spacing.md,
  },
  iconBoxSuccess: {
    backgroundColor: TOKENS.colors.statusSuccess,
  },
  iconBoxError: {
    backgroundColor: TOKENS.colors.statusDanger,
  },
  iconBoxInfo: {
    backgroundColor: TOKENS.colors.brand500,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
    marginBottom: 4,
  },
  message: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    lineHeight: 18,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: TOKENS.colors.surface100,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: TOKENS.colors.brand500,
  },
  progressBarSuccess: {
    backgroundColor: TOKENS.colors.statusSuccess,
  },
  progressBarError: {
    backgroundColor: TOKENS.colors.statusDanger,
  },
  progressBarInfo: {
    backgroundColor: TOKENS.colors.brand500,
  },
});
