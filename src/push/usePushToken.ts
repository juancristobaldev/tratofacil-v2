import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid, AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { REGISTER_PUSH_TOKEN_MUTATION } from '../graphql/operations/auth';
import type {
  RegisterPushTokenMutation,
  RegisterPushTokenMutationVariables,
} from '../graphql/generated-operations';

import { useAuth } from '../context/AuthContext';

let lastRegisteredToken: string | null = null;

export function getLastRegisteredPushToken(): string | null {
  return lastRegisteredToken;
}

export function clearPushTokenCache(): void {
  lastRegisteredToken = null;
}

export function usePushToken() {
  const { token: authToken, isAuthenticated } = useAuth();
  const [registerToken] = useMutation<
    RegisterPushTokenMutation,
    RegisterPushTokenMutationVariables
  >(REGISTER_PUSH_TOKEN_MUTATION);

  const deviceTokenRef = useRef<string | null>(null);
  const registeredTokenForSessionRef = useRef<string | null>(null);

  const sendTokenToBackend = (token: string) => {
    if (!isAuthenticated || !authToken) return;
    if (registeredTokenForSessionRef.current === token) return;
    registeredTokenForSessionRef.current = token;
    lastRegisteredToken = token;
    registerToken({ variables: { token, platform: Platform.OS } }).catch(() => {
      registeredTokenForSessionRef.current = null;
    });
  };

  useEffect(() => {
    if (isAuthenticated && authToken && deviceTokenRef.current) {
      sendTokenToBackend(deviceTokenRef.current);
    }
    if (!isAuthenticated) {
      registeredTokenForSessionRef.current = null;
    }
  }, [isAuthenticated, authToken]);

  useEffect(() => {
    const pushModule = NativeModules.PushTokenModule;
    if (!pushModule) return;

    const initToken = async () => {
      try {
        const granted = await requestPermission(pushModule);
        if (!granted) return;

        const token: string | null = await pushModule.getToken();
        if (token) {
          deviceTokenRef.current = token;
          sendTokenToBackend(token);
        }
      } catch (_) {}
    };

    initToken();

    let sub: any;
    try {
      const emitter = new NativeEventEmitter(pushModule);
      sub = emitter.addListener('onPushTokenRefresh', (token: string) => {
        deviceTokenRef.current = token;
        sendTokenToBackend(token);
      });
    } catch (_) {}

    // Si el usuario negó el permiso al inicio y luego lo habilita a mano desde
    // Ajustes, reintentamos al volver a foreground (mismo patrón que LocationContext).
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        initToken();
      }
    });

    return () => {
      sub?.remove();
      appStateSub.remove();
    };
  }, [isAuthenticated, authToken]);
}

async function requestPermission(pushModule: any): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const granted: boolean = await pushModule?.requestPermission();
      return Boolean(granted);
    }
    if (Platform.OS === 'android') {
      // No-op en Android <13 (el permiso no existe ahí; RN resuelve `granted` directo).
      // En Android 13+ es obligatorio pedirlo en runtime o las notificaciones no se muestran.
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (hasPermission) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Permiso de Notificaciones',
          message: 'TratoFacil necesita enviarte notificaciones sobre tus solicitudes y órdenes.',
          buttonNeutral: 'Preguntar luego',
          buttonNegative: 'Cancelar',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return false;
  } catch (_) {
    return false;
  }
}

