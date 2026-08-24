const mockIsReady = jest.fn();

jest.mock('../navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockIsReady(),
  },
}));

describe('PaymentReturnHandler', () => {
  beforeEach(() => {
    jest.resetModules();
    mockIsReady.mockReset();
  });

  it('REGRESSION: queues a payment return until navigation and consumer are ready', () => {
    mockIsReady.mockReturnValue(false);
    const handler = require('./PaymentReturnHandler') as typeof import('./PaymentReturnHandler');
    const consumer = jest.fn();

    handler.handlePaymentReturnUrl(
      'tratofacilv2://payment/callback?type=product&token_ws=queued-token',
      true,
    );
    handler.setPaymentReturnConsumer(consumer);

    expect(consumer).not.toHaveBeenCalled();

    mockIsReady.mockReturnValue(true);
    handler.drainPendingPaymentReturn();

    expect(consumer).toHaveBeenCalledTimes(1);
    expect(consumer).toHaveBeenCalledWith({ type: 'product', token: 'queued-token' });
  });

  it('REGRESSION: delivers the same payment token only once', () => {
    mockIsReady.mockReturnValue(true);
    const handler = require('./PaymentReturnHandler') as typeof import('./PaymentReturnHandler');
    const consumer = jest.fn();

    handler.setPaymentReturnConsumer(consumer);
    handler.handlePaymentReturnUrl(
      'tratofacilv2://payment/callback?type=realtime&token_ws=dup-token',
      false,
    );
    handler.handlePaymentReturnUrl(
      'tratofacilv2://payment/callback?type=realtime&token_ws=dup-token',
      false,
    );

    expect(consumer).toHaveBeenCalledTimes(1);
    expect(consumer).toHaveBeenCalledWith({ type: 'realtime', token: 'dup-token' });
  });

  it('REGRESSION: ignores unsupported or unrelated URLs', () => {
    mockIsReady.mockReturnValue(true);
    const handler = require('./PaymentReturnHandler') as typeof import('./PaymentReturnHandler');
    const consumer = jest.fn();

    handler.setPaymentReturnConsumer(consumer);
    handler.handlePaymentReturnUrl('tratofacilv2://order/123', false);
    handler.handlePaymentReturnUrl(
      'tratofacilv2://payment/callback?type=bad&token_ws=bad-token',
      false,
    );

    expect(consumer).not.toHaveBeenCalled();
  });
});
