import type { CreateRealtimeOrderInput, GuestCreateRealtimeOrderInput, MutationQuoteRealtimeOrderArgs, CreateRealtimeProviderReviewInput, CreateClientReviewInput } from '../graphql/generated';
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { io, Socket } from 'socket.io-client';
import { ENDPOINT } from '../config/endpoints';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useNotification } from '../context/NotificationContext';
import { logSocketIn, logSocketOut, setSocketLogIdentifiers } from '../utils/socketLogger';
import { startLocationTracking, stopLocationTracking } from '../native/locationTracker';
import { locationSimulator } from '../dev/joystick/locationSimulator';
import { getOrCreateDeviceId, getCachedDeviceId } from '../utils/deviceId';

const REVIEWED_ORDERS_STORAGE_KEY = '@tratofacil:reviewed_orders';

export interface DeviceConflictData {
  orderRealtimeId: number;
  currentActiveDeviceId?: string;
  message?: string;
}
import {
  GET_MY_REALTIME_STATE,
  GET_MY_REALTIME_ORDERS_AS_CLIENT,
  GET_MY_REALTIME_ORDERS_AS_PROVIDER,
  SET_MY_REALTIME_AVAILABILITY,
  CREATE_REALTIME_CONTACT_REQUEST,
  QUOTE_REALTIME_ORDER,
  UPDATE_REALTIME_QUOTE,
  ACCEPT_REALTIME_ORDER_QUOTE,
  REJECT_REALTIME_ORDER_QUOTE,
  RESPOND_REALTIME_CONTACT_REQUEST,
  CONFIRM_REALTIME_ARRIVAL,
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
} from '../graphql/generated';

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

type CreateRealtimeOrderInput_old = {
  serviceProviderId: number;
  description?: string;
  clientLat: number;
  clientLng: number;
  clientAddress?: string;
}

type GuestCreateRealtimeOrderInput_old = {
  guestEmail: string;
  guestPhone: string;
  guestName?: string;
  serviceProviderId: number;
  clientLat: number;
  clientLng: number;
  clientAddress?: string;
  clientDescription?: string;
}

type MutationQuoteRealtimeOrderArgs_old = {
  orderRealtimeId: number;
  quotedPrice: number;
  quotedHours: number;
  quotedTransport: number;
}

type CreateRealtimeProviderReviewInput_old = {
  rating: number;
  comment?: string;
  orderRealtimeId: number;
  providerId: number;
}

type CreateClientReviewInput_old = {
  rating: number;
  comment?: string;
  orderRealtimeId: number;
  clientId: number;
}

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const TERMINAL_ORDER_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

const ORDER_STATUS_PROGRESSION: Record<string, number> = {
  PENDING: 1,
  QUOTED: 2,
  PAYMENT_PENDING: 3,
  ACCEPTED: 4,
  ARRIVED: 5,
  IN_PROGRESS: 6,
  COMPLETED: 7,
  REJECTED: 8,
  CANCELLED: 8,
  EXPIRED: 8,
};

