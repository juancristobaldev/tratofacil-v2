import React from 'react';
import {
  StyleSheet,
  Text,
  ScrollView,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

export interface ChipItem<T> {
  key: T;
  label: string;
  icon?: IconName;
}

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected,
  onPress,
  icon,
  style,
  testID,
}) => {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon && (
        <Icon
          name={icon}
          size={14}
          color={selected ? TOKENS.colors.white : TOKENS.colors.textSubtle}
          style={styles.chipIcon}
        />
      )}
      <Text
        style={[
          styles.chipText,
          selected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export interface FilterChipsRowProps<T> {
  items: ChipItem<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function FilterChipsRow<T extends string | number>({
  items,
  selectedKey,
  onSelect,
  style,
}: FilterChipsRowProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.rowContainer, style]}
    >
      {items.map((item) => (
        <FilterChip
          key={String(item.key)}
          label={item.label}
          icon={item.icon}
          selected={item.key === selectedKey}
          onPress={() => onSelect(item.key)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.xs,
    paddingVertical: TOKENS.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.xs + 1,
    borderRadius: TOKENS.geometry.radiusPill,
    minHeight: 34,
  },
  chipSelected: {
    backgroundColor: TOKENS.colors.dark900,
    ...TOKENS.shadows.soft,
  },
  chipUnselected: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: TOKENS.typography.sizes.xs + 1,
    fontWeight: TOKENS.typography.weights.semibold,
  },
  chipTextSelected: {
    color: TOKENS.colors.white,
  },
  chipTextUnselected: {
    color: TOKENS.colors.textSubtle,
  },
});
