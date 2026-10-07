import { NativeModules, NativeEventEmitter, DeviceEventEmitter, Platform, AppState } from 'react-native';
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
    (action: string | undefined, data: Record<string, any> | undefined) => {
      if (!data) return;

      const resolvedAction = action || data.action;

      // 1. Ver reseñas recibidas (reputación: cuando un usuario es calificado por su contraparte)
      if (resolvedAction === 'REVIEWS' || data.type === 'NUEVA_VALORACION') {
        const targetRole = data.role === 'client' ? 'client' : 'provider';
        navRef.current?.navigate('ReviewsList', {
          role: targetRole,
        });
        return;
      }

      // 2. Ver billetera (proveedor al finalizar un servicio con pago liberado)
      if (resolvedAction === 'WALLET' || (data.type === 'SERVICIO_COMPLETADO' && data.role === 'provider')) {
        navRef.current?.navigate('Wallet');
        return;
      }

      // 3. Calificar servicio completado (cliente evaluando al profesional)
      if (resolvedAction === 'RATE' || (data.type === 'SERVICIO_COMPLETADO' && data.role !== 'provider')) {
        const orderId = Number(data.orderId);
        if (orderId) {
          navRef.current?.navigate('Rating', {
            orderRealtimeId: orderId,
            role: 'client',
          });
          return;
        }
      }

      // 4. Solicitud directa de contacto desde catálogo/perfil
      if (data.type === 'SOLICITUD_CONTACTO') {
        navRef.current?.navigate('MyServices');
        return;
      }

      // 5. Orden activa en tiempo real / mapa / tracking / chat
      const orderId = Number(data.orderId);
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

    pushModule
      .getPendingPushAction()
      .then((pending: string | null) => {
        if (pending) {
          try {
            const parsed = JSON.parse(pending);
            navigateToOrder(parsed.action, parsed.data);
            handlePushAction(parsed.action, parsed.data);
          } catch {}
        }
      })
      .catch(() => {});
  }, [navigateToOrder]);

  useEffect(() => {
    const pushModule = NativeModules.PushTokenModule;
    const subscriptions: Array<{ remove: () => void }> = [];

    consumePendingAction();

    if (pushModule) {
      try {
        const actionEmitter = new NativeEventEmitter(pushModule);
        const sub = actionEmitter.addListener(
          'onPushAction',
          (event: { action: string; data: Record<string, any> }) => {
            navigateToOrder(event.action, event.data);
            handlePushAction(event.action, event.data);
          },
        );
        subscriptions.push(sub);
      } catch (_) {}
    }

    if (Platform.OS === 'android') {
      const devSub = DeviceEventEmitter.addListener(
        'onPushAction',
        (event: { action: string; data: Record<string, any> }) => {
          navigateToOrder(event.action, event.data);
          handlePushAction(event.action, event.data);
        },
      );
      subscriptions.push(devSub);
    }

    // Warm-tap: re-leer la acción pendiente al volver al primer plano
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        consumePendingAction();
      }
    });
    subscriptions.push(appStateSub);

    return () => {
      subscriptions.forEach((s) => s.remove());
    };
  }, [consumePendingAction, navigateToOrder]);
}