export interface UseTimeRealServicesReturn {  loading: boolean;
  activeOrder: OrderRealTime | null;
  localActiveOrder: OrderRealTime | null;
  setLocalActiveOrder: React.Dispatch<React.SetStateAction<OrderRealTime | null>>;
  setLocalProviderActiveOrder: React.Dispatch<React.SetStateAction<OrderRealTime | null>>;
  cancellingRef: React.MutableRefObject<boolean>;
  clientOrders: OrderRealTime[];
  providerOrders: OrderRealTime[];
  providerState: RealtimeStateData['me']['provider'];
  isRealtimeActive: boolean;
  providerActiveOrder: OrderRealTime | null;
  socketStatus: SocketStatus;
  connectionGeneration: number;
  clientId: number | null;
  refetch: () => void;
  toggleAvailability: (active: boolean, lat?: number | null, lng?: number | null) => void;
  updateProviderLocation: (clientLat: number, clientLng: number) => Promise<void>;
  createContactRequest: (input: CreateRealtimeOrderInput) => Promise<{ id: number; status: string }>;
  quoteOrder: (params: MutationQuoteRealtimeOrderArgs) => Promise<void>;
  updateQuote: (params: MutationQuoteRealtimeOrderArgs) => Promise<void>;
  acceptQuote: (orderRealtimeId: number) => Promise<void>;
  rejectQuote: (orderRealtimeId: number) => Promise<void>;
  respondRequest: (orderRealtimeId: number, decision: string) => Promise<void>;
  confirmArrival: (orderRealtimeId: number, lat?: number, lng?: number) => Promise<any>;
  startOrder: (orderRealtimeId: number) => Promise<void>;
  finishOrder: (orderRealtimeId: number) => Promise<void>;
  cancelOrder: (orderRealtimeId: number) => Promise<void>;
  updateLocation: (orderRealtimeId: number, clientLat: number, clientLng: number) => Promise<void>;
  initPayment: (orderRealtimeId: number, returnUrl: string) => Promise<RealtimePaymentInitResponse>;
  confirmPayment: (token: string) => Promise<{ id: number; status: string }>;
  payWithSavedCard: (orderRealtimeId: number) => Promise<OrderRealTime>;
  sendMessage: (orderRealtimeId: number, message: string) => Promise<ChatMessageEntity>;
  createProviderReview: (input: CreateRealtimeProviderReviewInput) => Promise<void>;
  createClientReview: (input: CreateClientReviewInput) => Promise<void>;
  isOrderReviewed: (orderId: number) => boolean;
  markOrderReviewed: (orderId: number) => void;
  requestProviderToConnect: (serviceProviderId: number) => Promise<void>;
  subscribe: (event: string, handler: (...args: any[]) => void) => () => void;
  joinChat: (orderRealtimeId: number) => void;
  leaveChat: (orderRealtimeId: number) => void;
  socketRef: React.MutableRefObject<Socket | null>;
  guestCreateContactRequest: (input: GuestCreateRealtimeOrderInput) => Promise<{
    order: { id: number; status: string };
    accessToken: string;
    user: { id: number; displayName?: string; email?: string; phone?: string };
  }>;
  clientCounterOffer: (orderRealtimeId: number, quotedPrice: number, quotedHours: number, quotedTransport: number) => Promise<any>;
  respondToCounterOffer: (orderRealtimeId: number, decision: string) => Promise<any>;
  resetOrderSession: (orderId?: number) => void;
  deviceConflict: DeviceConflictData | null;
  dismissDeviceConflict: () => void;
  claimSessionControl: (orderRealtimeId: number) => void;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useTimeRealServices(): UseTimeRealServicesReturn {
  const { token, isAuthenticated } = useAuth();
  const { role, setRole } = useRole();
  const { showNotification, clearNotification } = useNotification();
  const apolloClient = useApolloClient();
  const socketRef = useRef<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [connectionGeneration, setConnectionGeneration] = useState(0);
  const [deviceConflict, setDeviceConflict] = useState<DeviceConflictData | null>(null);
  const subscriptionsRef = useRef<Map<string, Set<Function>>>(new Map());
  const activeChatRoomRef = useRef<number | null>(null);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationTsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    getOrCreateDeviceId().catch(() => {});
  }, []);

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

  const shouldSkipRealtimeQueries = !token || !isAuthenticated || role === 'guest';

  const { data, loading, refetch } = useQuery<RealtimeStateData>(
    GET_MY_REALTIME_STATE,
    {
      pollInterval: socketStatus === 'connected' ? 0 : 15000,
      fetchPolicy: socketStatus === 'connected' ? 'cache-first' : 'cache-and-network',
      skip: shouldSkipRealtimeQueries,
    },
  );

  const {
    data: clientOrdersData,
    refetch: refetchClientOrders,
  } = useQuery<any>(GET_MY_REALTIME_ORDERS_AS_CLIENT, {
    pollInterval: socketStatus === 'connected' ? 0 : 30000,
    fetchPolicy: socketStatus === 'connected' ? 'cache-first' : 'cache-and-network',
    skip: shouldSkipRealtimeQueries,
  });

  const {
    data: providerOrdersData,
    refetch: refetchProviderOrders,
  } = useQuery<any>(GET_MY_REALTIME_ORDERS_AS_PROVIDER, {
    pollInterval: socketStatus === 'connected' ? 0 : 30000,
    fetchPolicy: socketStatus === 'connected' ? 'cache-first' : 'cache-and-network',
    skip: shouldSkipRealtimeQueries || role !== 'provider',
  });

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  const refetchClientOrdersRef = useRef(refetchClientOrders);
  useEffect(() => {
    refetchClientOrdersRef.current = refetchClientOrders;
  }, [refetchClientOrders]);

  const refetchProviderOrdersRef = useRef(refetchProviderOrders);
  useEffect(() => {
    refetchProviderOrdersRef.current = refetchProviderOrders;
  }, [refetchProviderOrders]);

  const apolloClientRef = useRef(apolloClient);
  useEffect(() => {
    apolloClientRef.current = apolloClient;
  }, [apolloClient]);

  const [setAvailability] = useMutation(SET_MY_REALTIME_AVAILABILITY);
  const [updateProviderLocMut] = useMutation(UPDATE_PROVIDER_LOCATION);
  const [createContactMut] = useMutation<{ createRealtimeContactRequest: { id: number; status: string } }>(CREATE_REALTIME_CONTACT_REQUEST);
  const [quoteMut] = useMutation(QUOTE_REALTIME_ORDER);
  const [updateQuoteMut] = useMutation(UPDATE_REALTIME_QUOTE);
  const [acceptQuoteMut] = useMutation(ACCEPT_REALTIME_ORDER_QUOTE);
  const [rejectQuoteMut] = useMutation(REJECT_REALTIME_ORDER_QUOTE);
  const [respondMut] = useMutation(RESPOND_REALTIME_CONTACT_REQUEST);
  const [confirmArrivalMut] = useMutation(CONFIRM_REALTIME_ARRIVAL);
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
  const clientIdRef = useRef(clientId);
  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  const providerId = providerState?.id ?? null;
  const providerIdRef = useRef(providerId);
  useEffect(() => {
    providerIdRef.current = providerId;
  }, [providerId]);

  const orderStatusHistoryRef = useRef<Map<number, string>>(new Map());
  const lastOrderEventTimestampRef = useRef<Map<number, number>>(new Map());
  const approachingNotifiedRef = useRef<Set<number>>(new Set());
  const distanceMilestonesNotifiedRef = useRef<Map<number, Set<string>>>(new Map());
  const lastQuoteNotifiedRef = useRef<Map<number, number>>(new Map());
  const lastCounterOfferNotifiedRef = useRef<Map<number, number>>(new Map());

  const reviewedOrderIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(REVIEWED_ORDERS_STORAGE_KEY)
      .then((raw) => {
        if (!isMounted || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: number) => {
              if (Number.isFinite(id)) reviewedOrderIdsRef.current.add(id);
            });
          }
        } catch {}
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const markOrderReviewed = useCallback((orderId: number) => {
    if (orderId) {
      reviewedOrderIdsRef.current.add(orderId);
      const arr = Array.from(reviewedOrderIdsRef.current);
      AsyncStorage.setItem(REVIEWED_ORDERS_STORAGE_KEY, JSON.stringify(arr)).catch(() => {});
    }
  }, []);

  const isOrderReviewed = useCallback((orderId: number) => {
    return Boolean(orderId && reviewedOrderIdsRef.current.has(orderId));
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    console.log(
      `[RT:DOMAIN] role=${role} clientOrderId=${activeOrder?.id ?? 'null'} providerOrderId=${providerActiveOrder?.id ?? 'null'} status=${activeOrder?.status ?? providerActiveOrder?.status ?? 'null'} hasProvider=${!!activeOrder?.provider} hasServiceProvider=${!!activeOrder?.serviceProvider}`,
    );
  }, [role, activeOrder?.id, activeOrder?.status, activeOrder?.provider, activeOrder?.serviceProvider, providerActiveOrder?.id, providerActiveOrder?.status]);

  const activeOrderRef = useRef<OrderRealTime | null>(activeOrder);
  activeOrderRef.current = activeOrder;
  const providerActiveOrderRef = useRef<OrderRealTime | null>(providerState?.activeRealtimeOrder as OrderRealTime | null);
  providerActiveOrderRef.current = providerState?.activeRealtimeOrder as OrderRealTime | null;
  const localActiveOrderRef = useRef<OrderRealTime | null>(localActiveOrder);
  localActiveOrderRef.current = localActiveOrder;
  const localProviderActiveOrderRef = useRef<OrderRealTime | null>(localProviderActiveOrder);
  localProviderActiveOrderRef.current = localProviderActiveOrder;

  // Pre-seed orderStatusHistoryRef with existing orders to prevent duplicate alerts on reconnect or initial load
  useEffect(() => {
    const o = localActiveOrder || activeOrder;
    if (o?.id && o?.status && !orderStatusHistoryRef.current.has(o.id)) {
      orderStatusHistoryRef.current.set(o.id, o.status);
    }
  }, [localActiveOrder?.id, localActiveOrder?.status, activeOrder?.id, activeOrder?.status]);

  useEffect(() => {
    const po = localProviderActiveOrder || (providerState?.activeRealtimeOrder as OrderRealTime | null);
    if (po?.id && po?.status && !orderStatusHistoryRef.current.has(po.id)) {
      orderStatusHistoryRef.current.set(po.id, po.status);
    }
  }, [localProviderActiveOrder?.id, localProviderActiveOrder?.status, providerState?.activeRealtimeOrder]);

  // Auto-switch de modo: si llega una orden realtime activa como provider y estamos
  // en modo cliente, pasamos a modo proveedor.
  // Al terminar la orden: si el proveedor sigue activo en tiempo real (isRealtimeActive === true),
  // se mantiene en modo proveedor. Solo si NO está activo en tiempo real vuelve a modo cliente.
  const autoProviderOrderRef = useRef<number | null>(null);
  const lastCounterOfferResolvedAt = useRef<number>(0);

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

    // Defense-in-depth:
    // 1. El usuario debe poseer un perfil de proveedor registrado
    if (!providerState?.id) return;
    // 2. Si la orden corresponde a la orden activa del usuario como cliente, jamás conmutar a modo proveedor
    if (activeOrder?.id && activeOrder.id === providerActiveOrder.id) return;
    if (localActiveOrder?.id && localActiveOrder.id === providerActiveOrder.id) return;

    autoProviderOrderRef.current = providerActiveOrder.id;
    setRole('provider');
  }, [providerActiveOrder, isRealtimeActive, role, setRole, providerState?.id, activeOrder?.id, localActiveOrder?.id]);

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

  const providerOrders: OrderRealTime[] = useMemo(
    () => providerOrdersData?.myRealtimeOrdersAsProvider ?? [],
    [providerOrdersData],
  );

  useEffect(() => {
    const TERMINAL = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
    const STATUS_PROGRESSION: Record<string, number> = {
      PENDING: 1,
      QUOTED: 2,
      PAYMENT_PENDING: 3,
      ACCEPTED: 4,
      ARRIVED: 5,
      IN_PROGRESS: 6,
      COMPLETED: 7,
      CANCELLED: 7,
      REJECTED: 7,
      EXPIRED: 7,
    };

    // El socket es la fuente de verdad de una orden viva: mientras haya una
    // localActiveOrder no debe pisarse con el snapshot del poll (que puede estar
    // más atrasado). El poll solo la inicializa (null) y adopta estados terminales o avances.
    if (localActiveOrder) {
      const pollOrder = activeOrder;
      if (pollOrder && pollOrder.id === localActiveOrder.id) {
        const pollRank = STATUS_PROGRESSION[pollOrder.status] ?? 0;
        const localRank = STATUS_PROGRESSION[localActiveOrder.status] ?? 0;
        const isStatusUpgrade = pollRank >= localRank;

        // Reglas de reconciliación de contraofertas:
        // 1. Si la contraoferta se resolvió recientemente (< 5s), ignorar contraofertas no-nulas del poll (resurrección).
        // 2. Un pollOrder con counterOfferPrice == null NUNCA debe borrar una contraoferta viva del socket en localActiveOrder.
        // 3. El poll solo actualiza la contraoferta si trae un valor no-nulo genuinamente nuevo y no es resurrección.
        const isStaleResurrection =
          pollOrder.counterOfferPrice != null &&
          Date.now() - lastCounterOfferResolvedAt.current < 5000;

        const shouldAdoptPollCounterOffer =
          pollOrder.counterOfferPrice != null &&
          !isStaleResurrection &&
          pollOrder.counterOfferPrice !== localActiveOrder.counterOfferPrice;

        const counterOfferPriceChanged = shouldAdoptPollCounterOffer;

        const needsUpdate =
          (isStatusUpgrade && pollOrder.status !== localActiveOrder.status) ||
          (pollOrder.quotedPrice != null && localActiveOrder.quotedPrice !== pollOrder.quotedPrice) ||
          counterOfferPriceChanged ||
          (shouldAdoptPollCounterOffer && pollOrder.counterOfferHours != null && localActiveOrder.counterOfferHours !== pollOrder.counterOfferHours) ||
          (shouldAdoptPollCounterOffer && pollOrder.counterOfferTransport != null && localActiveOrder.counterOfferTransport !== pollOrder.counterOfferTransport);

        if (needsUpdate) {
          _setLocalActiveOrder((prev: any) => {
            if (!prev) return pollOrder;
            if (TERMINAL.includes(prev.status)) return prev;

            const nextCounterOfferPrice = isStaleResurrection
              ? null
              : shouldAdoptPollCounterOffer
                ? pollOrder.counterOfferPrice
                : prev.counterOfferPrice;

            const nextCounterOfferHours = isStaleResurrection
              ? null
              : shouldAdoptPollCounterOffer
                ? pollOrder.counterOfferHours
                : prev.counterOfferHours;

            const nextCounterOfferTransport = isStaleResurrection
              ? null
              : shouldAdoptPollCounterOffer
                ? pollOrder.counterOfferTransport
                : prev.counterOfferTransport;

            const nextStartedAt = pollOrder.startedAt || prev.startedAt || ((pollOrder.status === 'IN_PROGRESS' || prev.status === 'IN_PROGRESS') ? (prev.startedAt || new Date().toISOString()) : null);

            return {
              ...pollOrder,
              status: isStatusUpgrade ? pollOrder.status : prev.status,
              ...(nextStartedAt ? { startedAt: nextStartedAt } : {}),
              quotedPrice: pollOrder.quotedPrice ?? prev.quotedPrice,
              counterOfferPrice: nextCounterOfferPrice,
              counterOfferHours: nextCounterOfferHours,
              counterOfferTransport: nextCounterOfferTransport,
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
          if (isOrderReviewed(match.id)) {
            _setLocalActiveOrder(null);
          } else {
            _setLocalActiveOrder(match);
          }
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
    const STATUS_PROGRESSION: Record<string, number> = {
      PENDING: 1,
      QUOTED: 2,
      PAYMENT_PENDING: 3,
      ACCEPTED: 4,
      ARRIVED: 5,
      IN_PROGRESS: 6,
      COMPLETED: 7,
      CANCELLED: 7,
      REJECTED: 7,
      EXPIRED: 7,
    };
    const pollOrder = providerState?.activeRealtimeOrder as OrderRealTime | null;

    if (localProviderActiveOrder) {
      if (pollOrder && pollOrder.id === localProviderActiveOrder.id) {
        const pollRank = STATUS_PROGRESSION[pollOrder.status] ?? 0;
        const localRank = STATUS_PROGRESSION[localProviderActiveOrder.status] ?? 0;
        const isStatusUpgrade = pollRank >= localRank;

        const isStaleResurrection =
          pollOrder.counterOfferPrice != null &&
          Date.now() - lastCounterOfferResolvedAt.current < 5000;

        const shouldAdoptPollCounterOffer =
          pollOrder.counterOfferPrice != null &&
          !isStaleResurrection &&
          pollOrder.counterOfferPrice !== localProviderActiveOrder.counterOfferPrice;

        const counterOfferPriceChanged = shouldAdoptPollCounterOffer;

        const needsUpdate =
          (isStatusUpgrade && pollOrder.status !== localProviderActiveOrder.status) ||
          (pollOrder.quotedPrice != null && localProviderActiveOrder.quotedPrice !== pollOrder.quotedPrice) ||
          counterOfferPriceChanged ||
          (shouldAdoptPollCounterOffer && pollOrder.counterOfferHours != null && localProviderActiveOrder.counterOfferHours !== pollOrder.counterOfferHours) ||
          (shouldAdoptPollCounterOffer && pollOrder.counterOfferTransport != null && localProviderActiveOrder.counterOfferTransport !== pollOrder.counterOfferTransport) ||
          localProviderActiveOrder.clientDescription !== pollOrder.clientDescription;

        if (needsUpdate) {
          _setLocalProviderActiveOrder((prev: any) => {
            if (!prev) return pollOrder;
            if (TERMINAL.includes(prev.status)) return prev;

            const nextCounterOfferPrice = isStaleResurrection
              ? null
              : shouldAdoptPollCounterOffer
                ? pollOrder.counterOfferPrice
                : prev.counterOfferPrice;

            const nextCounterOfferHours = isStaleResurrection
              ? null
              : shouldAdoptPollCounterOffer
                ? pollOrder.counterOfferHours
                : prev.counterOfferHours;

            const nextCounterOfferTransport = isStaleResurrection
              ? null
              : shouldAdoptPollCounterOffer
                ? pollOrder.counterOfferTransport
                : prev.counterOfferTransport;

            const nextStartedAt = pollOrder.startedAt || prev.startedAt || ((pollOrder.status === 'IN_PROGRESS' || prev.status === 'IN_PROGRESS') ? (prev.startedAt || new Date().toISOString()) : null);

            return {
              ...pollOrder,
              status: isStatusUpgrade ? pollOrder.status : prev.status,
              ...(nextStartedAt ? { startedAt: nextStartedAt } : {}),
              quotedPrice: pollOrder.quotedPrice ?? prev.quotedPrice,
              counterOfferPrice: nextCounterOfferPrice,
              counterOfferHours: nextCounterOfferHours,
              counterOfferTransport: nextCounterOfferTransport,
              clientLat: prev.clientLat ?? pollOrder.clientLat,
              clientLng: prev.clientLng ?? pollOrder.clientLng,
              providerLat: prev.providerLat ?? pollOrder.providerLat,
              providerLng: prev.providerLng ?? pollOrder.providerLng,
            };
          });
        }
      } else if (pollOrder && pollOrder.id !== localProviderActiveOrder.id) {
        _setLocalProviderActiveOrder(pollOrder);
      } else {
        // El poll dejó de reportar esta orden: si providerOrders la marca terminal, la
        // cerramos; en caso contrario la mantenemos viva (evita el null-clear de R2).
        const match = providerOrders.find((o: any) => o.id === localProviderActiveOrder.id);
        if (match && TERMINAL.includes(match.status)) {
          if (isOrderReviewed(match.id)) {
            _setLocalProviderActiveOrder(null);
          } else {
            _setLocalProviderActiveOrder(match);
          }
        }
      }
      return;
    }

    if (pollOrder) {
      _setLocalProviderActiveOrder(pollOrder);
    }
  }, [providerState?.activeRealtimeOrder, providerOrders, localProviderActiveOrder]);

  const setLocalActiveOrder = useCallback<React.Dispatch<React.SetStateAction<OrderRealTime | null>>>(
    (value) => {
      _setLocalActiveOrder(value);
    },
    [],
  );

  const setLocalProviderActiveOrder = useCallback<React.Dispatch<React.SetStateAction<OrderRealTime | null>>>(
    (value) => {
      _setLocalProviderActiveOrder(value);
    },
    [],
  );

  const subscribe = useCallback((event: string, handler: (...args: any[]) => void) => {
    let set = subscriptionsRef.current.get(event);
    if (!set) {
      set = new Set();
      subscriptionsRef.current.set(event, set);
    }
    set.add(handler);
    return () => {
      const currentSet = subscriptionsRef.current.get(event);
      if (currentSet) {
        currentSet.delete(handler);
        if (currentSet.size === 0) {
          subscriptionsRef.current.delete(event);
        }
      }
    };
  }, []);

  const joinChat = useCallback((orderRealtimeId: number) => {
    activeChatRoomRef.current = orderRealtimeId;
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:join', { orderRealtimeId });
    }
  }, []);

  const leaveChat = useCallback((orderRealtimeId: number) => {
    if (activeChatRoomRef.current === orderRealtimeId) {
      activeChatRoomRef.current = null;
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:leave', { orderRealtimeId });
    }
  }, []);

  const isGuest = role === 'guest';

  useEffect(() => {
    if (!token || !isAuthenticated || isGuest) {
      setSocketStatus('disconnected');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    setSocketStatus('connecting');

    const deviceId = getCachedDeviceId();
    const socket = io(`${ENDPOINT.replace(/\/$/, '')}/find`, {
      transports: ['websocket'],
      auth: { token, deviceId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    const dispatch = (event: string, ...args: any[]) => {
      const set = subscriptionsRef.current.get(event);
      if (set) {
        set.forEach((handler) => {
          try {
            handler(...args);
          } catch (err) {
            if (__DEV__) {
              console.error(`[RT:SUBSCRIBE] Error in subscriber callback for "${event}":`, err);
            }
          }
        });
      }
    };

    socket.on('connect', () => {
      setSocketStatus('connected');
      setConnectionGeneration((prev) => prev + 1);
      setSocketLogIdentifiers(socket.id || '', String(clientIdRef.current ?? ''));
      logSocketIn('connect', { socketId: socket.id });
      if (__DEV__) console.log(`[RT:EVENT] source=BOOT type=socket_connect orderId=null status=null role=${roleRef.current}`);
      if (roleRef.current !== 'guest') {
        refetchRef.current();
        refetchClientOrdersRef.current();
        refetchProviderOrdersRef.current();
      }
      if (activeChatRoomRef.current != null) {
        socket.emit('chat:join', { orderRealtimeId: activeChatRoomRef.current });
      }
      dispatch('connect', { socketId: socket.id });
    });

    socket.on('connect_error', (err) => {
      setSocketStatus('error');
      logSocketIn('connect_error', { message: err.message });
      dispatch('connect_error', err);
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      setSocketStatus('disconnected');
      logSocketIn('disconnect', { reason });
      dispatch('disconnect', { reason });
      if (reason === 'io server disconnect') {
        // Desconexión forzada por el servidor (p. ej. token expirado o no autorizado).
        socket.disconnect();
      }
    });

    socket.on('reconnect_attempt', () => {
      setSocketStatus('connecting');
      logSocketIn('reconnect_attempt');
      dispatch('reconnect_attempt');
    });

    socket.on('order-realtime:created', (payload) => {
      logSocketIn('order-realtime:created', payload);
      if (__DEV__) console.log(`[RT:EVENT] source=SOCKET type=order-realtime:created orderId=${payload?.orderRealtimeId ?? payload?.id ?? 'null'} status=${payload?.status ?? 'null'} role=${roleRef.current}`);
      refetchRef.current();
      refetchClientOrdersRef.current();
      refetchProviderOrdersRef.current();
      const orderId = payload?.orderRealtimeId ?? payload?.id ?? 0;
      const isMyProviderOrder = Boolean(
        payload?.providerId && providerIdRef.current
          ? payload.providerId === providerIdRef.current
          : roleRef.current === 'provider' && (!payload?.clientId || payload.clientId !== clientIdRef.current)
      );
      if (isMyProviderOrder) {
        notifyRef.current({
          id: `orderCreated:${orderId}`,
          title: 'Nueva Solicitud',
          message: 'Tienes una nueva solicitud de servicio',
          type: 'info',
        });
      }
      dispatch('order-realtime:created', payload);
    });

    socket.on('order-realtime:updated', (payload: {
      orderRealtimeId: number;
      status: string;
      clientId?: number;
      providerId?: number;
      respondedAt?: string;
      startedAt?: string | null;
      arrivedAt?: string | null;
      quotedPrice?: number | null;
      quotedHours?: number | null;
      quotedTransport?: number | null;
      counterOfferPrice?: number | null;
      counterOfferHours?: number | null;
      counterOfferTransport?: number | null;
      paymentExpiresAt?: string | null;
      updatedAt?: string | null;
    }) => {
      logSocketIn('order-realtime:updated', payload);
      if (!payload?.orderRealtimeId) return;

      const orderId = payload.orderRealtimeId;
      const status = payload.status;
      const prevStatus = orderStatusHistoryRef.current.get(orderId);

      // 1. Monotonic Timestamp & Precedence Guard:
      // Si el evento trae updatedAt autorizado de la base de datos:
      if (payload.updatedAt) {
        const incomingTs = new Date(payload.updatedAt).getTime();
        const lastTs = lastOrderEventTimestampRef.current.get(orderId);
        if (Number.isFinite(incomingTs) && lastTs && incomingTs < lastTs) {
          if (__DEV__) {
            console.warn(
              `[RT:OUT_OF_ORDER_DROPPED] orderId=${orderId} incomingStatus=${status} incomingTs=${incomingTs} lastTs=${lastTs}`
            );
          }
          return;
        }
        if (Number.isFinite(incomingTs)) {
          lastOrderEventTimestampRef.current.set(orderId, incomingTs);
        }

        // Prevenir que una orden ya confirmada/pagada (ACCEPTED o superior) retroceda a PAYMENT_PENDING o anterior
        const currentProgression = ORDER_STATUS_PROGRESSION[prevStatus || ''] ?? 0;
        const incomingProgression = ORDER_STATUS_PROGRESSION[status] ?? 0;
        const isTerminal = TERMINAL_ORDER_STATUSES.includes(prevStatus || '');

        if (isTerminal && status !== prevStatus && !TERMINAL_ORDER_STATUSES.includes(status)) {
          if (__DEV__) {
            console.warn(
              `[RT:TERMINAL_REVERT_BLOCKED] orderId=${orderId} currentStatus=${prevStatus} blockedStatus=${status}`
            );
          }
          return;
        }

        if (currentProgression >= 4 && incomingProgression > 0 && incomingProgression < 4) {
          if (__DEV__) {
            console.warn(
              `[RT:DOWNGRADE_PREVENTED] orderId=${orderId} currentStatus=${prevStatus} blockedStatus=${status}`
            );
          }
          return;
        }
      }

      const isStatusChanged = prevStatus !== status;
      orderStatusHistoryRef.current.set(orderId, status);

      if (payload.counterOfferPrice === null) {
        lastCounterOfferResolvedAt.current = Date.now();
      }

      const myUserId = clientIdRef.current;
      const myProviderId = providerIdRef.current;
      const isClient = Boolean(
        (payload.clientId && myUserId && payload.clientId === myUserId) ||
        (!payload.clientId && roleRef.current === 'client')
      );
      const isProvider = Boolean(
        (payload.providerId && myProviderId && payload.providerId === myProviderId) ||
        (!payload.providerId && roleRef.current === 'provider')
      );

      if (isStatusChanged) {
        if (status === 'ARRIVED') {
          if (isClient) {
            notifyRef.current({
              id: `clientOrder:${orderId}:ARRIVED`,
              title: 'Proveedor ha llegado',
              message: 'El profesional ha confirmado su llegada a tu ubicación. Ya puedes iniciar el servicio.',
              type: 'success',
            });
          } else if (isProvider) {
            notifyRef.current({
              id: `providerOrder:${orderId}:ARRIVED`,
              title: 'Llegada Confirmada',
              message: 'Has confirmado tu llegada al domicilio. Esperando que el cliente inicie el servicio.',
              type: 'success',
            });
          }
        } else if (status === 'COMPLETED') {
          approachingNotifiedRef.current.delete(orderId);
          distanceMilestonesNotifiedRef.current.delete(orderId);
          lastQuoteNotifiedRef.current.delete(orderId);
          lastCounterOfferNotifiedRef.current.delete(orderId);
          if (isProvider) {
            notifyRef.current({
              id: `providerOrder:${orderId}:COMPLETED`,
              title: 'Trabajo Completado',
              message: 'Has finalizado el servicio.',
              type: 'success',
            });
          } else if (isClient) {
            notifyRef.current({
              id: `clientOrder:${orderId}:COMPLETED`,
              title: 'Servicio Finalizado',
              message: 'El servicio ha sido completado exitosamente.',
              type: 'success',
            });
          }
        } else if (status === 'CANCELLED') {
          approachingNotifiedRef.current.delete(orderId);
          distanceMilestonesNotifiedRef.current.delete(orderId);
          lastQuoteNotifiedRef.current.delete(orderId);
          lastCounterOfferNotifiedRef.current.delete(orderId);
          if (isProvider) {
            notifyRef.current({
              id: `providerOrder:${orderId}:CANCELLED`,
              title: 'Servicio Cancelado',
              message: 'El cliente ha cancelado la orden.',
              type: 'error',
            });
          } else if (isClient) {
            notifyRef.current({
              id: `clientOrder:${orderId}:CANCELLED`,
              title: 'Servicio Cancelado',
              message: 'El servicio ha sido cancelado.',
              type: 'error',
            });
          }
        } else if (status === 'REJECTED') {
          approachingNotifiedRef.current.delete(orderId);
          distanceMilestonesNotifiedRef.current.delete(orderId);
          lastQuoteNotifiedRef.current.delete(orderId);
          lastCounterOfferNotifiedRef.current.delete(orderId);
          if (isClient) {
            notifyRef.current({
              id: `clientOrder:${orderId}:REJECTED`,
              title: 'Solicitud Rechazada',
              message: 'El profesional ha rechazado tu solicitud.',
              type: 'error',
            });
          } else if (isProvider) {
            notifyRef.current({
              id: `providerOrder:${orderId}:REJECTED`,
              title: 'Solicitud Rechazada',
              message: 'Has rechazado la solicitud.',
              type: 'error',
            });
          }
        } else if (status === 'ACCEPTED') {
          if (isProvider) {
            notifyRef.current({
              id: `providerOrder:${orderId}:ACCEPTED`,
              title: '¡Pago Confirmado!',
              message: 'El cliente ha procesado el pago. Inicia tu ruta.',
              type: 'success',
            });
          } else if (isClient) {
            notifyRef.current({
              id: `clientOrder:${orderId}:ACCEPTED`,
              title: '¡Pago Confirmado!',
              message: 'Tu servicio ha sido confirmado. El proveedor está en camino.',
              type: 'success',
            });
          }
        } else if (status === 'PAYMENT_PENDING') {
          if (isProvider) {
            notifyRef.current({
              id: `providerOrder:${orderId}:PAYMENT_PENDING`,
              title: 'Pago en Proceso',
              message: 'El cliente está procesando el pago del servicio.',
              type: 'info',
            });
          } else if (isClient) {
            notifyRef.current({
              id: `clientOrder:${orderId}:PAYMENT_PENDING`,
              title: 'Pago en Proceso',
              message: 'Completa tu pago para confirmar el servicio.',
              type: 'info',
            });
          }
        } else if (status === 'IN_PROGRESS') {
          if (isClient) {
            notifyRef.current({
              id: `clientOrder:${orderId}:IN_PROGRESS`,
              title: 'Servicio en Curso',
              message: 'El profesional ha iniciado el trabajo.',
              type: 'info',
            });
          } else if (isProvider) {
            notifyRef.current({
              id: `providerOrder:${orderId}:IN_PROGRESS`,
              title: 'Servicio en Curso',
              message: 'Cronómetro activo. Buen trabajo.',
              type: 'info',
            });
          }
        } else if (status === 'EXPIRED') {
          approachingNotifiedRef.current.delete(orderId);
          distanceMilestonesNotifiedRef.current.delete(orderId);
          lastQuoteNotifiedRef.current.delete(orderId);
          lastCounterOfferNotifiedRef.current.delete(orderId);
          if (isProvider) {
            notifyRef.current({
              id: `providerOrder:${orderId}:EXPIRED`,
              title: 'Solicitud Expirada',
              message: 'El tiempo límite de la orden ha concluido.',
              type: 'error',
            });
          } else if (isClient) {
            notifyRef.current({
              id: `clientOrder:${orderId}:EXPIRED`,
              title: 'Solicitud Expirada',
              message: 'La solicitud ha expirado.',
              type: 'error',
            });
          }
        }
      }

      if (status === 'QUOTED') {
        if (payload.counterOfferPrice != null && isProvider) {
          const prevNotified = lastCounterOfferNotifiedRef.current.get(orderId);
          if (prevNotified !== payload.counterOfferPrice) {
            lastCounterOfferNotifiedRef.current.set(orderId, payload.counterOfferPrice);
            notifyRef.current({
              id: `counterOffer:${orderId}:${payload.counterOfferPrice}`,
              title: 'Contraoferta Recibida',
              message: 'El cliente ha enviado una contraoferta.',
              type: 'info',
            });
          }
        } else if (!payload.counterOfferPrice && isClient && payload.quotedPrice != null) {
          const prevQuote = lastQuoteNotifiedRef.current.get(orderId);
          if (isStatusChanged || prevQuote !== payload.quotedPrice) {
            lastQuoteNotifiedRef.current.set(orderId, payload.quotedPrice);
            notifyRef.current({
              id: `quote:${orderId}:${payload.quotedPrice}`,
              title: 'Oferta Recibida',
              message: 'El profesional ha enviado una oferta.',
              type: 'info',
            });
          }
        }
      }

      _setLocalActiveOrder((prev: any) => {
        const target = prev || activeOrderRef.current;
        if (!target || target.id !== payload.orderRealtimeId) return prev;
        const resolvedStartedAt = payload.startedAt ?? target.startedAt ?? (payload.status === 'IN_PROGRESS' ? (target.startedAt || new Date().toISOString()) : undefined);
        return {
          ...target,
          status: payload.status,
          ...(resolvedStartedAt ? { startedAt: resolvedStartedAt } : {}),
          ...(payload.arrivedAt !== undefined ? { arrivedAt: payload.arrivedAt } : {}),
          ...(payload.quotedPrice !== undefined && { quotedPrice: payload.quotedPrice }),
          ...(payload.quotedHours !== undefined && { quotedHours: payload.quotedHours }),
          ...(payload.quotedTransport !== undefined && { quotedTransport: payload.quotedTransport }),
          ...(payload.counterOfferPrice !== undefined && { counterOfferPrice: payload.counterOfferPrice }),
          ...(payload.counterOfferHours !== undefined && { counterOfferHours: payload.counterOfferHours }),
          ...(payload.counterOfferTransport !== undefined && { counterOfferTransport: payload.counterOfferTransport }),
        };
      });

      _setLocalProviderActiveOrder((prev: any) => {
        const target = prev || providerActiveOrderRef.current;
        if (!target || target.id !== payload.orderRealtimeId) return prev;
        const resolvedStartedAt = payload.startedAt ?? target.startedAt ?? (payload.status === 'IN_PROGRESS' ? (target.startedAt || new Date().toISOString()) : undefined);
        return {
          ...target,
          status: payload.status,
          ...(resolvedStartedAt ? { startedAt: resolvedStartedAt } : {}),
          ...(payload.arrivedAt !== undefined ? { arrivedAt: payload.arrivedAt } : {}),
          ...(payload.quotedPrice !== undefined && { quotedPrice: payload.quotedPrice }),
          ...(payload.quotedHours !== undefined && { quotedHours: payload.quotedHours }),
          ...(payload.quotedTransport !== undefined && { quotedTransport: payload.quotedTransport }),
          ...(payload.counterOfferPrice !== undefined && { counterOfferPrice: payload.counterOfferPrice }),
          ...(payload.counterOfferHours !== undefined && { counterOfferHours: payload.counterOfferHours }),
          ...(payload.counterOfferTransport !== undefined && { counterOfferTransport: payload.counterOfferTransport }),
        };
      });
      
      try {
        apolloClientRef.current.cache.modify({
          id: `OrderRealTime:${payload.orderRealtimeId}`,
          fields: {
            status: () => payload.status,
            ...(payload.arrivedAt !== undefined && { arrivedAt: () => payload.arrivedAt }),
            ...(payload.startedAt !== undefined && { startedAt: () => payload.startedAt }),
            ...(payload.quotedPrice !== undefined && { quotedPrice: () => payload.quotedPrice }),
            ...(payload.quotedHours !== undefined && { quotedHours: () => payload.quotedHours }),
            ...(payload.quotedTransport !== undefined && { quotedTransport: () => payload.quotedTransport }),
            ...(payload.counterOfferPrice !== undefined && { counterOfferPrice: () => payload.counterOfferPrice }),
            ...(payload.counterOfferHours !== undefined && { counterOfferHours: () => payload.counterOfferHours }),
            ...(payload.counterOfferTransport !== undefined && { counterOfferTransport: () => payload.counterOfferTransport }),
          },
        });
      } catch {}

      if (['CANCELLED', 'REJECTED', 'EXPIRED'].includes(payload.status)) {
        delete locationTsRef.current[payload.orderRealtimeId];
        try {
          apolloClientRef.current.cache.evict({ id: `OrderRealTime:${payload.orderRealtimeId}` });
          apolloClientRef.current.cache.gc();
        } catch {}
      }

      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
      refetchTimerRef.current = setTimeout(() => {
        refetchRef.current();
        refetchClientOrdersRef.current();
        refetchProviderOrdersRef.current();
      }, 500);

      dispatch('order-realtime:updated', payload);
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
      if (!payload?.orderRealtimeId) return;

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

      const isValidCoord = (c: number | null | undefined) =>
        c != null && Number.isFinite(c) && Math.abs(c) > 1e-4;

      setLocalActiveOrder((prev) => {
        const target = prev || activeOrderRef.current;
        if (!target || target.id !== payload.orderRealtimeId) return prev;
        return {
          ...target,
          clientLat: isValidCoord(payload.clientLat) ? payload.clientLat : target.clientLat,
          clientLng: isValidCoord(payload.clientLng) ? payload.clientLng : target.clientLng,
          providerLat: isValidCoord(payload.providerLat) ? payload.providerLat : target.providerLat,
          providerLng: isValidCoord(payload.providerLng) ? payload.providerLng : target.providerLng,
        };
      });

      _setLocalProviderActiveOrder((prev: any) => {
        const target = prev || providerActiveOrderRef.current;
        if (!target || target.id !== payload.orderRealtimeId) return prev;
        return {
          ...target,
          clientLat: isValidCoord(payload.clientLat) ? payload.clientLat : target.clientLat,
          clientLng: isValidCoord(payload.clientLng) ? payload.clientLng : target.clientLng,
          providerLat: isValidCoord(payload.providerLat) ? payload.providerLat : target.providerLat,
          providerLng: isValidCoord(payload.providerLng) ? payload.providerLng : target.providerLng,
        };
      });

      try {
        apolloClientRef.current.cache.modify({
          id: `OrderRealTime:${payload.orderRealtimeId}`,
          fields: {
            clientLat: (existing: number | null) => (isValidCoord(payload.clientLat) ? payload.clientLat : existing),
            clientLng: (existing: number | null) => (isValidCoord(payload.clientLng) ? payload.clientLng : existing),
            providerLat: (existing: number | null) => (isValidCoord(payload.providerLat) ? payload.providerLat : existing),
            providerLng: (existing: number | null) => (isValidCoord(payload.providerLng) ? payload.providerLng : existing),
          },
        });
      } catch {}

      dispatch('order-realtime:location-updated', payload);
    });

    socket.on('order-realtime:approaching', (payload: { orderRealtimeId: number; distanceMeters?: number; tier?: string }) => {
      logSocketIn('order-realtime:approaching', payload);
      if (!payload?.orderRealtimeId) return;
      const orderId = payload.orderRealtimeId;
      const dist = payload.distanceMeters;
      const tier = payload.tier;

      if (!distanceMilestonesNotifiedRef.current.has(orderId)) {
        distanceMilestonesNotifiedRef.current.set(orderId, new Set<string>());
      }
      const milestones = distanceMilestonesNotifiedRef.current.get(orderId)!;

      if (roleRef.current === 'client' && notifyRef.current) {
        if (tier === '5M') {
          if (!milestones.has('5M')) {
            milestones.add('5M');
            milestones.add('200M');
            milestones.add('500M');
            milestones.add('1000M');
            approachingNotifiedRef.current.add(orderId);
            notifyRef.current({
              id: `clientOrder:${orderId}:DIST_5M`,
              title: 'Profesional por llegar',
              message: 'El profesional está en tu puerta (a 5 metros de tu ubicación).',
              type: 'info',
            });
          }
        } else if (tier === '200M') {
          if (!milestones.has('200M')) {
            milestones.add('200M');
            milestones.add('500M');
            milestones.add('1000M');
            approachingNotifiedRef.current.add(orderId);
            notifyRef.current({
              id: `clientOrder:${orderId}:DIST_200M`,
              title: 'Profesional a 200 m',
              message: 'El profesional está muy cerca (a 200 metros).',
              type: 'info',
            });
          }
        } else if (tier === '500M') {
          if (!milestones.has('500M')) {
            milestones.add('500M');
            milestones.add('1000M');
            notifyRef.current({
              id: `clientOrder:${orderId}:DIST_500M`,
              title: 'Profesional a 500 m',
              message: 'El profesional está a 500 metros de tu ubicación.',
              type: 'info',
            });
          }
        } else if (tier === '1000M') {
          if (!milestones.has('1000M')) {
            milestones.add('1000M');
            notifyRef.current({
              id: `clientOrder:${orderId}:DIST_1000M`,
              title: 'Profesional a 1 km',
              message: 'El profesional se encuentra a aproximadamente 1 km de tu ubicación.',
              type: 'info',
            });
          }
        } else if (!approachingNotifiedRef.current.has(orderId)) {
          approachingNotifiedRef.current.add(orderId);
          notifyRef.current({
            id: `clientOrder:${orderId}:APPROACHING`,
            title: 'Profesional por llegar',
            message: dist
              ? `El profesional está a menos de ${dist}m de tu ubicación.`
              : 'El profesional está por llegar a tu ubicación.',
            type: 'info',
          });
        }
      }
      dispatch('order-realtime:approaching', payload);
    });

    socket.on('chat:received', (payload) => {
      logSocketIn('chat:received', payload);
      if (payload) {
        const isFromOtherUser = payload.senderId !== clientIdRef.current;
        const isChatClosed = activeChatRoomRef.current !== payload.orderRealtimeId;
        if (isFromOtherUser && isChatClosed && notifyRef.current) {
          const sender = payload.senderName || 'Contacto';
          const msg = payload.message || (payload.imageUrl ? '[Imagen]' : 'Nuevo mensaje');
          notifyRef.current({
            id: `chat:${payload.id || Date.now()}:${payload.orderRealtimeId}`,
            title: `Mensaje de ${sender}`,
            message: msg.length > 80 ? msg.slice(0, 80) + '...' : msg,
            type: 'info',
          });
        }
      }
      dispatch('chat:received', payload);
    });

    socket.on('provider:realtime:status', (payload) => {
      logSocketIn('provider:realtime:status', payload);
      refetchRef.current();
      dispatch('provider:realtime:status', payload);
    });

    socket.on('provider:location-updated', (payload: { providerId: number; lat?: number; lng?: number; clientLat?: number; clientLng?: number; timestamp?: number }) => {
      logSocketIn('provider:location-updated', payload);
      if (!payload?.providerId) return;
      const lat = payload.lat ?? payload.clientLat;
      const lng = payload.lng ?? payload.clientLng;
      if (lat == null || lng == null) return;
      try {
        apolloClientRef.current.cache.modify({
          id: `Provider:${payload.providerId}`,
          fields: {
            lat: () => lat,
            lng: () => lng,
          },
        });
      } catch {}
      dispatch('provider:location-updated', payload);
    });

    socket.on('provider:disconnected', (payload: { orderRealtimeId: number }) => {
      logSocketIn('provider:disconnected', payload);
      if (roleRef.current === 'client') {
        notifyRef.current({
          id: `providerDisconnected:${payload.orderRealtimeId}`,
          title: 'Proveedor desconectado',
          message: 'El proveedor ha perdido la conexión.',
          type: 'error',
        });
      }
      refetchRef.current();
      refetchClientOrdersRef.current();
      refetchProviderOrdersRef.current();
      dispatch('provider:disconnected', payload);
    });

    socket.on('provider:connect-requested', (payload) => {
      logSocketIn('provider:connect-requested', payload);
      refetchRef.current();
      dispatch('provider:connect-requested', payload);
    });

    socket.on('review:received', (payload: {
      id: number;
      rating: number;
      comment?: string | null;
      orderRealtimeId: number;
      type: 'CLIENT_REVIEW' | 'PROVIDER_REVIEW';
      authorName?: string;
      createdAt: string;
    }) => {
      logSocketIn('review:received', payload);
      if (!payload) return;
      const isTargetProvider = payload.type === 'PROVIDER_REVIEW' && (roleRef.current === 'provider' || (Boolean(providerIdRef.current) && roleRef.current !== 'client'));
      const isTargetClient = payload.type === 'CLIENT_REVIEW' && roleRef.current === 'client';
      if (notifyRef.current && (isTargetProvider || isTargetClient)) {
        const rawRating = Number(payload?.rating);
        const safeRating = Number.isFinite(rawRating) ? Math.max(1, Math.min(5, Math.floor(rawRating))) : 5;
        const stars = '★'.repeat(safeRating);
        notifyRef.current({
          id: `review:${payload.id}:${payload.orderRealtimeId}`,
          title: 'Nueva reseña recibida',
          message: `${payload.authorName ? `${payload.authorName}: ` : ''}${stars} (${safeRating}/5)${payload.comment ? ` - "${payload.comment}"` : ''}`,
          type: 'success',
        });
      }
      refetchRef.current();
      refetchClientOrdersRef.current();
      refetchProviderOrdersRef.current();
      try {
        apolloClientRef.current.refetchQueries({ include: ['Me', 'GetMyRealtimeOrdersAsClient', 'GetMyRealtimeOrdersAsProvider'] });
      } catch {}
      dispatch('review:received', payload);
    });

    socket.on('session:device-conflict', (payload: DeviceConflictData) => {
      logSocketIn('session:device-conflict', payload);
      setDeviceConflict(payload);
      dispatch('session:device-conflict', payload);
    });

    socket.on('session:displaced', (payload: { orderRealtimeId: number; newDeviceId?: string; message?: string }) => {
      logSocketIn('session:displaced', payload);
      stopLocationTracking();
      notifyRef.current({
        id: `displaced:${payload.orderRealtimeId}`,
        title: 'Control transferido',
        message: payload.message || 'El control del servicio fue transferido a otro dispositivo.',
        type: 'info',
        duration: 7000,
      });
      dispatch('session:displaced', payload);
    });

    socket.on('session:control-granted', (payload: { orderRealtimeId: number; deviceId: string }) => {
      logSocketIn('session:control-granted', payload);
      setDeviceConflict(null);
      notifyRef.current({
        id: `controlGranted:${payload.orderRealtimeId}`,
        title: 'Control activo',
        message: 'Has tomado el control del servicio en este dispositivo.',
        type: 'success',
      });
      dispatch('session:control-granted', payload);
    });

    const appStateHandler = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (socketRef.current) {
          logSocketOut('reconnect_manual', { reason: 'app_foreground' });
          socketRef.current.connect();
        }
        // Al regresar a primer plano, resincronizar inmediatamente el estado con el servidor
        refetchRef.current?.();
        refetchClientOrdersRef.current?.();
        refetchProviderOrdersRef.current?.();
        try {
          apolloClientRef.current?.refetchQueries({
            include: ['Me', 'GetMyRealtimeOrdersAsClient', 'GetMyRealtimeOrdersAsProvider'],
          });
        } catch {}
      }
    };
    const appStateSub = AppState.addEventListener('change', appStateHandler);

    return () => {
      appStateSub?.remove?.();
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketStatus('disconnected');
    };
  }, [token, isAuthenticated, isGuest]);

  const toggleAvailability = useCallback(
    async (active: boolean, lat?: number | null, lng?: number | null) => {
      await setAvailability({ variables: { active, lat, lng } });
      refetch();
    },
    [setAvailability, refetch],
  );

  const updateProviderLocation = useCallback(
    async (clientLat: number, clientLng: number, timestamp?: number) => {
      await updateProviderLocMut({
        variables: { lat: clientLat, lng: clientLng, timestamp: timestamp ?? undefined },
      });
    },
    [updateProviderLocMut],
  );

  const lastProviderSentCoordsRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    if (!isRealtimeActive) return;

    let watchId: number | null = null;
    let unsubSim: (() => void) | null = null;

    const dispatchProviderLocation = (position: {
      coords: { latitude: number; longitude: number };
      timestamp?: number;
    }) => {
      const now = Date.now();
      const last = lastProviderSentCoordsRef.current;
      if (last) {
        const dt = now - last.time;
        if (dt < 2000) return; // Mínimo 2s entre emisiones

        const dLat = (position.coords.latitude - last.lat) * 111000;
        const dLng = (position.coords.longitude - last.lng) * 111000 * Math.cos((last.lat * Math.PI) / 180);
        const distMeters = Math.sqrt(dLat * dLat + dLng * dLng);

        // Si se movió menos de 5 metros y pasaron menos de 15s (heartbeat), omitir
        if (distMeters < 5 && dt < 15000) return;
      }

      lastProviderSentCoordsRef.current = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        time: now,
      };

      updateProviderLocation(
        position.coords.latitude,
        position.coords.longitude,
        position.timestamp,
      ).catch(() => {});
    };

    try {
      watchId = Geolocation.watchPosition(
        (position) => {
          if (__DEV__ && locationSimulator.isSimulating()) {
            return;
          }
          dispatchProviderLocation(position);
        },
        () => {},
        {
          enableHighAccuracy: true,
          distanceFilter: 2,
          interval: 2000,
          fastestInterval: 1000,
        },
      );
    } catch (_) {}

    if (__DEV__) {
      unsubSim = locationSimulator.subscribe((simulatedPos) => {
        if (simulatedPos && locationSimulator.isSimulating()) {
          dispatchProviderLocation(simulatedPos);
        }
      });
    }

    return () => {
      if (watchId != null) {
        Geolocation.clearWatch(watchId);
      }
      if (unsubSim != null) {
        unsubSim();
      }
    };
  }, [isRealtimeActive, updateProviderLocation]);

  const createContactRequest = useCallback(
    async (input: CreateRealtimeOrderInput) => {
      if (__DEV__) console.log(`[RT:EVENT] source=CREATE_REQUEST type=start orderId=null status=null role=${roleRef.current}`);
      const { data: result } = await createContactMut({
        variables: {
          input: {
            serviceProviderId: Number(input.serviceProviderId),
            clientDescription: input.clientDescription || undefined,
            clientLat: Number(input.clientLat),
            clientLng: Number(input.clientLng),
            clientAddress: input.clientAddress || undefined,
          },
        },
      });
      const order = result!.createRealtimeContactRequest;
      if (order) {
        _setLocalActiveOrder(order as any);
      }
      if (__DEV__) console.log(`[RT:EVENT] source=CREATE_REQUEST type=result orderId=${order.id} status=${order.status} role=${roleRef.current}`);
      await refetch();
      await refetchClientOrders();
      return result!.createRealtimeContactRequest;
    },
    [createContactMut, refetch, refetchClientOrders],
  );

  const quoteOrder = useCallback(
    async (params: MutationQuoteRealtimeOrderArgs) => {
      _setLocalProviderActiveOrder((prev: any) => {
        if (!prev || prev.id !== params.orderRealtimeId) return prev;
        return {
          ...prev,
          status: 'QUOTED',
          quotedPrice: params.quotedPrice,
          quotedHours: params.quotedHours,
          quotedTransport: params.quotedTransport,
        };
      });
      try {
        await quoteMut({ variables: params });
      } finally {
        refetch();
      }
    },
    [quoteMut, refetch],
  );

  const updateQuote = useCallback(
    async (params: MutationQuoteRealtimeOrderArgs) => {
      const res = await updateQuoteMut({ variables: params });
      const updated = (res as any)?.data?.updateRealtimeQuote;
      const patch = {
        ...(params.quotedPrice != null && { quotedPrice: params.quotedPrice }),
        ...(params.quotedHours != null && { quotedHours: params.quotedHours }),
        ...(params.quotedTransport != null && { quotedTransport: params.quotedTransport }),
        ...(updated?.quotedPrice != null && { quotedPrice: updated.quotedPrice }),
        ...(updated?.quotedHours != null && { quotedHours: updated.quotedHours }),
        ...(updated?.quotedTransport != null && { quotedTransport: updated.quotedTransport }),
      };
      _setLocalProviderActiveOrder((prev: any) => {
        if (!prev || prev.id !== params.orderRealtimeId) return prev;
        return { ...prev, ...patch };
      });
      _setLocalActiveOrder((prev: any) => {
        if (!prev || prev.id !== params.orderRealtimeId) return prev;
        return { ...prev, ...patch };
      });
      try {
        apolloClient.cache.modify({
          id: `OrderRealTime:${params.orderRealtimeId}`,
          fields: {
            ...(patch.quotedPrice != null ? { quotedPrice: () => patch.quotedPrice } : {}),
            ...(patch.quotedHours != null ? { quotedHours: () => patch.quotedHours } : {}),
            ...(patch.quotedTransport != null ? { quotedTransport: () => patch.quotedTransport } : {}),
          },
        });
      } catch {}
      refetch();
      refetchClientOrders();
      return updated;
    },
    [updateQuoteMut, apolloClient, refetch, refetchClientOrders],
  );

  const acceptQuote = useCallback(
    async (orderRealtimeId: number) => {
      _setLocalActiveOrder((prev: any) => {
        if (!prev || prev.id !== orderRealtimeId) return prev;
        return { ...prev, status: 'ACCEPTED' };
      });
      try {
        await acceptQuoteMut({
          variables: { orderRealtimeId },
        });
      } finally {
        refetch();
        refetchClientOrders();
      }
    },
    [acceptQuoteMut, refetch, refetchClientOrders],
  );

  const rejectQuote = useCallback(
    async (orderRealtimeId: number) => {
      _setLocalActiveOrder((prev: any) => {
        if (!prev || prev.id !== orderRealtimeId) return prev;
        return { ...prev, status: 'REJECTED' };
      });
      try {
        await rejectQuoteMut({
          variables: { orderRealtimeId },
        });
      } finally {
        refetch();
        refetchClientOrders();
      }
    },
    [rejectQuoteMut, refetch, refetchClientOrders],
  );

  const respondRequest = useCallback(
    async (orderRealtimeId: number, decision: string) => {
      const nextStatus = decision.toUpperCase() === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
      _setLocalProviderActiveOrder((prev: any) => {
        if (!prev || prev.id !== orderRealtimeId) return prev;
        return { ...prev, status: nextStatus };
      });
      try {
        await respondMut({
          variables: { orderRealtimeId, decision },
        });
      } finally {
        refetch();
      }
    },
    [respondMut, refetch],
  );

  const confirmArrival = useCallback(
    async (orderRealtimeId: number, lat?: number, lng?: number) => {
      const nowIso = new Date().toISOString();
      const prevClient = localActiveOrderRef.current?.id === orderRealtimeId
        ? localActiveOrderRef.current
        : (activeOrderRef.current?.id === orderRealtimeId ? activeOrderRef.current : null);
      const prevProvider = localProviderActiveOrderRef.current?.id === orderRealtimeId
        ? localProviderActiveOrderRef.current
        : (providerActiveOrderRef.current?.id === orderRealtimeId ? providerActiveOrderRef.current : null);

      _setLocalActiveOrder((prev: any) =>
        prev?.id === orderRealtimeId ? { ...prev, status: 'ARRIVED', arrivedAt: prev.arrivedAt || nowIso } : prev
      );
      _setLocalProviderActiveOrder((prev: any) =>
        prev?.id === orderRealtimeId ? { ...prev, status: 'ARRIVED', arrivedAt: prev.arrivedAt || nowIso } : prev
      );
      try {
        const res = await confirmArrivalMut({ variables: { orderRealtimeId, lat, lng } });
        const arrived = (res as any)?.data?.confirmRealtimeArrival;
        if (arrived) {
          _setLocalActiveOrder((prev: any) =>
            prev?.id === orderRealtimeId ? { ...prev, status: arrived.status || 'ARRIVED', arrivedAt: arrived.arrivedAt } : prev
          );
          _setLocalProviderActiveOrder((prev: any) =>
            prev?.id === orderRealtimeId ? { ...prev, status: arrived.status || 'ARRIVED', arrivedAt: arrived.arrivedAt } : prev
          );
        }
        return arrived;
      } catch (err) {
        if (prevClient) {
          _setLocalActiveOrder((curr: any) => (curr?.id === orderRealtimeId ? prevClient : curr));
        }
        if (prevProvider) {
          _setLocalProviderActiveOrder((curr: any) => (curr?.id === orderRealtimeId ? prevProvider : curr));
        }
        throw err;
      } finally {
        refetch();
        refetchClientOrders();
      }
    },
    [confirmArrivalMut, refetch, refetchClientOrders],
  );

  const startOrder = useCallback(
    async (orderRealtimeId: number) => {
      const nowIso = new Date().toISOString();
      const prevClient = localActiveOrderRef.current?.id === orderRealtimeId
        ? localActiveOrderRef.current
        : (activeOrderRef.current?.id === orderRealtimeId ? activeOrderRef.current : null);
      const prevProvider = localProviderActiveOrderRef.current?.id === orderRealtimeId
        ? localProviderActiveOrderRef.current
        : (providerActiveOrderRef.current?.id === orderRealtimeId ? providerActiveOrderRef.current : null);

      _setLocalActiveOrder((prev: any) =>
        prev?.id === orderRealtimeId ? { ...prev, status: 'IN_PROGRESS', startedAt: prev.startedAt || nowIso } : prev
      );
      _setLocalProviderActiveOrder((prev: any) =>
        prev?.id === orderRealtimeId ? { ...prev, status: 'IN_PROGRESS', startedAt: prev.startedAt || nowIso } : prev
      );
      try {
        const res = await startMut({ variables: { orderRealtimeId } });
        const started = (res as any)?.data?.startRealtimeOrder;
        if (started?.startedAt) {
          _setLocalActiveOrder((prev: any) =>
            prev?.id === orderRealtimeId ? { ...prev, status: started.status || 'IN_PROGRESS', startedAt: started.startedAt } : prev
          );
          _setLocalProviderActiveOrder((prev: any) =>
            prev?.id === orderRealtimeId ? { ...prev, status: started.status || 'IN_PROGRESS', startedAt: started.startedAt } : prev
          );
        }
        return started;
      } catch (err) {
        if (prevClient) {
          _setLocalActiveOrder((curr: any) => (curr?.id === orderRealtimeId ? prevClient : curr));
        }
        if (prevProvider) {
          _setLocalProviderActiveOrder((curr: any) => (curr?.id === orderRealtimeId ? prevProvider : curr));
        }
        throw err;
      } finally {
        refetch();
        refetchClientOrders();
      }
    },
    [startMut, refetch, refetchClientOrders],
  );

  const finishOrder = useCallback(
    async (orderRealtimeId: number) => {
      try {
        await finishMut({ variables: { orderRealtimeId } });
      } finally {
        _setLocalProviderActiveOrder(null);
        _setLocalActiveOrder(null);
        clearNotification();
        try {
          apolloClient.cache.evict({ id: `OrderRealTime:${orderRealtimeId}` });
          apolloClient.cache.gc();
        } catch {}
        refetch();
        refetchClientOrders();
      }
    },
    [finishMut, clearNotification, apolloClient, refetch, refetchClientOrders],
  );

  const cancellingRef = useRef(false);

  const cancelOrder = useCallback(
    async (orderRealtimeId: number) => {
      if (__DEV__) console.log(`[RT:CANCEL_START] orderId=${orderRealtimeId} role=${roleRef.current}`);
      cancellingRef.current = true;
      try {
        const { data: cancelResult } = await cancelMut({ variables: { orderRealtimeId } });
        const result = (cancelResult as any)?.cancelRealtimeOrder;
        if (__DEV__) console.log(`[RT:CANCEL_RESULT] orderId=${result?.id ?? orderRealtimeId} status=${result?.status ?? 'unknown'} role=${roleRef.current}`);
      } catch (err) {
        if (__DEV__) console.warn('[RT:CANCEL_ERROR]', err);
        throw err;
      } finally {
        _setLocalActiveOrder(null);
        _setLocalProviderActiveOrder(null);
        clearNotification();
        try {
          apolloClient.cache.evict({ id: `OrderRealTime:${orderRealtimeId}` });
          apolloClient.cache.gc();
        } catch {}
        refetch();
        refetchClientOrders();
        setTimeout(() => { cancellingRef.current = false; }, 1000);
      }
    },
    [cancelMut, clearNotification, apolloClient, refetch, refetchClientOrders],
  );

  const updateLocation = useCallback(
    async (orderRealtimeId: number, clientLat: number, clientLng: number, timestamp?: number) => {
      await updateLocMut({
        variables: { orderRealtimeId, lat: clientLat, lng: clientLng, timestamp: timestamp ?? undefined },
      });
    },
    [updateLocMut],
  );

  // P0-1: Solo el proveedor transmite telemetría continua de GPS para la orden.
  // El cliente mantiene un punto de encuentro fijo (destino del servicio) y no transmite GPS continuo.
  const trackingOrder = role === 'provider'
    ? (localProviderActiveOrder ?? (providerState?.activeRealtimeOrder as OrderRealTime | null))
    : null;

  const trackingOrderId = trackingOrder?.id ?? null;
  const trackingOrderStatus = trackingOrder?.status ?? null;

  useEffect(() => {
    if (!trackingOrderId) return;
    if (trackingOrderStatus !== 'ACCEPTED' && trackingOrderStatus !== 'ARRIVED' && trackingOrderStatus !== 'IN_PROGRESS') return;

    let watchId: number | null = null;
    let unsubSim: (() => void) | null = null;
    const lastSentRef = { current: 0 };
    const lastSentCoordsRef = { current: null as { lat: number; lng: number } | null };

    // Foreground service (Android) que mantiene vivo el proceso para que este
    // watchPosition siga reportando la ubicación con la app en segundo plano.
    startLocationTracking();

    // iOS: recién acá pedimos "Always" (justificado en contexto: el proveedor empezó a
    // trackear una orden en curso), nunca al arrancar la app. Sin este permiso, iOS pausa
    // el watchPosition apenas la app pasa a background. Nunca se dispara para un cliente.
    if (Platform.OS === 'ios' && roleRef.current === 'provider') {
      Geolocation.requestAuthorization?.('always')?.catch?.(() => {});
    }

    const dispatchOrderLocation = (position: {
      coords: { latitude: number; longitude: number };
      timestamp?: number;
    }) => {
      const now = Date.now();
      const dt = now - lastSentRef.current;
      if (dt < 1500) return; // Throttle 1.5s mínimo

      const lastCoords = lastSentCoordsRef.current;
      if (lastCoords) {
        const dLat = (position.coords.latitude - lastCoords.lat) * 111000;
        const dLng = (position.coords.longitude - lastCoords.lng) * 111000 * Math.cos((lastCoords.lat * Math.PI) / 180);
        const distMeters = Math.sqrt(dLat * dLat + dLng * dLng);

        // Si el desplazamiento es insignificante (< 4m) y pasaron menos de 10s, no saturar
        if (distMeters < 4 && dt < 10000) return;
      }

      lastSentRef.current = now;
      lastSentCoordsRef.current = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      if (__DEV__) {
        console.log(`[RT:LOCATION_SEND] actor=${roleRef.current} orderId=${trackingOrderId} lat=${position.coords.latitude} lng=${position.coords.longitude} ts=${position.timestamp}`);
      }
      updateLocation(
        trackingOrderId,
        position.coords.latitude,
        position.coords.longitude,
        position.timestamp,
      ).catch(() => {});
    };

    try {
      watchId = Geolocation.watchPosition(
        (position) => {
          if (__DEV__ && locationSimulator.isSimulating()) {
            return;
          }
          dispatchOrderLocation(position);
        },
        () => {},
        {
          enableHighAccuracy: true,
          distanceFilter: 2,
          interval: 2000,
          fastestInterval: 1000,
          showsBackgroundLocationIndicator: true,
        },
      );
      if (__DEV__) {
        console.log(`[RT:ORDER_GPS_START] actor=${roleRef.current} orderId=${trackingOrderId} watchId=${watchId}`);
      }
    } catch (_) {}

    if (__DEV__) {
      unsubSim = locationSimulator.subscribe((simulatedPos) => {
        if (simulatedPos && locationSimulator.isSimulating()) {
          dispatchOrderLocation(simulatedPos);
        }
      });
    }

    return () => {
      if (watchId != null) {
        if (__DEV__) {
          console.log(`[RT:ORDER_GPS_STOP] actor=${roleRef.current} orderId=${trackingOrderId} watchId=${watchId}`);
        }
        Geolocation.clearWatch(watchId);
      }
      if (unsubSim != null) {
        unsubSim();
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
      const confirmed = result?.confirmRealtimeFlowPayment;
      if (confirmed) {
        _setLocalActiveOrder((prev: any) =>
          prev?.id === confirmed.id ? { ...prev, status: confirmed.status || 'ACCEPTED' } : prev
        );
      }
      refetch();
      refetchClientOrders();
      return result!.confirmRealtimeFlowPayment;
    },
    [confirmPayMut, refetch, refetchClientOrders],
  );

  const payWithSavedCard = useCallback(
    async (orderRealtimeId: number) => {
      _setLocalActiveOrder((prev: any) =>
        prev?.id === orderRealtimeId ? { ...prev, status: 'ACCEPTED' } : prev
      );
      try {
        const { data: result } = await paySavedCardMut({
          variables: { orderRealtimeId },
        });
        const paid = result?.payRealtimeOrderWithSavedCard;
        if (paid) {
          _setLocalActiveOrder((prev: any) =>
            prev?.id === orderRealtimeId ? { ...prev, ...paid, status: paid.status || 'ACCEPTED' } : prev
          );
        }
        return paid!;
      } finally {
        refetch();
        refetchClientOrders();
      }
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

  const resetOrderSession = useCallback(
    (orderId?: number) => {
      _setLocalActiveOrder(null);
      _setLocalProviderActiveOrder(null);
      clearNotification();
      if (orderId) {
        delete locationTsRef.current[orderId];
        try {
          apolloClient.cache.evict({ id: `OrderRealTime:${orderId}` });
          apolloClient.cache.gc();
        } catch {}
      } else {
        locationTsRef.current = {};
      }
    },
    [apolloClient, clearNotification],
  );

  const createProviderReview = useCallback(
    async (input: CreateRealtimeProviderReviewInput) => {
      markOrderReviewed(input.orderRealtimeId);
      resetOrderSession(input.orderRealtimeId);
      try {
        await reviewProviderMut({ variables: { input } });
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('ya') && (msg.includes('calific') || msg.includes('reseñ') || msg.includes('review'))) {
          if (__DEV__) console.warn('[useTimeRealServices] Provider review already exists, ignored', err);
        } else {
          throw err;
        }
      } finally {
        refetch();
        refetchClientOrders();
      }
    },
    [markOrderReviewed, resetOrderSession, reviewProviderMut, refetch, refetchClientOrders],
  );

  const createClientReview = useCallback(
    async (input: CreateClientReviewInput) => {
      markOrderReviewed(input.orderRealtimeId);
      resetOrderSession(input.orderRealtimeId);
      try {
        await reviewClientMut({ variables: { input } });
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('ya') && (msg.includes('calific') || msg.includes('reseñ') || msg.includes('review'))) {
          if (__DEV__) console.warn('[useTimeRealServices] Client review already exists, ignored', err);
        } else {
          throw err;
        }
      } finally {
        refetch();
        refetchClientOrders();
      }
    },
    [markOrderReviewed, resetOrderSession, reviewClientMut, refetch, refetchClientOrders],
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
      const response = result!.guestCreateRealtimeContactRequest;
      if (response?.order) {
        _setLocalActiveOrder(response.order as any);
      }
      try {
        await refetch();
      } catch {}
      try {
        await refetchClientOrders();
      } catch {}
      return response;
    },
    [guestCreateContactMut, refetch, refetchClientOrders],
  );

  const clientCounterOffer = useCallback(
    async (orderRealtimeId: number, quotedPrice: number, quotedHours: number, quotedTransport: number) => {
      const { data: result } = await counterOfferMut({
        variables: {
          input: { orderRealtimeId, quotedPrice, quotedHours, quotedTransport },
        },
      });
      const updated = (result as any)?.clientCounterOfferRealtimeOrder;
      if (updated) {
        const updater = (prev: any) => {
          if (!prev || prev.id !== orderRealtimeId) return prev;
          return {
            ...prev,
            ...updated,
            counterOfferPrice: quotedPrice,
            counterOfferHours: quotedHours,
            counterOfferTransport: quotedTransport,
          };
        };
        _setLocalActiveOrder(updater);
        try {
          apolloClient.cache.modify({
            id: `OrderRealTime:${orderRealtimeId}`,
            fields: {
              counterOfferPrice: () => quotedPrice,
              counterOfferHours: () => quotedHours,
              counterOfferTransport: () => quotedTransport,
            },
          });
        } catch {}
        refetch();
        refetchClientOrders();
      }
      return updated;
    },
    [counterOfferMut, apolloClient, refetch, refetchClientOrders],
  );

  const respondToCounterOffer = useCallback(
    async (orderRealtimeId: number, decision: string) => {
      lastCounterOfferResolvedAt.current = Date.now();
      const { data: result } = await respondCounterOffMut({
        variables: { orderRealtimeId, decision },
      });
      const updated = (result as any)?.respondToCounterOffer;
      if (updated) {
        const updater = (prev: any) => {
          if (!prev || prev.id !== orderRealtimeId) return prev;
          return {
            ...prev,
            ...updated,
            counterOfferPrice: null,
            counterOfferHours: null,
            counterOfferTransport: null,
            ...(decision === 'ACCEPTED' && updated.quotedPrice != null ? {
              quotedPrice: updated.quotedPrice,
              quotedHours: updated.quotedHours ?? prev.quotedHours,
              quotedTransport: updated.quotedTransport ?? prev.quotedTransport,
            } : {}),
          };
        };
        _setLocalProviderActiveOrder(updater);
        _setLocalActiveOrder(updater);
        try {
          apolloClient.cache.modify({
            id: `OrderRealTime:${orderRealtimeId}`,
            fields: {
              counterOfferPrice: () => null,
              counterOfferHours: () => null,
              counterOfferTransport: () => null,
              ...(decision === 'ACCEPTED' && updated.quotedPrice != null ? {
                quotedPrice: () => updated.quotedPrice,
              } : {}),
            },
          });
        } catch {}
        refetch();
        refetchClientOrders();
      }
      return updated;
    },
    [respondCounterOffMut, apolloClient, refetch, refetchClientOrders],
  );

  const claimSessionControl = useCallback((orderRealtimeId: number) => {
    if (socketRef.current) {
      socketRef.current.emit('session:claim-control', { orderRealtimeId });
    }
  }, []);

  const dismissDeviceConflict = useCallback(() => {
    setDeviceConflict(null);
  }, []);

  return useMemo(
    () => ({
      loading,
      activeOrder,
      localActiveOrder,
      setLocalActiveOrder,
      cancellingRef,
      clientOrders,
      providerOrders,
      providerState,
      isRealtimeActive,
      socketStatus,
      connectionGeneration,
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
      confirmArrival,
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
      isOrderReviewed,
      markOrderReviewed,
      requestProviderToConnect,
      subscribe,
      joinChat,
      leaveChat,
      guestCreateContactRequest,
      clientCounterOffer,
      respondToCounterOffer,
      resetOrderSession,
      deviceConflict,
      dismissDeviceConflict,
      claimSessionControl,
      socketRef,
      setLocalProviderActiveOrder: _setLocalProviderActiveOrder,
    }),
    [
      loading,
      activeOrder,
      localActiveOrder,
      clientOrders,
      providerOrders,
      providerState,
      isRealtimeActive,
      socketStatus,
      connectionGeneration,
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
      confirmArrival,
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
      isOrderReviewed,
      markOrderReviewed,
      requestProviderToConnect,
      subscribe,
      joinChat,
      leaveChat,
      guestCreateContactRequest,
      clientCounterOffer,
      respondToCounterOffer,
      resetOrderSession,
      deviceConflict,
      dismissDeviceConflict,
      claimSessionControl,
      _setLocalActiveOrder,
      _setLocalProviderActiveOrder,
    ],
  );
}

