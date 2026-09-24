import { Platform } from 'react-native';

/**
 * Calculates the exact height of the top navigation HeaderGeneral based on subtitle and safe area top inset.
 * Standard header: 60px + safeTop
 * Header with subtitle: 76px + safeTop
 */
export function getHeaderHeight(hasSubtitle: boolean = false, safeTopInset: number = 0): number {
  return (hasSubtitle ? 76 : 60) + safeTopInset;
}

/**
 * Returns the keyboardVerticalOffset for KeyboardAvoidingView on iOS when a top Header is present.
 * On Android, returns 0 because windowSoftInputMode="adjustResize" handles layout resizing.
 */
export function getKeyboardVerticalOffset(hasSubtitle: boolean = false, safeTopInset: number = 0): number {
  if (Platform.OS !== 'ios') return 0;
  return getHeaderHeight(hasSubtitle, safeTopInset);
}
