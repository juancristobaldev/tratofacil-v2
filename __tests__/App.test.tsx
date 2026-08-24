import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

jest.mock('../src/navigation/AppNavigator', () => {
  const { View, Text } = require('react-native');
  return {
    AppNavigator: () => (
      <View>
        <Text>TratoFacil App Root</Text>
      </View>
    ),
  };
});

jest.mock('../src/utils/deepLinks', () => ({
  initializeDeepLinks: jest.fn(() => jest.fn()),
  setOrderOpenHandler: jest.fn(),
  PAYMENT_CALLBACK_PATH: '/payment/callback',
  DEEP_LINK_SCHEME: 'tratofacilv2',
}));

describe('App Bootstrap and Provider Hierarchy', () => {
  it('monta la jerarquía completa de providers de la aplicación sin errores', async () => {
    const view = await render(<App />);
    expect(view.getByText('TratoFacil App Root')).toBeTruthy();
  });
});
