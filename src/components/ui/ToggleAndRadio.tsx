import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

// --- TOGGLE SWITCH ---
export interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  label?: string;
  subtitle?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onValueChange,
  label,
  subtitle,
  disabled = false,
  style,
  testID,
}) => {
  const offset = useSharedValue(value ? 20 : 2);

  React.useEffect(() => {
    offset.value = withSpring(value ? 20 : 2, TOKENS.animation.springConfig);
  }, [value, offset]);

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleToggle = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handleToggle}
      activeOpacity={0.8}
      disabled={disabled}
      style={[styles.toggleContainer, style]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label || 'Toggle switch'}
    >
      {(label || subtitle) && (
        <View style={styles.textWrap}>
          {label && <Text style={styles.toggleLabel}>{label}</Text>}
          {subtitle && <Text style={styles.toggleSubtitle}>{subtitle}</Text>}
        </View>
      )}
      <View
        style={[
          styles.switchTrack,
          value ? styles.switchTrackActive : styles.switchTrackInactive,
          disabled ? styles.switchTrackDisabled : null,
        ]}
      >
        <Animated.View style={[styles.switchThumb, thumbAnimatedStyle]} />
      </View>
    </TouchableOpacity>
  );
};

// --- RADIO OPTION & GROUP ---
export interface RadioOptionItem<T> {
  value: T;
  label: string;
  subtitle?: string;
  icon?: IconName;
}

export interface RadioGroupProps<T> {
  options: RadioOptionItem<T>[];
  selectedValue: T;
  onSelect: (val: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function RadioGroup<T extends string | number>({
  options,
  selectedValue,
  onSelect,
  style,
}: RadioGroupProps<T>) {
  return (
    <View style={[styles.radioGroup, style]}>
      {options.map((opt) => {
        const isSelected = opt.value === selectedValue;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
            style={styles.radioOption}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
          >
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <View style={styles.radioTextContainer}>
              <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
                {opt.label}
              </Text>
              {opt.subtitle && (
                <Text style={styles.radioSubtitle}>{opt.subtitle}</Text>
              )}
            </View>
            {opt.icon && (
              <Icon
                name={opt.icon}
                size={20}
                color={isSelected ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: TOKENS.spacing.xs,
  },
  textWrap: {
    flex: 1,
    marginRight: TOKENS.spacing.md,
  },
  toggleLabel: {
    fontSize: TOKENS.typography.sizes.sm + 1,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  toggleSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: TOKENS.colors.brand500,
  },
  switchTrackInactive: {
    backgroundColor: TOKENS.colors.surface300,
  },
  switchTrackDisabled: {
    opacity: 0.5,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  radioGroup: {
    gap: TOKENS.spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.sm + 2,
    paddingHorizontal: TOKENS.spacing.sm,
    borderRadius: TOKENS.geometry.radiusInput,
    backgroundColor: TOKENS.colors.white,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: TOKENS.colors.surface300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: TOKENS.spacing.md,
  },
  radioOuterSelected: {
    borderColor: TOKENS.colors.brand500,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.brand500,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: TOKENS.typography.sizes.sm + 1,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textMain,
  },
  radioLabelSelected: {
    fontWeight: TOKENS.typography.weights.bold,
  },
  radioSubtitle: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
});
