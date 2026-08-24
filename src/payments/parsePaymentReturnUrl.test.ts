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

  it('REGRESSION: decodes encoded callback URLs before extracting token and type', () => {
    expect(
      parsePaymentReturnUrl(
        'tratofacilv2://payment/callback%3Ftype%3Djob%26token_ws%3Djob-token',
      ),
    ).toEqual({ type: 'job', token: 'job-token' });
  });
});
