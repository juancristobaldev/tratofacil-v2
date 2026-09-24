import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from './SettingsScreen';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockDeleteAccount = jest.fn().mockResolvedValue(true);
const mockRefetch = jest.fn().mockResolvedValue({});
const mockToggleAvailability = jest.fn().mockResolvedValue(undefined);

let mockUser: any = {
  id: 1,
  email: 'usuario@tratofacil.test',
  displayName: 'Juan Perez',
  role: 'CLIENT',
};

let mockRole = 'client';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
  }),
  createNavigationContainerRef: () => ({
    isReady: () => false,
    navigate: jest.fn(),
    dispatch: jest.fn(),
    getCurrentRoute: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    deleteAccount: mockDeleteAccount,
    refetch: mockRefetch,
  }),
}));

jest.mock('../../context/RefreshContext', () => ({
  useRefresh: () => ({
    setIsRefreshing: jest.fn(),
  }),
}));

jest.mock('../../context/RoleContext', () => ({
  useRole: () => ({
    role: mockRole,
  }),
}));

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => ({
    isRealtimeActive: false,
    toggleAvailability: mockToggleAvailability,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('true'),
  setItem: jest.fn().mockResolvedValue(null),
}));

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

jest.mock('@gorhom/bottom-sheet', () => {
  const { TouchableOpacity } = require('react-native');
  return { TouchableOpacity };
});

describe('SettingsScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders settings screen with user account email and action buttons', async () => {
    const view = await render(<SettingsScreen />);

    expect(view.getByText('usuario@tratofacil.test')).toBeTruthy();
    expect(view.getByText('Notificaciones Push')).toBeTruthy();
    expect(view.getByTestId('logout-button')).toBeTruthy();
    expect(view.getByTestId('delete-account-button')).toBeTruthy();
    expect(view.getByText('Eliminar cuenta')).toBeTruthy();
  });

  it('shows confirmation alert when pressing Cerrar sesión and handles confirmation', async () => {
    const view = await render(<SettingsScreen />);

    fireEvent.press(view.getByTestId('logout-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Cerrar sesión',
      '¿Seguro que deseas cerrar sesión?',
      expect.any(Array),
    );

    const buttons = alertSpy.mock.calls[0][2];
    const logoutBtn = buttons.find((b: any) => b.text === 'Cerrar Sesión');
    expect(logoutBtn).toBeDefined();

    await logoutBtn.onPress();

    expect(mockLogout).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  });

  it('shows confirmation dialog when pressing Eliminar cuenta with irreversible warning', async () => {
    const view = await render(<SettingsScreen />);

    fireEvent.press(view.getByTestId('delete-account-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      '¿Eliminar tu cuenta definitivamente?',
      expect.stringContaining('permanente e irreversible'),
      expect.any(Array),
    );

    const buttons = alertSpy.mock.calls[0][2];
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text).toBe('Cancelar');
    expect(buttons[0].style).toBe('cancel');
    expect(buttons[1].text).toBe('Eliminar definitivamente');
    expect(buttons[1].style).toBe('destructive');
  });

  it('calls deleteAccount and resets navigation when confirmation is accepted', async () => {
    mockDeleteAccount.mockResolvedValueOnce(true);
    const view = await render(<SettingsScreen />);

    fireEvent.press(view.getByTestId('delete-account-button'));

    const confirmButtons = alertSpy.mock.calls[0][2];
    const deleteBtn = confirmButtons.find((b: any) => b.text === 'Eliminar definitivamente');

    await deleteBtn.onPress();

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);

    // Esperar a que se muestre la alerta de éxito
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Cuenta eliminada',
        'Tu cuenta ha sido eliminada con éxito.',
        expect.any(Array),
      );
    });

    // Simular pulsar "Aceptar" en la alerta de éxito
    const successButtons = alertSpy.mock.calls[1][2];
    const acceptBtn = successButtons.find((b: any) => b.text === 'Aceptar');
    acceptBtn.onPress();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  });

  it('displays error alert when deleteAccount fails', async () => {
    mockDeleteAccount.mockRejectedValueOnce(
      new Error('No puedes eliminar tu cuenta mientras tengas servicios u órdenes en curso'),
    );
    const view = await render(<SettingsScreen />);

    fireEvent.press(view.getByTestId('delete-account-button'));

    const confirmButtons = alertSpy.mock.calls[0][2];
    const deleteBtn = confirmButtons.find((b: any) => b.text === 'Eliminar definitivamente');

    await deleteBtn.onPress();

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo eliminar la cuenta',
        'No puedes eliminar tu cuenta mientras tengas servicios u órdenes en curso',
      );
    });

    expect(mockReset).not.toHaveBeenCalled();
  });
});
