import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_NAV_BASE_HEIGHT = 75;

export function getBottomNavHeight(bottomInset: number): number {
  return BOTTOM_NAV_BASE_HEIGHT + bottomInset;
}

export function useBottomNavHeight(): number {
  const insets = useSafeAreaInsets();
  return getBottomNavHeight(insets.bottom);
}
