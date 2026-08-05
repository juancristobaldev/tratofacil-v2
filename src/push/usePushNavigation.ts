import { NativeModules, NativeEventEmitter } from 'react-native';
import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { handlePushAction } from './PushActions';

const { PushTokenModule } = NativeModules;
const actionEmitter = new NativeEventEmitter(PushTokenModule);

export function usePushNavigation() {
  const navigation = useNavigation<any>();
  const navRef = useRef(navigation);
  navRef.current = navigation;

  useEffect(() => {
    PushTokenModule.getPendingPushAction().then((pending: string | null) => {
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          navigateToOrder(parsed.data, navRef.current);
          handlePushAction(parsed.action, parsed.data);
        } catch (_) {}
      }
    });

    const sub = actionEmitter.addListener('onPushAction', (event: { action: string; data: Record<string, any> }) => {
      navigateToOrder(event.data, navRef.current);
      handlePushAction(event.action, event.data);
    });

    return () => {
      sub.remove();
    };
  }, []);
}

function navigateToOrder(data: Record<string, any> | undefined, nav: any) {
  if (!data) return;
  const orderId = data.orderId;
  if (orderId) {
    nav.navigate('FocusMode', { orderId: Number(orderId) });
  }
}
