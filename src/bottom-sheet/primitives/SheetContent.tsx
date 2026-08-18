import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { TOKENS } from '../../theme';

interface SheetContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export const SheetContent: React.FC<SheetContentProps> = ({ children, style, padded = true }) => (
  <View style={[padded && styles.padded, style]}>{children}</View>
);

const styles = StyleSheet.create({
  padded: {
    paddingHorizontal: TOKENS.spacing.lg,
  },
});