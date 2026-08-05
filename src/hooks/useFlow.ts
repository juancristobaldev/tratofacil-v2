import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { Linking } from 'react-native';
import { INIT_FLOW_PRODUCT, CONFIRM_FLOW_PRODUCT } from '../graphql/operations/products';
import { INIT_FLOW_JOB } from '../graphql/operations/jobs';
import { INIT_REALTIME_FLOW_PAYMENT, CONFIRM_REALTIME_FLOW_PAYMENT } from '../graphql/operations/realtime';
import type { RealtimePaymentInitResponse } from '../types/graphql';

type FlowPaymentType = 'product' | 'job' | 'realtime';

interface FlowInitParams {
  type: FlowPaymentType;
  orderId: number;
  returnUrl: string;
}

interface FlowInitResult {
  url: string;
  token: string;
  paymentExpiresAt?: string;
}

interface UseFlowReturn {
  pay: (params: FlowInitParams) => Promise<FlowInitResult>;
  confirm: (type: FlowPaymentType, token: string) => Promise<void>;
  isProcessing: boolean;
  lastError: string | null;
}

export function useFlow(): UseFlowReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const [initProduct] = useMutation<{
    initFlowProduct: { url: string; token: string };
  }>(INIT_FLOW_PRODUCT);

  const [confirmProduct] = useMutation<{ confirmFlowProduct: { id: number; status: string } }>(CONFIRM_FLOW_PRODUCT);

  const [initJob] = useMutation<{
    initFlowJob: { url: string; token: string };
  }>(INIT_FLOW_JOB);

  const [initRealtime] = useMutation<{
    initRealtimeFlowPayment: RealtimePaymentInitResponse;
  }>(INIT_REALTIME_FLOW_PAYMENT);

  const [confirmRealtime] = useMutation<{
    confirmRealtimeFlowPayment: { id: number; status: string };
  }>(CONFIRM_REALTIME_FLOW_PAYMENT);

  const pay = useCallback(
    async (params: FlowInitParams): Promise<FlowInitResult> => {
      setIsProcessing(true);
      setLastError(null);

      try {
        let result: FlowInitResult;

        switch (params.type) {
          case 'product': {
            const { data } = await initProduct({
              variables: { orderProductId: params.orderId, returnUrl: params.returnUrl },
            });
            result = data!.initFlowProduct;
            break;
          }
          case 'job': {
            const { data } = await initJob({
              variables: { orderJobId: params.orderId, returnUrl: params.returnUrl },
            });
            result = data!.initFlowJob;
            break;
          }
          case 'realtime': {
            const { data } = await initRealtime({
              variables: { orderRealtimeId: params.orderId, returnUrl: params.returnUrl },
            });
            result = data!.initRealtimeFlowPayment;
            break;
          }
          default:
            throw new Error('Tipo de pago no soportado');
        }

        await Linking.openURL(result.url);
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Error al iniciar el pago';
        setLastError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [initProduct, initJob, initRealtime],
  );

  const confirm = useCallback(
    async (type: FlowPaymentType, token: string): Promise<void> => {
      setIsProcessing(true);
      setLastError(null);

      try {
        switch (type) {
          case 'product':
            await confirmProduct({ variables: { token } });
            break;
          case 'realtime':
            await confirmRealtime({ variables: { token } });
            break;
          default:
            throw new Error('Confirmación no soportada para este tipo');
        }
      } catch (err: any) {
        const msg = err?.message || 'Error al confirmar el pago';
        setLastError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [confirmProduct, confirmRealtime],
  );

  return { pay, confirm, isProcessing, lastError };
}
