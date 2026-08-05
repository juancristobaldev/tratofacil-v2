import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import { Button } from './Button';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<Props> = ({
  message = 'Ocurrió un error al cargar los datos.',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name="AlertTriangle" size={32} color={TOKENS.colors.white} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button title="Reintentar" onPress={onRetry} variant="secondary" style={styles.retryBtn} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    padding: TOKENS.spacing.xl,
    gap: TOKENS.spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TOKENS.colors.statusError,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  message: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: TOKENS.spacing.sm,
  },
});
