import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const { PushTokenModule } = NativeModules;
const tokenEmitter = new NativeEventEmitter(PushTokenModule);

const REGISTER_PUSH_TOKEN = gql`
  mutation RegisterPushToken($token: String!, $platform: String!) {
    registerPushToken(token: $token, platform: $platform)
  }
`;

export function usePushToken() {
  const [registerToken] = useMutation(REGISTER_PUSH_TOKEN);
  const registeredRef = useRef(false);

  const sendTokenToBackend = (token: string) => {
    registerToken({ variables: { token, platform: Platform.OS } }).catch(() => {});
  };

  useEffect(() => {
    const initToken = async () => {
      try {
        const granted = await requestPermission();
        if (!granted) return;

        const token: string | null = await PushTokenModule.getToken();
        if (token && !registeredRef.current) {
          registeredRef.current = true;
          sendTokenToBackend(token);
        }
      } catch (_) {}
    };

    initToken();

    const sub = tokenEmitter.addListener('onPushTokenRefresh', (token: string) => {
      registeredRef.current = true;
      sendTokenToBackend(token);
    });

    return () => {
      sub.remove();
    };
  }, []);
}

async function requestPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const granted: boolean = await PushTokenModule.requestPermission();
      return granted;
    }
    if (Platform.OS === 'android') {
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}
