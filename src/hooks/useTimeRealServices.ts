import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
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
import { startLocationTracking, stopLocationTracking } from '../native/locationTracker';
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
  PAY_REALTIME_ORDER_WITH_SAVED_CARD,
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

const TERMINAL_ORDER_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

export interface UseTimeRealServicesReturn {  loading: boolean;
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
  payWithSavedCard: (orderRealtimeId: number) => Promise<OrderRealTime>;
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
  const { role, setRole } = useRole();
  const { showNotification } = useNotification();
  const apolloClient = useApolloClient();
  const socketRef = useRef<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationTsRef = useRef<Record<string, number>>({});

  // El efecto de conexión del socket (más abajo) no depende de `role`/`showNotification`
  // para no forzar una reconexión cada vez que el usuario cambia de modo cliente/proveedor.
  // Los handlers leen estos refs (siempre al día) en vez de cerrar sobre los valores
  // vigentes al momento de crear el socket.
  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const notifyRef = useRef(showNotification);
  useEffect(() => {
    notifyRef.current = showNotification;
  }, [showNotification]);

  const { data, loading, refetch } = useQuery<RealtimeStateData>(
    GET_MY_REALTIME_STATE,
    {
      pollInterval: socketStatus === 'connected' ? 0 : 15000,
      fetchPolicy: socketStatus === 'connected' ? 'cache-first' : 'cache-and-network',
      skip: !token,
    },
  );

