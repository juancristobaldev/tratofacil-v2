import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PaymentConfirmingScreen } from './PaymentConfirmingScreen';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockReset = jest.fn();
const mockConfirm = jest.fn();

let mockRouteParams: any = { type: 'realtime', token: 'flow_token_rt_123' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    reset: mockReset,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('../../hooks/useFlow', () => ({
  useFlow: () => ({
    confirm: mockConfirm,
  }),
}));

jest.mock('../../components/ui', () => {
  const mockReact = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    Icon: ({ name }: { name: string }) => <Text>{name}</Text>,
    Button: ({ title, onPress, disabled }: any) => (
      <TouchableOpacity onPress={onPress} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

describe('PaymentConfirmingScreen Realtime Flow (Flujo 13)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { type: 'realtime', token: 'flow_token_rt_123' };
  });

  it('REALTIME: confirma pago exitoso con type realtime y redirige a PaymentSuccess con metadata realtime', async () => {
    mockConfirm.mockResolvedValue('ACCEPTED');

    await render(<PaymentConfirmingScreen />);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('realtime', 'flow_token_rt_123');
      expect(mockReplace).toHaveBeenCalledWith('PaymentSuccess', {
        title: '¡Pago Exitoso!',
        subtitle: 'Tu transacción se ha procesado correctamente.',
        type: 'realtime',
      });
    });
  });

  it('REALTIME: si el pago es rechazado o cancelado en Flow, reemplaza con PaymentFailed(realtime)', async () => {
    mockConfirm.mockResolvedValue('REJECTED');

    await render(<PaymentConfirmingScreen />);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('realtime', 'flow_token_rt_123');
      expect(mockReplace).toHaveBeenCalledWith('PaymentFailed', { type: 'realtime' });
    });
  });
});
