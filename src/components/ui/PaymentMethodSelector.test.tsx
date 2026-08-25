import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaymentMethodSelector } from './PaymentMethodSelector';

jest.mock('lucide-react-native', () => {
  const mockReact = require('react');
  const { Text } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, iconName) => (props: any) =>
        mockReact.createElement(
          Text,
          {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
            ...props,
          },
          String(iconName),
        ),
    },
  );
});

describe('PaymentMethodSelector', () => {
  it('renders saved card option when hasCard is true', async () => {
    const onSelectMethod = jest.fn();
    const view = await render(
      <PaymentMethodSelector
        hasCard={true}
        cardBrand="VISA"
        cardLast4="4242"
        selectedMethod="saved_card"
        onSelectMethod={onSelectMethod}
      />
    );

    expect(view.getByText('VISA •••• 4242')).toBeTruthy();
    expect(view.getByText('1-CLICK')).toBeTruthy();
    expect(view.getByText('Webpay / Flow')).toBeTruthy();
  });

  it('renders CTA to link card when hasCard is false', async () => {
    const onSelectMethod = jest.fn();
    const view = await render(
      <PaymentMethodSelector
        hasCard={false}
        selectedMethod="webpay"
        onSelectMethod={onSelectMethod}
      />
    );

    expect(view.getByText('Vincular tarjeta nueva')).toBeTruthy();
    expect(view.getByText('RECOMENDADO')).toBeTruthy();
    expect(view.getByText('Pagar con Flow / Webpay')).toBeTruthy();
  });

  it('calls onSelectMethod when option is pressed', async () => {
    const onSelectMethod = jest.fn();
    const view = await render(
      <PaymentMethodSelector
        hasCard={true}
        cardBrand="MASTERCARD"
        cardLast4="9999"
        selectedMethod="saved_card"
        onSelectMethod={onSelectMethod}
      />
    );

    await fireEvent.press(view.getByText('Webpay / Flow'));
    expect(onSelectMethod).toHaveBeenCalledWith('webpay');
  });

  it('calls onSelectMethod with register_card when CTA is pressed', async () => {
    const onSelectMethod = jest.fn();
    const view = await render(
      <PaymentMethodSelector
        hasCard={false}
        selectedMethod="webpay"
        onSelectMethod={onSelectMethod}
      />
    );

    await fireEvent.press(view.getByText('Vincular tarjeta nueva'));
    expect(onSelectMethod).toHaveBeenCalledWith('register_card');
  });
});
