import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DeviceSessionConflictModal } from './DeviceSessionConflictModal';

describe('DeviceSessionConflictModal Component', () => {
  it('renders correctly with title and active order badge', async () => {
    const onContinueHere = jest.fn();
    const onLogoutThisDevice = jest.fn();

    const view = await render(
      <DeviceSessionConflictModal
        visible={true}
        orderRealtimeId={1234}
        onContinueHere={onContinueHere}
        onLogoutThisDevice={onLogoutThisDevice}
      />
    );

    expect(view.getByText('Sesión activa en otro dispositivo')).toBeTruthy();
    expect(view.getByText('Orden activa #1234')).toBeTruthy();
    expect(view.getByText('Continuar aquí')).toBeTruthy();
    expect(view.getByText('Cerrar esta sesión')).toBeTruthy();
  });

  it('triggers onContinueHere when user selects "Continuar aquí"', async () => {
    const onContinueHere = jest.fn();
    const onLogoutThisDevice = jest.fn();

    const view = await render(
      <DeviceSessionConflictModal
        visible={true}
        orderRealtimeId={1234}
        onContinueHere={onContinueHere}
        onLogoutThisDevice={onLogoutThisDevice}
      />
    );

    fireEvent.press(view.getByText('Continuar aquí'));
    expect(onContinueHere).toHaveBeenCalledTimes(1);
    expect(onLogoutThisDevice).not.toHaveBeenCalled();
  });

  it('triggers onLogoutThisDevice when user selects "Cerrar esta sesión"', async () => {
    const onContinueHere = jest.fn();
    const onLogoutThisDevice = jest.fn();

    const view = await render(
      <DeviceSessionConflictModal
        visible={true}
        orderRealtimeId={1234}
        onContinueHere={onContinueHere}
        onLogoutThisDevice={onLogoutThisDevice}
      />
    );

    fireEvent.press(view.getByText('Cerrar esta sesión'));
    expect(onLogoutThisDevice).toHaveBeenCalledTimes(1);
    expect(onContinueHere).not.toHaveBeenCalled();
  });
});
