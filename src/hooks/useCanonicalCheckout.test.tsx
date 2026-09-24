import { Linking } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useCanonicalCheckout } from './useCanonicalCheckout';
import * as PendingStore from '../payments/pendingCheckoutStore';

const mockMutation = jest.fn();
const mockQuery = jest.fn();

jest.mock('@apollo/client/react', () => ({
  useMutation: () => [mockMutation, { loading: false, error: null }],
  useLazyQuery: () => [mockQuery, { loading: false, error: null }],
}));

jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
jest.spyOn(PendingStore, 'setPendingCheckout').mockResolvedValue(undefined);

describe('useCanonicalCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inicia checkout FLOW_HOSTED, guarda en PendingStore y abre la URL', async () => {
    mockMutation.mockResolvedValue({
      data: {
        createCheckout: {
          paymentId: 'pay_canonical_100',
          attemptId: 'att_canonical_200',
          status: 'CHECKOUT_READY',
          checkoutUrl: 'https://flow.cl/pay/canon_100',
          expiresAt: '2026-09-14T22:00:00Z',
          requiresAction: true,
        },
      },
    });

    const { result } = await renderHook(() => useCanonicalCheckout());

    let session: any;
    await act(async () => {
      session = await result.current.startCheckout({
        domainType: 'PRODUCT',
        orderId: 50,
      });
    });

    expect(mockMutation).toHaveBeenCalledWith({
      variables: {
        input: expect.objectContaining({
          order: { domainType: 'PRODUCT', orderId: 50 },
          paymentMethod: 'FLOW_HOSTED',
        }),
      },
    });
    expect(PendingStore.setPendingCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        domainType: 'product',
        orderId: 50,
        paymentId: 'pay_canonical_100',
        attemptId: 'att_canonical_200',
      }),
    );
    expect(Linking.openURL).toHaveBeenCalledWith('https://flow.cl/pay/canon_100');
    expect(session.paymentId).toBe('pay_canonical_100');
  });

  it('inicia checkout FLOW_SAVED_CARD sin abrir URL externa si no requiere acción', async () => {
    mockMutation.mockResolvedValue({
      data: {
        createCheckout: {
          paymentId: 'pay_card_direct',
          attemptId: 'att_card_direct',
          status: 'SUCCEEDED',
          checkoutUrl: null,
          requiresAction: false,
        },
      },
    });

    const { result } = await renderHook(() => useCanonicalCheckout());

    let session: any;
    await act(async () => {
      session = await result.current.startCheckout({
        domainType: 'SERVICE',
        orderId: 88,
        paymentMethod: 'FLOW_SAVED_CARD',
      });
    });

    expect(mockMutation).toHaveBeenCalledWith({
      variables: {
        input: expect.objectContaining({
          order: { domainType: 'SERVICE', orderId: 88 },
          paymentMethod: 'FLOW_SAVED_CARD',
        }),
      },
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(session.status).toBe('SUCCEEDED');
  });

  it('consulta pasivamente paymentStatus por token', async () => {
    mockQuery.mockResolvedValue({
      data: {
        paymentStatus: {
          paymentId: 'pay_check_1',
          attemptId: 'att_check_1',
          domainType: 'PRODUCT',
          orderId: 50,
          paymentStatus: 'PAID',
          isPaid: true,
          isTerminal: true,
          amount: 19990,
          currency: 'CLP',
        },
      },
    });

    const { result } = await renderHook(() => useCanonicalCheckout());

    let status: any;
    await act(async () => {
      status = await result.current.checkPaymentStatus({ token: 'token_canon_999' });
    });

    expect(mockQuery).toHaveBeenCalledWith({
      variables: {
        token: 'token_canon_999',
        paymentId: undefined,
        attemptId: undefined,
      },
    });
    expect(status?.isPaid).toBe(true);
    expect(status?.paymentStatus).toBe('PAID');
  });
});
