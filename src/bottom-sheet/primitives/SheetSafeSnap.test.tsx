import React, { createRef } from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { Sheet } from './Sheet';
import type { SheetModalRef } from '../core/bottomSheet.types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockSnapToIndex = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  const BottomSheetModal = React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      present: mockPresent,
      dismiss: mockDismiss,
      snapToIndex: mockSnapToIndex,
      collapse: jest.fn(),
      expand: jest.fn(),
      close: jest.fn(),
    }));

    return (
      <View testID="bottom-sheet-modal" {...props}>
        {children}
      </View>
    );
  });

  return {
    __esModule: true,
    BottomSheetModal,
    BottomSheetView: ({ children, ...props }: any) => (
      <View testID="bottom-sheet-view" {...props}>
        {children}
      </View>
    ),
  };
});

describe('Sheet safe snapToIndex proxy contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('safely catches out-of-range invariant without throwing and retries on next frame', async () => {
    const ref = createRef<SheetModalRef>();

    // First call throws the invariant error from Gorhom (simulating transition race condition)
    let callCount = 0;
    mockSnapToIndex.mockImplementation((index: number) => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error(
          "'index' was provided but out of the provided snap points range! expected value to be between -1, 0",
        );
      }
      return undefined;
    });

    await render(
      <Sheet ref={ref} snapPoints={[88]} initialIndex={1}>
        <Text>Test Content</Text>
      </Sheet>,
    );

    expect(ref.current).toBeTruthy();

    // Calling snapToIndex(1) must not throw an uncaught exception
    expect(() => {
      ref.current?.snapToIndex(1);
    }).not.toThrow();

    expect(mockSnapToIndex).toHaveBeenCalledTimes(1);
    expect(mockSnapToIndex).toHaveBeenCalledWith(1);

    // Run pending requestAnimationFrame callbacks
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    // The retry in requestAnimationFrame succeeded
    expect(mockSnapToIndex).toHaveBeenCalledTimes(2);
    expect(mockSnapToIndex).toHaveBeenLastCalledWith(1);
  });

  it('transparently delegates present and dismiss to underlying modal ref', async () => {
    const ref = createRef<SheetModalRef>();

    await render(
      <Sheet ref={ref} snapPoints={[88]} initialIndex={0}>
        <Text>Delegate Content</Text>
      </Sheet>,
    );

    ref.current?.present();
    expect(mockPresent).toHaveBeenCalledTimes(1);

    ref.current?.dismiss();
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
});
