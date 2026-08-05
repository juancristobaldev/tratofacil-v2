import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { TOKENS } from '../../theme';

interface Props {
  message?: string;
}

export const LoadingScreen: React.FC<Props> = ({ message = 'Cargando...' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={TOKENS.colors.brand500} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    gap: TOKENS.spacing.md,
  },
  text: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
});
