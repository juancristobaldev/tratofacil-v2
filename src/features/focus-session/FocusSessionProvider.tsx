import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useLocation } from '../../context/LocationContext';
import { useNotification } from '../../context/NotificationContext';
import { useRoutePolyline } from '../../hooks/useRoute';
import { getImageUrl } from '../../utils/imageUrl';
import { summarizeForRole } from '../../utils/ratings';
import { navigate } from '../../navigation/navigationRef';
import type { OrderRealTime } from '../../types/graphql';
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

function toPoint(lat: number | null | undefined, lng: number | null | undefined): FocusGeoPoint | null {
  return lat != null && lng != null ? { latitude: lat, longitude: lng } : null;
}

const STATUS_MAP: Record<string, ProviderOrderState> = {
  PENDING: 'VIEW_REQUEST',
  QUOTED: 'WAITING_CLIENT_RESPONSE',
  ACCEPTED: 'EN_CAMINO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'CANCELLED',
  EXPIRED: 'CANCELLED',
};

const FocusSessionContext = React.createContext<FocusSessionValue | null>(null);

export function useFocusSession(): FocusSessionValue;
export function useFocusSession(role: 'client'): FocusClientSession;
export function useFocusSession(role: 'provider'): FocusProviderSession;
export function useFocusSession(role?: 'client' | 'provider'): FocusSessionValue | FocusClientSession | FocusProviderSession {
  const ctx = React.useContext(FocusSessionContext);
  if (!ctx) {
    throw new Error('useFocusSession must be used within a <FocusSessionProvider>');
  }
  if (role === 'client') return ctx.client;
  if (role === 'provider') return ctx.provider;
  return ctx;
}

