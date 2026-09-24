import type { SheetKey } from './bottomSheet.types';
import type { AppRole } from '../../types/appRole';

export const TERMINAL_REALTIME_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
export const PROVIDER_FOCUS_STATUSES = ['PENDING', 'QUOTED', 'PAYMENT_PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'];

export type DesiredMapSurface =
  | { kind: 'SHEET'; key: SheetKey; reason: string }
  | { kind: 'NO_SHEET_BY_DESIGN'; reason: string };

export interface RealtimeOrderLike {
  id?: number | null;
  status?: string | null;
  provider?: any;
  serviceProvider?: any;
}

export const REALTIME_STATUS_RANK: Record<string, number> = {
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

export function selectClientRealtimeOrder<T = any>(
  localOrder?: any,
  domainOrder?: any
): T {
  if (!localOrder && !domainOrder) return null as T;
  if (!localOrder) return domainOrder as T;
  if (!domainOrder) return localOrder as T;

  const isLocalTerminal = localOrder.status ? TERMINAL_REALTIME_STATUSES.includes(localOrder.status) : false;
  const isDomainTerminal = domainOrder.status ? TERMINAL_REALTIME_STATUSES.includes(domainOrder.status) : false;

  if (isLocalTerminal && !isDomainTerminal && domainOrder.status) {
    return domainOrder as T;
  }
  if (isDomainTerminal && !isLocalTerminal && localOrder.status) {
    return localOrder as T;
  }
  if (isLocalTerminal && isDomainTerminal) {
    return (domainOrder || localOrder) as T;
  }

  const localRank = (localOrder.status && REALTIME_STATUS_RANK[localOrder.status]) ?? 0;
  const domainRank = (domainOrder.status && REALTIME_STATUS_RANK[domainOrder.status]) ?? 0;

  let chosenOrder: any;
  if (localRank > domainRank) {
    chosenOrder = localOrder;
  } else if (domainRank > localRank) {
    chosenOrder = domainOrder;
  } else {
    chosenOrder = localOrder;
  }

  const fallbackProvider = localOrder.provider || domainOrder.provider;
  const fallbackServiceProvider = localOrder.serviceProvider || domainOrder.serviceProvider;
  const fallbackStartedAt =
    chosenOrder.startedAt ||
    localOrder.startedAt ||
    domainOrder.startedAt ||
    (chosenOrder.status === 'IN_PROGRESS' || localOrder.status === 'IN_PROGRESS' || domainOrder.status === 'IN_PROGRESS'
      ? new Date().toISOString()
      : undefined);

  return {
    ...domainOrder,
    ...chosenOrder,
    ...(fallbackProvider ? { provider: fallbackProvider } : {}),
    ...(fallbackServiceProvider ? { serviceProvider: fallbackServiceProvider } : {}),
    ...(fallbackStartedAt ? { startedAt: fallbackStartedAt } : {}),
  } as T;
}

export function deriveDesiredMapSurface(params: {
  role: AppRole | string;
  clientActiveOrder?: RealtimeOrderLike | null;
  providerActiveOrder?: RealtimeOrderLike | null;
}): DesiredMapSurface {
  const { role, clientActiveOrder, providerActiveOrder } = params;

  if (role === 'provider') {
    const order = providerActiveOrder;
    if (order?.status && (PROVIDER_FOCUS_STATUSES.includes(order.status) || !TERMINAL_REALTIME_STATUSES.includes(order.status))) {
      return { kind: 'SHEET', key: 'focus_provider', reason: 'provider_domain_order' };
    }
    return { kind: 'SHEET', key: 'provider_dashboard', reason: 'provider_default' };
  }

  const order = clientActiveOrder;
  if (order?.id && order.status && !TERMINAL_REALTIME_STATUSES.includes(order.status)) {
    if (order.status === 'PENDING') {
      return {
        kind: 'NO_SHEET_BY_DESIGN',
        reason: 'client_order_pending_quote',
      };
    }
    return {
      kind: 'SHEET',
      key: 'focus_client',
      reason: order.provider
        ? 'client_domain_order_with_provider'
        : 'client_domain_order_missing_provider',
    };
  }
  return { kind: 'SHEET', key: 'categories', reason: 'client_default' };
}
