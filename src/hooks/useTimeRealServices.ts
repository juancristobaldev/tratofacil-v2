import { useEffect, useRef, useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { io, Socket } from 'socket.io-client';
import { ENDPOINT } from '../config/endpoints';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useNotification } from '../context/NotificationContext';
import { logSocketIn, logSocketOut, setSocketLogIdentifiers } from '../utils/socketLogger';
import {
  GET_MY_REALTIME_STATE,
  GET_MY_REALTIME_ORDERS_AS_CLIENT,
  SET_MY_REALTIME_AVAILABILITY,
  CREATE_REALTIME_CONTACT_REQUEST,
  QUOTE_REALTIME_ORDER,
  UPDATE_REALTIME_QUOTE,
  ACCEPT_REALTIME_ORDER_QUOTE,
  REJECT_REALTIME_ORDER_QUOTE,
  RESPOND_REALTIME_CONTACT_REQUEST,
  START_REALTIME_ORDER,
  FINISH_REALTIME_ORDER,
  CANCEL_REALTIME_ORDER,
  UPDATE_REALTIME_ORDER_LOCATION,
  INIT_REALTIME_FLOW_PAYMENT,
  CONFIRM_REALTIME_FLOW_PAYMENT,
  SEND_MESSAGE,
  CREATE_REALTIME_PROVIDER_REVIEW,
  CREATE_CLIENT_REVIEW,
  REQUEST_PROVIDER_TO_CONNECT,
  UPDATE_PROVIDER_LOCATION,
  GUEST_CREATE_REALTIME_CONTACT_REQUEST,
  CLIENT_COUNTER_OFFER,
  RESPOND_TO_COUNTER_OFFER,
} from '../graphql/operations/realtime';
import type {
  OrderRealTime,
  RealtimePaymentInitResponse,
  ChatMessageEntity,
} from '../types/graphql';

interface RealtimeStateData {
  me: {
    id: number;
    provider: {
      id: number;
      isRealtimeActive: boolean;
      activeRealtimeOrder: OrderRealTime | null;
    } | null;
    activeRealtimeOrder: OrderRealTime | null;
  };
}

interface CreateContactInput {
  serviceProviderId: number;
  description?: string;
  lat: number;
  lng: number;
  clientAddress?: string;
}

interface GuestCreateRealtimeOrderInput {
  guestEmail: string;
  guestPhone: string;
  guestName?: string;
  serviceProviderId: number;
  clientLat: number;
  clientLng: number;
  clientAddress?: string;
  clientDescription?: string;
}

interface QuoteInput {
  orderRealtimeId: number;
  quotedPrice: number;
  quotedHours: number;
  quotedTransport: number;
}

interface ProviderReviewInput {
  rating: number;
  comment?: string;
  orderRealtimeId: number;
  providerId: number;
}

interface ClientReviewInput {
  rating: number;
  comment?: string;
  orderRealtimeId: number;
  clientId: number;
}

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseTimeRealServicesReturn {
  loading: boolean;
  activeOrder: OrderRealTime | null;
  localActiveOrder: OrderRealTime | null;
  setLocalActiveOrder: React.Dispatch<React.SetStateAction<OrderRealTime | null>>;
  cancellingRef: React.MutableRefObject<boolean>;
  clientOrders: OrderRealTime[];
  providerState: RealtimeStateData['me']['provider'];
  isRealtimeActive: boolean;
  providerActiveOrder: OrderRealTime | null;
  socketStatus: SocketStatus;
  clientId: number | null;
  refetch: () => void;
  toggleAvailability: (active: boolean, lat?: number | null, lng?: number | null) => void;
  updateProviderLocation: (lat: number, lng: number) => Promise<void>;
  createContactRequest: (input: CreateContactInput) => Promise<{ id: number; status: string }>;
  quoteOrder: (params: QuoteInput) => Promise<void>;
  updateQuote: (params: QuoteInput) => Promise<void>;
  acceptQuote: (orderRealtimeId: number) => Promise<void>;
  rejectQuote: (orderRealtimeId: number) => Promise<void>;
  respondRequest: (orderRealtimeId: number, decision: string) => Promise<void>;
  startOrder: (orderRealtimeId: number) => Promise<void>;
  finishOrder: (orderRealtimeId: number) => Promise<void>;
  cancelOrder: (orderRealtimeId: number) => Promise<void>;
  updateLocation: (orderRealtimeId: number, lat: number, lng: number) => Promise<void>;
  initPayment: (orderRealtimeId: number, returnUrl: string) => Promise<RealtimePaymentInitResponse>;
  confirmPayment: (token: string) => Promise<{ id: number; status: string }>;
  sendMessage: (orderRealtimeId: number, message: string) => Promise<ChatMessageEntity>;
  createProviderReview: (input: ProviderReviewInput) => Promise<void>;
  createClientReview: (input: ClientReviewInput) => Promise<void>;
    requestProviderToConnect: (serviceProviderId: number) => Promise<void>;
  socketRef: React.MutableRefObject<Socket | null>;
  guestCreateContactRequest: (input: GuestCreateRealtimeOrderInput) => Promise<{
    order: { id: number; status: string };
    accessToken: string;
    user: { id: number; displayName?: string; email?: string; phone?: string };
  }>;
  clientCounterOffer: (orderRealtimeId: number, quotedPrice: number, quotedHours: number, quotedTransport: number) => Promise<any>;
  respondToCounterOffer: (orderRealtimeId: number, decision: string) => Promise<any>;
}

