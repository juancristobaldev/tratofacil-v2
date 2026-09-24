import { parsePaymentReturnUrl } from './parsePaymentReturnUrl';

describe('parsePaymentReturnUrl', () => {
  it('REGRESSION: accepts Flow token_ws callback for product payments', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/callback?type=product&token_ws=flow-token-123',
      ),
    ).toEqual({ type: 'product', token: 'flow-token-123' });
  });

  it('REGRESSION: accepts token alias for realtime payments', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/callback?token=opaque-token&type=realtime',
      ),
    ).toEqual({ type: 'realtime', token: 'opaque-token' });
  });

  it('REGRESSION: accepts the card callback token', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/callback?type=card&token=card-token',
      ),
    ).toEqual({ type: 'card', token: 'card-token' });
  });

  it('accepts service callback token', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/callback?type=service&token=service-token-123',
      ),
    ).toEqual({ type: 'service', token: 'service-token-123' });
  });

  it('accepts plan callback token', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/callback?type=plan&token=plan-token-456',
      ),
    ).toEqual({ type: 'plan', token: 'plan-token-456' });
  });

  it('REGRESSION: ignores non-payment deep links', () => {
    expect(parsePaymentReturnUrl('tratofacilv2://order/123')).toBeNull();
  });

  it('REGRESSION: rejects missing token or unsupported payment type', () => {
    expect(parsePaymentReturnUrl('tratofacilv2://payment/callback?type=product')).toBeNull();
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/callback?type=unknown&token_ws=flow-token-123',
      ),
    ).toBeNull();
  });

  it('CANONICAL: accepts payment/result with attemptId, domain and orderId', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/result?attemptId=att-canon-101&domain=product&orderId=42',
      ),
    ).toEqual({
      type: 'product',
      attemptId: 'att-canon-101',
      orderId: 42,
    });
  });

  it('CANONICAL: accepts payment/result with both token and attemptId', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/result?attemptId=att-canon-102&domain=service&orderId=99&token=flow-tok-789',
      ),
    ).toEqual({
      type: 'service',
      attemptId: 'att-canon-102',
      orderId: 99,
      token: 'flow-tok-789',
    });
  });

  it('REGRESSION: decodes encoded callback URLs before extracting token and type', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/callback%3Ftype%3Djob%26token_ws%3Djob-token',
      ),
    ).toEqual({ type: 'job', token: 'job-token' });
  });
});
