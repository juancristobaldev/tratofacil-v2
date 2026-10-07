import React, { useEffect, useRef } from 'react';
import { NativeModules, NativeEventEmitter, DeviceEventEmitter, Platform } from 'react-native';
import { usePushToken } from './usePushToken';
import { handlePushAction } from './PushActions';
import { useNotification } from '../context/NotificationContext';

export function PushProvider({ children }: { children: React.ReactNode }) {
  usePushToken();
  const notificationCtx = useNotification();
  const notifyRef = useRef(notificationCtx?.showNotification);
  notifyRef.current = notificationCtx?.showNotification;

  useEffect(() => {
    const pushModule = NativeModules.PushTokenModule;
    const subscriptions: Array<{ remove: () => void }> = [];

    const handleForegroundPush = (data: Record<string, any>) => {
      handlePushAction('FOREGROUND', data);

      if (notifyRef.current && (data.title || data.body)) {
        const isError =
          data.type === 'TRATO_CANCELADO' || data.type === 'TRATO_RECHAZADO';
        notifyRef.current({
          title: data.title || 'TratoFácil',
          message: data.body || '',
          type: isError ? 'error' : 'info',
          duration: 4500,
          onPress: () => {
            handlePushAction('OPEN', data);
          },
        });
      }
    };

    // Android: PushNotificationService emite 'onPushReceived' a través de RCTDeviceEventEmitter
    if (Platform.OS === 'android') {
      const androidSub = DeviceEventEmitter.addListener(
        'onPushReceived',
        (data: Record<string, any>) => {
          handleForegroundPush(data);
        },
      );
      subscriptions.push(androidSub);
    }

    // iOS (y soporte multiplataforma si PushTokenModule emite onPushAction):
    if (pushModule) {
      try {
        const emitter = new NativeEventEmitter(pushModule);
        const actionSub = emitter.addListener(
          'onPushAction',
          (event: { action?: string; data?: Record<string, any> }) => {
            if (event?.action && event?.data) {
              handlePushAction(event.action, event.data);
            }
          },
        );
        subscriptions.push(actionSub);
      } catch (_) {}
    }

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  return <>{children}</>;
}
