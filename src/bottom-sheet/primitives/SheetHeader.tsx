import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { TOKENS } from '../../theme';

interface SheetHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}

export const SheetHeader: React.FC<SheetHeaderProps> = ({ title, subtitle, trailing }) => (
  <View style={styles.header}>
    <View style={styles.titles}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    {trailing}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.sm,
  },
  titles: {
    flex: 1,
    marginRight: TOKENS.spacing.sm,
  },
  title: {
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.textMain,
  },
  subtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
});