import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapFloatingNavigationControls } from './MapFloatingNavigationControls';
import type { RouteCoordinate } from '../../utils/directions';

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

describe('MapFloatingNavigationControls Component', () => {
  const mockTarget: RouteCoordinate = { latitude: -38.745, longitude: -72.595 };

  it('renders correctly in inactive state (2D mode)', async () => {
    const onToggleNavigation = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={false}
        targetCoordinate={mockTarget}
        onToggleNavigation={onToggleNavigation}
      />
    );

    const btn = view.getByTestId('btn-toggle-navigation-mode');
    expect(btn).toBeTruthy();
    expect(btn.props.accessibilityState.selected).toBe(false);
    expect(btn.props.accessibilityState.disabled).toBe(false);
  });

  it('renders correctly in active state (3D navigation mode)', async () => {
    const onToggleNavigation = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={true}
        targetCoordinate={mockTarget}
        onToggleNavigation={onToggleNavigation}
      />
    );

    const btn = view.getByTestId('btn-toggle-navigation-mode');
    expect(btn).toBeTruthy();
    expect(btn.props.accessibilityState.selected).toBe(true);
    expect(btn.props.accessibilityState.disabled).toBe(false);
  });

  it('fires onToggleNavigation with heading and target coordinate on press when inactive', async () => {
    const onToggleNavigation = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={false}
        targetCoordinate={mockTarget}
        heading={135}
        onToggleNavigation={onToggleNavigation}
      />
    );

    const btn = view.getByTestId('btn-toggle-navigation-mode');
    await fireEvent.press(btn);

    expect(onToggleNavigation).toHaveBeenCalledTimes(1);
    expect(onToggleNavigation).toHaveBeenCalledWith(mockTarget, {
      heading: 135,
      animated: true,
      force: true,
    });
  });

  it('fires onToggleNavigation to exit navigation when currently active', async () => {
    const onToggleNavigation = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={true}
        targetCoordinate={mockTarget}
        onToggleNavigation={onToggleNavigation}
      />
    );

    const btn = view.getByTestId('btn-toggle-navigation-mode');
    await fireEvent.press(btn);

    expect(onToggleNavigation).toHaveBeenCalledTimes(1);
    expect(onToggleNavigation).toHaveBeenCalledWith(mockTarget, {
      animated: true,
    });
  });

  it('sanitizes negative or invalid heading to 0° on activation', async () => {
    const onToggleNavigation = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={false}
        targetCoordinate={mockTarget}
        heading={-1}
        onToggleNavigation={onToggleNavigation}
      />
    );

    const btn = view.getByTestId('btn-toggle-navigation-mode');
    await fireEvent.press(btn);

    expect(onToggleNavigation).toHaveBeenCalledWith(mockTarget, {
      heading: 0,
      animated: true,
      force: true,
    });
  });

  it('disables interaction when targetCoordinate is null and not navigating', async () => {
    const onToggleNavigation = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={false}
        targetCoordinate={null}
        onToggleNavigation={onToggleNavigation}
      />
    );

    const btn = view.getByTestId('btn-toggle-navigation-mode');
    expect(btn.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(btn);

    expect(onToggleNavigation).not.toHaveBeenCalled();
  });

  it('can hide navigation while keeping smart framing visible', async () => {
    const onToggleNavigation = jest.fn();
    const onSmartFraming = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={false}
        targetCoordinate={mockTarget}
        onToggleNavigation={onToggleNavigation}
        onSmartFraming={onSmartFraming}
        showNavigation={false}
        showSmartFraming={true}
      />
    );

    expect(view.queryByTestId('btn-toggle-navigation-mode')).toBeNull();

    const smartFramingBtn = view.getByTestId('btn-smart-framing');
    expect(smartFramingBtn).toBeTruthy();
    await fireEvent.press(smartFramingBtn);

    expect(onToggleNavigation).not.toHaveBeenCalled();
    expect(onSmartFraming).toHaveBeenCalledTimes(1);
  });

  it('disables interaction explicitly when disabled prop is true', async () => {
    const onToggleNavigation = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={false}
        targetCoordinate={mockTarget}
        disabled={true}
        onToggleNavigation={onToggleNavigation}
      />
    );

    const btn = view.getByTestId('btn-toggle-navigation-mode');
    expect(btn.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(btn);

    expect(onToggleNavigation).not.toHaveBeenCalled();
  });

  it('renders and triggers Smart Framing button when showSmartFraming is true', async () => {
    const onToggleNavigation = jest.fn();
    const onSmartFraming = jest.fn();
    const view = await render(
      <MapFloatingNavigationControls
        isNavigating={false}
        targetCoordinate={mockTarget}
        onToggleNavigation={onToggleNavigation}
        onSmartFraming={onSmartFraming}
        showSmartFraming={true}
      />
    );

    const smartBtn = view.getByTestId('btn-smart-framing');
    expect(smartBtn).toBeTruthy();
    await fireEvent.press(smartBtn);

    expect(onSmartFraming).toHaveBeenCalledTimes(1);
  });
});
