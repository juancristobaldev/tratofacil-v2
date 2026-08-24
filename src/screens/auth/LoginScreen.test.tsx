import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockShowNotification = jest.fn();
const mockCheckEmailExists = jest.fn();
const mockRequestReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginLoading: false,
    logout: mockLogout,
  }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('@apollo/client/react', () => ({
  useLazyQuery: () => [mockCheckEmailExists, { loading: false }],
  useMutation: () => [mockRequestReset, { loading: false }],
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

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: ({ children, ...props }: any) => {
      const { Text } = require('react-native');
      return <Text {...props}>{children}</Text>;
    },
  },
  useSharedValue: (value: unknown) => ({ value }),
  useAnimatedStyle: () => ({}),
  withSpring: (value: unknown) => value,
}));

describe('LoginScreen component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckEmailExists.mockResolvedValue({
      data: {
        checkLoginEmailExists: { exists: true, hasPassword: true },
      },
    });
    mockLogin.mockResolvedValue({ accessToken: 'token', user: { id: 1 } });
    mockLogout.mockResolvedValue(undefined);
    mockRequestReset.mockResolvedValue({ data: { requestPasswordReset: true } });
  });

  it('COMPONENT: valida email inválido antes de consultar GraphQL', async () => {
    const view = await render(<LoginScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('tu@correo.com'), 'correo-invalido');
    await fireEvent.press(view.getByRole('button', { name: 'Continuar' }));

    expect(await view.findByText('Ingresa un correo electrónico válido.')).toBeTruthy();
    expect(mockCheckEmailExists).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('COMPONENT: autentica cuenta existente y navega al MainApp', async () => {
    const view = await render(<LoginScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('tu@correo.com'), 'Usuario@Email.CL ');
    await fireEvent.press(view.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(mockCheckEmailExists).toHaveBeenCalledWith({
        variables: { email: 'usuario@email.cl' },
      });
    });

    await fireEvent.changeText(view.getByPlaceholderText('••••••••'), 'Password123!');
    await fireEvent.press(view.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('usuario@email.cl', 'Password123!');
      expect(mockReplace).toHaveBeenCalledWith('MainApp');
    });
  });

  it('COMPONENT: envía a registro cuando el email no existe', async () => {
    mockCheckEmailExists.mockResolvedValueOnce({
      data: {
        checkLoginEmailExists: { exists: false, hasPassword: false },
      },
    });

    const view = await render(<LoginScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('tu@correo.com'), 'nuevo@email.cl');
    await fireEvent.press(view.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Register', { initialEmail: 'nuevo@email.cl' });
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
