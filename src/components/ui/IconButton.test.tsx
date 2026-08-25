import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { IconButton } from './IconButton';

jest.mock('lucide-react-native', () => {
  const mockReact = require('react');
  const { Text } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, iconName) => (props: any) =>
        mockReact.createElement(
          Text,
          {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
            ...props,
          },
          String(iconName),
        ),
    },
  );
});

describe('IconButton component', () => {
  it('renders icon and triggers onPress when tapped', async () => {
    const onPress = jest.fn();
    const view = await render(
      <IconButton
        icon="ArrowLeft"
        accessibilityLabel="Volver atrás"
        onPress={onPress}
        testID="icon-btn-back"
      />
    );

    expect(view.getByText('ArrowLeft', { includeHiddenElements: true })).toBeTruthy();
    const btn = view.getByTestId('icon-btn-back');
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders badge dot and count', async () => {
    const onPress = jest.fn();
    const view = await render(
      <IconButton
        icon="Bell"
        badge={5}
        accessibilityLabel="Notificaciones"
        onPress={onPress}
      />
    );

    expect(view.getByText('Bell', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByText('5')).toBeTruthy();
  });

  it('supports all shapes: circle, rounded, square', async () => {
    const onPress = jest.fn();
    const shapes = ['circle', 'rounded', 'square'] as const;

    for (const shape of shapes) {
      const view = await render(
        <IconButton
          icon="Menu"
          shape={shape}
          accessibilityLabel={`Shape ${shape}`}
          onPress={onPress}
        />
      );
      expect(view.getByText('Menu', { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it('supports all variants: surface, ghost, primary, secondary, white, danger, dark', async () => {
    const onPress = jest.fn();
    const variants = [
      'surface',
      'ghost',
      'primary',
      'secondary',
      'white',
      'danger',
      'dark',
    ] as const;

    for (const variant of variants) {
      const view = await render(
        <IconButton
          icon="Check"
          variant={variant}
          accessibilityLabel={`Variant ${variant}`}
          onPress={onPress}
        />
      );
      expect(view.getByText('Check', { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it('disables interactions when disabled', async () => {
    const onPress = jest.fn();
    const view = await render(
      <IconButton
        icon="Trash"
        disabled
        accessibilityLabel="Eliminar"
        onPress={onPress}
        testID="icon-btn-disabled"
      />
    );

    const btn = view.getByTestId('icon-btn-disabled');
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loader and disables press when loading', async () => {
    const onPress = jest.fn();
    const view = await render(
      <IconButton
        icon="Trash"
        loading
        accessibilityLabel="Eliminando"
        onPress={onPress}
        testID="icon-btn-loading"
      />
    );

    expect(view.queryByText('Trash', { includeHiddenElements: true })).toBeNull();
    const btn = view.getByTestId('icon-btn-loading');
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });
});
