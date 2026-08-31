import type { OrderRealTime } from '../../graphql/generated';
import type { UseTimeRealServicesReturn } from '../../hooks/useTimeRealServices';

export interface FocusGeoPoint {
  latitude: number;
  longitude: number;
}

export interface SessionProviderInfo {
  id: string;
  name: string;
  providerName?: string;
  avatar?: string | null;
  rating?: number;
  reviewsCount?: number;
  verified?: boolean;
  isRealtimeActive?: boolean;
  description?: string | null;
  serviceName?: string;
  serviceProviderId?: number;
  pricePerHour?: number;
}

export type ProviderOrderState =
  | 'VIEW_REQUEST'
  | 'WAITING_CLIENT_RESPONSE'
  | 'EN_CAMINO'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface FocusClientSession {
  orderId: number | null;
  activeOrder: OrderRealTime | null;
  provider: SessionProviderInfo | null;
  distanceLabel: string | null;
  etaLabel: string | null;
  distanceToProviderKm: number | null;
  providerCoords: FocusGeoPoint | null;
  clientCoords: FocusGeoPoint | null;
  routeCoords: FocusGeoPoint[];
  realtime: UseTimeRealServicesReturn;
  showChat: boolean;
  setShowChat: (visible: boolean) => void;
}

export interface FocusProviderSession {
  orderId: number | null;
  activeOrder: OrderRealTime | null;
  orderState: ProviderOrderState;
  setOrderState: (state: ProviderOrderState) => void;
  distanceLabel: string | null;
  etaLabel: string | null;
  providerCoords: FocusGeoPoint | null;
  clientCoords: FocusGeoPoint | null;
  routeCoords: FocusGeoPoint[];
  realtime: UseTimeRealServicesReturn;
  showChat: boolean;
  setShowChat: (visible: boolean) => void;
  handleFinish: () => void;
}

export interface FocusSessionValue {
  client: FocusClientSession;
  provider: FocusProviderSession;
}

export type FocusRole = 'client' | 'provider';