  const {
    data: clientOrdersData,
    refetch: refetchClientOrders,
  } = useQuery<any>(GET_MY_REALTIME_ORDERS_AS_CLIENT, {
    pollInterval: socketStatus === 'connected' ? 0 : 30000,
    fetchPolicy: socketStatus === 'connected' ? 'cache-first' : 'cache-and-network',
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
  const [finishMut] = useMutation(FINISH_REALTIME_ORDER, {
    refetchQueries: ['MyWallet'],
  });
  const [cancelMut] = useMutation(CANCEL_REALTIME_ORDER);
  const [updateLocMut] = useMutation(UPDATE_REALTIME_ORDER_LOCATION);
  const [initPayMut] = useMutation<{ initRealtimeFlowPayment: RealtimePaymentInitResponse }>(INIT_REALTIME_FLOW_PAYMENT);
  const [confirmPayMut] = useMutation<{ confirmRealtimeFlowPayment: { id: number; status: string } }>(CONFIRM_REALTIME_FLOW_PAYMENT);
  const [paySavedCardMut] = useMutation<{ payRealtimeOrderWithSavedCard: OrderRealTime }>(PAY_REALTIME_ORDER_WITH_SAVED_CARD);
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

  const [localActiveOrder, _setLocalActiveOrder] = useState<OrderRealTime | null>(null);
  const [localProviderActiveOrder, _setLocalProviderActiveOrder] = useState<OrderRealTime | null>(null);

  const activeOrder = (data?.me?.activeRealtimeOrder as OrderRealTime) ?? null;
  const providerState = data?.me?.provider ?? null;
  const isRealtimeActive = providerState?.isRealtimeActive || false;
  const providerActiveOrder = localProviderActiveOrder ?? ((providerState?.activeRealtimeOrder as OrderRealTime) ?? null);
  const clientId = data?.me?.id ?? null;

  useEffect(() => {
    if (!__DEV__) return;
    console.log(
      `[RT:DOMAIN] role=${role} clientOrderId=${activeOrder?.id ?? 'null'} providerOrderId=${providerActiveOrder?.id ?? 'null'} status=${activeOrder?.status ?? providerActiveOrder?.status ?? 'null'} hasProvider=${!!activeOrder?.provider} hasServiceProvider=${!!activeOrder?.serviceProvider}`,
    );
  }, [role, activeOrder?.id, activeOrder?.status, activeOrder?.provider, activeOrder?.serviceProvider, providerActiveOrder?.id, providerActiveOrder?.status]);

  // Auto-switch de modo: si llega una orden realtime activa como provider y estamos
  // en modo cliente, pasamos a modo proveedor.
  // Al terminar la orden: si el proveedor sigue activo en tiempo real (isRealtimeActive === true),
  // se mantiene en modo proveedor. Solo si NO está activo en tiempo real vuelve a modo cliente.
  const autoProviderOrderRef = useRef<number | null>(null);

  useEffect(() => {
    if (!providerActiveOrder) {
      if (autoProviderOrderRef.current !== null && role === 'provider') {
        autoProviderOrderRef.current = null;
        if (!isRealtimeActive) {
          setRole('client');
        }
      }
      return;
    }
    if (TERMINAL_ORDER_STATUSES.includes(providerActiveOrder.status)) {
      if (autoProviderOrderRef.current === providerActiveOrder.id && role === 'provider') {
        autoProviderOrderRef.current = null;
        if (!isRealtimeActive) {
          setRole('client');
        }
      }
      return;
    }
    if (autoProviderOrderRef.current === providerActiveOrder.id) return;
    if (role === 'provider') return;
    autoProviderOrderRef.current = providerActiveOrder.id;
    setRole('provider');
  }, [providerActiveOrder, isRealtimeActive, role, setRole]);

  useEffect(() => {
    if (!__DEV__) return;
    const p = activeOrder?.provider;
    const prov = providerState;
    if (p || prov) {
      console.log(
        '[TRACE:QUERY] GetMyRealtimeState | activeOrder.provider:', (p as any)?.name,
        '| logoImage.cdnUrl:', (p as any)?.logoImage?.cdnUrl,
      );
    }
  }, [data]);

  const clientOrders: OrderRealTime[] = useMemo(
    () => clientOrdersData?.myRealtimeOrdersAsClient ?? [],
    [clientOrdersData],
  );

  useEffect(() => {
    const TERMINAL = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

    // El socket es la fuente de verdad de una orden viva: mientras haya una
    // localActiveOrder no debe pisarse con el snapshot del poll (que puede estar
    // más atrasado). El poll solo la inicializa (null) y adopta estados terminales.
    if (localActiveOrder) {
      const pollOrder = activeOrder;
      if (pollOrder && pollOrder.id === localActiveOrder.id) {
        const needsUpdate =
          pollOrder.status !== localActiveOrder.status ||
          localActiveOrder.quotedPrice !== pollOrder.quotedPrice ||
          localActiveOrder.counterOfferPrice !== pollOrder.counterOfferPrice ||
          localActiveOrder.counterOfferHours !== pollOrder.counterOfferHours ||
          localActiveOrder.counterOfferTransport !== pollOrder.counterOfferTransport;

        if (needsUpdate) {
          _setLocalActiveOrder((prev: any) => {
            if (!prev) return pollOrder;
            if (TERMINAL.includes(prev.status)) return prev;
            return {
              ...pollOrder,
              clientLat: prev.clientLat ?? pollOrder.clientLat,
              clientLng: prev.clientLng ?? pollOrder.clientLng,
              providerLat: prev.providerLat ?? pollOrder.providerLat,
              providerLng: prev.providerLng ?? pollOrder.providerLng,
            };
          });
        }
      } else if (pollOrder && pollOrder.id !== localActiveOrder.id) {
        _setLocalActiveOrder(pollOrder);
      } else {
        // El poll dejó de reportar esta orden: si clientOrders la marca terminal, la
        // cerramos; en caso contrario la mantenemos viva (evita el null-clear de R2).
        const match = clientOrders.find((o: any) => o.id === localActiveOrder.id);
        if (match && TERMINAL.includes(match.status)) {
          _setLocalActiveOrder(match);
        } else if (!pollOrder && !TERMINAL.includes(localActiveOrder.status)) {
          // Si el poll ya no la reporta ni está en clientOrders activa, se asume cerrada/nula
          _setLocalActiveOrder(null);
        }
      }
      return;
    }

    // Sin orden local viva: bootstrap desde el poll.
    if (activeOrder) {
      _setLocalActiveOrder(activeOrder);
    }
  }, [activeOrder, clientOrders, localActiveOrder]);

  useEffect(() => {
    const TERMINAL = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
    const pollOrder = providerState?.activeRealtimeOrder as OrderRealTime | null;

    if (localProviderActiveOrder) {
      if (pollOrder && pollOrder.id === localProviderActiveOrder.id) {
        const needsUpdate =
          pollOrder.status !== localProviderActiveOrder.status ||
          localProviderActiveOrder.quotedPrice !== pollOrder.quotedPrice ||
          localProviderActiveOrder.counterOfferPrice !== pollOrder.counterOfferPrice ||
          localProviderActiveOrder.counterOfferHours !== pollOrder.counterOfferHours ||
          localProviderActiveOrder.counterOfferTransport !== pollOrder.counterOfferTransport ||
          localProviderActiveOrder.clientDescription !== pollOrder.clientDescription;

        if (needsUpdate) {
          _setLocalProviderActiveOrder((prev: any) => {
            if (!prev) return pollOrder;
            if (TERMINAL.includes(prev.status)) return prev;
            return {
              ...pollOrder,
              clientLat: prev.clientLat ?? pollOrder.clientLat,
              clientLng: prev.clientLng ?? pollOrder.clientLng,
              providerLat: prev.providerLat ?? pollOrder.providerLat,
              providerLng: prev.providerLng ?? pollOrder.providerLng,
            };
          });
        }
      } else if (pollOrder && pollOrder.id !== localProviderActiveOrder.id) {
        _setLocalProviderActiveOrder(pollOrder);
      } else if (!pollOrder && !TERMINAL.includes(localProviderActiveOrder.status)) {
        _setLocalProviderActiveOrder(null);
      }
      return;
    }

    if (pollOrder) {
      _setLocalProviderActiveOrder(pollOrder);
    }
  }, [providerState?.activeRealtimeOrder, localProviderActiveOrder]);

  const setLocalActiveOrder = useCallback<React.Dispatch<React.SetStateAction<OrderRealTime | null>>>(
    (value) => {
      _setLocalActiveOrder(value);
    },
    [],
  );

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
      if (__DEV__) console.log(`[RT:EVENT] source=BOOT type=socket_connect orderId=null status=null role=${roleRef.current}`);
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
      if (__DEV__) console.log(`[RT:EVENT] source=SOCKET type=order-realtime:created orderId=${payload?.orderRealtimeId ?? payload?.id ?? 'null'} status=${payload?.status ?? 'null'} role=${roleRef.current}`);
      refetch();
      refetchClientOrders();
      if (roleRef.current === 'provider') {
        notifyRef.current({ title: 'Nueva Solicitud', message: 'Tienes una nueva solicitud de servicio', type: 'info' });
      }
    });

