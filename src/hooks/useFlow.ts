import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { Linking } from 'react-native';
import { INIT_FLOW_PRODUCT, CONFIRM_FLOW_PRODUCT, PAY_PRODUCT_WITH_SAVED_CARD } from '../graphql/operations/products';
import { INIT_FLOW_JOB, CONFIRM_FLOW_JOB } from '../graphql/operations/jobs';
import { INIT_REALTIME_FLOW_PAYMENT, CONFIRM_REALTIME_FLOW_PAYMENT, PAY_REALTIME_ORDER_WITH_SAVED_CARD } from '../graphql/operations/realtime';
import { CONFIRM_FLOW_AD } from '../graphql/operations/wallet';
import type { RealtimePaymentInitResponse } from '../graphql/generated';

type FlowPaymentType = 'product' | 'job' | 'realtime' | 'ad';

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
  payWithSavedCard: (type: FlowPaymentType, orderId: number) => Promise<any>;
  confirm: (type: FlowPaymentType, token: string) => Promise<string>;
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
  const [payProductSavedCard] = useMutation(PAY_PRODUCT_WITH_SAVED_CARD);

  const [initJob] = useMutation<{
    initFlowJob: { url: string; token: string };
  }>(INIT_FLOW_JOB);

  const [initRealtime] = useMutation<{
    initRealtimeFlowPayment: RealtimePaymentInitResponse;
  }>(INIT_REALTIME_FLOW_PAYMENT);

  const [confirmRealtime] = useMutation<{
    confirmRealtimeFlowPayment: { id: number; status: string };
  }>(CONFIRM_REALTIME_FLOW_PAYMENT);
  const [payRealtimeSavedCard] = useMutation(PAY_REALTIME_ORDER_WITH_SAVED_CARD);


  const [confirmJob] = useMutation<{ confirmFlowJob: { id: number; status: string } }>(CONFIRM_FLOW_JOB);

  const [confirmAd] = useMutation<{ confirmFlowAdTransaction: { id: number; status: string } }>(CONFIRM_FLOW_AD);

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

  const payWithSavedCard = useCallback(
    async (type: FlowPaymentType, orderId: number): Promise<any> => {
      setIsProcessing(true);
      setLastError(null);

      try {
        let result: any;
        switch (type) {
          case 'product': {
            const { data } = await payProductSavedCard({
              variables: { orderProductId: orderId },
            });
            result = (data as any)?.payProductOrderWithSavedCard;
            break;
          }
          case 'realtime': {
            const { data } = await payRealtimeSavedCard({
              variables: { orderRealtimeId: orderId },
            });
            result = (data as any)?.payRealtimeOrderWithSavedCard;
            break;
          }
          default:
            throw new Error(`Pago con tarjeta no soportado para tipo '${type}'`);
        }
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Error al procesar el pago con la tarjeta vinculada';
        setLastError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [payProductSavedCard, payRealtimeSavedCard],
  );

  const confirm = useCallback(
    async (type: FlowPaymentType, token: string): Promise<string> => {
      setIsProcessing(true);
      setLastError(null);

      try {
        let status: string | undefined;
        switch (type) {
          case 'product': {
            const { data } = await confirmProduct({ variables: { token } });
            status = data?.confirmFlowProduct?.status;
            break;
          }
          case 'realtime': {
            const { data } = await confirmRealtime({ variables: { token } });
            status = data?.confirmRealtimeFlowPayment?.status;
            break;
          }
          case 'job': {
            const { data } = await confirmJob({ variables: { token } });
            status = data?.confirmFlowJob?.status;
            break;
          }
          case 'ad': {
            const { data } = await confirmAd({ variables: { token } });
            status = data?.confirmFlowAdTransaction?.status;
            break;
          }
          default:
            throw new Error('Confirmación no soportada para este tipo');
        }
        return status ?? 'UNKNOWN';
      } catch (err: any) {
        const msg = err?.message || 'Error al confirmar el pago';
        setLastError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [confirmProduct, confirmRealtime, confirmJob, confirmAd],
  );

  return { pay, payWithSavedCard, confirm, isProcessing, lastError };
}

