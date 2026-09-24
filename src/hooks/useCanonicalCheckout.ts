import { useCallback } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client/react';
import { Linking, Platform } from 'react-native';
import {
  CREATE_CHECKOUT,
  PAYMENT_STATUS,
  PaymentDomainType,
  PaymentMethodType,
  ClientPlatform,
  CheckoutSessionResult,
  PaymentStatusResultData,
} from '../graphql/operations/payments';
import {
  setPendingCheckout,
  getPendingCheckout,
  clearPendingCheckout,
} from '../payments/pendingCheckoutStore';

export interface StartCheckoutParams {
  domainType: PaymentDomainType;
  orderId: number;
  paymentMethod?: PaymentMethodType;
}

export function useCanonicalCheckout() {
  const [createCheckoutMut, { loading: isStartingCheckout, error: startCheckoutError }] = useMutation<{
    createCheckout: CheckoutSessionResult;
  }>(CREATE_CHECKOUT);

  const [getPaymentStatusQuery, { loading: isCheckingStatus, error: checkStatusError }] = useLazyQuery<{
    paymentStatus: PaymentStatusResultData;
  }>(PAYMENT_STATUS, { fetchPolicy: 'network-only' });

  const startCheckout = useCallback(
    async (params: StartCheckoutParams): Promise<CheckoutSessionResult> => {
      const platform: ClientPlatform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
      const paymentMethod = params.paymentMethod || 'FLOW_HOSTED';
      const idempotencyKey = `mob_${params.domainType.toLowerCase()}_${params.orderId}_${Date.now()}`;

      const { data } = await createCheckoutMut({
        variables: {
          input: {
            order: {
              domainType: params.domainType,
              orderId: params.orderId,
            },
            paymentMethod,
            platform,
            idempotencyKey,
          },
        },
      });

      if (!data?.createCheckout) {
        throw new Error('No se pudo crear la sesión de pago canónica.');
      }

      const session = data.createCheckout;

      if (paymentMethod === 'FLOW_HOSTED' && session.checkoutUrl) {
        await setPendingCheckout({
          domainType: params.domainType.toLowerCase() as any,
          orderId: params.orderId,
          paymentId: session.paymentId,
          attemptId: session.attemptId,
          createdAt: Date.now(),
        });
        await Linking.openURL(session.checkoutUrl);
      }

      return session;
    },
    [createCheckoutMut],
  );

  const checkPaymentStatus = useCallback(
    async (params: {
      token?: string;
      paymentId?: string;
      attemptId?: string;
    }): Promise<PaymentStatusResultData | null> => {
      const { data } = await getPaymentStatusQuery({
        variables: {
          token: params.token,
          paymentId: params.paymentId,
          attemptId: params.attemptId,
        },
      });

      return data?.paymentStatus || null;
    },
    [getPaymentStatusQuery],
  );

  return {
    startCheckout,
    checkPaymentStatus,
    getPendingCheckout,
    clearPendingCheckout,
    isStartingCheckout,
    isCheckingStatus,
    startCheckoutError,
    checkStatusError,
  };
}
