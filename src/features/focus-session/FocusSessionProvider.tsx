import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useLocation } from '../../context/LocationContext';
import { useNotification } from '../../context/NotificationContext';
import { useRoutePolyline } from '../../hooks/useRoute';
import { useRole } from '../../context/RoleContext';
import { getImageUrl } from '../../utils/imageUrl';
import { summarizeForRole } from '../../utils/ratings';
import { navigate } from '../../navigation/navigationRef';
import type { OrderRealTime } from '../../graphql/generated';
import { selectClientRealtimeOrder } from '../../bottom-sheet/core/sheetPolicy';
import type {
  FocusSessionValue,
  FocusClientSession,
  FocusProviderSession,
  ProviderOrderState,
  SessionProviderInfo,
  FocusGeoPoint,
} from './focusSession.types';

function getMetersBetween(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371e3;
  const dLat = ((la2 - la1) * Math.PI) / 180;
  const dLon = ((lo2 - lo1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatEta(meters: number): string {
  const minutes = Math.ceil(meters / 200);
  if (minutes <= 0) return 'Llegó';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

function toValidGeoPoint(lat: number | null | undefined, lng: number | null | undefined): FocusGeoPoint | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (Math.abs(lat) < 1e-4 && Math.abs(lng) < 1e-4) return null;
  return { latitude: lat, longitude: lng };
}

const toPoint = toValidGeoPoint;

const STATUS_MAP: Record<string, ProviderOrderState> = {
  PENDING: 'VIEW_REQUEST',
  QUOTED: 'WAITING_CLIENT_RESPONSE',
  PAYMENT_PENDING: 'WAITING_CLIENT_RESPONSE',
  ACCEPTED: 'EN_CAMINO',
  PROVIDER_ON_THE_WAY: 'EN_CAMINO',
  ARRIVED: 'ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'CANCELLED',
  EXPIRED: 'CANCELLED',
};

const defaultFocusSessionValue: FocusSessionValue = {
  client: {
    orderId: null,
    activeOrder: null,
    provider: null,
    distanceLabel: null,
    etaLabel: null,
    distanceToProviderKm: null,
    providerCoords: null,
    clientCoords: null,
    clientUserCoords: null,
    serviceDestinationCoords: null,
    routeCoords: [],
    realtime: {
      location: null,
      providers: [],
      activeOrder: null,
      localActiveOrder: null,
      providerActiveOrder: null,
      requestService: () => Promise.resolve(null),
      cancelOrder: () => Promise.resolve(false),
      acceptOrder: () => Promise.resolve(false),
      rejectOrder: () => Promise.resolve(false),
      quoteOrder: () => Promise.resolve(false),
      startService: () => Promise.resolve(false),
      completeOrder: () => Promise.resolve(false),
      clearOrders: () => {},
      sendChatMessage: () => {},
      fetchChatMessages: () => Promise.resolve([]),
      markMessagesAsRead: () => {},
      unreadCount: 0,
      chatMessages: [],
    } as any,
    showChat: false,
    setShowChat: () => {},
  },
  provider: {
    orderId: null,
    activeOrder: null,
    orderState: 'VIEW_REQUEST',
    setOrderState: () => {},
    distanceLabel: null,
    etaLabel: null,
    distanceMeters: null,
    isWithinArrivalRadius: false,
    providerCoords: null,
    providerLocalCoords: null,
    clientCoords: null,
    serviceDestinationCoords: null,
    routeCoords: [],
    realtime: {
      location: null,
      providers: [],
      activeOrder: null,
      localActiveOrder: null,
      providerActiveOrder: null,
      requestService: () => Promise.resolve(null),
      cancelOrder: () => Promise.resolve(false),
      acceptOrder: () => Promise.resolve(false),
      rejectOrder: () => Promise.resolve(false),
      quoteOrder: () => Promise.resolve(false),
      updateQuote: () => Promise.resolve(null),
      respondToCounterOffer: () => Promise.resolve(null),
      startService: () => Promise.resolve(false),
      completeOrder: () => Promise.resolve(false),
      clearOrders: () => {},
      sendChatMessage: () => {},
      fetchChatMessages: () => Promise.resolve([]),
      markMessagesAsRead: () => {},
      unreadCount: 0,
      chatMessages: [],
    } as any,
    showChat: false,
    setShowChat: () => {},
    handleFinish: () => {},
  },
};

const FocusSessionContext = React.createContext<FocusSessionValue | null>(null);

export function useFocusSession(): FocusSessionValue;
export function useFocusSession(role: 'client'): FocusClientSession;
export function useFocusSession(role: 'provider'): FocusProviderSession;
export function useFocusSession(role?: 'client' | 'provider'): FocusSessionValue | FocusClientSession | FocusProviderSession {
  const ctx = React.useContext(FocusSessionContext) || defaultFocusSessionValue;
  if (role === 'client') return ctx.client;
  if (role === 'provider') return ctx.provider;
  return ctx;
}

export const FocusSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const realtime = useRealtime();
  const { location } = useLocation();
  const { showNotification, clearNotification } = useNotification();
  const { role } = useRole();

  const [showChat, setShowChat] = useState(false);

  const orderStartedAtMapRef = useRef<Record<number, string>>({});

  // ---- Orden activa por rol -------------------------------------------------
  let rawClientActiveOrder: OrderRealTime | null = (selectClientRealtimeOrder(realtime.localActiveOrder, realtime.activeOrder) as OrderRealTime) ?? null;
  if (rawClientActiveOrder?.id && rawClientActiveOrder.status === 'IN_PROGRESS') {
    if (rawClientActiveOrder.startedAt) {
      orderStartedAtMapRef.current[rawClientActiveOrder.id] = rawClientActiveOrder.startedAt;
    } else {
      if (!orderStartedAtMapRef.current[rawClientActiveOrder.id]) {
        orderStartedAtMapRef.current[rawClientActiveOrder.id] = new Date().toISOString();
      }
      rawClientActiveOrder = { ...rawClientActiveOrder, startedAt: orderStartedAtMapRef.current[rawClientActiveOrder.id] };
    }
  }
  const clientActiveOrder = rawClientActiveOrder;

  const rawProviderOrder = realtime.providerActiveOrder;
  const lastProviderOrderRef = useRef<OrderRealTime | null>(rawProviderOrder);
  if (rawProviderOrder) {
    if (!['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(rawProviderOrder.status)) {
      lastProviderOrderRef.current = rawProviderOrder;
    } else {
      lastProviderOrderRef.current = null;
    }
  } else {
    lastProviderOrderRef.current = null;
  }
  let providerOrder = rawProviderOrder || lastProviderOrderRef.current;
  if (providerOrder?.id && providerOrder.status === 'IN_PROGRESS') {
    if (providerOrder.startedAt) {
      orderStartedAtMapRef.current[providerOrder.id] = providerOrder.startedAt;
    } else {
      if (!orderStartedAtMapRef.current[providerOrder.id]) {
        orderStartedAtMapRef.current[providerOrder.id] = new Date().toISOString();
      }
      providerOrder = { ...providerOrder, startedAt: orderStartedAtMapRef.current[providerOrder.id] };
    }
  }

  useEffect(() => {
    if (!__DEV__) return;
    console.log(`[RT:PROVIDER_ORDER] rawOrderId=${rawProviderOrder?.id ?? 'null'} lastOrderId=${lastProviderOrderRef.current?.id ?? 'null'} status=${rawProviderOrder?.status ?? lastProviderOrderRef.current?.status ?? 'null'}`);
  }, [rawProviderOrder?.id, rawProviderOrder?.status]);

  // ---- Session de cliente ---------------------------------------------------
  const lastKnownProviderInfoRef = useRef<SessionProviderInfo | null>(null);

  const provider: SessionProviderInfo | null = useMemo(() => {
    const p = clientActiveOrder?.provider || (clientActiveOrder?.serviceProvider as any)?.provider;
    const sp = clientActiveOrder?.serviceProvider;
    if (!p && !sp) {
      if (clientActiveOrder && !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(clientActiveOrder.status)) {
        return lastKnownProviderInfoRef.current;
      }
      lastKnownProviderInfoRef.current = null;
      return null;
    }
    const allReviews = [...(p?.reviews || []), ...(p?.realtimeReviews || [])];
    const name = p?.name || 'Profesional';
    const computed: SessionProviderInfo = {
      id: String(p?.id || sp?.id || 'provider'),
      name,
      providerName: name,
      avatar: getImageUrl(p?.logoImage?.cdnUrl || null),
      rating: allReviews.length
        ? allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length
        : 0,
      reviewsCount: allReviews.length,
      verified: p?.certificates?.some((c: any) => c.verified) || false,
      description: p?.bio || sp?.description || '',
      pricePerHour: sp?.price || 0,
      serviceName: sp?.service?.name || '',
      serviceProviderId: sp?.id,
    };
    lastKnownProviderInfoRef.current = computed;
    return computed;
  }, [clientActiveOrder]);

  const clientUserCoords = useMemo<FocusGeoPoint | null>(() => {
    return toPoint(location?.coords?.latitude, location?.coords?.longitude);
  }, [location?.coords?.latitude, location?.coords?.longitude]);

  const fixedServiceDestinationRef = useRef<{ orderId: number; coords: FocusGeoPoint } | null>(null);
  const serviceDestinationCoords = useMemo<FocusGeoPoint | null>(() => {
    const orderId = clientActiveOrder?.id;
    if (!orderId) {
      fixedServiceDestinationRef.current = null;
      return null;
    }
    if (fixedServiceDestinationRef.current?.orderId === orderId) {
      return fixedServiceDestinationRef.current.coords;
    }
    const pt = toValidGeoPoint(clientActiveOrder.clientLat, clientActiveOrder.clientLng);
    if (pt) {
      fixedServiceDestinationRef.current = { orderId, coords: pt };
      return pt;
    }
    return null;
  }, [clientActiveOrder?.id, clientActiveOrder?.clientLat, clientActiveOrder?.clientLng]);

  const clientCoords = useMemo<FocusGeoPoint | null>(() => {
    return serviceDestinationCoords ?? clientUserCoords;
  }, [serviceDestinationCoords, clientUserCoords]);

  const clientProviderCoords = useMemo<FocusGeoPoint | null>(() => {
    const lat = clientActiveOrder?.providerLat ?? clientActiveOrder?.provider?.lat;
    const lng = clientActiveOrder?.providerLng ?? clientActiveOrder?.provider?.lng;
    return toValidGeoPoint(lat, lng);
  }, [clientActiveOrder?.providerLat, clientActiveOrder?.providerLng, clientActiveOrder?.provider?.lat, clientActiveOrder?.provider?.lng]);

  const isClientRouteActive = Boolean(
    clientProviderCoords &&
    serviceDestinationCoords &&
    clientActiveOrder?.status === 'ACCEPTED'
  );
  // Regla Cardinal 4: La ruta siempre conecta al Proveedor con el Punto de Encuentro (serviceDestinationCoords), NUNCA con el GPS móvil del cliente.
  const clientRoute = useRoutePolyline(clientProviderCoords, serviceDestinationCoords, isClientRouteActive);

  const distanceLabel = useMemo(() => {
    const routeDistance = clientRoute.routeDistance;
    if (routeDistance != null && routeDistance > 0) return formatDistance(routeDistance);
    if (!serviceDestinationCoords || !clientProviderCoords) return null;
    return formatDistance(
      getMetersBetween(
        clientProviderCoords.latitude,
        clientProviderCoords.longitude,
        serviceDestinationCoords.latitude,
        serviceDestinationCoords.longitude,
      ),
    );
  }, [clientRoute.routeDistance, serviceDestinationCoords, clientProviderCoords]);

  const etaLabel = useMemo(() => {
    const routeDuration = clientRoute.routeDuration;
    if (routeDuration != null && routeDuration > 0) {
      const minutes = Math.ceil(routeDuration / 60);
      if (minutes <= 0) return 'Llegó';
      if (minutes === 1) return '1 min';
      return `${minutes} min`;
    }
    if (!serviceDestinationCoords || !clientProviderCoords) return null;
    return formatEta(
      getMetersBetween(
        clientProviderCoords.latitude,
        clientProviderCoords.longitude,
        serviceDestinationCoords.latitude,
        serviceDestinationCoords.longitude,
      ),
    );
  }, [clientRoute.routeDuration, serviceDestinationCoords, clientProviderCoords]);

  const distanceToProviderKm = useMemo(() => {
    if (!serviceDestinationCoords || !clientProviderCoords) return null;
    return (
      getMetersBetween(
        clientProviderCoords.latitude,
        clientProviderCoords.longitude,
        serviceDestinationCoords.latitude,
        serviceDestinationCoords.longitude,
      ) / 1000
    );
  }, [serviceDestinationCoords, clientProviderCoords]);

  const clientSession = useMemo<FocusClientSession>(
    () => ({
      orderId: clientActiveOrder?.id ?? null,
      activeOrder: clientActiveOrder,
      provider,
      distanceLabel,
      etaLabel,
      distanceToProviderKm,
      providerCoords: clientProviderCoords,
      clientCoords,
      clientUserCoords,
      serviceDestinationCoords,
      routeCoords: clientRoute.routeCoords,
      realtime,
      showChat,
      setShowChat,
    }),
    [clientActiveOrder, provider, distanceLabel, etaLabel, distanceToProviderKm, clientProviderCoords, clientCoords, clientUserCoords, serviceDestinationCoords, clientRoute.routeCoords, realtime, showChat],
  );

  const notifiedClientApproachingRef = useRef<Record<number, boolean>>({});
  const notifiedClientMilestonesRef = useRef<Record<number, Set<string>>>({});

  // Notificación escalonada de proximidad para el cliente (1km, 500m, 200m, 5m) y ETA
  useEffect(() => {
    if (role === 'provider') return;
    const orderId = clientActiveOrder?.id;
    if (!orderId || clientActiveOrder?.status !== 'ACCEPTED') return;

    if (!notifiedClientMilestonesRef.current[orderId]) {
      notifiedClientMilestonesRef.current[orderId] = new Set<string>();
    }
    const orderMilestones = notifiedClientMilestonesRef.current[orderId];
    const distM = distanceToProviderKm != null ? Math.round(distanceToProviderKm * 1000) : null;

    // Hito 4: 5 metros (llegada inminente / en puerta)
    if (distM != null && distM <= 10 && !orderMilestones.has('5M')) {
      orderMilestones.add('5M');
      orderMilestones.add('200M');
      orderMilestones.add('500M');
      orderMilestones.add('1000M');
      showNotification({
        id: `clientOrder:${orderId}:DIST_5M`,
        title: 'Profesional por llegar',
        message: 'El profesional está en tu puerta (a 5 metros de tu ubicación).',
        type: 'info',
      });
    }
    // Hito 3: 200 metros
    else if (distM != null && distM <= 200 && !orderMilestones.has('200M')) {
      orderMilestones.add('200M');
      orderMilestones.add('500M');
      orderMilestones.add('1000M');
      showNotification({
        id: `clientOrder:${orderId}:DIST_200M`,
        title: 'Profesional a 200 m',
        message: 'El profesional está muy cerca (a 200 metros).',
        type: 'info',
      });
    }
    // Hito 2: 500 metros
    else if (distM != null && distM <= 500 && !orderMilestones.has('500M')) {
      orderMilestones.add('500M');
      orderMilestones.add('1000M');
      showNotification({
        id: `clientOrder:${orderId}:DIST_500M`,
        title: 'Profesional a 500 m',
        message: 'El profesional está a 500 metros de tu ubicación.',
        type: 'info',
      });
    }
    // Hito 1: 1 km (1.000 metros)
    else if (distM != null && distM <= 1000 && !orderMilestones.has('1000M')) {
      orderMilestones.add('1000M');
      showNotification({
        id: `clientOrder:${orderId}:DIST_1000M`,
        title: 'Profesional a 1 km',
        message: 'El profesional se encuentra a aproximadamente 1 km de tu ubicación.',
        type: 'info',
      });
    }

    // Alerta complementaria basada en ETA (<= 5 min)
    if (!notifiedClientApproachingRef.current[orderId]) {
      const match = etaLabel ? etaLabel.match(/(\d+)\s*min/) : null;
      const isUnderOneMin = etaLabel ? (etaLabel.includes('< 1') || etaLabel.includes('<1')) : false;
      const mins = match ? parseInt(match[1], 10) : (isUnderOneMin ? 1 : null);
      const isEtaClose = mins !== null && mins <= 5 && mins > 0;

      if (isEtaClose) {
        notifiedClientApproachingRef.current[orderId] = true;
        showNotification({
          id: `clientOrder:${orderId}:APPROACHING`,
          title: 'Profesional por llegar',
          message: `El profesional está por llegar en ${etaLabel}.`,
          type: 'info',
        });
      }
    }
  }, [role, clientActiveOrder?.id, clientActiveOrder?.status, distanceToProviderKm, etaLabel, showNotification]);

  // ---- Session de proveedor ------------------------------------------------
  const [orderState, setOrderState] = useState<ProviderOrderState>('VIEW_REQUEST');
  const [distanceRemaining, setDistanceRemaining] = useState('...');
  const [etaRemaining, setEtaRemaining] = useState('...');

  const fixedProviderClientDestRef = useRef<{ orderId: number; coords: FocusGeoPoint } | null>(null);
  const providerClientCoords = useMemo<FocusGeoPoint | null>(() => {
    const orderId = providerOrder?.id;
    const isTerminal = providerOrder?.status ? ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(providerOrder.status) : false;
    if (!providerOrder || !orderId || isTerminal) {
      fixedProviderClientDestRef.current = null;
      return null;
    }
    if (fixedProviderClientDestRef.current?.orderId === orderId) {
      return fixedProviderClientDestRef.current.coords;
    }
    const pt = toValidGeoPoint(providerOrder.clientLat, providerOrder.clientLng);
    if (pt) {
      fixedProviderClientDestRef.current = { orderId, coords: pt };
      return pt;
    }
    return null;
  }, [providerOrder?.id, providerOrder?.status, providerOrder?.clientLat, providerOrder?.clientLng]);

  const liveProviderCoords = useMemo<FocusGeoPoint | null>(() => {
    const localPoint = toValidGeoPoint(location?.coords?.latitude, location?.coords?.longitude);
    if (localPoint) return localPoint;
    return toValidGeoPoint(providerOrder?.providerLat, providerOrder?.providerLng);
  }, [location?.coords?.latitude, location?.coords?.longitude, providerOrder?.providerLat, providerOrder?.providerLng]);

  const providerOrderId = providerOrder?.id ?? null;
  const lastProviderOrderIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (providerOrderId != null && providerOrderId !== lastProviderOrderIdRef.current) {
      lastProviderOrderIdRef.current = providerOrderId;
      setOrderState('VIEW_REQUEST');
      setDistanceRemaining('...');
      setEtaRemaining('...');
    }
  }, [providerOrderId]);

  const isProviderRouteActive = Boolean(
    liveProviderCoords &&
    providerClientCoords &&
    (orderState === 'EN_CAMINO' || orderState === 'VIEW_REQUEST')
  );

  const providerRoute = useRoutePolyline(
    liveProviderCoords,
    providerClientCoords,
    isProviderRouteActive,
  );

  useEffect(() => {
    if (!__DEV__) return;
    console.log(`[MAP:ROUTE_ORDER] orderId=${providerOrder?.id ?? 'null'} status=${providerOrder?.status ?? 'null'} orderState=${orderState} routeActive=${isProviderRouteActive} hasProviderCoords=${!!liveProviderCoords} hasClientCoords=${!!providerClientCoords}`);
  }, [providerOrder?.id, providerOrder?.status, orderState, isProviderRouteActive, liveProviderCoords, providerClientCoords]);

  const providerDistanceLabel = useMemo(() => {
    const routeDistance = providerRoute.routeDistance;
    if (routeDistance != null && routeDistance > 0) return formatDistance(routeDistance);
    if (!liveProviderCoords || !providerClientCoords) return '...';
    return formatDistance(
      getMetersBetween(
        liveProviderCoords.latitude,
        liveProviderCoords.longitude,
        providerClientCoords.latitude,
        providerClientCoords.longitude,
      ),
    );
  }, [providerRoute.routeDistance, liveProviderCoords, providerClientCoords]);

  const providerEtaLabel = useMemo(() => {
    const routeDuration = providerRoute.routeDuration;
    if (routeDuration != null && routeDuration > 0) {
      const minutes = Math.ceil(routeDuration / 60);
      if (minutes <= 0) return 'Llegó';
      if (minutes === 1) return '1 min';
      return `${minutes} min`;
    }
    if (!liveProviderCoords || !providerClientCoords) return '...';
    return formatEta(
      getMetersBetween(
        liveProviderCoords.latitude,
        liveProviderCoords.longitude,
        providerClientCoords.latitude,
        providerClientCoords.longitude,
      ),
    );
  }, [providerRoute.routeDuration, liveProviderCoords, providerClientCoords]);

  const distanceMeters = useMemo(() => {
    if (!liveProviderCoords || !providerClientCoords) return null;
    return getMetersBetween(
      liveProviderCoords.latitude,
      liveProviderCoords.longitude,
      providerClientCoords.latitude,
      providerClientCoords.longitude,
    );
  }, [liveProviderCoords, providerClientCoords]);

  const isWithinArrivalRadius = Boolean(distanceMeters !== null && distanceMeters <= 100);

  // Mapeo de status realtime -> estado de sesión de proveedor.
  useEffect(() => {
    const r = realtime?.providerActiveOrder;
    if (!r) {
      return;
    }
    const mapped = STATUS_MAP[r.status];
    if (mapped && mapped !== orderState) {
      setOrderState(mapped);
    }
  }, [realtime?.providerActiveOrder, orderState]);

  const hasNotifiedArrivalRef = useRef<{ orderId: number; notified: boolean } | null>(null);
  const notifiedStatesByOrderRef = useRef<Record<number, Set<string>>>({});

  // Notificación de proximidad al llegar a la zona del cliente (<= 100m) mientras está en camino.
  useEffect(() => {
    if (role === 'client') return;
    const currentOrderId = providerOrder?.id;
    if (!currentOrderId) return;
    if (!notifiedStatesByOrderRef.current[currentOrderId]) {
      notifiedStatesByOrderRef.current[currentOrderId] = new Set<string>();
    }
    const orderNotified = notifiedStatesByOrderRef.current[currentOrderId];
    if (orderState === 'EN_CAMINO' && isWithinArrivalRadius && !orderNotified.has('NEAR_CLIENT')) {
      orderNotified.add('NEAR_CLIENT');
      showNotification({
        id: `providerOrder:${currentOrderId}:NEAR_CLIENT`,
        title: 'Llegada a Destino',
        message: 'Has llegado a la ubicación del cliente. Confirma tu llegada para que el cliente pueda iniciar el servicio.',
        type: 'info',
      });
    }
  }, [role, orderState, isWithinArrivalRadius, providerOrder?.id, showNotification]);

  // Notificaciones por transición de estado del servicio (garantizadas 1 vez por orden y estado).
  useEffect(() => {
    if (role === 'client') return;
    const currentOrderId = providerOrder?.id;
    if (!currentOrderId) return;

    if (!notifiedStatesByOrderRef.current[currentOrderId]) {
      notifiedStatesByOrderRef.current[currentOrderId] = new Set<string>();
    }
    const orderNotified = notifiedStatesByOrderRef.current[currentOrderId];

    if (orderState === 'EN_CAMINO' && !orderNotified.has('EN_CAMINO')) {
      orderNotified.add('EN_CAMINO');
      showNotification({
        id: `providerOrder:${currentOrderId}:EN_CAMINO`,
        title: 'Nueva Orden de Trabajo',
        message: 'Dirígete a la ubicación del cliente para iniciar el servicio.',
        type: 'info',
      });
    } else if (orderState === 'ARRIVED' && !orderNotified.has('ARRIVED')) {
      orderNotified.add('ARRIVED');
      hasNotifiedArrivalRef.current = { orderId: currentOrderId, notified: true };
      showNotification({
        id: `providerOrder:${currentOrderId}:ARRIVED`,
        title: 'Llegada Confirmada',
        message: 'Has confirmado tu llegada al domicilio. Esperando que el cliente inicie el servicio.',
        type: 'success',
      });
    } else if (orderState === 'IN_PROGRESS' && !orderNotified.has('IN_PROGRESS')) {
      orderNotified.add('IN_PROGRESS');
      showNotification({
        id: `providerOrder:${currentOrderId}:IN_PROGRESS`,
        title: 'Servicio Iniciado',
        message: 'Cronómetro activo.',
        type: 'info',
      });
    } else if (orderState === 'COMPLETED' && !orderNotified.has('COMPLETED')) {
      orderNotified.add('COMPLETED');
      showNotification({
        id: `providerOrder:${currentOrderId}:COMPLETED`,
        title: 'Trabajo Completado',
        message: 'Has finalizado el servicio.',
        type: 'success',
      });
    }
  }, [role, orderState, providerOrder?.id, showNotification]);

  const handleFinish = useCallback(
    (overrideState?: ProviderOrderState) => {
      const targetState = overrideState || orderState;
      const targetOrder = providerOrder;
      lastProviderOrderRef.current = null;
      lastKnownProviderInfoRef.current = null;
      fixedProviderClientDestRef.current = null;
      if (targetOrder?.id) {
        delete orderStartedAtMapRef.current[targetOrder.id];
      }
      clearNotification();
      realtime.setLocalActiveOrder(null);
      realtime.setLocalProviderActiveOrder?.(null);
      realtime.resetOrderSession?.(targetOrder?.id);

      if (targetState === 'COMPLETED' && targetOrder) {
        const clientSummary = summarizeForRole(targetOrder?.client, 'client');
        navigate('Rating', {
          role: 'provider',
          targetUser: {
            name: targetOrder?.client?.displayName || 'Cliente',
            avatar: null,
            rating: clientSummary?.rating ?? 0,
            reviewsCount: clientSummary?.count ?? 0,
            subtext: targetOrder?.serviceProvider?.service?.name || '',
          },
          serviceDetails: targetOrder?.clientDescription || '',
          amount: targetOrder?.payment?.amount || targetOrder?.quotedPrice || 0,
          address: targetOrder?.clientAddress || '',
          orderRealtimeId: targetOrder?.id,
          clientId: targetOrder?.client?.id,
        });
      } else {
        navigate('MainApp');
      }
    },
    [clearNotification, orderState, providerOrder, realtime],
  );

  const providerSession = useMemo<FocusProviderSession>(
    () => ({
      orderId: providerOrderId,
      activeOrder: providerOrder,
      orderState,
      setOrderState,
      distanceLabel: providerDistanceLabel,
      etaLabel: providerEtaLabel,
      distanceMeters,
      isWithinArrivalRadius,
      providerCoords: liveProviderCoords,
      providerLocalCoords: liveProviderCoords,
      clientCoords: providerClientCoords,
      serviceDestinationCoords: providerClientCoords,
      routeCoords: providerRoute.routeCoords,
      realtime,
      showChat,
      setShowChat,
      handleFinish,
    }),
    [providerOrderId, providerOrder, orderState, providerDistanceLabel, providerEtaLabel, distanceMeters, isWithinArrivalRadius, liveProviderCoords, providerClientCoords, providerRoute.routeCoords, realtime, showChat, handleFinish],
  );

  const value = useMemo<FocusSessionValue>(() => ({ client: clientSession, provider: providerSession }), [clientSession, providerSession]);

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>;
};
