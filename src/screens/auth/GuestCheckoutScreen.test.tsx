import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { GuestCheckoutScreen } from './GuestCheckoutScreen';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockSetSession = jest.fn();
const mockRefreshLocation = jest.fn();
const mockGuestCreateContactRequest = jest.fn();
const mockCheckEmailExists = jest.fn();

let mockLocation: any = { coords: { latitude: -33.4489, longitude: -70.6693 } };
let mockRouteParams: Record<string, any> = {
  provider: { name: 'Gasfiter Pro', serviceProviderId: 123 },
  description: 'Necesito reparar una llave',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate, replace: mockReplace }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('@apollo/client/react', () => ({
  useLazyQuery: () => [mockCheckEmailExists],
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ setSession: mockSetSession }),
}));

jest.mock('../../context/LocationContext', () => ({
  useLocation: () => ({ location: mockLocation, refreshLocation: mockRefreshLocation }),
}));

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => ({ guestCreateContactRequest: mockGuestCreateContactRequest }),
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

describe('GuestCheckoutScreen component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = { coords: { latitude: -33.4489, longitude: -70.6693 } };
    mockRouteParams = {
      provider: { name: 'Gasfiter Pro', serviceProviderId: 123 },
      description: 'Necesito reparar una llave',
    };
    mockCheckEmailExists.mockResolvedValue({
      data: { checkLoginEmailExists: { exists: false, hasPassword: false } },
    });
    mockGuestCreateContactRequest.mockResolvedValue({
      accessToken: 'guest-token',
      user: { id: 99, email: 'guest@email.cl' },
    });
    mockSetSession.mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function fillValidForm(view: Awaited<ReturnType<typeof render>>) {
    await fireEvent.changeText(view.getByPlaceholderText('Ej: Juan Pérez'), 'Juan Perez');
    await fireEvent.changeText(view.getByPlaceholderText('Ej: juan@correo.cl'), 'Guest@Email.CL ');
    await fireEvent.changeText(view.getByPlaceholderText('Ej: 912345678'), '912345678');
  }

  it('COMPONENT: valida datos obligatorios antes de consultar email o realtime', async () => {
    const view = await render(<GuestCheckoutScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'Solicitar servicio' }));

    expect(view.getByText('El nombre es obligatorio')).toBeTruthy();
    expect(view.getByText('Ingresa un correo electrónico válido')).toBeTruthy();
    expect(view.getByText('Ingresa un número móvil válido')).toBeTruthy();
    expect(mockCheckEmailExists).not.toHaveBeenCalled();
    expect(mockGuestCreateContactRequest).not.toHaveBeenCalled();
  });

  it('COMPONENT: exige ubicación antes de crear solicitud guest', async () => {
    mockLocation = null;
    const view = await render(<GuestCheckoutScreen />);
    await fillValidForm(view);

    await fireEvent.press(view.getByRole('button', { name: 'Solicitar servicio' }));

    await waitFor(() => {
      expect(mockRefreshLocation).toHaveBeenCalledTimes(1);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Ubicación requerida',
        'No pudimos obtener tu ubicación. Intenta nuevamente en un momento.',
      );
    });
    expect(mockGuestCreateContactRequest).not.toHaveBeenCalled();
  });

  it('COMPONENT: redirige a Login si el email ya tiene cuenta', async () => {
    mockCheckEmailExists.mockResolvedValueOnce({
      data: { checkLoginEmailExists: { exists: true, hasPassword: true } },
    });
    const view = await render(<GuestCheckoutScreen />);
    await fillValidForm(view);

    await fireEvent.press(view.getByRole('button', { name: 'Solicitar servicio' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Login', {
        initialEmail: 'guest@email.cl',
        guestConflict: true,
      });
    });
    expect(mockGuestCreateContactRequest).not.toHaveBeenCalled();
  });

  it('COMPONENT: crea solicitud guest, guarda sesión y navega al home', async () => {
    const view = await render(<GuestCheckoutScreen />);
    await fillValidForm(view);

    await fireEvent.press(view.getByRole('button', { name: 'Solicitar servicio' }));

    await waitFor(() => {
      expect(mockCheckEmailExists).toHaveBeenCalledWith({ variables: { email: 'guest@email.cl' } });
      expect(mockGuestCreateContactRequest).toHaveBeenCalledWith({
        guestEmail: 'guest@email.cl',
        guestPhone: '+56912345678',
        guestName: 'Juan Perez',
        serviceProviderId: 123,
        clientLat: -33.4489,
        clientLng: -70.6693,
        clientDescription: 'Necesito reparar una llave',
      });
      expect(mockSetSession).toHaveBeenCalledWith('guest-token', { id: 99, email: 'guest@email.cl' });
      expect(mockNavigate).toHaveBeenCalledWith('MainApp', { screen: 'Home' });
    });
  });
});