    socket.on('order-realtime:updated', (payload: { orderRealtimeId: number; status: string }) => {
      logSocketIn('order-realtime:updated', payload);
      if (__DEV__) console.log(`[RT:EVENT] source=SOCKET type=order-realtime:updated orderId=${payload.orderRealtimeId} status=${payload.status} role=${roleRef.current}`);
      
      const currentRole = roleRef.current;
      if (payload.status === 'PROVIDER_ON_THE_WAY' && currentRole === 'client') {
        notifyRef.current({ title: 'Proveedor en camino', message: 'El profesional va hacia tu ubicación.', type: 'info' });
      } else if (payload.status === 'ARRIVED' && currentRole === 'client') {
        notifyRef.current({ title: 'Proveedor ha llegado', message: 'El profesional se encuentra en tu ubicación.', type: 'success' });
      } else if (payload.status === 'COMPLETED') {
        notifyRef.current({ title: 'Servicio Finalizado', message: 'El servicio ha sido completado exitosamente.', type: 'success' });
      } else if (payload.status === 'CANCELLED') {
        notifyRef.current({
          title: 'Servicio Cancelado',
          message: currentRole === 'provider' ? 'El cliente ha cancelado la orden.' : 'El servicio ha sido cancelado.',
          type: 'error',
        });
      } else if (payload.status === 'REJECTED' && currentRole === 'client') {
        notifyRef.current({ title: 'Oferta Rechazada', message: 'El profesional ha rechazado tu solicitud.', type: 'error' });
      } else if (payload.status === 'ACCEPTED' && currentRole === 'provider') {
        notifyRef.current({ title: 'Servicio Aceptado', message: 'El cliente ha aceptado el trato.', type: 'success' });
      } else if (payload.status === 'NEGOTIATING' && currentRole === 'client') {
        notifyRef.current({ title: 'Cotización Recibida', message: 'El profesional ha enviado una cotización.', type: 'info' });
      }

      _setLocalActiveOrder((prev: any) => {
        if (prev && prev.id === payload.orderRealtimeId) {
          return { ...prev, status: payload.status };
        }
        return prev;
      });

      _setLocalProviderActiveOrder((prev: any) => {
        if (prev && prev.id === payload.orderRealtimeId) {
          return { ...prev, status: payload.status };
        }
        return prev;
      });
      
      try {
        apolloClient.cache.modify({
          id: `OrderRealTime:${payload.orderRealtimeId}`,
          fields: {
            status: () => payload.status,
          },
        });
      } catch {}

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
      timestamp?: number;
      source?: 'client' | 'provider';
    }) => {
      logSocketIn('order-realtime:location-updated', payload);

      const sourceKey = payload.source || 'default';
      const actorKey = `${payload.orderRealtimeId}:${sourceKey}`;

      // Guard de recencia client-side por actor: descarta eventos obsoletos del mismo actor sin bloquear al otro.
      if (payload.timestamp && Number.isFinite(payload.timestamp)) {
        const prev = locationTsRef.current[actorKey] ?? 0;
        if (payload.timestamp <= prev) return;
        locationTsRef.current[actorKey] = payload.timestamp;
      }

      if (__DEV__) {
        console.log(`[RT:SOCKET_LOCATION_RECEIVED] receiverRole=${roleRef.current} source=${sourceKey} orderId=${payload.orderRealtimeId} clientLat=${payload.clientLat} clientLng=${payload.clientLng} providerLat=${payload.providerLat} providerLng=${payload.providerLng}`);
      }

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

      _setLocalProviderActiveOrder((prev: any) => {
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

    socket.on('provider:location-updated', (payload: { providerId: number; lat: number; lng: number; timestamp?: number }) => {
      logSocketIn('provider:location-updated', payload);
      if (!payload?.providerId) return;
      try {
        apolloClient.cache.modify({
          id: `Provider:${payload.providerId}`,
          fields: {
            lat: () => payload.lat,
            lng: () => payload.lng,
          },
        });
      } catch {}
    });

    socket.on('provider:disconnected', (payload: { orderRealtimeId: number }) => {
      logSocketIn('provider:disconnected', payload);
      if (roleRef.current === 'client') {
        notifyRef.current({ title: 'Proveedor desconectado', message: 'El proveedor ha perdido la conexión.', type: 'error' });
      }
      refetch();
      refetchClientOrders();
    });

    socket.on('provider:connect-requested', (payload) => {
      logSocketIn('provider:connect-requested', payload);
      refetch();
    });

    const appStateHandler = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && socketRef.current) {
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
      return setAvailability({ variables: { active, lat, lng } });
    },
    [setAvailability],
  );

  const updateProviderLocation = useCallback(
    async (lat: number, lng: number, timestamp?: number) => {
      await updateProviderLocMut({
        variables: { lat, lng, timestamp: timestamp ?? undefined },
      });
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
            position.timestamp,
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
      if (__DEV__) console.log(`[RT:EVENT] source=CREATE_REQUEST type=start orderId=null status=null role=${roleRef.current}`);
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
      const order = result!.createRealtimeContactRequest;
      if (__DEV__) console.log(`[RT:EVENT] source=CREATE_REQUEST type=result orderId=${order.id} status=${order.status} role=${roleRef.current}`);
      await refetch();
      await refetchClientOrders();
      return result!.createRealtimeContactRequest;
    },
    [createContactMut, refetch, refetchClientOrders],
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
      if (__DEV__) console.log(`[RT:CANCEL_START] orderId=${orderRealtimeId} role=${roleRef.current}`);
      cancellingRef.current = true;
      _setLocalActiveOrder((prev: any) => (prev?.id === orderRealtimeId ? { ...prev, status: 'CANCELLED' } : prev));
      _setLocalProviderActiveOrder((prev: any) => (prev?.id === orderRealtimeId ? { ...prev, status: 'CANCELLED' } : prev));
      try {
        const { data: cancelResult } = await cancelMut({ variables: { orderRealtimeId } });
        const result = (cancelResult as any)?.cancelRealtimeOrder;
        if (__DEV__) console.log(`[RT:CANCEL_RESULT] orderId=${result?.id ?? orderRealtimeId} status=${result?.status ?? 'unknown'} role=${roleRef.current}`);
      } catch (err) {
        if (__DEV__) console.warn('[RT:CANCEL_ERROR]', err);
        throw err;
      } finally {
        refetch();
        refetchClientOrders();
        setTimeout(() => { cancellingRef.current = false; }, 1000);
      }
    },
    [cancelMut, refetch, refetchClientOrders],
  );

