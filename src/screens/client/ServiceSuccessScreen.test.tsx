import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { ServiceSuccessScreen } from './ServiceSuccessScreen';

const mockReset = jest.fn();
let mockRouteParams: any = {};
let mockUserRole = 'client';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: mockReset,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../context/RoleContext', () => ({
  useRole: () => ({ role: mockUserRole }),
}));

jest.mock('../../hooks/useAds', () => ({
  useAds: () => ({
    horizontal: [],
    getTransitionDuration: () => 6000,
  }),
}));

jest.mock('../../components/ui', () => {
  const mockReact = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    Icon: ({ name }: { name: string }) => <Text>{name}</Text>,
    Button: ({ title, onPress, accessibilityLabel }: any) => (
      <TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    RotatingHorizontalAd: () => null,
  };
});

describe('ServiceSuccessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockUserRole = 'client';
  });

  it('renders client copy when role is client', async () => {
    mockUserRole = 'client';
    const view = await render(<ServiceSuccessScreen />);

    expect(await view.findByText(/Gracias por preferir/i)).toBeTruthy();
    expect(await view.findByText(/busca tu prestador de servicios/i)).toBeTruthy();
  });

  it('renders provider copy when role is provider', async () => {
    mockUserRole = 'provider';
    const view = await render(<ServiceSuccessScreen />);

    expect(await view.findByText('¡Servicio Completado!')).toBeTruthy();
    expect(await view.findByText(/Has finalizado el servicio y calificado al cliente con éxito/i)).toBeTruthy();
  });

  it('respects route param role over context role', async () => {
    mockUserRole = 'client';
    mockRouteParams = { role: 'provider' };
    const view = await render(<ServiceSuccessScreen />);

    expect(await view.findByText('¡Servicio Completado!')).toBeTruthy();
  });

  it('navigates to MainApp when pressing "Volver al Inicio"', async () => {
    const view = await render(<ServiceSuccessScreen />);
    const btn = view.getByText('Volver al Inicio');

    await fireEvent.press(btn);

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  });

  it('navigates to MainApp when hardware back button is pressed', async () => {
    const spy = jest.spyOn(BackHandler, 'addEventListener');
    await render(<ServiceSuccessScreen />);

    expect(spy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));

    const handler = spy.mock.calls[0][1];
    const handled = (handler as () => boolean)();

    expect(handled).toBe(true);
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
    spy.mockRestore();
  });
});
