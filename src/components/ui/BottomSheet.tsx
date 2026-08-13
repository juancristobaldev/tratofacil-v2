import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';

export type BottomSheetState = 'expanded' | 'hidden';

interface BottomSheetProps {
  children: React.ReactNode;
  visible?: boolean;
  state?: BottomSheetState;
  onStateChange?: (state: BottomSheetState) => void;
  onClose: () => void;
  showHandle?: boolean;
  showCloseButton?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: ViewStyle;
  bottomInset?: number; // Space reserved for BottomNav
  useScrollView?: boolean;
  enablePanDownToClose?: boolean;
}

export const CustomBottomSheet: React.FC<BottomSheetProps> = ({
  children,
  visible = false,
  state,
  onStateChange,
  onClose,
  showHandle = true,
  showCloseButton = false,
  style,
  contentStyle,
  bottomInset = 0,
  useScrollView = true,
  enablePanDownToClose = false,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const activeState = state !== undefined ? state : visible ? 'expanded' : 'hidden';

  const snapPoints = useMemo(() => {
    const peekHeight = bottomInset + 45;
    return ['85%', peekHeight];
  }, [bottomInset]);

  // Los detents se ordenan de mayor a menor: índice 0 = abierto (85%), índice 1 = peek.
  const targetIndex = activeState === 'expanded' ? 0 : 1;

  useEffect(() => {
    bottomSheetRef.current?.snapToIndex(targetIndex);
  }, [targetIndex]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === 0 && onStateChange) onStateChange('expanded');
    if (index >= 1 && onStateChange) onStateChange('hidden');
  }, [onStateChange]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 490 }]} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={targetIndex}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={enablePanDownToClose}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        handleComponent={showHandle ? undefined : () => null}
        backgroundStyle={styles.background}
        style={[styles.sheetContainer, style]}
      >
        {useScrollView ? (
          <BottomSheetScrollView
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: bottomInset },
              contentStyle
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </BottomSheetScrollView>
        ) : (
          <View style={[styles.contentContainer, { paddingBottom: bottomInset }, contentStyle]}>
            {children}
          </View>
        )}
      </BottomSheet>
    </View>
  );
};

// Exporting as BottomSheet to match the existing component name
export { CustomBottomSheet as BottomSheet };

const styles = StyleSheet.create({
  sheetContainer: {
    // 490 para estar debajo del BottomNav que tiene zIndex 500
    zIndex: 490,
  },
  background: {
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: TOKENS.geometry.radiusModal,
    borderTopRightRadius: TOKENS.geometry.radiusModal,
    ...TOKENS.shadows.floating,
  },
  contentContainer: {
    width: '100%',
    // No flex: 1. Permite que ScrollView calcule el tamaño dinámico de sus hijos reales.
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 520,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
