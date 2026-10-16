import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PurchaseScreen } from './PurchaseScreen';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockCreateOrder = jest.fn();
const mockPay = jest.fn();
const mockPayWithSavedCard = jest.fn();
const mockShowNotification = jest.fn();

let mockRole = 'client';
let mockUser: any = null;
let mockRouteParams: Record<string, any> = {};

const product = {
  id: '77',
  name: 'Taladro inalámbrico',
  price: 119000,
  provider: { name: 'Ferretería Central' },
};

const shippingData = {
  street: 'Av Providencia',
  number: '1234',
  additional: 'Depto 501',
  city: 'Providencia',
  region: 'RM',
  phone: '912345678',
  receiverName: 'Juan Perez',
  shippingDisabled: false,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../context/RoleContext', () => ({
  useRole: () => ({ role: mockRole }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../hooks/useMarketplace', () => ({
  useMarketplace: () => ({ createOrder: mockCreateOrder }),
}));

const mockRegisterCard = jest.fn();
jest.mock('../../hooks/usePlans', () => ({
  usePlans: () => ({ registerCard: mockRegisterCard }),
}));

jest.mock('../../hooks/useFlow', () => ({
  useFlow: () => ({ pay: mockPay, payWithSavedCard: mockPayWithSavedCard }),
}));

jest.mock('../../config/endpoints', () => ({
  DEEP_LINK_CALLBACK: 'tratofacil://callback',
}));

jest.mock('../../components/modals/VerificationCenterModal', () => ({
  VerificationCenterModal: (props: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    if (!props.visible) return null;
    return (
      <View testID="verification-center-modal">
        <Text>{props.title || 'Verificación Requerida'}</Text>
      </View>
    );
  },
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

describe('PurchaseScreen component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'client';
    mockUser = null;
    mockRouteParams = { product, shippingData };
    mockCreateOrder.mockResolvedValue({ id: 555 });
    mockPay.mockResolvedValue({ url: 'https://flow.test/payment', token: 'flow-token' });
    mockPayWithSavedCard.mockResolvedValue({ id: 555, status: 'PENDING' });
  });

  it('COMPONENT: muestra error y permite volver si no hay producto', async () => {
    mockRouteParams = {};
    const view = await render(<PurchaseScreen />);

    expect(view.getByText('Producto no encontrado')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Volver atrás' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('COMPONENT: guest checkout redirige a Login antes de crear orden', async () => {
    mockRole = 'guest';
    const view = await render(<PurchaseScreen />);

    await fireEvent.press(view.getByText('Pagar con Flow'));

    expect(mockNavigate).toHaveBeenCalledWith('Login');
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockPay).not.toHaveBeenCalled();
  });

  it('COMPONENT: crea orden con shipping y luego inicia pago Flow si no tiene tarjeta', async () => {
    const view = await render(<PurchaseScreen />);

    expect(view.getByText('Taladro inalámbrico')).toBeTruthy();
    expect(view.getByText('Av Providencia 1234 Depto 501')).toBeTruthy();
    expect(view.getByText('Vincular tarjeta nueva')).toBeTruthy();
    expect(view.getByText('Pagar con Flow')).toBeTruthy();

    await fireEvent.press(view.getByText('Pagar con Flow'));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        { productId: 77, quantity: 1 },
        {
          street: 'Av Providencia',
          number: '1234',
          commune: 'Providencia',
          region: 'RM',
          phone: '912345678',
          reference: 'Depto 501',
        },
      );
      expect(mockPay).toHaveBeenCalledWith({
        type: 'product',
        orderId: 555,
        returnUrl: 'tratofacil://callback?type=product',
      });
    });
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('COMPONENT: realiza pago directo con tarjeta guardada cuando el usuario la tiene vinculada', async () => {
    mockUser = {
      id: 1,
      cardActive: true,
      creditCardType: 'VISA',
      last4CardDigits: '4242',
    };
    const view = await render(<PurchaseScreen />);

    expect(view.getByText('VISA •••• 4242')).toBeTruthy();
    expect(view.getByText('1-CLICK')).toBeTruthy();

    await fireEvent.press(view.getByText('VISA •••• 4242'));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalled();
      expect(mockPayWithSavedCard).toHaveBeenCalledWith('product', 555);
      expect(mockShowNotification).toHaveBeenCalledWith({
        title: '¡Compra exitosa!',
        message: 'Tu pago fue procesado con tu tarjeta guardada.',
        type: 'success',
      });
      expect(mockNavigate).toHaveBeenCalledWith('PaymentSuccess', {
        title: '¡Compra exitosa!',
        subtitle: 'Tu pedido de "Taladro inalámbrico" ha sido procesado correctamente.',
        type: 'product',
      });
    });
  });

  it('COMPONENT: informa error si falla la creación de orden', async () => {
    mockCreateOrder.mockRejectedValueOnce(new Error('Stock insuficiente'));
    const view = await render(<PurchaseScreen />);

    await fireEvent.press(view.getByText('Pagar con Flow'));

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Stock insuficiente',
        type: 'error',
      });
    });
    expect(mockPay).not.toHaveBeenCalled();
  });

  it('COMPONENT: muestra advertencia temprana proactiva cuando emailVerified es false', async () => {
    mockUser = { id: 1, emailVerified: false };
    const view = await render(<PurchaseScreen />);

    expect(view.getByText('Completa tu perfil para agilizar el pago')).toBeTruthy();
  });

  it('COMPONENT: abre VerificationCenterModal en contexto cuando el backend rechaza por verificación sin perder la orden', async () => {
    mockCreateOrder.mockRejectedValueOnce(new Error('Debes verificar tu correo electrónico para comprar'));
    const view = await render(<PurchaseScreen />);

    await fireEvent.press(view.getByText('Pagar con Flow'));

    await waitFor(() => {
      expect(view.getByTestId('verification-center-modal')).toBeTruthy();
    });
    expect(mockPay).not.toHaveBeenCalled();
    expect(mockShowNotification).not.toHaveBeenCalled();
  });
});
