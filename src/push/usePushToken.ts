import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid, AppState } from 'react-native';
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

    // Si el usuario negó el permiso al inicio y luego lo habilita a mano desde
    // Ajustes, reintentamos al volver a foreground (mismo patrón que LocationContext).
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !registeredRef.current) {
        initToken();
      }
    });

    return () => {
      sub.remove();
      appStateSub.remove();
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
