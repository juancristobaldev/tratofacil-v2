import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setPendingCheckout,
  getPendingCheckout,
  clearPendingCheckout,
  PendingCheckout,
} from './pendingCheckoutStore';

describe('PendingCheckoutStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guarda exitosamente un checkout pendiente', async () => {
    const checkout: PendingCheckout = {
      domainType: 'product',
      orderId: 42,
      paymentId: 'pay_123',
      attemptId: 'att_456',
      createdAt: 123456,
    };

    await setPendingCheckout(checkout);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@tratofacil:pending_checkout',
      JSON.stringify(checkout)
    );
  });

  it('recupera exitosamente un checkout pendiente', async () => {
    const checkout: PendingCheckout = {
      domainType: 'product',
      orderId: 42,
      paymentId: 'pay_123',
      attemptId: 'att_456',
      createdAt: 123456,
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(checkout));
    const retrieved = await getPendingCheckout();
    expect(retrieved).toEqual(checkout);
  });

  it('retorna null cuando no hay checkout pendiente almacenado', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const retrieved = await getPendingCheckout();
    expect(retrieved).toBeNull();
  });

  it('elimina correctamente el checkout pendiente al llamar a clearPendingCheckout', async () => {
    await clearPendingCheckout();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@tratofacil:pending_checkout');
  });
});
