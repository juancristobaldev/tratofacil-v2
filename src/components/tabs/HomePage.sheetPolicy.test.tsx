import React from 'react';
import { render, act } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { HomePage, _resetNavigatedToRatingOrderIds } from './HomePage';

const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockUpdate = jest.fn();
const mockSetMapFlowActive = jest.fn();

let mockRole = 'client';
let mockRealtime: any = {
  activeOrder: null,
  localActiveOrder: null,
  providerActiveOrder: null,
  providers: [],
};

jest.mock('../../bottom-sheet/core/useBottomSheet', () => ({
  useBottomSheet: () => ({
    present: mockPresent,
    dismiss: mockDismiss,
    update: mockUpdate,
    active: null,
    activePayload: null,
    setMapFlowActive: mockSetMapFlowActive,
    bindRuntimeActionHandlers: jest.fn(),
    unbindRuntimeActionHandlers: jest.fn(),
  }),
}));

jest.mock('../../context/RoleContext', () => ({
  useRole: () => ({ role: mockRole }),
}));

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => mockRealtime,
}));

jest.mock('../../context/LocationContext', () => ({
  useLocation: () => ({ location: { coords: { latitude: -33.45, longitude: -70.66 } } }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

jest.mock('../../context/CategoriesContext', () => ({
  useCategories: () => ({ categories: [] }),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useIsFocused: () => true,
  createNavigationContainerRef: () => ({ isReady: () => true, navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../components/ui/AnimatedUserMarker', () => ({
  AnimatedUserMarker: () => null,
}));



describe('HomePage BottomSheet Surface Invariants (Flujo 4 & 20)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetNavigatedToRatingOrderIds();
    mockRole = 'client';
    mockRealtime = {
      activeOrder: null,
      localActiveOrder: null,
      providerActiveOrder: null,
      providers: [],
      cancelOrder: jest.fn().mockResolvedValue(true),
    };
  });

  it('INVARIANTE CRÍTICO: Cliente con orden PENDING activa -> muestra radar overlay y suprime bottom sheet (exclusividad mutua overlay vs bottom sheet)', async () => {
    mockRole = 'client';
    mockRealtime.activeOrder = {
      id: 101,
      status: 'PENDING',
      provider: { id: 202, name: 'Mario' },
    };

    await render(<HomePage />);

    // Con el overlay de radar activo, NINGÚN bottom sheet debe mostrarse (exclusividad mutua)
    expect(mockPresent).not.toHaveBeenCalled();
  });

  it('Proveedor con orden PENDING -> presenta focus_provider', async () => {
    mockRole = 'provider';
    mockRealtime.providerActiveOrder = {
      id: 201,
      status: 'PENDING',
      client: { displayName: 'Carlos' },
    };

    await render(<HomePage />);

    expect(mockPresent).toHaveBeenCalledWith('focus_provider', expect.anything());
  });

  it('Cliente con orden QUOTED -> presenta focus_client', async () => {
    mockRole = 'client';
    mockRealtime.activeOrder = {
      id: 101,
      status: 'QUOTED',
      quotedPrice: 30000,
      provider: { id: 202, name: 'Mario' },
    };

    await render(<HomePage />);

    expect(mockPresent).toHaveBeenCalledWith('focus_client', expect.anything());
  });

  it('Cliente con orden PAYMENT_PENDING -> presenta focus_client sin bloqueo de overlay', async () => {
    mockRole = 'client';
    mockRealtime.activeOrder = {
      id: 102,
      status: 'PAYMENT_PENDING',
      provider: { id: 202, name: 'Mario' },
    };

    await render(<HomePage />);

    expect(mockPresent).toHaveBeenCalledWith('focus_client', expect.objectContaining({ orderId: 102 }));
  });

  it('Cliente con orden recibida por WebSocket en QUOTED mientras cache de Apollo sigue en PENDING -> presenta focus_client inmediatamente', async () => {
    mockRole = 'client';
    mockRealtime.activeOrder = {
      id: 101,
      status: 'PENDING',
      provider: { id: 202, name: 'Mario' },
    };
    mockRealtime.localActiveOrder = {
      id: 101,
      status: 'QUOTED',
      quotedPrice: 35000,
    };

    await render(<HomePage />);

    expect(mockPresent).toHaveBeenCalledWith('focus_client', expect.objectContaining({ orderId: 101 }));
  });

  it('INVARIANTE CRÍTICO ANTI-LIVELOCK: Cliente con orden QUOTED y categoría con 1 solo proveedor NO dispara AUTO_SINGLE_PROVIDER (no preemption de focus_client)', async () => {
    mockRole = 'client';
    mockRealtime.activeOrder = {
      id: 215,
      status: 'QUOTED',
      quotedPrice: 25000,
      provider: { id: 39, name: 'Juan Quezada', lat: -38.76, lng: -72.60 },
    };
    mockRealtime.providers = [
      { id: 39, name: 'Juan Quezada', lat: -38.76, lng: -72.60, categorySlug: 'peluqueria-canina', serviceId: 8 },
    ];

    await render(<HomePage />);

    // Verifica que focus_client se presenta y NUNCA provider_preview
    expect(mockPresent).toHaveBeenCalledWith('focus_client', expect.objectContaining({ orderId: 215 }));
    expect(mockPresent).not.toHaveBeenCalledWith('provider_preview', expect.anything());
  });

  it('Deseleccionar un proveedor único no reinicia bucle de auto-selección', async () => {
    mockRole = 'client';
    mockRealtime.activeOrder = null;

    let actionHandlers: any = {};
    const mockBindRuntimeActionHandlers = jest.fn((owner, handlers) => {
      actionHandlers = handlers;
    });

    jest.spyOn(require('../../bottom-sheet/core/useBottomSheet'), 'useBottomSheet').mockImplementation(() => ({
      present: mockPresent,
      dismiss: mockDismiss,
      update: mockUpdate,
      active: 'provider_preview',
      activePayload: { provider: { id: 99, name: 'Mario' } },
      setMapFlowActive: mockSetMapFlowActive,
      bindRuntimeActionHandlers: mockBindRuntimeActionHandlers,
      unbindRuntimeActionHandlers: jest.fn(),
    }));

    await render(<HomePage />);

    expect(mockBindRuntimeActionHandlers).toHaveBeenCalled();
    const deselectHandler = actionHandlers.provider_preview?.DESELECT;
    expect(typeof deselectHandler).toBe('function');

    // Deseleccionar no debe fallar y debe llamar a presentCategories
    deselectHandler({}, { actionId: 1 });
    expect(mockPresent).toHaveBeenCalledWith('categories', expect.anything());
  });

  describe('Search Bar Visibility Invariant with Non-Terminal Orders', () => {
    it('Cliente sin orden -> input de búsqueda de servicios es VISIBLE', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = null;

      const { queryByPlaceholderText } = await render(<HomePage />);
      expect(queryByPlaceholderText('¿Qué servicio necesitas?')).not.toBeNull();
    });

    it('Cliente con orden terminal COMPLETED/CANCELLED -> input de búsqueda es VISIBLE', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = { id: 101, status: 'COMPLETED' };

      const { queryByPlaceholderText } = await render(<HomePage />);
      expect(queryByPlaceholderText('¿Qué servicio necesitas?')).not.toBeNull();
    });

    it('Cliente con orden no terminal PENDING -> input de búsqueda NO debe aparecer', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = { id: 101, status: 'PENDING' };

      const { queryByPlaceholderText } = await render(<HomePage />);
      expect(queryByPlaceholderText('¿Qué servicio necesitas?')).toBeNull();
    });

    it('Cliente con orden no terminal QUOTED -> input de búsqueda NO debe aparecer', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = { id: 101, status: 'QUOTED' };

      const { queryByPlaceholderText } = await render(<HomePage />);
      expect(queryByPlaceholderText('¿Qué servicio necesitas?')).toBeNull();
    });

    it('Cliente con orden no terminal ACCEPTED -> input de búsqueda NO debe aparecer', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = { id: 101, status: 'ACCEPTED' };

      const { queryByPlaceholderText } = await render(<HomePage />);
      expect(queryByPlaceholderText('¿Qué servicio necesitas?')).toBeNull();
    });

    it('Cliente con orden no terminal IN_PROGRESS -> input de búsqueda NO debe aparecer', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = { id: 101, status: 'IN_PROGRESS' };

      const { queryByPlaceholderText } = await render(<HomePage />);
      expect(queryByPlaceholderText('¿Qué servicio necesitas?')).toBeNull();
    });

    it('Proveedor -> input de búsqueda nunca debe aparecer', async () => {
      mockRole = 'provider';
      mockRealtime.providerActiveOrder = null;

      const { queryByPlaceholderText } = await render(<HomePage />);
      expect(queryByPlaceholderText('¿Qué servicio necesitas?')).toBeNull();
    });
  });

  describe('Home floating navigation controls ownership', () => {
    it('Proveedor con orden ACCEPTED no renderiza controles flotantes manuales ni encuadre en HomePage', async () => {
      mockRole = 'provider';
      mockRealtime.providerActiveOrder = {
        id: 201,
        status: 'ACCEPTED',
        client: { displayName: 'Carlos' },
      };

      const { queryByTestId } = await render(<HomePage />);

      expect(queryByTestId('btn-toggle-navigation-mode')).toBeNull();
      expect(queryByTestId('btn-smart-framing')).toBeNull();
    });

    it('Cliente con orden ACCEPTED renderiza encuadre inteligente sin controles de navegación 3D', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = {
        id: 101,
        status: 'ACCEPTED',
        provider: { id: 202, name: 'Mario' },
      };

      const { queryByTestId, getByTestId } = await render(<HomePage />);

      expect(queryByTestId('btn-toggle-navigation-mode')).toBeNull();
      expect(getByTestId('btn-smart-framing')).toBeTruthy();
    });

    it('Proveedor sin orden activa no renderiza botón de encuadre en Home', async () => {
      mockRole = 'provider';
      mockRealtime.providerActiveOrder = null;

      const { queryByTestId } = await render(<HomePage />);

      expect(queryByTestId('btn-smart-framing')).toBeNull();
    });

    it('Cliente sin orden activa conserva encuadre de Home sin navegación 3D', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = null;

      const { queryByTestId, getByTestId } = await render(<HomePage />);

      expect(queryByTestId('btn-toggle-navigation-mode')).toBeNull();
      expect(getByTestId('btn-smart-framing')).toBeTruthy();
    });
  });

  describe('Rating Navigation and Loop Prevention', () => {
    it('Cliente con orden COMPLETED no revisada navega a Rating', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = {
        id: 101,
        status: 'COMPLETED',
        provider: { id: 202, name: 'Mario Gasfiter' },
      };
      mockRealtime.isOrderReviewed = jest.fn(() => false);

      await render(<HomePage />);

      expect(mockNavigate).toHaveBeenCalledWith('Rating', expect.objectContaining({
        role: 'client',
        orderRealtimeId: 101,
        providerId: 202,
      }));
    });

    it('Cliente con orden COMPLETED YA REVISADA NO navega a Rating (previene bucle al volver a inicio)', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = {
        id: 101,
        status: 'COMPLETED',
        provider: { id: 202, name: 'Mario Gasfiter' },
      };
      mockRealtime.isOrderReviewed = jest.fn((id: number) => id === 101);

      await render(<HomePage />);

      expect(mockNavigate).not.toHaveBeenCalledWith('Rating', expect.anything());
    });

    it('Proveedor con orden COMPLETED no revisada navega a Rating', async () => {
      mockRole = 'provider';
      mockRealtime.providerActiveOrder = {
        id: 301,
        status: 'COMPLETED',
        client: { id: 401, displayName: 'Carlos Cliente' },
      };
      mockRealtime.isOrderReviewed = jest.fn(() => false);

      await render(<HomePage />);

      expect(mockNavigate).toHaveBeenCalledWith('Rating', expect.objectContaining({
        role: 'provider',
        orderRealtimeId: 301,
        clientId: 401,
      }));
    });

    it('Proveedor con orden COMPLETED YA REVISADA NO navega a Rating', async () => {
      mockRole = 'provider';
      mockRealtime.providerActiveOrder = {
        id: 301,
        status: 'COMPLETED',
        client: { id: 401, displayName: 'Carlos Cliente' },
      };
      mockRealtime.isOrderReviewed = jest.fn((id: number) => id === 301);

      await render(<HomePage />);

      expect(mockNavigate).not.toHaveBeenCalledWith('Rating', expect.anything());
    });
  });

  describe('Focus Mode Grace Period & Flapping Prevention', () => {
    it('cuando active es focus_client y activeOrder pasa transitoriamente a null (sin estado terminal), entra en gracia y NO presenta categories de inmediato', async () => {
      jest.useFakeTimers();
      mockRole = 'client';
      mockRealtime.activeOrder = null;

      const originalHook = require('../../bottom-sheet/core/useBottomSheet');
      const spy = jest.spyOn(originalHook, 'useBottomSheet').mockReturnValue({
        present: mockPresent,
        dismiss: mockDismiss,
        update: mockUpdate,
        active: 'focus_client',
        activePayload: { orderId: 101 },
        setMapFlowActive: mockSetMapFlowActive,
        bindRuntimeActionHandlers: jest.fn(),
        unbindRuntimeActionHandlers: jest.fn(),
      });

      await render(<HomePage />);

      // En el frame inicial, NO debe haber llamado a categories de inmediato
      expect(mockPresent).not.toHaveBeenCalledWith('categories', expect.anything());

      // Tras expirar la ventana de gracia de 800ms, sí degrada
      jest.advanceTimersByTime(850);
      expect(mockPresent).toHaveBeenCalledWith('categories', expect.anything());

      spy.mockRestore();
      jest.useRealTimers();
    });

    it('cuando active es focus_client y activeOrder tiene estado terminal confirmado COMPLETED, reconcilia a default inmediatamente', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = { id: 101, status: 'COMPLETED' };
      mockRealtime.isOrderReviewed = jest.fn(() => true);

      const originalHook = require('../../bottom-sheet/core/useBottomSheet');
      const spy = jest.spyOn(originalHook, 'useBottomSheet').mockReturnValue({
        present: mockPresent,
        dismiss: mockDismiss,
        update: mockUpdate,
        active: 'focus_client',
        activePayload: { orderId: 101 },
        setMapFlowActive: mockSetMapFlowActive,
        bindRuntimeActionHandlers: jest.fn(),
        unbindRuntimeActionHandlers: jest.fn(),
      });

      await render(<HomePage />);

      expect(mockPresent).toHaveBeenCalledWith('categories', expect.anything());

      spy.mockRestore();
    });
  });

  describe('Android Hardware BackPress Hierarchy', () => {
    it('returns false at root allowing system back', async () => {
      const spy = jest.spyOn(BackHandler, 'addEventListener');
      const view = await render(<HomePage />);

      expect(spy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
      const handler = spy.mock.calls[spy.mock.calls.length - 1][1];
      const handled = (handler as () => boolean)();
      expect(handled).toBe(false);
      view.unmount();
      spy.mockRestore();
    });

    it('handles back press by deselecting provider when active is provider_preview', async () => {
      const originalHook = require('../../bottom-sheet/core/useBottomSheet');
      const spySheet = jest.spyOn(originalHook, 'useBottomSheet').mockReturnValue({
        present: mockPresent,
        dismiss: mockDismiss,
        update: mockUpdate,
        active: 'provider_preview',
        activePayload: { provider: { id: 42 } },
        setMapFlowActive: mockSetMapFlowActive,
        bindRuntimeActionHandlers: jest.fn(),
        unbindRuntimeActionHandlers: jest.fn(),
      });

      const spy = jest.spyOn(BackHandler, 'addEventListener');
      const view = await render(<HomePage />);

      const handler = spy.mock.calls[spy.mock.calls.length - 1][1];
      let handled = false;
      await act(async () => {
        handled = (handler as () => boolean)();
      });
      expect(handled).toBe(true);

      view.unmount();
      spy.mockRestore();
      spySheet.mockRestore();
    });

    it('cancels pending order on back press when radar overlay is active', async () => {
      mockRole = 'client';
      mockRealtime.activeOrder = {
        id: 101,
        status: 'PENDING',
        provider: { id: 202, name: 'Mario' },
      };

      const spy = jest.spyOn(BackHandler, 'addEventListener');
      const view = await render(<HomePage />);

      const handler = spy.mock.calls[spy.mock.calls.length - 1][1];
      let handled = false;
      await act(async () => {
        handled = (handler as () => boolean)();
      });

      expect(handled).toBe(true);
      expect(mockRealtime.cancelOrder).toHaveBeenCalledWith(101);

      view.unmount();
      spy.mockRestore();
    });
  });
});
