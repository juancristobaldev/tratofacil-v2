import { client } from '../graphql/apollo';
import {
  ACCEPT_REALTIME_ORDER_QUOTE,
  RESPOND_REALTIME_CONTACT_REQUEST,
  RESPOND_TO_COUNTER_OFFER,
  INIT_REALTIME_FLOW_PAYMENT,
} from '../graphql/operations/realtime';
import { PushPayload } from './types';
import { Linking, Platform } from 'react-native';

type ActionHandler = (payload: PushPayload) => Promise<void>;

const actionHandlers: Record<string, ActionHandler> = {
  ACCEPT: async (payload) => {
    try {
      await client.mutate({
        mutation: ACCEPT_REALTIME_ORDER_QUOTE,
        variables: { orderRealtimeId: payload.orderId },
      });
    } catch (_) {}
  },

  REJECT: async (payload) => {
    try {
      await client.mutate({
        mutation: RESPOND_REALTIME_CONTACT_REQUEST,
        variables: { orderRealtimeId: payload.orderId, decision: 'reject' },
      });
    } catch (_) {}
  },

  ACCEPT_COUNTER: async (payload) => {
    try {
      await client.mutate({
        mutation: RESPOND_TO_COUNTER_OFFER,
        variables: { orderRealtimeId: payload.orderId, decision: 'ACCEPTED' },
      });
    } catch (_) {}
  },

  REJECT_COUNTER: async (payload) => {
    try {
      await client.mutate({
        mutation: RESPOND_TO_COUNTER_OFFER,
        variables: { orderRealtimeId: payload.orderId, decision: 'REJECTED' },
      });
    } catch (_) {}
  },

  PAY: async (payload) => {
    try {
      const { data } = await client.mutate<{ initRealtimeFlowPayment: { url: string } }>({
        mutation: INIT_REALTIME_FLOW_PAYMENT,
        variables: {
          orderRealtimeId: payload.orderId,
          returnUrl: 'tratofacilv2://payment/callback',
        },
      });
      const paymentUrl = data?.initRealtimeFlowPayment?.url;
      if (paymentUrl) {
        await Linking.openURL(paymentUrl);
      }
    } catch (_) {}
  },

  FOREGROUND: async (_payload) => {},
  OPEN: openApp,
  OPEN_CHAT: openApp,
  NAVIGATE: openApp,
  RATE: openApp,
  START_SERVICE: openApp,
  COUNTER_OFFER: openApp,
};

async function openApp(payload: PushPayload) {
  const deepLink = payload.deepLink || `tratofacilv2://order/${payload.orderId}`;
  await Linking.openURL(deepLink).catch(() => {});
}

export async function handlePushAction(
  actionId: string | undefined,
  data: Record<string, any> | undefined,
) {
  if (!actionId || !data) return;

  const payload: PushPayload = {
    type: data.type as PushPayload['type'],
    orderId: Number(data.orderId),
    title: data.title ?? '',
    body: data.body ?? '',
  };

  const handler = actionHandlers[actionId];
  if (handler) {
    await handler(payload);
  }
}
