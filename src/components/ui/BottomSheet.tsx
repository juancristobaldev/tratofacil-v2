import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Pressable,
  ViewStyle,
  PanResponder,
  StyleProp,
  LayoutChangeEvent,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';

export type BottomSheetState = 'expanded' | 'minimized' | 'hidden';

interface BottomSheetProps {
  children: React.ReactNode;
  visible?: boolean;
  state?: BottomSheetState;
  onStateChange?: (state: BottomSheetState) => void;
  onClose: () => void;
  showHandle?: boolean;
  showCloseButton?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: ViewStyle;
  bottomInset?: number; // Space reserved for BottomNav
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_HEIGHT = SCREEN_HEIGHT * 0.75;

export const BottomSheet: React.FC<BottomSheetProps> = ({
  children,
  visible = false,
  state,
  onStateChange,
  onClose,
  showHandle = true,
  showCloseButton = false,
  style,
  contentStyle,
  bottomInset = 0,
}) => {
  const activeState = state !== undefined ? state : (visible ? 'expanded' : 'hidden');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Dynamic height state
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [hasMeasured, setHasMeasured] = useState(false);

  const activeStateRef = useRef(activeState);
  activeStateRef.current = activeState;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const slideAnimRef = useRef(slideAnim);
  slideAnimRef.current = slideAnim;

  const contentHeightRef = useRef(contentHeight);
  contentHeightRef.current = contentHeight;

  useEffect(() => {
    if (!hasMeasured) return;

    const actualHeight = contentHeight;
    // 80% hidden, 20% visible. Garantizamos que al menos queden 60px visibles para el handle.
    const hideOffset = Math.min(actualHeight * 0.8, actualHeight - 60); 
    const minimizeOffset = actualHeight * 0.5; // 50% visible

    if (activeState === 'expanded') {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: TOKENS.animation.durationNormal,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: TOKENS.animation.durationNormal,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (activeState === 'minimized') {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: minimizeOffset,
          duration: TOKENS.animation.durationNormal,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: TOKENS.animation.durationNormal,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: hideOffset,
          duration: TOKENS.animation.durationFast,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: TOKENS.animation.durationFast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeState, contentHeight, hasMeasured]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const currentState = activeStateRef.current;
        const currentSlide = slideAnimRef.current;
        const h = contentHeightRef.current;
        
        const hideOffset = Math.min(h * 0.8, h - 60);
        const minimizeOffset = h * 0.5;

        if (currentState === 'expanded') {
          if (gestureState.dy > 0) {
            currentSlide.setValue(gestureState.dy);
          }
        } else if (currentState === 'minimized') {
          currentSlide.setValue(minimizeOffset + gestureState.dy);
        } else if (currentState === 'hidden') {
          if (gestureState.dy < 0) {
            currentSlide.setValue(hideOffset + gestureState.dy);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentState = activeStateRef.current;
        const onChange = onStateChangeRef.current;
        const currentSlide = slideAnimRef.current;
        const h = contentHeightRef.current;

        const hideOffset = Math.min(h * 0.8, h - 60);
        const minimizeOffset = h * 0.5;

        if (currentState === 'expanded') {
          if (gestureState.dy > 150 || gestureState.vy > 0.8) {
            if (onChange) onChange('hidden');
          } else if (gestureState.dy > 60 || gestureState.vy > 0.3) {
            if (onChange) onChange('minimized');
          } else {
            Animated.spring(currentSlide, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        } else if (currentState === 'minimized') {
          if (gestureState.dy > 60 || gestureState.vy > 0.3) {
            if (onChange) onChange('hidden');
          } else if (gestureState.dy < -60 || gestureState.vy < -0.3) {
            if (onChange) onChange('expanded');
          } else {
            Animated.spring(currentSlide, {
              toValue: minimizeOffset,
              useNativeDriver: true,
            }).start();
          }
        } else if (currentState === 'hidden') {
          if (gestureState.dy < -60 || gestureState.vy < -0.3) {
            if (onChange) onChange('expanded'); // Swipe up from hidden usually expands fully for better UX, or minimized
          } else {
            Animated.spring(currentSlide, {
              toValue: hideOffset,
              useNativeDriver: true,
            }).start();
          }
        }
      },
    })
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    let measuredHeight = Math.round(event.nativeEvent.layout.height);
    if (measuredHeight < 100) measuredHeight = 100; // minimum safeguard
    
    // Prevent infinite loops from fractional subpixel layout changes
    if (Math.abs(contentHeight - measuredHeight) > 2) {
      setContentHeight(measuredHeight);
    }

    if (!hasMeasured) {
      slideAnim.setValue(SCREEN_HEIGHT); // ensure it starts from bottom
      setHasMeasured(true);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      {activeState === 'expanded' && (
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
      )}

      {/* Sheet Container */}
      <Animated.View
        style={[
          styles.sheet,
          {
            maxHeight: MAX_HEIGHT + bottomInset,
            bottom: 0,
            transform: [{ translateY: slideAnim }],
            opacity: hasMeasured ? 1 : 0, // hide until layout is measured
          },
          style,
        ]}
      >
        {/* Header area that captures swipe gestures */}
        <View {...panResponder.panHandlers} style={styles.gestureHeader}>
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          {showCloseButton && (
            <Pressable
              onPress={() => {
                if (onStateChange) {
                  onStateChange('hidden');
                }
              }}
              style={styles.closeBtn}
            >
              <Icon name="X" size={18} color={TOKENS.colors.textSubtle} />
            </Pressable>
          )}
        </View>

        {/* Dynamic Content Wrapper */}
        <View onLayout={handleLayout} style={[styles.content, { paddingBottom: bottomInset }, contentStyle]}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 350,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: TOKENS.geometry.radiusModal,
    borderTopRightRadius: TOKENS.geometry.radiusModal,
    ...TOKENS.shadows.floating,
    zIndex: 400,
  },
  gestureHeader: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: TOKENS.geometry.radiusModal,
    borderTopRightRadius: TOKENS.geometry.radiusModal,
    zIndex: 410, // Ensure header is above content for swiping
  },
  handleContainer: {
    width: '100%',
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: TOKENS.colors.surface300,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 410,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
  },
});
