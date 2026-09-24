import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Modal as RNModal,
  Pressable,
  ViewStyle,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TOKENS, MOTION } from '../../theme';
import { IconButton } from './IconButton';

interface ModalProps {
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
  showCloseButton?: boolean;
  contentStyle?: ViewStyle;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  visible,
  onClose,
  showCloseButton = true,
  contentStyle,
}) => {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.92);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: MOTION.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <Animated.View
              style={[
                styles.dialog,
                contentStyle,
                {
                  opacity,
                  transform: [{ scale }],
                },
              ]}
            >
              {showCloseButton && (
                <IconButton
                  icon="X"
                  size="sm"
                  variant="surface"
                  accessibilityLabel="Cerrar modal"
                  onPress={onClose}
                  style={styles.closeBtn}
                />
              )}
              {children}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: TOKENS.colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: TOKENS.spacing.md,
  },
  dialog: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusModal,
    padding: TOKENS.spacing.lg,
    width: '100%',
    maxWidth: 340,
    maxHeight: '85%',
    position: 'relative',
    ...TOKENS.shadows.floating,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
});

