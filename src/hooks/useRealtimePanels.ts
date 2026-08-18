import { useEffect } from 'react';
import { useRealtime } from '../realtime/RealtimeContext';
import { useBottomSheet } from '../bottom-sheet/core/useBottomSheet';

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'];

const STATUS_TO_PROVIDER_STATE: Record<string, string> = {
  PENDING: 'VIEW_REQUEST',
  QUOTED: 'WAITING_CLIENT_RESPONSE',
  ACCEPTED: 'EN_CAMINO',
  IN_PROGRESS: 'IN_PROGRESS',
};

export function useRealtimePanels(role: string, isMapFlowActive: boolean): void {
  const realtime = useRealtime();
  const { present, active } = useBottomSheet();

  // Cliente/guest: si hay una orden realtime activa (no terminal) y no está
  // visible el panel focus_client, lo abrimos.
  useEffect(() => {
    if (!isMapFlowActive) return;
    if (role === 'provider') return;
    if (realtime.cancellingRef?.current) return;

    const order = realtime.localActiveOrder || realtime.activeOrder;
    if (!order?.status) return;
    if (active === 'focus_client') return;
    if (TERMINAL_STATUSES.includes(order.status)) return;
    if (!order.provider) return;

    present('focus_client', { orderId: order.id });
  }, [realtime.activeOrder, realtime.cancellingRef, present, active, role, isMapFlowActive]);

  // Proveedor: si hay una orden realtime activa (no terminal), retomamos focus mode.
  useEffect(() => {
    if (!isMapFlowActive) return;
    if (role !== 'provider') return;
    if (realtime.cancellingRef?.current) return;

    const order = realtime.providerActiveOrder;
    if (!order?.status) return;
    if (active === 'focus_provider') return;
    if (TERMINAL_STATUSES.includes(order.status)) return;

    const orderState = STATUS_TO_PROVIDER_STATE[order.status];
    if (!orderState) return;

    present('focus_provider', { orderId: order.id });
  }, [
    realtime.providerActiveOrder,
    realtime.cancellingRef,
    present,
    active,
    role,
    isMapFlowActive,
  ]);
}
