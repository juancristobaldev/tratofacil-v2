import React, { useRef } from 'react';
import { StyleSheet, Text, TextInput, View, ViewStyle, TextInputProps } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: IconName;
  iconColor?: string;
  containerStyle?: ViewStyle;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  iconColor,
  containerStyle,
  error,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputErrorBorder : null,
        ]}
      >
        {icon && (
          <Icon
            name={icon}
            size={18}
            color={iconColor || TOKENS.colors.brand500}
            style={styles.icon}
          />
        )}
        <TextInput
          placeholderTextColor={TOKENS.colors.textMuted}
          style={styles.textInput}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

interface PhoneInputProps extends Omit<InputProps, 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value,
  onChangeText,
  containerStyle,
  error,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputErrorBorder : null,
        ]}
      >
        <View style={styles.countryPrefixContainer}>
          <Text style={styles.countryPrefixText}>CL +56</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          placeholder="9 1234 5678"
          placeholderTextColor={TOKENS.colors.textMuted}
          style={[styles.textInput, styles.phoneInput]}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

interface VerificationCodeInputProps {
  label?: string;
  code: string[];
  onChangeCode: (code: string[]) => void;
  containerStyle?: ViewStyle;
}

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  label = 'Código de verificación',
  code,
  onChangeCode,
  containerStyle,
}) => {
  const inputsRef = useRef<any[]>([]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    onChangeCode(newCode);

    // Auto-focus next input
    if (text && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      onChangeCode(newCode);
    }
  };

  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {label && <Text style={[styles.label, { textAlign: 'center', marginBottom: 12 }]}>{label}</Text>}
      <View style={styles.codeInputsContainer}>
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputsRef.current[i] = ref; }}
              value={code[i] || ''}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              style={[
                styles.codeInput,
                code[i] ? styles.codeInputActive : null,
              ]}
              placeholder="0"
              placeholderTextColor={TOKENS.colors.textMuted}
              selectTextOnFocus
            />
          ))}
      </View>
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
  inputContainer: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: TOKENS.geometry.radiusInput,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    height: 52,
    ...TOKENS.shadows.soft,
  },
  inputFocusedBorder: {
    borderColor: TOKENS.colors.brand500,
    borderWidth: 1.5,
  },
  inputErrorBorder: {
    borderColor: TOKENS.colors.statusError,
  },
  icon: {
    marginRight: TOKENS.spacing.sm,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: TOKENS.colors.textMain,
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.medium,
    padding: 0, // Reset default padding in android
  },
  errorText: {
    color: TOKENS.colors.statusError,
    fontSize: TOKENS.typography.sizes.xxs,
    fontWeight: TOKENS.typography.weights.semibold,
    marginTop: 4,
    marginLeft: 4,
  },
  countryPrefixContainer: {
    paddingRight: TOKENS.spacing.sm,
    borderRightWidth: 1,
    borderRightColor: TOKENS.colors.surface200,
    marginRight: TOKENS.spacing.sm,
    height: '100%',
    justifyContent: 'center',
  },
  countryPrefixText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.semibold,
    color: TOKENS.colors.textSubtle,
  },
  phoneInput: {
    fontWeight: TOKENS.typography.weights.bold,
    letterSpacing: 1,
  },
  codeInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: TOKENS.spacing.sm,
  },
  codeInput: {
    width: 56,
    height: 64,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    borderRadius: TOKENS.geometry.radiusInput,
    textAlign: 'center',
    fontSize: TOKENS.typography.sizes.xxl,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.textMain,
    ...TOKENS.shadows.soft,
  },
  codeInputActive: {
    borderColor: TOKENS.colors.brand500,
    borderWidth: 2,
  },
});
