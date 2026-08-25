import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SetPasswordScreen } from './SetPasswordScreen';

const mockReset = jest.fn();
const mockSetGuestPassword = jest.fn();
const mockLogout = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    setGuestPassword: mockSetGuestPassword,
    logout: mockLogout,
  }),
}));

describe('SetPasswordScreen component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('COMPONENT: valida contraseña mínima de 8 caracteres y coincidencia', async () => {
    const view = await render(<SetPasswordScreen />);

    const passwordInput = view.getByPlaceholderText('Nueva contraseña (mín. 8 caracteres)');
    const confirmInput = view.getByPlaceholderText('Confirmar contraseña');
    const submitBtn = view.getByRole('button', { name: 'Crear contraseña' });

    // Botón deshabilitado al inicio
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

    // Escribir contraseñas diferentes
    await fireEvent.changeText(passwordInput, '12345678');
    await fireEvent.changeText(confirmInput, '12345679');

    expect(submitBtn.props.accessibilityState?.disabled).toBe(false);
    await fireEvent.press(submitBtn);

    expect(view.getByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(mockSetGuestPassword).not.toHaveBeenCalled();
  });

  it('COMPONENT: consolida cuenta exitosamente con setGuestPassword', async () => {
    mockSetGuestPassword.mockResolvedValueOnce(undefined);
    const view = await render(<SetPasswordScreen />);

    const passwordInput = view.getByPlaceholderText('Nueva contraseña (mín. 8 caracteres)');
    const confirmInput = view.getByPlaceholderText('Confirmar contraseña');
    const submitBtn = view.getByRole('button', { name: 'Crear contraseña' });

    await fireEvent.changeText(passwordInput, 'password123');
    await fireEvent.changeText(confirmInput, 'password123');

    await fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockSetGuestPassword).toHaveBeenCalledWith('password123');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Cuenta consolidada',
        'Tu cuenta ahora está protegida con contraseña. Ya puedes operar con normalidad.',
        expect.any(Array),
      );
      expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'MainApp' }] });
    });
  });

  it('COMPONENT: saltar por ahora navega a MainApp manteniendo la sesión activa (sin logout)', async () => {
    const view = await render(<SetPasswordScreen />);

    const skipBtn = view.getByText('Saltar por ahora');
    await fireEvent.press(skipBtn);

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'MainApp' }] });
  });
});
