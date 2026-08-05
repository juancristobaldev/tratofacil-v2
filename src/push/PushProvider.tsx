import React, { useEffect } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { usePushToken } from './usePushToken';
import { handlePushAction } from './PushActions';

const { PushTokenModule } = NativeModules;
const actionEmitter = new NativeEventEmitter(PushTokenModule);

export function PushProvider({ children }: { children: React.ReactNode }) {
  usePushToken();

  useEffect(() => {
    let sub: any;

    if (Platform.OS === 'android') {
      const androidEmitter = new NativeEventEmitter(PushTokenModule);
      sub = androidEmitter.addListener(
        'onPushReceived',
        (data: Record<string, any>) => {
          handlePushAction('FOREGROUND', data);
        },
      );
    }

    return () => {
      sub?.remove();
    };
  }, []);

  return <>{children}</>;
}
