import type { SheetKey } from './bottomSheet.types';
import type { AppRole } from '../../types/graphql';

export const TERMINAL_REALTIME_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];
export const PROVIDER_FOCUS_STATUSES = ['PENDING', 'QUOTED', 'ACCEPTED', 'IN_PROGRESS'];

export type DesiredMapSurface =
  | { kind: 'SHEET'; key: SheetKey; reason: string }
  | { kind: 'NO_SHEET_BY_DESIGN'; reason: 'WAITING_PROVIDER_QUOTE' };

export interface RealtimeOrderLike {
  id?: number | null;
  status?: string | null;
  provider?: any;
  serviceProvider?: any;
}

export function selectClientRealtimeOrder<T extends RealtimeOrderLike>(
  localOrder: T | null | undefined,
  domainOrder: T | null | undefined
): T | null | undefined {
  if (domainOrder?.status && !TERMINAL_REALTIME_STATUSES.includes(domainOrder.status)) return domainOrder;
  if (localOrder?.status && !TERMINAL_REALTIME_STATUSES.includes(localOrder.status)) return localOrder;
  return domainOrder || localOrder;
}

export function deriveDesiredMapSurface(params: {
  role: AppRole | string;
  clientActiveOrder?: RealtimeOrderLike | null;
  providerActiveOrder?: RealtimeOrderLike | null;
}): DesiredMapSurface {
  const { role, clientActiveOrder, providerActiveOrder } = params;

  if (role === 'provider') {
    const order = providerActiveOrder;
    if (order?.status && PROVIDER_FOCUS_STATUSES.includes(order.status)) {
      return { kind: 'SHEET', key: 'focus_provider', reason: 'provider_domain_order' };
    }
    return { kind: 'SHEET', key: 'provider_dashboard', reason: 'provider_default' };
  }

  const order = clientActiveOrder;
  if (order?.id && order.status === 'PENDING') {
    return { kind: 'NO_SHEET_BY_DESIGN', reason: 'WAITING_PROVIDER_QUOTE' };
  }
  if (order?.id && order.status && !TERMINAL_REALTIME_STATUSES.includes(order.status)) {
    return {
      kind: 'SHEET',
      key: 'focus_client',
      reason: order.provider ? 'client_domain_order_with_provider' : 'client_domain_order_missing_provider',
    };
  }
  return { kind: 'SHEET', key: 'categories', reason: 'client_default' };
}
