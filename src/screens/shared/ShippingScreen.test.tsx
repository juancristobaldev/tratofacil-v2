import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ShippingScreen } from './ShippingScreen';

const mockNavigate = jest.fn();
let mockRouteParams: Record<string, any> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
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

describe('ShippingScreen component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockRouteParams = {
      product: {
        id: '123',
        name: 'Set de Herramientas',
        price: 49990,
      },
    };
  });

  it('renders shipping form with RegionCitySelect and other inputs', async () => {
    const view = await render(<ShippingScreen />);

    expect(view.getByText('Ingresa la dirección donde deseas recibir el producto.')).toBeTruthy();
    expect(view.getByText('Región *')).toBeTruthy();
    expect(view.getByText('Comuna / Ciudad *')).toBeTruthy();
    expect(view.getByText('Calle *')).toBeTruthy();
    expect(view.getByText('Número *')).toBeTruthy();
    expect(view.getByText('Continuar al Pago')).toBeTruthy();
  });

  it('alerts error if required fields are missing on submit', async () => {
    const view = await render(<ShippingScreen />);

    await fireEvent.press(view.getByText('Continuar al Pago'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Campos incompletos',
      'Por favor llena todos los campos obligatorios (*) para continuar.',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('allows selecting region and city via selects and navigates to Purchase screen on valid submit', async () => {
    const view = await render(<ShippingScreen />);

    // 1. Select Region
    await fireEvent.press(view.getByTestId('shipping-region-trigger'));
    await fireEvent.press(view.getByTestId('shipping-option-Metropolitana de Santiago'));

    // 2. Select City
    await fireEvent.press(view.getByTestId('shipping-city-trigger'));
    await fireEvent.press(view.getByTestId('shipping-option-Las Condes'));

    // 3. Fill street and number
    await fireEvent.changeText(view.getByPlaceholderText('Ej: Av. Providencia'), 'Av. Apoquindo');
    await fireEvent.changeText(view.getByPlaceholderText('Ej: 1234'), '4500');
    await fireEvent.changeText(view.getByPlaceholderText('Ej: Depto 502, Torre B'), 'Oficina 701');
    await fireEvent.changeText(view.getByPlaceholderText('Ej: Juan Pérez'), 'Carlos Santana');
    await fireEvent.changeText(view.getByPlaceholderText('Ej: +56 9 1234 5678'), '987654321');

    // Submit
    await fireEvent.press(view.getByText('Continuar al Pago'));

    expect(mockNavigate).toHaveBeenCalledWith('Purchase', {
      product: mockRouteParams.product,
      shippingData: {
        region: 'Metropolitana de Santiago',
        city: 'Las Condes',
        street: 'Av. Apoquindo',
        number: '4500',
        additional: 'Oficina 701',
        receiverName: 'Carlos Santana',
        phone: '+56987654321',
      },
    });
  });
});
