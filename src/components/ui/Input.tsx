import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, ViewStyle, StyleProp, TextInputProps, TouchableOpacity } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, IconName } from './Icon';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: IconName;
  leftIcon?: IconName;
  iconColor?: string;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  rightElement?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  leftIcon,
  iconColor,
  rightIcon,
  onRightIconPress,
  rightElement,
  isPassword,
  containerStyle,
  error,
  helperText,
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSecure = isPassword ? !showPassword : secureTextEntry;
  const activeIcon = icon || leftIcon;

  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused ? styles.inputFocusedBorder : null,
          error ? styles.inputErrorBorder : null,
        ]}
      >
        {activeIcon && (
          <Icon
            name={activeIcon}
            size={18}
            color={iconColor || (isFocused ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle)}
            style={styles.icon}
          />
        )}
        <TextInput
          placeholderTextColor={TOKENS.colors.textMuted}
          style={styles.textInput}
          secureTextEntry={isSecure}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name={showPassword ? 'EyeOff' : 'Eye'}
              size={18}
              color={showPassword ? TOKENS.colors.brand500 : TOKENS.colors.textSubtle}
            />
          </TouchableOpacity>
        )}
        {!isPassword && rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIconBtn}
            activeOpacity={0.7}
          >
            <Icon
              name={rightIcon}
              size={18}
              color={TOKENS.colors.textSubtle}
            />
          </TouchableOpacity>
        )}
        {!isPassword && rightElement && (
          <View style={styles.rightElementContainer}>
            {rightElement}
          </View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {!error && helperText && <Text style={styles.helperText}>{helperText}</Text>}
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
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused ? styles.inputFocusedBorder : null,
          error ? styles.inputErrorBorder : null,
        ]}
      >
        <View style={styles.countryPrefixContainer}>
          <Text style={[styles.countryPrefixText, isFocused && { color: TOKENS.colors.brand500 }]}>CL +56</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          placeholder="9 1234 5678"
          placeholderTextColor={TOKENS.colors.textMuted}
          style={[styles.textInput, styles.phoneInput]}
          maxLength={9}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

interface CodeInputProps {
  label?: string;
  length?: number;
  value: string;
  onChangeText: (code: string) => void;
  containerStyle?: ViewStyle;
}

export const CodeInput: React.FC<CodeInputProps> = ({
  label,
  value,
  onChangeText,
  containerStyle,
}) => {
  const [code, setCode] = useState<string[]>(value.split('').slice(0, 4));
  const inputsRef = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    onChangeText(newCode.join(''));

    if (text.length > 0 && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.outerContainer, containerStyle]}>
      {label && <Text style={[styles.label, styles.codeLabel]}>{label}</Text>}
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
  codeLabel: {
    textAlign: 'center',
    marginBottom: 12,
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
  helperText: {
    color: TOKENS.colors.textSubtle,
    fontSize: 11,
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
  rightIconBtn: {
    padding: TOKENS.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: TOKENS.spacing.xs,
  },
  rightElementContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: TOKENS.spacing.xs,
  },
});
