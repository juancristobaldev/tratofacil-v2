import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/RealtimeContext';
import { navigate } from '../navigation/navigationRef';
import { setPaymentReturnConsumer } from './PaymentReturnHandler';
import type { PaymentReturnRef } from './parsePaymentReturnUrl';

/**
 * Single semantic authority for what happens after a Flow.cl payment return
 * deep link resolves. Mounted once; waits for auth hydration before
 * registering so a cold-start return never race with token/user loading.
 *
 * Normal payment types (product/job/ad) hand off to PaymentConfirmingScreen,
 * which owns the actual confirm-mutation + bounded retry.
 *
 * Realtime orders do NOT get a generic success screen: the user is restored
 * into MainApp and confirmRealtimeFlowPayment is fired only as a fast-path
 * reconciliation nicety — the existing socket/poll reconciler in HomePage.tsx
 * is what actually drives the UI, since the backend webhook already updated
 * the authoritative order state independently of this call's outcome.
 */
export function PaymentReturnGate() {
  const { authResolved, refetch } = useAuth();
  const realtime = useRealtime();
  const confirmRealtimeRef = useRef(realtime.confirmPayment);
  confirmRealtimeRef.current = realtime.confirmPayment;

  useEffect(() => {
    if (!authResolved) return;

    setPaymentReturnConsumer((ref: PaymentReturnRef) => {
      if (ref.type === 'realtime') {
        if (__DEV__) console.log('[PAY:NAVIGATION] to=MainApp reason=realtime_payment_return');
        navigate('MainApp');
        const paymentToken = ref.token || ref.attemptId || '';
        if (paymentToken) {
          confirmRealtimeRef.current(paymentToken).catch(() => {
            if (__DEV__) console.log(`[PAY:CONFIRM_RESULT] paymentId=${paymentToken} status=CONFIRMATION_UNAVAILABLE`);
          });
        }
        return;
      }

      if (ref.type === 'card') {
        if (__DEV__) console.log('[PAY:NAVIGATION] to=MainApp reason=card_registration_return');
        refetch?.().catch(() => {});
        navigate('MainApp');
        return;
      }

      if (__DEV__) console.log('[PAY:NAVIGATION] to=PaymentConfirming reason=normal_payment_return');
      navigate('PaymentConfirming', {
        type: ref.type,
        token: ref.token,
        attemptId: ref.attemptId,
        orderId: ref.orderId,
      });
    });

    return () => setPaymentReturnConsumer(null);
  }, [authResolved]);

  return null;
}
