import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';

interface Props {
  icon?: React.ComponentProps<typeof Icon>['name'];
  title: string;
  description?: string;
}

export const EmptyState: React.FC<Props> = ({
  icon = 'Inbox',
  title,
  description,
}) => {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={48} color={TOKENS.colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: TOKENS.spacing.xl,
    gap: TOKENS.spacing.sm,
  },
  title: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    textAlign: 'center',
  },
  description: {
    fontSize: TOKENS.typography.sizes.sm,
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    lineHeight: 20,
  },
});
