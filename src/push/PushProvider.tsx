import React, { useEffect } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { usePushToken } from './usePushToken';
import { handlePushAction } from './PushActions';

const PushTokenModule = NativeModules.PushTokenModule;

export function PushProvider({ children }: { children: React.ReactNode }) {
  usePushToken();

  useEffect(() => {
    let sub: any;

    if (Platform.OS === 'android' && PushTokenModule) {
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
