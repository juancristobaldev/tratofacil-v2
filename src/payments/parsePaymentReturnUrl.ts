export const PAYMENT_CALLBACK_PATH = 'payment/callback';

export type PaymentReturnType = 'product' | 'job' | 'realtime' | 'ad';

const VALID_TYPES: readonly PaymentReturnType[] = ['product', 'job', 'realtime', 'ad'];

export interface PaymentReturnRef {
  type: PaymentReturnType;
  token: string;
}

/**
 * Single authority for interpreting a Flow.cl payment-return deep link.
 * Only ever reads `token`/`type` (opaque identifiers) — never a status/success flag,
 * since the deep link is not the source of truth for whether a payment succeeded.
 */
export function parsePaymentReturnUrl(url: string): PaymentReturnRef | null {
  if (!url || !url.includes(PAYMENT_CALLBACK_PATH)) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }

  const tokenMatch = decoded.match(/[?&]token_ws=([^&]+)/) || decoded.match(/[?&]token=([^&]+)/);
  const token = tokenMatch?.[1];
  if (!token) return null;

  const typeMatch = decoded.match(/[?&]type=([^&]+)/);
  const type = typeMatch?.[1];
  if (!type || !VALID_TYPES.includes(type as PaymentReturnType)) return null;

  return { type: type as PaymentReturnType, token };
}