export const FocusSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const realtime = useRealtime();
  const { location } = useLocation();
  const { showNotification } = useNotification();

  const [showChat, setShowChat] = useState(false);

  // ---- Orden activa por rol -------------------------------------------------
  const clientActiveOrder: OrderRealTime | null = realtime.localActiveOrder || realtime.activeOrder;

  const rawProviderOrder = realtime.providerActiveOrder;
  const lastProviderOrderRef = useRef<OrderRealTime | null>(rawProviderOrder);
  if (rawProviderOrder && !['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(rawProviderOrder.status)) {
    lastProviderOrderRef.current = rawProviderOrder;
  } else {
    lastProviderOrderRef.current = null;
  }
  const providerOrder = rawProviderOrder || lastProviderOrderRef.current;

  useEffect(() => {
    if (!__DEV__) return;
    console.log(`[RT:PROVIDER_ORDER] rawOrderId=${rawProviderOrder?.id ?? 'null'} lastOrderId=${lastProviderOrderRef.current?.id ?? 'null'} status=${rawProviderOrder?.status ?? lastProviderOrderRef.current?.status ?? 'null'}`);
  }, [rawProviderOrder?.id, rawProviderOrder?.status]);

  // ---- Session de cliente ---------------------------------------------------
  const provider: SessionProviderInfo | null = useMemo(() => {
    const p = clientActiveOrder?.provider;
    const sp = clientActiveOrder?.serviceProvider;
    if (!p) return null;
    const allReviews = [...(p.reviews || []), ...(p.realtimeReviews || [])];
    return {
      id: String(p.id),
      name: p.name,
      providerName: p.name,
      avatar: getImageUrl(p.logoImage?.cdnUrl || null),
      rating: allReviews.length
        ? allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length
        : 0,
      reviewsCount: allReviews.length,
      verified: p.certificates?.some((c: any) => c.verified) || false,
      description: p.bio || '',
      pricePerHour: sp?.price || 0,
      serviceName: sp?.service?.name || '',
      serviceProviderId: sp?.id,
    };
  }, [clientActiveOrder]);

  const clientCoords = useMemo<FocusGeoPoint | null>(() => {
    const lat = clientActiveOrder?.clientLat ?? location?.coords?.latitude;
    const lng = clientActiveOrder?.clientLng ?? location?.coords?.longitude;
    return toPoint(lat, lng);
  }, [clientActiveOrder?.clientLat, clientActiveOrder?.clientLng, location?.coords?.latitude, location?.coords?.longitude]);

  const clientProviderCoords = useMemo<FocusGeoPoint | null>(() => {
    const lat = clientActiveOrder?.providerLat ?? clientActiveOrder?.provider?.lat;
    const lng = clientActiveOrder?.providerLng ?? clientActiveOrder?.provider?.lng;
    return toPoint(lat, lng);
  }, [clientActiveOrder?.providerLat, clientActiveOrder?.providerLng, clientActiveOrder?.provider?.lat, clientActiveOrder?.provider?.lng]);

  const clientRoute = useRoutePolyline(clientProviderCoords, clientCoords, true);

  const distanceLabel = useMemo(() => {
    const routeDistance = clientRoute.routeDistance;
    if (routeDistance != null && routeDistance > 0) return formatDistance(routeDistance);
    if (!clientCoords || !clientProviderCoords) return null;
    return formatDistance(
      getMetersBetween(
        clientProviderCoords.latitude,
        clientProviderCoords.longitude,
        clientCoords.latitude,
        clientCoords.longitude,
      ),
    );
  }, [clientRoute.routeDistance, clientCoords, clientProviderCoords]);

  const etaLabel = useMemo(() => {
    const routeDuration = clientRoute.routeDuration;
    if (routeDuration != null && routeDuration > 0) {
      const minutes = Math.ceil(routeDuration / 60);
      if (minutes <= 0) return 'Llegó';
      if (minutes === 1) return '1 min';
      return `${minutes} min`;
    }
    if (!clientCoords || !clientProviderCoords) return null;
    return formatEta(
      getMetersBetween(
        clientProviderCoords.latitude,
        clientProviderCoords.longitude,
        clientCoords.latitude,
        clientCoords.longitude,
      ),
    );
  }, [clientRoute.routeDuration, clientCoords, clientProviderCoords]);

  const distanceToProviderKm = useMemo(() => {
    if (!clientCoords || !clientProviderCoords) return null;
    return (
      getMetersBetween(
        clientProviderCoords.latitude,
        clientProviderCoords.longitude,
        clientCoords.latitude,
        clientCoords.longitude,
      ) / 1000
    );
  }, [clientCoords, clientProviderCoords]);

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
      routeCoords: clientRoute.routeCoords,
      realtime,
      showChat,
      setShowChat,
    }),
    [clientActiveOrder, provider, distanceLabel, etaLabel, distanceToProviderKm, clientProviderCoords, clientCoords, clientRoute.routeCoords, realtime, showChat],
  );

  // ---- Session de proveedor ------------------------------------------------
  const [orderState, setOrderState] = useState<ProviderOrderState>('VIEW_REQUEST');
  const [distanceRemaining, setDistanceRemaining] = useState('...');
  const [etaRemaining, setEtaRemaining] = useState('...');

  const providerClientCoords = useMemo<FocusGeoPoint | null>(() => {
    const lat = providerOrder?.clientLat ?? location?.coords?.latitude;
    const lng = providerOrder?.clientLng ?? location?.coords?.longitude;
    return toPoint(lat, lng);
  }, [providerOrder?.clientLat, providerOrder?.clientLng, location?.coords?.latitude, location?.coords?.longitude]);

  const liveProviderCoords = useMemo<FocusGeoPoint | null>(() => {
    const lat = location?.coords?.latitude ?? providerOrder?.providerLat;
    const lng = location?.coords?.longitude ?? providerOrder?.providerLng;
    return toPoint(lat, lng);
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

  const providerRoute = useRoutePolyline(
    liveProviderCoords,
    providerClientCoords,
    orderState === 'EN_CAMINO' || orderState === 'ARRIVED',
  );

  useEffect(() => {
    if (!__DEV__) return;
    console.log(`[MAP:ROUTE_ORDER] orderId=${providerOrder?.id ?? 'null'} status=${providerOrder?.status ?? 'null'} orderState=${orderState} routeActive=${orderState === 'EN_CAMINO' || orderState === 'ARRIVED'} hasProviderCoords=${!!liveProviderCoords} hasClientCoords=${!!providerClientCoords}`);
  }, [providerOrder?.id, providerOrder?.status, orderState, liveProviderCoords, providerClientCoords]);

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

  // Mapeo de status realtime -> estado de sesión de proveedor.
  useEffect(() => {
    const r = realtime?.providerActiveOrder;
    if (!r) {
      if (orderState !== 'CANCELLED' && orderState !== 'COMPLETED') {
        setOrderState('CANCELLED');
      }
      return;
    }
    const mapped = STATUS_MAP[r.status];
    if (mapped && mapped !== orderState) {
      setOrderState(mapped);
    }
  }, [realtime?.providerActiveOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notificaciones por transición de estado del servicio.
  useEffect(() => {
    if (orderState === 'EN_CAMINO') {
      showNotification({ title: 'Nueva Orden de Trabajo', message: 'Dirígete a la ubicación del cliente para iniciar el servicio.', type: 'info' });
    } else if (orderState === 'ARRIVED') {
      showNotification({ title: 'Llegada a Destino', message: 'Has llegado a la ubicación del cliente.', type: 'success' });
    } else if (orderState === 'IN_PROGRESS') {
      showNotification({ title: 'Servicio Iniciado', message: 'Cronómetro activo.', type: 'info' });
    } else if (orderState === 'COMPLETED') {
      showNotification({ title: 'Trabajo Completado', message: 'Has finalizado el servicio.', type: 'success' });
    }
  }, [orderState, showNotification]);

  // Detección de llegada (< 100m) durante el traslado.
  useEffect(() => {
    if (orderState !== 'EN_CAMINO' || !liveProviderCoords || !providerClientCoords) return;
    const m = getMetersBetween(
      liveProviderCoords.latitude,
      liveProviderCoords.longitude,
      providerClientCoords.latitude,
      providerClientCoords.longitude,
    );
    if (m < 100) {
      setOrderState('ARRIVED');
    }
  }, [orderState, liveProviderCoords?.latitude, liveProviderCoords?.longitude, providerClientCoords?.latitude, providerClientCoords?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = useCallback(() => {
    realtime.setLocalActiveOrder(null);
    if (orderState === 'COMPLETED') {
      const clientSummary = summarizeForRole(providerOrder?.client, 'client');
      navigate('Rating', {
        role: 'provider',
        targetUser: {
          name: providerOrder?.client?.displayName || 'Cliente',
          avatar: null,
          rating: clientSummary?.rating ?? 0,
          reviewsCount: clientSummary?.count ?? 0,
          subtext: providerOrder?.serviceProvider?.service?.name || '',
        },
        serviceDetails: providerOrder?.clientDescription || '',
        amount: providerOrder?.quotedPrice || 0,
        address: providerOrder?.clientAddress || '',
        orderRealtimeId: providerOrder?.id,
        clientId: providerOrder?.client?.id,
      });
    } else {
      navigate('MainApp');
    }
  }, [orderState, providerOrder, realtime]);

  const providerSession = useMemo<FocusProviderSession>(
    () => ({
      orderId: providerOrderId,
      activeOrder: providerOrder,
      orderState,
      setOrderState,
      distanceLabel: providerDistanceLabel,
      etaLabel: providerEtaLabel,
      providerCoords: liveProviderCoords,
      clientCoords: providerClientCoords,
      routeCoords: providerRoute.routeCoords,
      realtime,
      showChat,
      setShowChat,
      handleFinish,
    }),
    [providerOrderId, providerOrder, orderState, providerDistanceLabel, providerEtaLabel, liveProviderCoords, providerClientCoords, providerRoute.routeCoords, realtime, showChat, handleFinish],
  );

  const value = useMemo<FocusSessionValue>(() => ({ client: clientSession, provider: providerSession }), [clientSession, providerSession]);

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>;
};