  const updateLocation = useCallback(
    async (orderRealtimeId: number, lat: number, lng: number, timestamp?: number) => {
      await updateLocMut({
        variables: { orderRealtimeId, lat, lng, timestamp: timestamp ?? undefined },
      });
    },
    [updateLocMut],
  );

  const trackingOrder = role === 'provider'
    ? (localProviderActiveOrder ?? (providerState?.activeRealtimeOrder as OrderRealTime | null))
    : (localActiveOrder ?? activeOrder);

  const trackingOrderId = trackingOrder?.id ?? null;
  const trackingOrderStatus = trackingOrder?.status ?? null;

  useEffect(() => {
    if (!trackingOrderId) return;
    if (trackingOrderStatus !== 'ACCEPTED' && trackingOrderStatus !== 'IN_PROGRESS') return;

    let watchId: number | null = null;
    const lastSentRef = { current: 0 };

    // Foreground service (Android) que mantiene vivo el proceso para que este
    // watchPosition siga reportando la ubicación con la app en segundo plano.
    startLocationTracking();

    // iOS: recién acá pedimos "Always" (justificado en contexto: el proveedor empezó a
    // trackear una orden en curso), nunca al arrancar la app. Sin este permiso, iOS pausa
    // el watchPosition apenas la app pasa a background. Nunca se dispara para un cliente.
    if (Platform.OS === 'ios' && roleRef.current === 'provider') {
      Geolocation.requestAuthorization?.('always')?.catch?.(() => {});
    }

    try {
      watchId = Geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          if (now - lastSentRef.current < 4000) return;
          lastSentRef.current = now;
          if (__DEV__) {
            console.log(`[RT:LOCATION_SEND] actor=${roleRef.current} orderId=${trackingOrderId} lat=${position.coords.latitude} lng=${position.coords.longitude} ts=${position.timestamp}`);
          }
          updateLocation(
            trackingOrderId,
            position.coords.latitude,
            position.coords.longitude,
            position.timestamp,
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
      if (__DEV__) {
        console.log(`[RT:ORDER_GPS_START] actor=${roleRef.current} orderId=${trackingOrderId} watchId=${watchId}`);
      }
    } catch (_) {}

    return () => {
      if (watchId != null) {
        if (__DEV__) {
          console.log(`[RT:ORDER_GPS_STOP] actor=${roleRef.current} orderId=${trackingOrderId} watchId=${watchId}`);
        }
        Geolocation.clearWatch(watchId);
      }
      stopLocationTracking();
    };
  }, [role, trackingOrderId, trackingOrderStatus, updateLocation]);

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

  const payWithSavedCard = useCallback(
    async (orderRealtimeId: number) => {
      const { data: result } = await paySavedCardMut({
        variables: { orderRealtimeId },
      });
      await refetch();
      await refetchClientOrders();
      return result!.payRealtimeOrderWithSavedCard;
    },
    [paySavedCardMut, refetch, refetchClientOrders],
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

  return useMemo(
    () => ({
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
      payWithSavedCard,
      sendMessage,
      createProviderReview,
      createClientReview,
      requestProviderToConnect,
      guestCreateContactRequest,
      clientCounterOffer,
      respondToCounterOffer,
      socketRef,
    }),
    [
      loading,
      activeOrder,
      localActiveOrder,
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
      payWithSavedCard,
      sendMessage,
      createProviderReview,
      createClientReview,
      requestProviderToConnect,
      guestCreateContactRequest,
      clientCounterOffer,
      respondToCounterOffer,
      setLocalActiveOrder,
    ],
  );
}

