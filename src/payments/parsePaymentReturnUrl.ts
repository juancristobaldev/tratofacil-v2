export const PAYMENT_CALLBACK_PATH = 'payment/callback';
export const PAYMENT_RESULT_PATH = 'payment/result';

export type PaymentReturnType = 'product' | 'job' | 'realtime' | 'ad' | 'card' | 'service' | 'plan';
export type ConfirmablePaymentReturnType = Exclude<PaymentReturnType, 'card'>;

const VALID_TYPES: readonly PaymentReturnType[] = ['product', 'job', 'realtime', 'ad', 'card', 'service', 'plan'];

export interface PaymentReturnRef {
  type: PaymentReturnType;
  token?: string;
  attemptId?: string;
  orderId?: number;
}

/**
 * Single authority for interpreting a Flow.cl payment-return deep link.
 * Only ever reads `token`/`attemptId`/`type` (opaque identifiers) — never a status/success flag,
 * since the deep link is not the source of truth for whether a payment succeeded.
 */
export function parsePaymentReturnUrl(url: string): PaymentReturnRef | null {
  if (!url || (!url.includes(PAYMENT_CALLBACK_PATH) && !url.includes(PAYMENT_RESULT_PATH))) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }

  const tokenMatch = decoded.match(/[?&]token_ws=([^&]+)/) || decoded.match(/[?&]token=([^&]+)/);
  const token = tokenMatch?.[1];

  const attemptMatch = decoded.match(/[?&]attemptId=([^&]+)/);
  const attemptId = attemptMatch?.[1];

  if (!token && !attemptId) return null;

  const typeMatch = decoded.match(/[?&]type=([^&]+)/) || decoded.match(/[?&]domain=([^&]+)/);
  const rawType = typeMatch?.[1]?.toLowerCase();
  if (rawType && !VALID_TYPES.includes(rawType as PaymentReturnType)) {
    return null;
  }
  const type: PaymentReturnType = (rawType as PaymentReturnType) || 'product';

  const orderMatch = decoded.match(/[?&]orderId=([^&]+)/);
  const orderId = orderMatch?.[1] ? Number(orderMatch[1]) : undefined;

  return {
    type,
    ...(token ? { token } : {}),
    ...(attemptId ? { attemptId } : {}),
    ...(orderId !== undefined && !Number.isNaN(orderId) ? { orderId } : {}),
  };
}
