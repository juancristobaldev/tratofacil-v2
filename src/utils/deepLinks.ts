import { Linking } from 'react-native';

export const DEEP_LINK_SCHEME = 'tratofacilv2';
export const PAYMENT_CALLBACK_PATH = 'payment/callback';

type PaymentCallbackHandler = (token: string, type?: string) => void;
type OrderOpenHandler = (orderId: number) => void;

let paymentHandler: PaymentCallbackHandler | null = null;
let orderOpenHandler: OrderOpenHandler | null = null;

export function setPaymentCallbackHandler(handler: PaymentCallbackHandler) {
  paymentHandler = handler;
}

export function setOrderOpenHandler(handler: OrderOpenHandler | null) {
  orderOpenHandler = handler;
}

export function parsePaymentCallback(url: string): { token: string; type?: string } | null {
  if (!url) return null;

  const decoded = decodeURIComponent(url);
  const tokenMatch = decoded.match(/[?&]token_ws=([^&]+)/) || decoded.match(/[?&]token=([^&]+)/);
  if (!tokenMatch) return null;

  const typeMatch = decoded.match(/[?&]type=([^&]+)/);
  return { token: tokenMatch[1], type: typeMatch?.[1] };
}

export function initializeDeepLinks() {
  const handleOpenURL = (event: { url: string }) => {
    const { url } = event;
    if (!url) return;

    if (url.includes(PAYMENT_CALLBACK_PATH)) {
      const parsed = parsePaymentCallback(url);
      if (parsed && paymentHandler) {
        paymentHandler(parsed.token, parsed.type);
      }
      return;
    }

    // Deep link de orden: tratofacilv2://order/:id
    const orderMatch = url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/order\/(\d+)/);
    if (orderMatch) {
      const orderId = Number(orderMatch[1]);
      if (Number.isFinite(orderId) && orderOpenHandler) {
        orderOpenHandler(orderId);
      }
    }
  };

  const subscription = Linking.addEventListener('url', handleOpenURL);

  Linking.getInitialURL().then((url) => {
    if (url) {
      handleOpenURL({ url });
    }
  });

  return () => {
    subscription.remove();
  };
}
