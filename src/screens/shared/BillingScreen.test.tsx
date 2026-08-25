import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BillingScreen } from './BillingScreen';

const mockRegisterCard = jest.fn();
const mockCancelSubscription = jest.fn();
const mockReactivateSubscription = jest.fn();
const mockRefetch = jest.fn();
const mockDeleteSavedCardMut = jest.fn();

let mockUser: any = {
  cardActive: true,
  last4CardDigits: '4242',
  creditCardType: 'VISA',
  displayName: 'Juan Perez',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  createNavigationContainerRef: () => ({
    isReady: () => false,
    navigate: jest.fn(),
    dispatch: jest.fn(),
    getCurrentRoute: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: 'provider',
  }),
}));

jest.mock('../../context/RefreshContext', () => ({
  useRefresh: () => ({ setIsRefreshing: jest.fn() }),
}));

jest.mock('../../hooks/usePlans', () => ({
  usePlans: () => ({
    paymentHistory: [
      {
        id: 1,
        description: 'Servicio Gasfitería',
        type: 'SERVICE',
        amount: 22000,
        createdAt: '2026-08-12T10:00:00Z',
      },
    ],
    paymentHistoryLoading: false,
    paymentHistoryError: null,
    registerCard: mockRegisterCard,
    providerPlan: {
      planActive: true,
      planEndsAt: '2026-09-12T10:00:00Z',
      subscriptionFlowId: 'flow_sub_123',
      plan: 'TRATOFACIL_SRV_PRO',
    },
    marketplacePlan: null,
    cancelSubscription: mockCancelSubscription,
    reactivateSubscription: mockReactivateSubscription,
    refetch: mockRefetch,
  }),
}));

jest.mock('@apollo/client/react', () => ({
  useMutation: () => [mockDeleteSavedCardMut, { loading: false }],
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

describe('BillingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      cardActive: true,
      last4CardDigits: '4242',
      creditCardType: 'VISA',
      displayName: 'Juan Perez',
    };
  });

  it('renders credit card tab with card preview and action buttons', async () => {
    const view = await render(<BillingScreen />);

    expect(view.getByText('Tarjetas')).toBeTruthy();
    expect(view.getByText('Suscripciones')).toBeTruthy();
    expect(view.getByText('Historial')).toBeTruthy();

    expect(view.getByText('VISA')).toBeTruthy();
    expect(view.getByText('•••• •••• •••• 4242')).toBeTruthy();
    expect(view.getByText('JUAN PEREZ')).toBeTruthy();
    expect(view.getByText('VINCULADA')).toBeTruthy();

    expect(view.getByText('Cambiar tarjeta')).toBeTruthy();
    expect(view.getByText('Desvincular tarjeta')).toBeTruthy();
  });

  it('switches to subscriptions tab and shows active plan', async () => {
    const view = await render(<BillingScreen />);

    await fireEvent.press(view.getByText('Suscripciones'));

    expect(view.getByText('PRO')).toBeTruthy();
    expect(view.getByText('Activa')).toBeTruthy();
    expect(view.getByText('Cancelar Suscripción')).toBeTruthy();
  });

  it('switches to payment history tab and shows transactions', async () => {
    const view = await render(<BillingScreen />);

    await fireEvent.press(view.getByText('Historial'));

    expect(view.getByText('Servicio Gasfitería')).toBeTruthy();
    expect(view.getByText('$22.000')).toBeTruthy();
  });

  it('renders empty state when user has no card', async () => {
    mockUser = {
      cardActive: false,
      last4CardDigits: null,
      creditCardType: null,
      displayName: 'Juan Perez',
    };

    const view = await render(<BillingScreen />);

    expect(view.getByText('No tienes tarjetas vinculadas')).toBeTruthy();
    expect(view.getByText('Agregar nueva tarjeta')).toBeTruthy();
  });
});
