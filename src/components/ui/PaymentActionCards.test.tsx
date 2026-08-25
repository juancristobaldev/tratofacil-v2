import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaymentActionCards } from './PaymentActionCards';

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

describe('PaymentActionCards', () => {
  it('renders saved card action card and Webpay card when hasCard is true', async () => {
    const onPayWithSavedCard = jest.fn();
    const onPayWithFlow = jest.fn();

    const view = await render(
      <PaymentActionCards
        hasCard={true}
        cardBrand="VISA"
        cardLast4="4242"
        onPayWithSavedCard={onPayWithSavedCard}
        onPayWithFlow={onPayWithFlow}
      />
    );

    expect(view.getByText('VISA •••• 4242')).toBeTruthy();
    expect(view.getByText('1-CLICK')).toBeTruthy();
    expect(view.getByText('Pagar con Webpay / Flow')).toBeTruthy();

    await fireEvent.press(view.getByText('VISA •••• 4242'));
    expect(onPayWithSavedCard).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByText('Pagar con Webpay / Flow'));
    expect(onPayWithFlow).toHaveBeenCalledTimes(1);
  });

  it('renders CTA to link card and direct Webpay when hasCard is false', async () => {
    const onRegisterCard = jest.fn();
    const onPayWithFlow = jest.fn();

    const view = await render(
      <PaymentActionCards
        hasCard={false}
        onRegisterCard={onRegisterCard}
        onPayWithFlow={onPayWithFlow}
      />
    );

    expect(view.getByText('Vincular tarjeta nueva')).toBeTruthy();
    expect(view.getByText('RECOMENDADO')).toBeTruthy();
    expect(view.getByText('Pagar con Flow / Webpay')).toBeTruthy();

    await fireEvent.press(view.getByText('Vincular tarjeta nueva'));
    expect(onRegisterCard).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByText('Pagar con Flow / Webpay'));
    expect(onPayWithFlow).toHaveBeenCalledTimes(1);
  });

  it('disables cards when isProcessing is true', async () => {
    const onPayWithSavedCard = jest.fn();
    const onPayWithFlow = jest.fn();

    const view = await render(
      <PaymentActionCards
        hasCard={true}
        cardBrand="MASTERCARD"
        cardLast4="9999"
        onPayWithSavedCard={onPayWithSavedCard}
        onPayWithFlow={onPayWithFlow}
        isProcessing={true}
        activeAction="saved_card"
      />
    );

    await fireEvent.press(view.getByText('MASTERCARD •••• 9999'));
    expect(onPayWithSavedCard).not.toHaveBeenCalled();
  });
});
