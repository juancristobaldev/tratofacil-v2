import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_CHECKOUT_KEY = '@tratofacil:pending_checkout';

export interface PendingCheckout {
  domainType: 'product' | 'job' | 'service' | 'ad' | 'realtime' | 'plan';
  orderId: number;
  paymentId?: string;
  attemptId?: string;
  token?: string;
  createdAt: number;
}

export async function setPendingCheckout(checkout: PendingCheckout): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(checkout));
  } catch (err) {
    if (__DEV__) {
      console.warn('[PendingCheckoutStore] Error guardando checkout pendiente:', err);
    }
  }
}

export async function getPendingCheckout(): Promise<PendingCheckout | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCheckout;
  } catch (err) {
    if (__DEV__) {
      console.warn('[PendingCheckoutStore] Error leyendo checkout pendiente:', err);
    }
    return null;
  }
}

export async function clearPendingCheckout(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch (err) {
    if (__DEV__) {
      console.warn('[PendingCheckoutStore] Error eliminando checkout pendiente:', err);
    }
  }
}
