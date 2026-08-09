import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Modal as RNModal,
  Pressable,
  ViewStyle,
  Animated,
} from 'react-native';
import { TOKENS, MOTION } from '../../theme';
import { Icon } from './Icon';

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
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Icon name="X" size={16} color={TOKENS.colors.textSubtle} />
            </Pressable>
          )}
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
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
    position: 'relative',
    ...TOKENS.shadows.floating,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
