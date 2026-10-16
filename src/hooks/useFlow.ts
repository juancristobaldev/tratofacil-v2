import { useState, useCallback } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client/react';
import { Linking, Platform } from 'react-native';
import { INIT_FLOW_PRODUCT, CONFIRM_FLOW_PRODUCT, PAY_PRODUCT_WITH_SAVED_CARD } from '../graphql/operations/products';
import { INIT_FLOW_JOB, CONFIRM_FLOW_JOB } from '../graphql/operations/jobs';
import { INIT_REALTIME_FLOW_PAYMENT, CONFIRM_REALTIME_FLOW_PAYMENT, PAY_REALTIME_ORDER_WITH_SAVED_CARD } from '../graphql/operations/realtime';
import { CONFIRM_FLOW_AD, PAY_AD_ORDER_WITH_SAVED_CARD } from '../graphql/operations/wallet';
import {
  CREATE_CHECKOUT,
  PAYMENT_STATUS,
  PaymentDomainType,
  ClientPlatform,
  CheckoutSessionResult,
  PaymentStatusResultData,
} from '../graphql/operations/payments';
import {
  setPendingCheckout,
  clearPendingCheckout,
} from '../payments/pendingCheckoutStore';
import type { RealtimePaymentInitResponse } from '../graphql/generated';

type FlowPaymentType = 'product' | 'job' | 'realtime' | 'ad' | 'service' | 'plan';

const DOMAIN_TYPE_MAP: Record<FlowPaymentType, PaymentDomainType> = {
  product: 'PRODUCT',
  job: 'JOB',
  realtime: 'REALTIME',
  ad: 'AD',
  service: 'SERVICE',
  plan: 'PLAN',
};

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

export interface SavedCardPaymentResult {
  success?: boolean;
  paymentId?: string;
  id?: number | string;
  url?: string;
  attemptId?: string;
}

interface UseFlowReturn {
  pay: (params: FlowInitParams) => Promise<FlowInitResult>;
  payWithSavedCard: (type: FlowPaymentType, orderId: number) => Promise<SavedCardPaymentResult>;
  confirm: (type: FlowPaymentType, token: string, attemptId?: string) => Promise<string>;
  isProcessing: boolean;
  lastError: string | null;
}