export function useTimeRealServices(): UseTimeRealServicesReturn {
  const { token } = useAuth();
  const { role } = useRole();
  const { showNotification } = useNotification();
  const apolloClient = useApolloClient();
  const socketRef = useRef<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, loading, refetch } = useQuery<RealtimeStateData>(
    GET_MY_REALTIME_STATE,
    {
      pollInterval: 15000,
      fetchPolicy: 'network-only',
      skip: !token,
    },
  );

  const {
    data: clientOrdersData,
    refetch: refetchClientOrders,
  } = useQuery<any>(GET_MY_REALTIME_ORDERS_AS_CLIENT, {
    pollInterval: 30000,
    fetchPolicy: 'network-only',
    skip: !token,
  });

  const [setAvailability] = useMutation(SET_MY_REALTIME_AVAILABILITY);
  const [updateProviderLocMut] = useMutation(UPDATE_PROVIDER_LOCATION);
  const [createContactMut] = useMutation<{ createRealtimeContactRequest: { id: number; status: string } }>(CREATE_REALTIME_CONTACT_REQUEST);
  const [quoteMut] = useMutation(QUOTE_REALTIME_ORDER);
  const [updateQuoteMut] = useMutation(UPDATE_REALTIME_QUOTE);
  const [acceptQuoteMut] = useMutation(ACCEPT_REALTIME_ORDER_QUOTE);
  const [rejectQuoteMut] = useMutation(REJECT_REALTIME_ORDER_QUOTE);
  const [respondMut] = useMutation(RESPOND_REALTIME_CONTACT_REQUEST);
  const [startMut] = useMutation(START_REALTIME_ORDER);
  const [finishMut] = useMutation(FINISH_REALTIME_ORDER);
  const [cancelMut] = useMutation(CANCEL_REALTIME_ORDER);
  const [updateLocMut] = useMutation(UPDATE_REALTIME_ORDER_LOCATION);
  const [initPayMut] = useMutation<{ initRealtimeFlowPayment: RealtimePaymentInitResponse }>(INIT_REALTIME_FLOW_PAYMENT);
  const [confirmPayMut] = useMutation<{ confirmRealtimeFlowPayment: { id: number; status: string } }>(CONFIRM_REALTIME_FLOW_PAYMENT);
  const [sendMsgMut] = useMutation<{ sendMessage: ChatMessageEntity }>(SEND_MESSAGE);
  const [guestCreateContactMut] = useMutation<{
    guestCreateRealtimeContactRequest: {
      order: { id: number; status: string };
      accessToken: string;
      user: { id: number; displayName?: string; email?: string; phone?: string };
    };
  }>(GUEST_CREATE_REALTIME_CONTACT_REQUEST);
  const [reviewProviderMut] = useMutation(CREATE_REALTIME_PROVIDER_REVIEW);
  const [reviewClientMut] = useMutation(CREATE_CLIENT_REVIEW);
  const [connectMut] = useMutation(REQUEST_PROVIDER_TO_CONNECT);
  const [counterOfferMut] = useMutation<any>(CLIENT_COUNTER_OFFER);
  const [respondCounterOffMut] = useMutation<any>(RESPOND_TO_COUNTER_OFFER);

  const activeOrder = (data?.me?.activeRealtimeOrder as OrderRealTime) ?? null;
  const providerState = data?.me?.provider ?? null;
  const isRealtimeActive = providerState?.isRealtimeActive || false;
  const providerActiveOrder = (providerState?.activeRealtimeOrder as OrderRealTime) ?? null;
  const clientId = data?.me?.id ?? null;

  useEffect(() => {
    const p = activeOrder?.provider;
    const prov = providerState;
    if (p || prov) {
      console.log(
        '[TRACE:QUERY] GetMyRealtimeState | activeOrder.provider:', (p as any)?.name,
        '| logoImage.cdnUrl:', (p as any)?.logoImage?.cdnUrl,
      );
    }
  }, [data]);

  const clientOrders: OrderRealTime[] = clientOrdersData?.myRealtimeOrdersAsClient ?? [];

  const [localActiveOrder, _setLocalActiveOrder] = useState<OrderRealTime | null>(null);

  useEffect(() => {
    if (!activeOrder && localActiveOrder) {
      const TERMINAL = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
      if (TERMINAL.includes(localActiveOrder.status)) {
        return;
      }
      const match = clientOrders.find((o: any) => o.id === localActiveOrder.id);
      if (match && TERMINAL.includes(match.status)) {
        _setLocalActiveOrder(match);
        return;
      }
    }
    if (activeOrder !== localActiveOrder) {
      _setLocalActiveOrder(activeOrder);
    }
  }, [activeOrder, clientOrders]);

  const setLocalActiveOrder: React.Dispatch<React.SetStateAction<OrderRealTime | null>> = (value) => {
    _setLocalActiveOrder(value);
  };

  useEffect(() => {
    if (!token) {
      setSocketStatus('disconnected');
      return;
    }

    setSocketStatus('connecting');

    const socket = io(`${ENDPOINT.replace(/\/$/, '')}/find`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketStatus('connected');
      setSocketLogIdentifiers(socket.id || '', String(clientId ?? ''));
      logSocketIn('connect', { socketId: socket.id });
      refetch();
      refetchClientOrders();
    });

    socket.on('connect_error', (err) => {
      setSocketStatus('error');
      logSocketIn('connect_error', { message: err.message });
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      setSocketStatus('disconnected');
      logSocketIn('disconnect', { reason });
    });

    socket.on('reconnect_attempt', () => {
      setSocketStatus('connecting');
      logSocketIn('reconnect_attempt');
    });

    socket.on('order-realtime:created', (payload) => {
      logSocketIn('order-realtime:created', payload);
      refetch();
      refetchClientOrders();
      if (role === 'provider') {
        showNotification({ title: 'Nueva Solicitud', message: 'Tienes una nueva solicitud de servicio', type: 'info' });
      }
    });

    socket.on('order-realtime:updated', (payload: { orderRealtimeId: number; status: string }) => {
      logSocketIn('order-realtime:updated', payload);
      
      if (payload.status === 'PROVIDER_ON_THE_WAY' && role === 'client') {
        showNotification({ title: 'Proveedor en camino', message: 'El profesional va hacia tu ubicación.', type: 'info' });
      } else if (payload.status === 'ARRIVED' && role === 'client') {
        showNotification({ title: 'Proveedor ha llegado', message: 'El profesional se encuentra en tu ubicación.', type: 'success' });
      } else if (payload.status === 'COMPLETED') {
        showNotification({ title: 'Servicio Finalizado', message: 'El servicio ha sido completado exitosamente.', type: 'success' });
      } else if (payload.status === 'CANCELLED') {
        showNotification({ title: 'Servicio Cancelado', message: 'El servicio ha sido cancelado.', type: 'error' });
      } else if (payload.status === 'REJECTED' && role === 'client') {
        showNotification({ title: 'Oferta Rechazada', message: 'El profesional ha rechazado tu solicitud.', type: 'error' });
      } else if (payload.status === 'ACCEPTED' && role === 'provider') {
        showNotification({ title: 'Servicio Aceptado', message: 'El cliente ha aceptado el trato.', type: 'success' });
      } else if (payload.status === 'NEGOTIATING' && role === 'client') {
        showNotification({ title: 'Cotización Recibida', message: 'El profesional ha enviado una cotización.', type: 'info' });
      }

      const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
      if (TERMINAL_STATUSES.includes(payload.status)) {
        _setLocalActiveOrder((prev: any) => {
          if (prev && prev.id === payload.orderRealtimeId) {
            return { ...prev, status: payload.status };
          }
          return prev;
        });
      }
      
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
      refetchTimerRef.current = setTimeout(() => {
        refetch();
        refetchClientOrders();
      }, 500);
    });

    socket.on('order-realtime:location-updated', (payload: {
      orderRealtimeId: number;
      clientLat: number;
      clientLng: number;
      providerLat: number | null;
      providerLng: number | null;
    }) => {
      logSocketIn('order-realtime:location-updated', payload);
      setLocalActiveOrder((prev) => {
        if (!prev || prev.id !== payload.orderRealtimeId) return prev;
        return {
          ...prev,
          clientLat: payload.clientLat,
          clientLng: payload.clientLng,
          providerLat: payload.providerLat ?? prev.providerLat,
          providerLng: payload.providerLng ?? prev.providerLng,
        };
      });

      try {
        apolloClient.cache.modify({
          id: `OrderRealTime:${payload.orderRealtimeId}`,
          fields: {
            clientLat: () => payload.clientLat,
            clientLng: () => payload.clientLng,
            providerLat: (existing: number | null) => payload.providerLat ?? existing,
            providerLng: (existing: number | null) => payload.providerLng ?? existing,
          },
        });
      } catch {}
    });

    socket.on('chat:received', (payload) => {
      logSocketIn('chat:received', payload);
      // Optional: Solo notificar si no estamos con el panel abierto o similares
    });

    socket.on('provider:realtime:status', (payload) => {
      logSocketIn('provider:realtime:status', payload);
      refetch();
    });

    socket.on('provider:location-updated', (payload) => {
      logSocketIn('provider:location-updated', payload);
      refetch();
    });

    socket.on('provider:disconnected', (payload: { orderRealtimeId: number }) => {
      logSocketIn('provider:disconnected', payload);
      if (role === 'client') {
        showNotification({ title: 'Proveedor desconectado', message: 'El proveedor ha perdido la conexión.', type: 'error' });
      }
      refetch();
      refetchClientOrders();
    });

    socket.on('provider:connect-requested', (payload) => {
      logSocketIn('provider:connect-requested', payload);
      refetch();
    });

    const appStateHandler = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && socketRef.current?.disconnected) {
        logSocketOut('reconnect_manual', { reason: 'app_foreground' });
        socketRef.current.connect();
      }
    };
    const appStateSub = AppState.addEventListener('change', appStateHandler);

    return () => {
      appStateSub.remove();
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketStatus('disconnected');
    };
  }, [token, refetch, refetchClientOrders, apolloClient, clientId]);

  const toggleAvailability = useCallback(
    (active: boolean, lat?: number | null, lng?: number | null) => {
      setAvailability({ variables: { active, lat, lng } });
    },
    [setAvailability],
  );

  const updateProviderLocation = useCallback(
    async (lat: number, lng: number) => {
      await updateProviderLocMut({ variables: { lat, lng } });
    },
    [updateProviderLocMut],
  );

  useEffect(() => {
    if (!isRealtimeActive) return;

    let watchId: number | null = null;

    try {
      watchId = Geolocation.watchPosition(
        (position) => {
          updateProviderLocation(
            position.coords.latitude,
            position.coords.longitude,
          ).catch(() => {});
        },
        () => {},
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 5000,
          fastestInterval: 2000,
        },
      );
    } catch (_) {}

    return () => {
      if (watchId != null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [isRealtimeActive, updateProviderLocation]);

  const createContactRequest = useCallback(
    async (input: CreateContactInput) => {
      const { data: result } = await createContactMut({
        variables: {
          input: {
            serviceProviderId: Number(input.serviceProviderId),
            clientDescription: input.description || undefined,
            clientLat: Number(input.lat),
            clientLng: Number(input.lng),
            clientAddress: input.clientAddress || undefined,
          },
        },
      });
      return result!.createRealtimeContactRequest;
    },
    [createContactMut],
  );

  const quoteOrder = useCallback(
    async (params: QuoteInput) => {
      await quoteMut({ variables: params });
    },
    [quoteMut],
  );

  const updateQuote = useCallback(
    async (params: QuoteInput) => {
      await updateQuoteMut({ variables: params });
    },
    [updateQuoteMut],
  );

  const acceptQuote = useCallback(
    async (orderRealtimeId: number) => {
      await acceptQuoteMut({
        variables: { orderRealtimeId },
      });
    },
    [acceptQuoteMut],
  );

  const rejectQuote = useCallback(
    async (orderRealtimeId: number) => {
      await rejectQuoteMut({
        variables: { orderRealtimeId },
      });
    },
    [rejectQuoteMut],
  );

  const respondRequest = useCallback(
    async (orderRealtimeId: number, decision: string) => {
      await respondMut({
        variables: { orderRealtimeId, decision },
      });
    },
    [respondMut],
  );

  const startOrder = useCallback(
    async (orderRealtimeId: number) => {
      await startMut({ variables: { orderRealtimeId } });
      refetch();
      refetchClientOrders();
    },
    [startMut, refetch, refetchClientOrders],
  );

  const finishOrder = useCallback(
    async (orderRealtimeId: number) => {
      await finishMut({ variables: { orderRealtimeId } });
      refetch();
      refetchClientOrders();
    },
    [finishMut, refetch, refetchClientOrders],
  );

  const cancellingRef = useRef(false);

  const cancelOrder = useCallback(
    async (orderRealtimeId: number) => {
      cancellingRef.current = true;
      await cancelMut({ variables: { orderRealtimeId } });
      refetch();
      refetchClientOrders();
      setTimeout(() => { cancellingRef.current = false; }, 1000);
    },
    [cancelMut, refetch, refetchClientOrders],
  );

  const updateLocation = useCallback(
    async (orderRealtimeId: number, lat: number, lng: number) => {
      await updateLocMut({
        variables: { orderRealtimeId, lat, lng },
      });
    },
    [updateLocMut],
  );

  useEffect(() => {
    const order = localActiveOrder ?? activeOrder;
    if (!order || !order.id) return;
    if (order.status !== 'ACCEPTED' && order.status !== 'IN_PROGRESS') return;

    let watchId: number | null = null;
    const lastSentRef = { current: 0 };

    try {
      watchId = Geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          if (now - lastSentRef.current < 4000) return;
          lastSentRef.current = now;
          updateLocation(
            order.id,
            position.coords.latitude,
            position.coords.longitude,
          ).catch(() => {});
        },
        () => {},
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 5000,
          fastestInterval: 2000,
        },
      );
    } catch (_) {}

    return () => {
      if (watchId != null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [localActiveOrder?.status, activeOrder?.status, updateLocation, localActiveOrder?.id, activeOrder?.id]);

  const initPayment = useCallback(
    async (orderRealtimeId: number, returnUrl: string) => {
      const { data: result } = await initPayMut({
        variables: { orderRealtimeId, returnUrl },
      });
      return result!.initRealtimeFlowPayment;
    },
    [initPayMut],
  );

  const confirmPayment = useCallback(
    async (paymentToken: string) => {
      const { data: result } = await confirmPayMut({
        variables: { token: paymentToken },
      });
      return result!.confirmRealtimeFlowPayment;
    },
    [confirmPayMut],
  );

  const sendMessage = useCallback(
    async (orderRealtimeId: number, message: string) => {
      const { data: result } = await sendMsgMut({
        variables: { orderRealtimeId, message },
      });
      return result!.sendMessage;
    },
    [sendMsgMut],
  );

  const createProviderReview = useCallback(
    async (input: ProviderReviewInput) => {
      await reviewProviderMut({ variables: { input } });
      refetch();
    },
    [reviewProviderMut, refetch],
  );

  const createClientReview = useCallback(
    async (input: ClientReviewInput) => {
      await reviewClientMut({ variables: { input } });
      refetch();
    },
    [reviewClientMut, refetch],
  );

  const requestProviderToConnect = useCallback(
    async (serviceProviderId: number) => {
      await connectMut({ variables: { serviceProviderId } });
    },
    [connectMut],
  );

  const guestCreateContactRequest = useCallback(
    async (input: GuestCreateRealtimeOrderInput) => {
      const { data: result } = await guestCreateContactMut({
        variables: { input },
      });
      return result!.guestCreateRealtimeContactRequest;
    },
    [guestCreateContactMut],
  );

  const clientCounterOffer = useCallback(
    async (orderRealtimeId: number, quotedPrice: number, quotedHours: number, quotedTransport: number) => {
      const { data: result } = await counterOfferMut({
        variables: {
          input: { orderRealtimeId, quotedPrice, quotedHours, quotedTransport },
        },
      });
      return (result as any)!.clientCounterOfferRealtimeOrder;
    },
    [counterOfferMut],
  );

  const respondToCounterOffer = useCallback(
    async (orderRealtimeId: number, decision: string) => {
      const { data: result } = await respondCounterOffMut({
        variables: { orderRealtimeId, decision },
      });
      return (result as any)!.respondToCounterOffer;
    },
    [respondCounterOffMut],
  );

  return {
    loading,
    activeOrder,
    localActiveOrder,
    setLocalActiveOrder,
    cancellingRef,
    clientOrders,
    providerState,
    isRealtimeActive,
    socketStatus,
    providerActiveOrder,
    clientId,
    refetch,
    toggleAvailability,
    createContactRequest,
    quoteOrder,
    updateQuote,
    acceptQuote,
    rejectQuote,
    respondRequest,
    startOrder,
    finishOrder,
    cancelOrder,
    updateLocation,
    updateProviderLocation,
    initPayment,
    confirmPayment,
    sendMessage,
    createProviderReview,
    createClientReview,
    requestProviderToConnect,
    guestCreateContactRequest,
    clientCounterOffer,
    respondToCounterOffer,
    socketRef,
  };
}
