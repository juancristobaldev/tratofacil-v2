import { Linking } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFlow } from './useFlow';

const mockMutationByOperation = new Map<string, jest.Mock>();

jest.mock('@apollo/client/react', () => ({
  useMutation: (document: { definitions?: Array<{ name?: { value?: string } }> }) => {
    const operationName = document.definitions?.[0]?.name?.value ?? 'UnknownOperation';
    const mutation = mockMutationByOperation.get(operationName) ?? jest.fn();
    mockMutationByOperation.set(operationName, mutation);
    return [mutation, { loading: false }];
  },
}));

jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

describe('useFlow', () => {
  beforeEach(() => {
    mockMutationByOperation.clear();
    jest.mocked(Linking.openURL).mockClear();
  });

  it('REGRESSION: initializes product Flow payment with orderProductId and opens returned URL', async () => {
    const initProduct = jest.fn().mockResolvedValue({
      data: { initFlowProduct: { url: 'https://flow.test/product', token: 'product-token' } },
    });
    mockMutationByOperation.set('InitFlowProduct', initProduct);

    const { result } = await renderHook(() => useFlow());
    let payment: Awaited<ReturnType<typeof result.current.pay>> | undefined;
    await act(async () => {
      payment = await result.current.pay({
        type: 'product',
        orderId: 555,
        returnUrl: 'tratofacilv2://payment/callback?type=product',
      });
    });

    expect(initProduct).toHaveBeenCalledWith({
      variables: {
        orderProductId: 555,
        returnUrl: 'tratofacilv2://payment/callback?type=product',
      },
    });
    expect(Linking.openURL).toHaveBeenCalledWith('https://flow.test/product');
    expect(payment).toEqual({ url: 'https://flow.test/product', token: 'product-token' });
    await waitFor(() => expect(result.current.isProcessing).toBe(false));
  });

  it('REGRESSION: initializes realtime Flow payment with orderRealtimeId', async () => {
    const initRealtime = jest.fn().mockResolvedValue({
      data: {
        initRealtimeFlowPayment: {
          url: 'https://flow.test/realtime',
          token: 'realtime-token',
          paymentExpiresAt: '2026-08-23T12:00:00.000Z',
        },
      },
    });
    mockMutationByOperation.set('InitRealtimeFlowPayment', initRealtime);

    const { result } = await renderHook(() => useFlow());
    let payment: Awaited<ReturnType<typeof result.current.pay>> | undefined;
    await act(async () => {
      payment = await result.current.pay({
        type: 'realtime',
        orderId: 77,
        returnUrl: 'tratofacilv2://payment/callback?type=realtime',
      });
    });

    expect(initRealtime).toHaveBeenCalledWith({
      variables: {
        orderRealtimeId: 77,
        returnUrl: 'tratofacilv2://payment/callback?type=realtime',
      },
    });
    expect(Linking.openURL).toHaveBeenCalledWith('https://flow.test/realtime');
    expect(payment?.paymentExpiresAt).toBe('2026-08-23T12:00:00.000Z');
  });

  it('REGRESSION: confirms ad payment through confirmFlowAdTransaction', async () => {
    const confirmAd = jest.fn().mockResolvedValue({
      data: { confirmFlowAdTransaction: { id: 9, status: 'SUCCESS' } },
    });
    mockMutationByOperation.set('ConfirmFlowAd', confirmAd);

    const { result } = await renderHook(() => useFlow());
    let status: string | undefined;
    await act(async () => {
      status = await result.current.confirm('ad', 'ad-token');
    });

    expect(confirmAd).toHaveBeenCalledWith({ variables: { token: 'ad-token' } });
    expect(status).toBe('SUCCESS');
  });

  it('REGRESSION: exposes payment init errors and does not open Flow URL', async () => {
    const initJob = jest.fn().mockRejectedValue(new Error('Flow no disponible'));
    mockMutationByOperation.set('InitFlowJob', initJob);

    const { result } = await renderHook(() => useFlow());

    await act(async () => {
      await expect(
        result.current.pay({
          type: 'job',
          orderId: 88,
          returnUrl: 'tratofacilv2://payment/callback?type=job',
        }),
      ).rejects.toThrow('Flow no disponible');
    });

    expect(initJob).toHaveBeenCalledWith({
      variables: {
        orderJobId: 88,
        returnUrl: 'tratofacilv2://payment/callback?type=job',
      },
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.lastError).toBe('Flow no disponible'));
  });
});