export function useFlow(): UseFlowReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const [createCheckoutMut] = useMutation<{
    createCheckout: CheckoutSessionResult;
  }>(CREATE_CHECKOUT);

  const [getPaymentStatus] = useLazyQuery<{
    paymentStatus: PaymentStatusResultData;
  }>(PAYMENT_STATUS, { fetchPolicy: 'network-only' });

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
  const [payAdSavedCard] = useMutation(PAY_AD_ORDER_WITH_SAVED_CARD);

  const pay = useCallback(
    async (params: FlowInitParams): Promise<FlowInitResult> => {
      setIsProcessing(true);
      setLastError(null);

      if (__DEV__) {
        console.log('[useFlow:pay:START]', params);
      }

      try {
        let result: FlowInitResult | null = null;

        // 1. Intento canónico: CREATE_CHECKOUT
        const domainType = DOMAIN_TYPE_MAP[params.type];
        if (domainType) {
          try {
            const platform: ClientPlatform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
            const idempotencyKey = `mob_host_${params.type}_${params.orderId}_${Date.now()}`;
            const { data } = await createCheckoutMut({
              variables: {
                input: {
                  order: {
                    domainType,
                    orderId: params.orderId,
                  },
                  paymentMethod: 'FLOW_HOSTED',
                  platform,
                  idempotencyKey,
                },
              },
            });

            if (data?.createCheckout?.checkoutUrl) {
              const session = data.createCheckout;
              await setPendingCheckout({
                domainType: params.type,
                orderId: params.orderId,
                paymentId: session.paymentId,
                attemptId: session.attemptId,
                createdAt: Date.now(),
              });
              result = {
                url: session.checkoutUrl!,
                token: session.attemptId,
                paymentExpiresAt: session.expiresAt || undefined,
              };
              if (__DEV__) {
                console.log('[useFlow:createCheckout:SUCCESS]', {
                  paymentId: session.paymentId,
                  attemptId: session.attemptId,
                  checkoutUrl: session.checkoutUrl,
                });
              }
            }
          } catch (checkoutErr) {
            if (__DEV__) {
              console.warn('[useFlow] createCheckout fallback to legacy init', checkoutErr);
            }
          }
        }

        // 2. Fallback de compatibilidad si createCheckout no está disponible o falló
        if (!result) {
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
        }

        if (__DEV__) {
          console.log('[useFlow:pay:OPEN_URL]', result.url);
        }
        await Linking.openURL(result.url);
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Error al iniciar el pago';
        if (__DEV__) {
          console.error('[useFlow:pay:ERROR]', {
            type: params.type,
            orderId: params.orderId,
            message: msg,
            graphQLErrors: err?.graphQLErrors,
            networkError: err?.networkError,
          });
        }
        setLastError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [createCheckoutMut, initProduct, initJob, initRealtime],
  );

  const payWithSavedCard = useCallback(
    async (type: FlowPaymentType, orderId: number): Promise<SavedCardPaymentResult> => {
      setIsProcessing(true);
      setLastError(null);

      if (__DEV__) {
        console.log('[useFlow:payWithSavedCard:START]', { type, orderId });
      }

      try {
        let result: SavedCardPaymentResult | null = null;
        const domainType = DOMAIN_TYPE_MAP[type];
        if (domainType) {
          try {
            const platform: ClientPlatform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
            const idempotencyKey = `mob_card_${type}_${orderId}_${Date.now()}`;
            const { data } = await createCheckoutMut({
              variables: {
                input: {
                  order: {
                    domainType,
                    orderId,
                  },
                  paymentMethod: 'FLOW_SAVED_CARD',
                  platform,
                  idempotencyKey,
                },
              },
            });

            if (data?.createCheckout) {
              const session = data.createCheckout;
              if (session.status === 'SUCCEEDED' || !session.requiresAction) {
                await clearPendingCheckout();
                result = { success: true, paymentId: session.paymentId };
                if (__DEV__) {
                  console.log('[useFlow:payWithSavedCard:SUCCEEDED]', result);
                }
              } else if (session.checkoutUrl) {
                await setPendingCheckout({
                  domainType: type,
                  orderId,
                  paymentId: session.paymentId,
                  attemptId: session.attemptId,
                  createdAt: Date.now(),
                });
                await Linking.openURL(session.checkoutUrl);
                result = { url: session.checkoutUrl, attemptId: session.attemptId };
                if (__DEV__) {
                  console.log('[useFlow:payWithSavedCard:ACTION_REQUIRED]', result);
                }
              }
            }
          } catch (cardErr) {
            if (__DEV__) {
              console.warn('[useFlow] createCheckout saved card fallback', cardErr);
            }
          }
        }

        if (!result) {
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
            case 'ad': {
              const { data } = await payAdSavedCard({
                variables: { orderAdsId: orderId },
              });
              result = (data as any)?.payAdOrderWithSavedCard;
              break;
            }
            default:
              throw new Error(`Pago con tarjeta no soportado para tipo '${type}'`);
          }
        }

        if (!result) {
          throw new Error('La pasarela no devolvió un resultado de cobro válido');
        }

        return result;
      } catch (err: any) {
        const msg = err?.message || 'Error al procesar el pago con la tarjeta vinculada';
        if (__DEV__) {
          console.error('[useFlow:payWithSavedCard:ERROR]', {
            type,
            orderId,
            message: msg,
            graphQLErrors: err?.graphQLErrors,
            networkError: err?.networkError,
          });
        }
        setLastError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [createCheckoutMut, payProductSavedCard, payRealtimeSavedCard, payAdSavedCard],
  );

  const confirm = useCallback(
    async (type: FlowPaymentType, token: string, attemptId?: string): Promise<string> => {
      setIsProcessing(true);
      setLastError(null);

      if (__DEV__) {
        console.log('[useFlow:confirm:START]', { type, token, attemptId });
      }

      try {
        // 1. Intento canónico: consulta de solo lectura paymentStatus
        try {
          const { data } = await getPaymentStatus({
            variables: {
              token: token || undefined,
              attemptId: attemptId || undefined,
            },
          });

          if (data?.paymentStatus) {
            const { isPaid, isTerminal } = data.paymentStatus;
            if (__DEV__) {
              console.log('[useFlow:confirm:paymentStatus]', data.paymentStatus);
            }
            if (isPaid) {
              await clearPendingCheckout();
              return 'SUCCESS';
            }
            if (isTerminal && !isPaid) {
              await clearPendingCheckout();
              return 'FAILED';
            }
            return 'PENDING';
          }
        } catch (statusErr) {
          if (__DEV__) {
            console.warn('[useFlow] paymentStatus query fallback', statusErr);
          }
        }

        // 2. Fallback a mutación legada si paymentStatus no respondió
        if (!token) {
          return 'PENDING';
        }

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
        await clearPendingCheckout();
        if (__DEV__) {
          console.log('[useFlow:confirm:legacyResult]', { type, token, status });
        }
        return status ?? 'UNKNOWN';
      } catch (err: any) {
        const msg = err?.message || 'Error al confirmar el pago';
        if (__DEV__) {
          console.error('[useFlow:confirm:ERROR]', {
            type,
            token,
            attemptId,
            message: msg,
            graphQLErrors: err?.graphQLErrors,
            networkError: err?.networkError,
          });
        }
        setLastError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [getPaymentStatus, confirmProduct, confirmRealtime, confirmJob, confirmAd],
  );

  return { pay, payWithSavedCard, confirm, isProcessing, lastError };
}
