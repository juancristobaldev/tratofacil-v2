import React, { createContext, useContext, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export interface NotificationOptions {
  id?: string;
  title: string;
  message: string;
  type?: NotificationType;
  duration?: number; // ms
  onPress?: () => void;
}

export interface NotificationHistoryItem extends NotificationOptions {
  receivedAt: number;
}

interface NotificationContextProps {
  showNotification: (options: NotificationOptions) => void;
  clearNotification: () => void;
  history: NotificationHistoryItem[];
  clearHistory: () => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  showNotification: () => {},
  clearNotification: () => {},
  history: [],
  clearHistory: () => {},
});

export const useNotification = () => useContext(NotificationContext);

const triggerHaptic = (type?: NotificationType) => {
  try {
    if (type === 'error') {
      Vibration.vibrate([0, 60, 60, 60]);
    } else if (type === 'success') {
      Vibration.vibrate([0, 80]);
    } else {
      Vibration.vibrate(40);
    }
  } catch {}
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationOptions | null>(null);
  const [queuedNext, setQueuedNext] = useState<NotificationOptions | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);

  const notificationRef = useRef<NotificationOptions | null>(null);
  const isShowingRef = useRef(false);
  const queueRef = useRef<NotificationOptions[]>([]);
  const recentIdsRef = useRef<Map<string, number>>(new Map());
  const lifetimeMilestonesRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);
  
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(1);

  const displayNotification = useCallback((opts: NotificationOptions) => {
    notificationRef.current = opts;
    setNotification(opts);
    setQueuedNext(queueRef.current[0] || null);
    setQueueCount(queueRef.current.length);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    triggerHaptic(opts.type);

    translateY.value = -150;
    opacity.value = 0;
    progress.value = 1;

    translateY.value = withSpring(0, { damping: 15, stiffness: 150, mass: 0.8 });
    opacity.value = withTiming(1, { duration: 200 });

    const duration = opts.duration || (queueRef.current.length > 0 ? 2200 : 4000);
    progress.value = withTiming(0, { duration, easing: Easing?.linear });

    timeoutRef.current = setTimeout(() => {
      hideNotification();
    }, duration);
  }, [opacity, progress, translateY]);

  const isHidingRef = useRef(false);

  const processNextOrClose = useCallback(() => {
    isHidingRef.current = false;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      setQueuedNext(queueRef.current[0] || null);
      setQueueCount(queueRef.current.length);
      displayNotification(next);
    } else {
      isShowingRef.current = false;
      notificationRef.current = null;
      setNotification(null);
      setQueuedNext(null);
      setQueueCount(0);
    }
  }, [displayNotification]);

  const hideNotification = useCallback(() => {
    if (isHidingRef.current) return;
    isHidingRef.current = true;

    translateY.value = withSpring(-150, { damping: 20, stiffness: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(processNextOrClose)();
      }
    });

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      processNextOrClose();
    }, 250);
  }, [translateY, opacity, processNextOrClose]);

  const clearNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    translateY.value = -150;
    opacity.value = 0;
    progress.value = 0;

    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      setQueuedNext(queueRef.current[0] || null);
      setQueueCount(queueRef.current.length);
      displayNotification(next);
    } else {
      isShowingRef.current = false;
      notificationRef.current = null;
      setNotification(null);
      setQueuedNext(null);
      setQueueCount(0);
    }
  }, [opacity, progress, translateY, displayNotification]);

  const showNotification = useCallback((options: NotificationOptions) => {
    const dedupeKey = options.id || `${options.type || 'info'}:${options.title}:${options.message}`;
    const now = Date.now();

    // Clean up expired keys (> 15s)
    for (const [key, timestamp] of recentIdsRef.current.entries()) {
      if (now - timestamp > 15000) {
        recentIdsRef.current.delete(key);
      }
    }

    // Cooldown check (3000ms para absorber ráfagas de red/reconexión)
    const lastTimestamp = recentIdsRef.current.get(dedupeKey);
    if (lastTimestamp && (now - lastTimestamp) < 3000) {
      return;
    }
    recentIdsRef.current.set(dedupeKey, now);

    // Persistir en historial en memoria (máximo 20)
    setHistory((prev) => [
      { ...options, receivedAt: now },
      ...prev.slice(0, 19),
    ]);

    if (isShowingRef.current) {
      const alreadyInQueue = queueRef.current.some(
        item => (item.id && options.id && item.id === options.id) ||
                (item.title === options.title && item.message === options.message),
      );
      const isCurrentlyShowing = notificationRef.current && (
        (notificationRef.current.id && options.id && notificationRef.current.id === options.id) ||
        (notificationRef.current.title === options.title && notificationRef.current.message === options.message)
      );
      if (!alreadyInQueue && !isCurrentlyShowing) {
        queueRef.current.push(options);
        setQueuedNext(queueRef.current[0] || null);
        setQueueCount(queueRef.current.length);
      }
      return;
    }

    isShowingRef.current = true;
    displayNotification(options);
  }, [displayNotification]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handlePress = useCallback(() => {
    const current = notificationRef.current;
    if (current?.onPress) {
      try {
        current.onPress();
      } catch {}
    }
    clearNotification();
  }, [clearNotification]);

  const value = useMemo(
    () => ({ showNotification, clearNotification, history, clearHistory }),
    [showNotification, clearNotification, history, clearHistory]
  );

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onBegin(() => {
      // Hold/Drag to pause: pausa el timeout mientras el usuario interactúa
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    })
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
        // Reanudar el temporizador para cerrar en 2500ms tras soltar
        timeoutRef.current = setTimeout(() => {
          hideNotification();
        }, 2500);
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(handlePress)();
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

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
            <View style={styles.cardsWrapper} pointerEvents="box-none">
              {/* Tarjeta de fondo apilada (preview visual de cola) */}
              {queuedNext && (
                <View style={styles.stackedCard} pointerEvents="none" />
              )}

              <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.notificationPill, animatedStyle]}>
                  {/* Badge contador si hay más en cola */}
                  {queueCount > 0 && (
                    <View style={styles.badgePill} pointerEvents="none">
                      <Text style={styles.badgeText}>+{queueCount}</Text>
                    </View>
                  )}

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
            </View>
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
  cardsWrapper: {
    position: 'relative',
    width: '100%',
  },
  stackedCard: {
    position: 'absolute',
    left: TOKENS.spacing.md,
    right: TOKENS.spacing.md,
    top: 8,
    height: 64,
    backgroundColor: TOKENS.colors.surface200,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface300,
    transform: [{ scale: 0.94 }],
    opacity: 0.8,
    zIndex: 1,
    ...TOKENS.shadows.soft,
  },
  notificationPill: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    ...TOKENS.shadows.floating,
    marginHorizontal: TOKENS.spacing.sm,
    zIndex: 2,
  },
  badgePill: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: TOKENS.colors.brand500,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeText: {
    color: TOKENS.colors.white,
    fontSize: 10,
    fontWeight: TOKENS.typography.weights.extrabold,
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
    paddingRight: TOKENS.spacing.sm,
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
