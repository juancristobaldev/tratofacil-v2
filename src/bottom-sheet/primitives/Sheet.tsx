import React, { forwardRef, useMemo, useCallback } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '../../theme';
import type { SheetModalRef } from '../core/bottomSheet.types';
import { getBottomNavHeight } from '../../components/layout/bottomNavMetrics';

interface SheetProps {
  children: React.ReactNode;
  snapPoints?: readonly (string | number)[];
  enableDynamicSizing?: boolean;
  maxDynamicContentSize?: number;
  onDismiss?: () => void;
  onChange?: (index: number) => void;
  // DEV-only instrumentation key (no behavior change)
  sheetKey?: string;
}

const HANDLE_CHROME_ESTIMATE = 24;

export const Sheet = forwardRef<SheetModalRef, SheetProps>(
  ({ children, snapPoints, enableDynamicSizing = true, maxDynamicContentSize, onDismiss, onChange, sheetKey }, ref) => {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const NAVBAR_HEIGHT = getBottomNavHeight(insets.bottom);
    const HEADER_HEIGHT = 60 + insets.top;
    const TOP_GAP = Math.max(24, windowHeight * 0.2);
    const computedMaxDynamicContentSize = Math.max(
      240,
      windowHeight - HEADER_HEIGHT - TOP_GAP - NAVBAR_HEIGHT,
    );

    const defaultSnapPoints = useMemo(() => [240, computedMaxDynamicContentSize], [computedMaxDynamicContentSize]);
    const activeSnapPoints = useMemo(() => snapPoints ? [...snapPoints] : defaultSnapPoints, [defaultSnapPoints, snapPoints]);
    const initialIndex = activeSnapPoints && activeSnapPoints.length > 1 ? 1 : 0;

    if (__DEV__) {
      console.log('[BS:SHEET_CONFIG]', {
        sheetKey: sheetKey ?? null,
        enableDynamicSizing,
        snapPoints: activeSnapPoints,
        maxDynamicContentSize: maxDynamicContentSize ?? computedMaxDynamicContentSize,
        topInset: HEADER_HEIGHT,
        bottomInset: NAVBAR_HEIGHT,
        windowHeight,
        index: initialIndex,
      });
      console.log('[BS:GEOMETRY]', {
        key: sheetKey ?? null,
        windowHeight,
        headerBottom: HEADER_HEIGHT,
        bottomNavTop: windowHeight - NAVBAR_HEIGHT,
        bottomNavHeight: NAVBAR_HEIGHT,
        topGap: TOP_GAP,
        computedMaxDynamicContentSize,
        availableHeight: windowHeight - HEADER_HEIGHT - TOP_GAP - NAVBAR_HEIGHT,
      });
    }

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (__DEV__) {
          const position = (ref as unknown as { current?: { animatedPosition?: { value?: number } } })?.current?.animatedPosition?.value;
          console.log('[BS:SHEET_CHANGE]', {
            index,
            animatedTop: position ?? null,
            estimatedSheetBottom:
              typeof position === 'number'
                ? position + HANDLE_CHROME_ESTIMATE + (activeSnapPoints[index] as number)
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
        onChange={handleSheetChanges}
        onAnimate={(fromIndex, toIndex) => {
          if (__DEV__) console.log('[BS:ANIMATE]', { fromIndex, toIndex });
        }}
        onDismiss={() => {
          if (__DEV__) console.log('[BS:SHEET_DISMISS]');
          onDismiss?.();
        }}
        backdropComponent={() => null}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
        bottomInset={NAVBAR_HEIGHT}
        topInset={HEADER_HEIGHT}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView
          onLayout={(event) => {
            if (__DEV__) {
              const { width, height } = event.nativeEvent.layout;
              const contentBottom = (ref as unknown as { current?: { animatedPosition?: { value?: number } } })?.current?.animatedPosition?.value;
              console.log('[BS:CONTENT_LAYOUT]', { width, height });
              console.log('[BS:SAFE_CONTENT]', {
                key: sheetKey ?? null,
                contentHeight: height,
                animatedTop: contentBottom ?? null,
                safeBottom: windowHeight - NAVBAR_HEIGHT,
                overlapPx:
                  typeof contentBottom === 'number'
                    ? contentBottom + HANDLE_CHROME_ESTIMATE + height - (windowHeight - NAVBAR_HEIGHT)
                    : null,
              });
            }
          }}
        >
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

Sheet.displayName = 'Sheet';

const styles = StyleSheet.create({
  background: {
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: TOKENS.geometry.radiusModal,
    borderTopRightRadius: TOKENS.geometry.radiusModal,
    shadowColor: TOKENS.colors.dark900,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  indicator: {
    backgroundColor: TOKENS.colors.surface300,
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: TOKENS.spacing.xs,
  },
});
