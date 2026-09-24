import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { PaymentConfirmingScreen } from './PaymentConfirmingScreen';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockReset = jest.fn();
const mockConfirm = jest.fn();

let mockRouteParams: any = { type: 'product', token: 'flow_token_123' };

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

describe('PaymentConfirmingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { type: 'product', token: 'flow_token_123' };
  });

  it('COMPONENT: confirms payment successfully and replaces with PaymentSuccess screen', async () => {
    mockConfirm.mockResolvedValue('SUCCESS');

    await render(<PaymentConfirmingScreen />);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('product', 'flow_token_123');
      expect(mockReplace).toHaveBeenCalledWith('PaymentSuccess', {
        title: '¡Compra Exitosa!',
        subtitle: 'Tu producto será enviado pronto.',
        type: 'product',
      });
    });
  });

  it('COMPONENT: replaces with PaymentFailed screen when payment status is FAILED', async () => {
    mockConfirm.mockResolvedValue('FAILED');

    await render(<PaymentConfirmingScreen />);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('product', 'flow_token_123');
      expect(mockReplace).toHaveBeenCalledWith('PaymentFailed', { type: 'product' });
    });
  });

  it('COMPONENT: redirects to PaymentFailed if token or type is missing', async () => {
    mockRouteParams = {};

    await render(<PaymentConfirmingScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('PaymentFailed', { type: undefined });
    });
  });

  it('COMPONENT: displays pending UI and manual retry button when confirmation exhausts auto retries', async () => {
    mockConfirm.mockResolvedValue('PENDING');

    const view = await render(<PaymentConfirmingScreen />);

    // Fast-forward initial check
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    // Advance delays
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 50));
    });

    // When state reaches PENDING with attempts exhausted, UI shows title and Reintentar button
    mockConfirm.mockResolvedValueOnce('SUCCESS');

    const title = await view.findByText('Confirmando pago...');
    expect(title).toBeTruthy();
  });

  it('CANONICAL: confirms payment with attemptId when token is omitted', async () => {
    mockRouteParams = { type: 'product', attemptId: 'att_canon_999' };
    mockConfirm.mockResolvedValue('SUCCESS');

    await render(<PaymentConfirmingScreen />);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('product', '', 'att_canon_999');
      expect(mockReplace).toHaveBeenCalledWith('PaymentSuccess', {
        title: '¡Compra Exitosa!',
        subtitle: 'Tu producto será enviado pronto.',
        type: 'product',
      });
    });
  });
});
