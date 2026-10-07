import { Linking } from 'react-native';
import { initializeDeepLinks, setOrderOpenHandler } from './deepLinks';

jest.mock('react-native', () => ({
  Linking: {
    addEventListener: jest.fn(),
    getInitialURL: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../payments/PaymentReturnHandler', () => ({
  handlePaymentReturnUrl: jest.fn(),
}));

describe('DeepLinks Security Gates (P2-04 Strict Scheme Validation)', () => {
  let urlListener: ((event: { url: string }) => void) | null = null;
  const mockOrderHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setOrderOpenHandler(mockOrderHandler);

    (Linking.addEventListener as jest.Mock).mockImplementation((_event, callback) => {
      urlListener = callback;
      return { remove: jest.fn() };
    });

    initializeDeepLinks();
  });

  it('debe ignorar esquemas de URL arbitrarios o maliciosos (ej. evilapp://order/123)', () => {
    expect(urlListener).toBeDefined();

    urlListener!({ url: 'evilapp://order/123' });
    urlListener!({ url: 'http://order/123' });
    urlListener!({ url: 'otherapp://order/456' });

    expect(mockOrderHandler).not.toHaveBeenCalled();
  });

  it('debe aceptar exclusivamente el esquema oficial tratofacilv2://order/:id', () => {
    expect(urlListener).toBeDefined();

    urlListener!({ url: 'tratofacilv2://order/999' });

    expect(mockOrderHandler).toHaveBeenCalledWith(999);
  });
});
