import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { RegionCitySelect } from './RegionCitySelect';

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

describe('RegionCitySelect component', () => {
  it('renders region trigger and disabled city trigger initially when region is empty', async () => {
    const onRegionChange = jest.fn();
    const onCityChange = jest.fn();

    const view = await render(
      <RegionCitySelect
        region=""
        city=""
        onRegionChange={onRegionChange}
        onCityChange={onCityChange}
      />,
    );

    expect(view.getByText('Región *')).toBeTruthy();
    expect(view.getByText('Ciudad / Comuna *')).toBeTruthy();
    expect(view.getByText('Selecciona una región')).toBeTruthy();
    expect(view.getByText('Primero elige una región')).toBeTruthy();
  });

  it('opens region modal and selects a region', async () => {
    const onRegionChange = jest.fn();
    const onCityChange = jest.fn();

    const view = await render(
      <RegionCitySelect
        region=""
        city=""
        onRegionChange={onRegionChange}
        onCityChange={onCityChange}
        testIDPrefix="test"
      />,
    );

    // Press region trigger
    await fireEvent.press(view.getByTestId('test-region-trigger'));

    // Modal title should appear
    expect(view.getByText('Seleccionar Región')).toBeTruthy();

    // Select "Metropolitana de Santiago"
    await fireEvent.press(view.getByTestId('test-option-Metropolitana de Santiago'));

    expect(onRegionChange).toHaveBeenCalledWith('Metropolitana de Santiago');
  });

  it('filters regions using search input', async () => {
    const onRegionChange = jest.fn();
    const onCityChange = jest.fn();

    const view = await render(
      <RegionCitySelect
        region=""
        city=""
        onRegionChange={onRegionChange}
        onCityChange={onCityChange}
        testIDPrefix="test"
      />,
    );

    await fireEvent.press(view.getByTestId('test-region-trigger'));

    const searchInput = view.getByTestId('test-search-input');
    await fireEvent.changeText(searchInput, 'Valpara');

    expect(view.getByText('Valparaíso')).toBeTruthy();
    expect(view.queryByText('Tarapacá')).toBeNull();
  });

  it('enables city picker when region is selected and selects a city/comuna', async () => {
    const onRegionChange = jest.fn();
    const onCityChange = jest.fn();

    const view = await render(
      <RegionCitySelect
        region="Metropolitana de Santiago"
        city=""
        onRegionChange={onRegionChange}
        onCityChange={onCityChange}
        testIDPrefix="test"
      />,
    );

    expect(view.getByText('Metropolitana de Santiago')).toBeTruthy();
    expect(view.getByText('Selecciona tu ciudad o comuna')).toBeTruthy();

    // Press city trigger
    await fireEvent.press(view.getByTestId('test-city-trigger'));

    expect(view.getByText('Seleccionar Ciudad / Comuna')).toBeTruthy();

    // Filter cities
    const searchInput = view.getByTestId('test-search-input');
    await fireEvent.changeText(searchInput, 'Providencia');

    expect(view.getByText('Providencia')).toBeTruthy();

    await fireEvent.press(view.getByTestId('test-option-Providencia'));
    expect(onCityChange).toHaveBeenCalledWith('Providencia');
  });

  it('clears selected city when changing to a region that does not contain that city', async () => {
    const onRegionChange = jest.fn();
    const onCityChange = jest.fn();

    const view = await render(
      <RegionCitySelect
        region="Metropolitana de Santiago"
        city="Providencia"
        onRegionChange={onRegionChange}
        onCityChange={onCityChange}
        testIDPrefix="test"
      />,
    );

    await fireEvent.press(view.getByTestId('test-region-trigger'));

    // Select "Tarapacá"
    await fireEvent.press(view.getByTestId('test-option-Tarapacá'));

    expect(onRegionChange).toHaveBeenCalledWith('Tarapacá');
    expect(onCityChange).toHaveBeenCalledWith('');
  });

  it('shows error messages when provided', async () => {
    const view = await render(
      <RegionCitySelect
        region=""
        city=""
        onRegionChange={jest.fn()}
        onCityChange={jest.fn()}
        regionError="Región es requerida"
        cityError="Ciudad es requerida"
      />,
    );

    expect(view.getByText('Región es requerida')).toBeTruthy();
    expect(view.getByText('Ciudad es requerida')).toBeTruthy();
  });

  it('does not open modals when disabled', async () => {
    const view = await render(
      <RegionCitySelect
        region="Metropolitana de Santiago"
        city="Santiago"
        onRegionChange={jest.fn()}
        onCityChange={jest.fn()}
        disabled={true}
        testIDPrefix="test"
      />,
    );

    await fireEvent.press(view.getByTestId('test-region-trigger'));
    expect(view.queryByText('Seleccionar Región')).toBeNull();

    await fireEvent.press(view.getByTestId('test-city-trigger'));
    expect(view.queryByText('Seleccionar Ciudad / Comuna')).toBeNull();
  });
});
