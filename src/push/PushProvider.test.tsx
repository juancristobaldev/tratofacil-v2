import React from 'react';
import { render, act } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform, View } from 'react-native';
import { PushProvider } from './PushProvider';
import { handlePushAction } from './PushActions';

const mockShowNotification = jest.fn();

jest.mock('../context/NotificationContext', () => ({
  useNotification: () => ({
    showNotification: mockShowNotification,
    clearNotification: jest.fn(),
    history: [],
    clearHistory: jest.fn(),
  }),
}));

jest.mock('./usePushToken', () => ({
  usePushToken: jest.fn(),
}));

jest.mock('./PushActions', () => ({
  handlePushAction: jest.fn(),
}));

describe('PushProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listens to onPushReceived via DeviceEventEmitter on Android and triggers in-app banner', async () => {
    Platform.OS = 'android';

    await render(
      <PushProvider>
        <View testID="test-child" />
      </PushProvider>,
    );

    await act(async () => {
      DeviceEventEmitter.emit('onPushReceived', {
        type: 'TRATO_DIRECTO_CREATED',
        orderId: '123',
        title: '⚡ Nueva solicitud de servicio',
        body: 'Juan Pérez solicita tus servicios',
      });
    });

    expect(handlePushAction).toHaveBeenCalledWith('FOREGROUND', {
      type: 'TRATO_DIRECTO_CREATED',
      orderId: '123',
      title: '⚡ Nueva solicitud de servicio',
      body: 'Juan Pérez solicita tus servicios',
    });

    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '⚡ Nueva solicitud de servicio',
        message: 'Juan Pérez solicita tus servicios',
        type: 'info',
      }),
    );
  });

  it('renders children without throwing', async () => {
    const view = await render(
      <PushProvider>
        <View testID="test-child" />
      </PushProvider>,
    );

    expect(view.getByTestId('test-child')).toBeTruthy();
  });
});
