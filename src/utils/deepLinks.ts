import { Linking } from 'react-native';
import { PAYMENT_CALLBACK_PATH } from '../payments/parsePaymentReturnUrl';
import { handlePaymentReturnUrl } from '../payments/PaymentReturnHandler';

export const DEEP_LINK_SCHEME = 'tratofacilv2';
export { PAYMENT_CALLBACK_PATH };

type OrderOpenHandler = (orderId: number) => void;

let orderOpenHandler: OrderOpenHandler | null = null;

export function setOrderOpenHandler(handler: OrderOpenHandler | null) {
  orderOpenHandler = handler;
}

export function initializeDeepLinks() {
  const handleOpenURL = (event: { url: string }, coldStart: boolean) => {
    const { url } = event;
    if (!url) return;

    if (url.includes(PAYMENT_CALLBACK_PATH)) {
      handlePaymentReturnUrl(url, coldStart);
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

  const subscription = Linking.addEventListener('url', (event) => handleOpenURL(event, false));

  Linking.getInitialURL().then((url) => {
    if (url) {
      handleOpenURL({ url }, true);
    }
  });

  return () => {
    subscription.remove();
  };
}
