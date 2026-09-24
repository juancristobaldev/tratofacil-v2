import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { NotificationProvider, useNotification } from './NotificationContext';
import { Vibration } from 'react-native';

jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});

describe('NotificationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deduplicates notifications with the same id or title:message within cooldown window', async () => {
    jest.useFakeTimers();
    let unmountHook: (() => void) | undefined;
    try {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <NotificationProvider>{children}</NotificationProvider>
      );

      const { result, unmount } = await renderHook(() => useNotification(), { wrapper });
      unmountHook = unmount;

      await act(async () => {
        result.current.showNotification({
          id: 'order:10:ARRIVED',
          title: 'Llegada a Destino',
          message: 'Has llegado a la ubicación del cliente.',
          type: 'success',
        });
      });

      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

      // Immediate second call with same dedupe id should be ignored
      await act(async () => {
        result.current.showNotification({
          id: 'order:10:ARRIVED',
          title: 'Llegada a Destino',
          message: 'Has llegado a la ubicación del cliente.',
          type: 'success',
        });
      });

      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

      // Fast-forward past duration (4000ms) and cooldown (3000ms)
      await act(async () => {
        jest.advanceTimersByTime(5000);
        jest.setSystemTime(Date.now() + 5000);
      });

      await act(async () => {
        result.current.showNotification({
          id: 'order:10:ARRIVED',
          title: 'Llegada a Destino',
          message: 'Has llegado a la ubicación del cliente.',
          type: 'success',
        });
      });

      expect(Vibration.vibrate).toHaveBeenCalledTimes(2);

      await act(async () => {
        result.current.clearNotification();
        jest.advanceTimersByTime(500);
      });
    } finally {
      unmountHook?.();
      jest.useRealTimers();
    }
  });

  it('allows clearing notification cleanly and accepts onPress callbacks', async () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result, unmount } = await renderHook(() => useNotification(), { wrapper });
    const mockOnPress = jest.fn();

    await act(async () => {
      result.current?.showNotification({
        id: 'test:press',
        title: 'Error de prueba',
        message: 'Fallo intencional',
        type: 'error',
        onPress: mockOnPress,
      });
    });

    expect(Vibration.vibrate).toHaveBeenCalledWith([0, 60, 60, 60]);

    await act(async () => {
      result.current?.clearNotification();
    });

    unmount();
  });

  it('queues distinct notifications sequentially and displays them in FIFO order', async () => {
    jest.useFakeTimers();
    let unmountHook: (() => void) | undefined;
    try {
      const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <NotificationProvider>{children}</NotificationProvider>
      );

      const { result, unmount } = await renderHook(() => useNotification(), { wrapper });
      unmountHook = unmount;

      await act(async () => {
        result.current.showNotification({
          id: 'first',
          title: 'Primera Alerta',
          message: 'Detalle 1',
          type: 'info',
          duration: 3000,
        });
      });

      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

      // Enqueue a distinct second notification while first is active
      await act(async () => {
        result.current.showNotification({
          id: 'second',
          title: 'Segunda Alerta',
          message: 'Detalle 2',
          type: 'success',
          duration: 3000,
        });
      });

      // Still 1 vibration because second is queued
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

      // Advance past first notification duration + hide timeout (3000 + 300ms)
      await act(async () => {
        jest.advanceTimersByTime(3300);
      });

      // Now second notification should have been popped from queue and displayed
      expect(Vibration.vibrate).toHaveBeenCalledTimes(2);

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
