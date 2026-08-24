import { NativeModules, NativeEventEmitter, AppState } from 'react-native';
import { useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { handlePushAction } from './PushActions';
import { useRealtime } from '../realtime/RealtimeContext';

export function usePushNavigation() {
  const navigation = useNavigation<any>();
  const navRef = useRef(navigation);
  navRef.current = navigation;
  const { refetch } = useRealtime();

  const navigateToOrder = useCallback(
    (data: Record<string, any> | undefined) => {
      if (!data) return;
      const orderId = data.orderId;
      if (orderId) {
        navRef.current?.navigate('MainApp');
        refetch();
      }
    },
    [refetch],
  );

  const consumePendingAction = useCallback(() => {
    const pushModule = NativeModules.PushTokenModule;
    if (!pushModule?.getPendingPushAction) return;

    pushModule.getPendingPushAction().then((pending: string | null) => {
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          navigateToOrder(parsed.data);
          handlePushAction(parsed.action, parsed.data);
        } catch {}
      }
    }).catch(() => {});
  }, [navigateToOrder]);

  useEffect(() => {
    const pushModule = NativeModules.PushTokenModule;
    if (!pushModule) return;

    consumePendingAction();

    let sub: any;
    try {
      const actionEmitter = new NativeEventEmitter(pushModule);
      sub = actionEmitter.addListener(
        'onPushAction',
        (event: { action: string; data: Record<string, any> }) => {
          navigateToOrder(event.data);
          handlePushAction(event.action, event.data);
        },
      );
    } catch (_) {}

    // Warm-tap Android: re-leer la acción pendiente al volver al primer plano
    // (una notificación tocada en background no remonta el tracker).
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        consumePendingAction();
      }
    });

    return () => {
      sub?.remove();
      appStateSub.remove();
    };
  }, [consumePendingAction, navigateToOrder]);
}

