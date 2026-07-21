import React from 'react';
import { StyleSheet, View, ViewStyle, Pressable, StyleProp } from 'react-native';
import { TOKENS } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  padded = true,
}) => {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          padded && styles.padded,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, padded && styles.padded, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusCard,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
    overflow: 'hidden',
  },
  padded: {
    padding: TOKENS.spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
