import { navigationRef } from '../navigation/navigationRef';
import { parsePaymentReturnUrl, PaymentReturnRef } from './parsePaymentReturnUrl';

type ReturnConsumer = (ref: PaymentReturnRef) => void;

let consumer: ReturnConsumer | null = null;
let pending: PaymentReturnRef | null = null;
const processedTokens = new Set<string>();

function log(tag: string, fields: Record<string, unknown>) {
  if (!__DEV__) return;
  const parts = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(' ');
  console.log(`[${tag}] ${parts}`);
}

function tryDeliver(ref: PaymentReturnRef) {
  if (processedTokens.has(ref.token)) {
    log('PAY:DEDUP', { paymentId: ref.token, action: 'IGNORE' });
    return;
  }
  if (!consumer || !navigationRef.isReady()) {
    pending = ref;
    return;
  }
  processedTokens.add(ref.token);
  pending = null;
  log('PAY:CONTEXT_RESOLVED', { type: ref.type, paymentRef: ref.token });
  consumer(ref);
}

/**
 * Registered once auth is hydrated and the app is ready to act on a payment
 * return. Draining is idempotent — a pending return is delivered exactly once.
 */
export function setPaymentReturnConsumer(fn: ReturnConsumer | null) {
  consumer = fn;
  if (consumer && pending) {
    tryDeliver(pending);
  }
}

export function handlePaymentReturnUrl(url: string, coldStart: boolean) {
  const ref = parsePaymentReturnUrl(url);
  if (!ref) return;
  log('PAY:DEEPLINK_RECEIVED', { resourceType: ref.type, coldStart });
  tryDeliver(ref);
}

/** Call when navigation becomes ready, in case a return arrived before it did. */
export function drainPendingPaymentReturn() {
  if (pending) tryDeliver(pending);
}
