import React, { forwardRef, useMemo, useCallback } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import type { SheetModalRef } from '../core/bottomSheet.types';
import { getBottomSheetGeometry } from '../core/bottomSheetGeometry';
import { resolveSheetInitialIndex, resolveSheetSnapPoints } from '../core/bottomSheetSnapPoints';

interface SheetProps {
  children: React.ReactNode;
  snapPoints?: readonly (string | number)[];
  initialIndex?: number;
  enableDynamicSizing?: boolean;
  maxDynamicContentSize?: number;
  contentMode?: 'view' | 'scroll' | 'list' | 'mixed';
  keyboardBehavior?: 'interactive' | 'extend' | 'fillParent';
  keyboardBlurBehavior?: 'none' | 'restore';
  onDismiss?: () => void;
  onChange?: (index: number) => void;
  onContentHeightChange?: (height: number) => void;
  // DEV-only instrumentation key (no behavior change)
  sheetKey?: string;
}

const HANDLE_CHROME_ESTIMATE = 24;

export const Sheet = forwardRef<SheetModalRef, SheetProps>(
  ({
    children,
    snapPoints,
    initialIndex: providedInitialIndex,
    enableDynamicSizing = true,
    maxDynamicContentSize,
    contentMode = 'view',
    keyboardBehavior = 'interactive',
    keyboardBlurBehavior = 'restore',
    onDismiss,
    onChange,
    onContentHeightChange,
    sheetKey,
  }, ref) => {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const geometry = getBottomSheetGeometry({
      windowHeight,
      safeTopInset: insets.top,
      safeBottomInset: insets.bottom,
    });
    const computedMaxDynamicContentSize = geometry.maxDynamicContentSize;

    const activeSnapPoints = useMemo(() => resolveSheetSnapPoints({
      snapPoints,
      enableDynamicSizing,
      maxDynamicContentSize: computedMaxDynamicContentSize,
    }), [computedMaxDynamicContentSize, enableDynamicSizing, snapPoints]);

    const initialIndex = resolveSheetInitialIndex({
      requestedIndex: providedInitialIndex,
      resolvedSnapPoints: activeSnapPoints,
      enableDynamicSizing,
    });

    if (__DEV__) {
      console.log('[BS:SHEET_CONFIG]', {
        sheetKey: sheetKey ?? null,
        enableDynamicSizing,
        snapPoints: activeSnapPoints ?? 'DYNAMIC_UNSET',
        maxDynamicContentSize: maxDynamicContentSize ?? computedMaxDynamicContentSize,
        topInset: insets.top,
        bottomInset: geometry.navbarHeight,
        windowHeight,
        index: initialIndex,
      });
      console.log('[BS:GEOMETRY]', {
        key: sheetKey ?? null,
        windowHeight,
        encuadreBottom: geometry.encuadreBottomOffset,
        topClearance: geometry.topClearance,
        bottomNavTop: geometry.bottomNavTop,
        bottomNavHeight: geometry.navbarHeight,
        computedMaxDynamicContentSize,
        availableHeight: geometry.availableHeight,
      });
    }

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (__DEV__) {
          const position = (ref as unknown as { current?: { animatedPosition?: { value?: number } } })?.current?.animatedPosition?.value;
          const currentSnap = activeSnapPoints ? activeSnapPoints[index] : 'DYNAMIC';
          console.log('[BS:SHEET_CHANGE]', {
            index,
            animatedTop: position ?? null,
            estimatedSheetBottom:
              typeof position === 'number' && typeof currentSnap === 'number'
                ? position + HANDLE_CHROME_ESTIMATE + currentSnap
                : null,
          });
        }
        onChange?.(index);
      },
      [onChange, ref, activeSnapPoints],
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={initialIndex}
        snapPoints={activeSnapPoints}
        enableDynamicSizing={enableDynamicSizing}
        maxDynamicContentSize={maxDynamicContentSize ?? computedMaxDynamicContentSize}
        enableHandlePanningGesture={true}
        enablePanDownToClose={false}
        enableBlurKeyboardOnGesture={true}
        android_keyboardInputMode="adjustResize"
        onChange={handleSheetChanges}
        onAnimate={(fromIndex, toIndex) => {
          if (__DEV__) console.log('[BS:ANIMATE]', { fromIndex, toIndex });
        }}
        onDismiss={() => {
          if (__DEV__) console.log('[BS:SHEET_DISMISS]');
          onDismiss?.();
        }}
        backdropComponent={() => null}
        containerStyle={styles.container}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
        bottomInset={geometry.navbarHeight}
        topInset={insets.top}
        keyboardBehavior={keyboardBehavior}
        keyboardBlurBehavior={keyboardBlurBehavior}
      >
        {contentMode === 'view' ? (
          <BottomSheetView
            style={{ maxHeight: maxDynamicContentSize ?? computedMaxDynamicContentSize }}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              onContentHeightChange?.(height);
              if (__DEV__) {
                const contentBottom = (ref as unknown as { current?: { animatedPosition?: { value?: number } } })?.current?.animatedPosition?.value;
                console.log('[BS:CONTENT_LAYOUT]', { width, height });
                console.log('[BS:SAFE_CONTENT]', {
                  key: sheetKey ?? null,
                  contentHeight: height,
                  animatedTop: contentBottom ?? null,
                  safeBottom: geometry.bottomNavTop,
                  overlapPx:
                    typeof contentBottom === 'number'
                      ? contentBottom + HANDLE_CHROME_ESTIMATE + height - geometry.bottomNavTop
                      : null,
                });
              }
            }}
          >
            {children}
          </BottomSheetView>
        ) : (
          children
        )}
      </BottomSheetModal>
    );
  }
);

Sheet.displayName = 'Sheet';

const styles = StyleSheet.create({
  container: {
    pointerEvents: 'box-none',
  },
  background: {
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: TOKENS.colors.dark900,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  indicator: {
    backgroundColor: TOKENS.colors.surface200,
    width: 48,
    height: 4.5,
    borderRadius: 999,
    marginTop: TOKENS.spacing.xs,
  },
});
