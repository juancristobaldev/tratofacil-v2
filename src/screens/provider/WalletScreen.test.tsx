import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { WalletScreen } from './WalletScreen';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRequestWithdrawal = jest.fn();
const mockRefetch = jest.fn();
const mockSetIsRefreshing = jest.fn();

let mockAuth = {
  user: { provider: { id: 10 } },
  role: 'provider',
};

let mockPlans = {
  requestWithdrawal: mockRequestWithdrawal,
  withdrawalLoading: false,
  walletLoading: false,
  wallet: {
    id: 1,
    balance: 50000,
    transactions: [
      {
        id: 100,
        type: 'EARNING',
        amount: 80000,
        description: 'Servicio completado',
        createdAt: '2026-08-10T12:00:00.000Z',
      },
      {
        id: 101,
        type: 'WITHDRAWAL',
        amount: -30000,
        description: 'Retiro solicitado',
        createdAt: '2026-08-11T12:00:00.000Z',
      },
    ],
  },
  refetch: mockRefetch,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../context/RefreshContext', () => ({
  useRefresh: () => ({ setIsRefreshing: mockSetIsRefreshing }),
}));

jest.mock('../../hooks/usePlans', () => ({
  usePlans: () => mockPlans,
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

describe('WalletScreen component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {
      user: { provider: { id: 10 } },
      role: 'provider',
    };
    mockPlans = {
      requestWithdrawal: mockRequestWithdrawal,
      withdrawalLoading: false,
      walletLoading: false,
      wallet: {
        id: 1,
        balance: 50000,
        transactions: [
          {
            id: 100,
            type: 'EARNING',
            amount: 80000,
            description: 'Servicio completado',
            createdAt: '2026-08-10T12:00:00.000Z',
          },
          {
            id: 101,
            type: 'WITHDRAWAL',
            amount: -30000,
            description: 'Retiro solicitado',
            createdAt: '2026-08-11T12:00:00.000Z',
          },
        ],
      },
      refetch: mockRefetch,
    };
    mockRequestWithdrawal.mockResolvedValue({ id: 1, amount: 50000, status: 'PENDING' });
    mockRefetch.mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('COMPONENT: muestra saldo disponible e historial de movimientos', async () => {
    const view = await render(<WalletScreen />);

    expect(view.getByText('Saldo disponible')).toBeTruthy();
    expect(view.getByText('$50.000')).toBeTruthy();
    expect(view.getByText('Servicio completado')).toBeTruthy();
    expect(view.getByText('Retiro solicitado')).toBeTruthy();
    expect(view.getByText('+$80.000')).toBeTruthy();
    expect(view.getByText('-$30.000')).toBeTruthy();
  });

  it('COMPONENT: solicita retiro y muestra confirmación de éxito', async () => {
    const view = await render(<WalletScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'Retirar dinero' }));
    expect(view.getByText('Retirar Fondos')).toBeTruthy();
    expect(view.getAllByText('$50.000').length).toBeGreaterThanOrEqual(2);

    await fireEvent.press(view.getByRole('button', { name: 'Confirmar Retiro' }));

    await waitFor(() => {
      expect(mockRequestWithdrawal).toHaveBeenCalledTimes(1);
      expect(view.getByText('¡Retiro solicitado!')).toBeTruthy();
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('COMPONENT: no permite abrir retiro si el saldo es cero', async () => {
    mockPlans = {
      ...mockPlans,
      wallet: { id: 1, balance: 0, transactions: [] },
    };

    const view = await render(<WalletScreen />);

    expect(view.getByText('$0')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Retirar dinero' }));

    expect(view.queryByText('Retirar Fondos')).toBeNull();
    expect(mockRequestWithdrawal).not.toHaveBeenCalled();
  });

  it('COMPONENT: informa error si la solicitud de retiro falla', async () => {
    mockRequestWithdrawal.mockRejectedValueOnce(new Error('No tienes cuenta bancaria registrada'));
    const view = await render(<WalletScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'Retirar dinero' }));
    await fireEvent.press(view.getByRole('button', { name: 'Confirmar Retiro' }));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No tienes cuenta bancaria registrada');
    });
    expect(view.queryByText('¡Retiro solicitado!')).toBeNull();
  });
});
