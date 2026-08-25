import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

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

describe('Button component', () => {
  it('renders title correctly and handles onPress', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Button title="Continuar" onPress={onPress} testID="btn-continue" />
    );

    expect(view.getByText('Continuar')).toBeTruthy();
    const btn = view.getByTestId('btn-continue');
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with iconLeft and iconRight', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Button
        title="Siguiente"
        iconLeft="ArrowLeft"
        iconRight="ArrowRight"
        onPress={onPress}
      />
    );

    expect(view.getByText('Siguiente')).toBeTruthy();
    expect(view.getByText('ArrowLeft', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByText('ArrowRight', { includeHiddenElements: true })).toBeTruthy();
  });

  it('supports legacy icon prop as iconLeft', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Button title="Buscar" icon="Search" onPress={onPress} />
    );

    expect(view.getByText('Buscar')).toBeTruthy();
    expect(view.getByText('Search', { includeHiddenElements: true })).toBeTruthy();
  });

  it('renders different sizes (lg, md, sm, xs)', async () => {
    const onPress = jest.fn();
    const viewLg = await render(
      <Button title="Large Button" size="lg" onPress={onPress} />
    );
    expect(viewLg.getByText('Large Button')).toBeTruthy();

    const viewSm = await render(
      <Button title="Small Button" size="sm" onPress={onPress} />
    );
    expect(viewSm.getByText('Small Button')).toBeTruthy();

    const viewXs = await render(
      <Button title="Extra Small Button" size="xs" onPress={onPress} />
    );
    expect(viewXs.getByText('Extra Small Button')).toBeTruthy();
  });

  it('renders all visual variants without crashing', async () => {
    const onPress = jest.fn();
    const variants = [
      'primary',
      'secondary',
      'outline',
      'white',
      'danger',
      'danger-outline',
      'ghost',
      'subtle',
      'dark',
    ] as const;

    for (const variant of variants) {
      const view = await render(
        <Button title={`Variant ${variant}`} variant={variant} onPress={onPress} />
      );
      expect(view.getByText(`Variant ${variant}`)).toBeTruthy();
    }
  });

  it('disables pressing when disabled prop is true', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Button title="Deshabilitado" disabled onPress={onPress} testID="btn-disabled" />
    );

    const btn = view.getByTestId('btn-disabled');
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator and does not call onPress when loading', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Button title="Cargando" loading onPress={onPress} testID="btn-loading" />
    );

    expect(view.queryByText('Cargando')).toBeNull();
    const btn = view.getByTestId('btn-loading');
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });
});
