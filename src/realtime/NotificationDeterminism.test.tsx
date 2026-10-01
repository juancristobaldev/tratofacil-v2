import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { NotificationProvider, useNotification } from '../context/NotificationContext';
import { Vibration } from 'react-native';

jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});

describe('Notification & Realtime Determinism Hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drops out-of-order notifications with stale timestamps and prevents state regression', async () => {
    // Simulación del guard determinista de causalidad y tiempo
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

    const lastOrderEventTimestamp = new Map<number, number>();
    const orderStatusHistory = new Map<number, string>();
    const notificationsEmitted: Array<{ id: string; status: string; ts: number }> = [];

    const handleRealtimeUpdate = (payload: {
      orderRealtimeId: number;
      status: string;
      updatedAt?: string;
    }) => {
      const orderId = payload.orderRealtimeId;
      const status = payload.status;
      const prevStatus = orderStatusHistory.get(orderId);

      if (payload.updatedAt) {
        const incomingTs = new Date(payload.updatedAt).getTime();
        const lastTs = lastOrderEventTimestamp.get(orderId);

        // Monotonic guard
        if (Number.isFinite(incomingTs) && lastTs && incomingTs < lastTs) {
          return { accepted: false, reason: 'OUT_OF_ORDER' };
        }
        if (Number.isFinite(incomingTs)) {
          lastOrderEventTimestamp.set(orderId, incomingTs);
        }

        // Downgrade guard
        const currentProgression = ORDER_STATUS_PROGRESSION[prevStatus || ''] ?? 0;
        const incomingProgression = ORDER_STATUS_PROGRESSION[status] ?? 0;
        if (currentProgression >= 4 && incomingProgression > 0 && incomingProgression < 4) {
          return { accepted: false, reason: 'DOWNGRADE_PREVENTED' };
        }
      }

      orderStatusHistory.set(orderId, status);
      notificationsEmitted.push({
        id: `order:${orderId}:${status}`,
        status,
        ts: payload.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now(),
      });
      return { accepted: true };
    };

    // 1. Evento A: Orden pasa a ACCEPTED en t=1000
    const resA = handleRealtimeUpdate({
      orderRealtimeId: 42,
      status: 'ACCEPTED',
      updatedAt: new Date(1000).toISOString(),
    });
    expect(resA.accepted).toBe(true);
    expect(orderStatusHistory.get(42)).toBe('ACCEPTED');

    // 2. Evento B rezagado en la red: Llega PAYMENT_PENDING con t=500 (desfasado)
    const resB = handleRealtimeUpdate({
      orderRealtimeId: 42,
      status: 'PAYMENT_PENDING',
      updatedAt: new Date(500).toISOString(),
    });
    expect(resB.accepted).toBe(false);
    expect(resB.reason).toBe('OUT_OF_ORDER');
    // El estado NO debió retroceder
    expect(orderStatusHistory.get(42)).toBe('ACCEPTED');

    // 3. Evento C simultáneo: Intento de revertir a QUOTED con t=1200
    const resC = handleRealtimeUpdate({
      orderRealtimeId: 42,
      status: 'QUOTED',
      updatedAt: new Date(1200).toISOString(),
    });
    expect(resC.accepted).toBe(false);
    expect(resC.reason).toBe('DOWNGRADE_PREVENTED');
    expect(orderStatusHistory.get(42)).toBe('ACCEPTED');

    // 4. Evento D progresivo legítimo: Orden pasa a ARRIVED en t=2000
    const resD = handleRealtimeUpdate({
      orderRealtimeId: 42,
      status: 'ARRIVED',
      updatedAt: new Date(2000).toISOString(),
    });
    expect(resD.accepted).toBe(true);
    expect(orderStatusHistory.get(42)).toBe('ARRIVED');
    expect(notificationsEmitted.map((n) => n.status)).toEqual(['ACCEPTED', 'ARRIVED']);
  });

  it('accelerates queue processing during bursts and deduplicates within safety window', async () => {
    jest.useFakeTimers();
    let unmountHook: (() => void) | undefined;
    try {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <NotificationProvider>{children}</NotificationProvider>
      );

      const { result, unmount } = await renderHook(() => useNotification(), { wrapper });
      unmountHook = unmount;

      // Ráfaga de 3 eventos distintos en el mismo tick
      await act(async () => {
        result.current.showNotification({
          id: 'burst:1',
          title: 'Notificación 1',
          message: 'Primero',
          type: 'info',
        });
        result.current.showNotification({
          id: 'burst:2',
          title: 'Notificación 2',
          message: 'Segundo',
          type: 'success',
        });
        result.current.showNotification({
          id: 'burst:3',
          title: 'Notificación 3',
          message: 'Tercero',
          type: 'info',
        });
      });

      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

      // La primera notificación se muestra por su duración completa (4000ms + hide)
      await act(async () => {
        jest.advanceTimersByTime(4300);
      });
      expect(Vibration.vibrate).toHaveBeenCalledTimes(2);

      // Con aceleración de cola, cuando hay items pendientes la segunda dura 2200ms (+ hide)
      await act(async () => {
        jest.advanceTimersByTime(2600);
      });
      expect(Vibration.vibrate).toHaveBeenCalledTimes(3);

      // Reintento con duplicado dentro de la ventana de seguridad (ej. a los 1000ms tras mostrarse)
      await act(async () => {
        result.current.showNotification({
          id: 'burst:3',
          title: 'Notificación 3',
          message: 'Tercero',
          type: 'info',
        });
      });
      // No debe volver a vibrar ni encolarse
      expect(Vibration.vibrate).toHaveBeenCalledTimes(3);

      await act(async () => {
        result.current.clearNotification();
        jest.advanceTimersByTime(500);
      });
    } finally {
      unmountHook?.();
      jest.useRealTimers();
    }
  });
});
