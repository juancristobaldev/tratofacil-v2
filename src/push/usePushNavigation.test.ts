import { renderHook, act, waitFor } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform, NativeModules } from 'react-native';
import { usePushNavigation } from './usePushNavigation';

const mockNavigate = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../realtime/RealtimeContext', () => ({
  useRealtime: () => ({
    refetch: mockRefetch,
  }),
}));

jest.mock('./PushActions', () => ({
  handlePushAction: jest.fn(),
}));

describe('usePushNavigation - Matriz de Auditoría de Rutas y Destinatarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    NativeModules.PushTokenModule = {
      getPendingPushAction: jest.fn().mockResolvedValue(null),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };
  });

  afterEach(() => {
    DeviceEventEmitter.removeAllListeners();
  });

  it('auditoría REVIEWS: redirige a ReviewsList cuando un usuario recibe una calificación', async () => {
    const { unmount } = await renderHook(() => usePushNavigation());

    await act(async () => {
      DeviceEventEmitter.emit('onPushAction', {
        action: 'REVIEWS',
        data: {
          type: 'NUEVA_VALORACION',
          orderId: 101,
          role: 'provider',
        },
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ReviewsList', { role: 'provider' });
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('Rating', expect.anything());
    unmount();
  });

  it('auditoría WALLET: redirige a Wallet al profesional cuando finaliza un servicio con pago liberado', async () => {
    const { unmount } = await renderHook(() => usePushNavigation());

    await act(async () => {
      DeviceEventEmitter.emit('onPushAction', {
        action: 'WALLET',
        data: {
          type: 'SERVICIO_COMPLETADO',
          orderId: 102,
          role: 'provider',
        },
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Wallet');
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('Rating', expect.anything());
    unmount();
  });

  it('auditoría RATE: redirige a RatingScreen al cliente para calificar al profesional', async () => {
    const { unmount } = await renderHook(() => usePushNavigation());

    await act(async () => {
      DeviceEventEmitter.emit('onPushAction', {
        action: 'RATE',
        data: {
          type: 'SERVICIO_COMPLETADO',
          orderId: 103,
          role: 'client',
        },
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Rating', {
        orderRealtimeId: 103,
        role: 'client',
      });
    });
    unmount();
  });

  it('auditoría SOLICITUD_CONTACTO: redirige a MyServices al profesional', async () => {
    const { unmount } = await renderHook(() => usePushNavigation());

    await act(async () => {
      DeviceEventEmitter.emit('onPushAction', {
        action: 'OPEN',
        data: {
          type: 'SOLICITUD_CONTACTO',
          orderId: 5,
        },
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('MyServices');
    });
    unmount();
  });

  it('auditoría ORDEN EN VIVO: redirige a MainApp y ejecuta refetch', async () => {
    const { unmount } = await renderHook(() => usePushNavigation());

    await act(async () => {
      DeviceEventEmitter.emit('onPushAction', {
        action: 'NAVIGATE',
        data: {
          type: 'PROVIDER_EN_CAMINO',
          orderId: 200,
        },
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('MainApp');
      expect(mockRefetch).toHaveBeenCalled();
    });
    unmount();
  });

  it('consumePendingAction: procesa acción pendiente en arranque en frío (cold start)', async () => {
    NativeModules.PushTokenModule.getPendingPushAction.mockResolvedValue(
      JSON.stringify({
        action: 'REVIEWS',
        data: {
          type: 'NUEVA_VALORACION',
          orderId: 88,
          role: 'provider',
        },
      }),
    );

    const { unmount } = await renderHook(() => usePushNavigation());

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ReviewsList', { role: 'provider' });
    });
    unmount();
  });
});
