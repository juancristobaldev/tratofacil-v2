import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import { formatPhoneNational, parsePhoneValue } from '../../utils/formatters';

// --- PHONE INPUT ---
export interface PhoneInputProps {
  label?: string;
  value: string;
  onChangeText: (rawPhone: string) => void;
  countryCode?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  placeholder?: string;
  testID?: string;
  returnKeyType?: TextInput['props']['returnKeyType'];
  onSubmitEditing?: TextInput['props']['onSubmitEditing'];
}

export const PhoneInput = React.forwardRef<TextInput, PhoneInputProps>(({
  label,
  value,
  onChangeText,
  countryCode = 'CL +56',
  error,
  helperText,
  containerStyle,
  placeholder = '9 1234 5678',
  testID,
  returnKeyType,
  onSubmitEditing,
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (text: string) => {
    const parsed = parsePhoneValue(text);
    onChangeText(parsed);
  };

  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.phoneInputContainer,
          isFocused ? styles.inputFocusedBorder : null,
          error ? styles.inputErrorBorder : null,
        ]}
      >
        <View style={styles.countryPrefixBadge}>
          <Text style={styles.countryPrefixText}>{countryCode}</Text>
        </View>
        <TextInput
          ref={ref}
          testID={testID}
          value={formatPhoneNational(value)}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={TOKENS.colors.textMuted}
          keyboardType="phone-pad"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={styles.phoneTextInput}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {!error && helperText && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
});

PhoneInput.displayName = 'PhoneInput';

// --- PRICE / HERO AMOUNT INPUT ---
export interface PriceInputProps {
  label?: string;
  value: string | number;
  onChangeText?: (val: string) => void;
  currencySymbol?: string;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
  returnKeyType?: TextInput['props']['returnKeyType'];
  onSubmitEditing?: TextInput['props']['onSubmitEditing'];
}

export const PriceInput = React.forwardRef<TextInput, PriceInputProps>(({
  label = 'MONTO A COBRAR',
  value,
  onChangeText,
  currencySymbol = '$',
  editable = true,
  containerStyle,
  testID,
  returnKeyType,
  onSubmitEditing,
}, ref) => {
  const displayValue = typeof value === 'number' ? value.toLocaleString('es-CL') : String(value);

  return (
    <View style={[styles.priceCard, containerStyle]}>
      {label && <Text style={styles.priceLabel}>{label}</Text>}
      <View style={styles.priceRow}>
        <Text style={styles.priceSymbol}>{currencySymbol}</Text>
        {editable ? (
          <TextInput
            ref={ref}
            testID={testID}
            value={displayValue}
            onChangeText={onChangeText}
            keyboardType="numeric"
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            style={styles.priceTextInput}
            placeholder="0"
            placeholderTextColor={TOKENS.colors.textMuted}
          />
        ) : (
          <Text style={styles.priceValueText}>{displayValue}</Text>
        )}
      </View>
    </View>
  );
});

PriceInput.displayName = 'PriceInput';

// --- SELECT / PICKER TRIGGER ---
export interface SelectPickerTriggerProps {
  label?: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SelectPickerTrigger: React.FC<SelectPickerTriggerProps> = ({
  label,
  value,
  placeholder = 'Seleccionar...',
  onPress,
  error,
  containerStyle,
  testID,
}) => {
  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.selectTrigger, error ? styles.inputErrorBorder : null]}
        accessibilityRole="button"
        accessibilityLabel={`${label || ''}: ${value || placeholder}`}
      >
        <Text
          style={[
            styles.selectText,
            !value && styles.selectPlaceholderText,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Icon name="ChevronDown" size={18} color={TOKENS.colors.textSubtle} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
  },
  label: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    marginBottom: 6,
  },
  phoneInputContainer: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
  },
  countryPrefixBadge: {
    backgroundColor: TOKENS.colors.surface50,
    paddingHorizontal: TOKENS.spacing.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: TOKENS.colors.surface200,
  },
  countryPrefixText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textMain,
  },
  phoneTextInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: TOKENS.spacing.md,
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
    letterSpacing: 0.5,
  },
  inputFocusedBorder: {
    borderColor: TOKENS.colors.brand500,
    borderWidth: 1.5,
  },
  inputErrorBorder: {
    borderColor: TOKENS.colors.statusError,
  },
  errorText: {
    color: TOKENS.colors.statusError,
    fontSize: TOKENS.typography.sizes.xxs,
    fontWeight: TOKENS.typography.weights.semibold,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    color: TOKENS.colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  priceCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusCard,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    padding: TOKENS.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.soft,
  },
  priceLabel: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textSubtle,
    letterSpacing: TOKENS.typography.letterSpacing.widest,
    marginBottom: TOKENS.spacing.xs,
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceSymbol: {
    fontSize: TOKENS.typography.sizes.xxxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand500,
    marginRight: 4,
  },
  priceTextInput: {
    fontSize: TOKENS.typography.sizes.xxxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  priceValueText: {
    fontSize: TOKENS.typography.sizes.xxxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
  },
  selectTrigger: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.spacing.md,
    ...TOKENS.shadows.soft,
  },
  selectText: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textMain,
    flex: 1,
  },
  selectPlaceholderText: {
    color: TOKENS.colors.textMuted,
  },
});
