import React from 'react';
import { render } from '@testing-library/react-native';
import { HomePage } from './HomePage';

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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useIsFocused: () => true,
  createNavigationContainerRef: () => ({ isReady: () => true, navigate: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));



describe('HomePage BottomSheet Surface Invariants (Flujo 4 & 20)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'client';
    mockRealtime = {
      activeOrder: null,
      localActiveOrder: null,
      providerActiveOrder: null,
      providers: [],
    };
  });

  it('INVARIANTE CRÍTICO (Flujo 4): Cliente con orden PENDING activa -> NO presenta BottomSheet (NO_SHEET_BY_DESIGN)', async () => {
    mockRole = 'client';
    mockRealtime.activeOrder = {
      id: 101,
      status: 'PENDING',
      provider: { id: 202, name: 'Mario' },
    };

    await render(<HomePage />);

    expect(mockPresent).not.toHaveBeenCalledWith('categories', expect.anything());
    expect(mockPresent).not.toHaveBeenCalledWith('focus_client', expect.anything());
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
});

