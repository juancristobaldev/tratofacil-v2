import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { Sheet } from './Sheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BottomSheetModal: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <View ref={ref} testID="bottom-sheet-modal" {...props}>
        {children}
      </View>
    )),
    BottomSheetView: ({ children, ...props }: any) => (
      <View testID="bottom-sheet-view" {...props}>
        {children}
      </View>
    ),
  };
});

describe('Sheet content mode composition contract', () => {
  it('wraps static view content in BottomSheetView for measurement', async () => {
    const screen = await render(
      <Sheet contentMode="view">
        <Text>Static content</Text>
      </Sheet>,
    );

    expect(screen.getByTestId('bottom-sheet-view')).toBeTruthy();
    expect(screen.getByText('Static content')).toBeTruthy();
  });

  it.each(['scroll', 'list', 'mixed'] as const)(
    'does not wrap %s content in BottomSheetView',
    async (contentMode) => {
      const screen = await render(
        <Sheet contentMode={contentMode}>
          <View testID="direct-child">
            <Text>Scrollable content</Text>
          </View>
        </Sheet>,
      );

      expect(screen.queryByTestId('bottom-sheet-view')).toBeNull();
      expect(screen.getByTestId('direct-child')).toBeTruthy();
    },
  );

  it('passes a valid content index with compact snap points and dynamic content sizing', async () => {
    const screen = await render(
      <Sheet contentMode="view" snapPoints={[88]} initialIndex={1}>
        <Text>Compactable content</Text>
      </Sheet>,
    );

    const modal = screen.getByTestId('bottom-sheet-modal');
    expect(modal.props.index).toBe(1);
    expect(modal.props.snapPoints).toEqual([88]);
  });
});
