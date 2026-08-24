import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RegisterScreen } from './RegisterScreen';
import { Role } from '../../types/graphql';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockRegister = jest.fn();

let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    registerLoading: false,
  }),
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

describe('RegisterScreen component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockRegister.mockResolvedValue({ accessToken: 'token', user: { id: 1, role: Role.CLIENT } });
  });

  it('COMPONENT: valida email inválido antes de avanzar', async () => {
    const view = await render(<RegisterScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('tu@correo.com'), 'correo-invalido');
    await fireEvent.press(view.getByRole('button', { name: 'Continuar' }));

    expect(await view.findByText('El correo electrónico no es válido.')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
    expect(view.queryByPlaceholderText('Mínimo 8 caracteres')).toBeNull();
  });

  it('COMPONENT: email válido avanza a contraseña y exige mínimo 8 caracteres', async () => {
    const view = await render(<RegisterScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('tu@correo.com'), 'nuevo@email.cl');
    await fireEvent.press(view.getByRole('button', { name: 'Continuar' }));

    expect(view.getByText('nuevo@email.cl')).toBeTruthy();
    expect(view.getByPlaceholderText('Mínimo 8 caracteres')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Finalizar registro' }).props.accessibilityState.disabled).toBe(true);
  });

  it('COMPONENT: registra cliente y navega al MainApp', async () => {
    mockRouteParams = { initialEmail: ' Usuario@Email.CL ' };
    const view = await render(<RegisterScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('Mínimo 8 caracteres'), 'Password123!');
    await fireEvent.press(view.getByRole('button', { name: 'Finalizar registro' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'usuario@email.cl',
        password: 'Password123!',
        role: Role.CLIENT,
      });
      expect(mockReplace).toHaveBeenCalledWith('MainApp');
    });
  });

  it('COMPONENT: muestra conflicto cuando el correo ya existe', async () => {
    mockRegister.mockRejectedValueOnce({
      graphQLErrors: [{ message: 'correo electrónico ya está registrado' }],
    });
    mockRouteParams = { initialEmail: 'registrado@email.cl' };
    const view = await render(<RegisterScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('Mínimo 8 caracteres'), 'Password123!');
    await fireEvent.press(view.getByRole('button', { name: 'Finalizar registro' }));

    expect(await view.findByText('Este correo electrónico ya está registrado.')).toBeTruthy();
    expect(view.getByPlaceholderText('tu@correo.com')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
