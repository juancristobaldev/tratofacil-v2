import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { registry } from '../core/bottomSheet.registry';
import { BottomSheetProvider } from '../core/BottomSheetProvider';
import { FocusProviderPanelContent } from '../../components/panels/FocusProviderPanelContent';
import { FocusClientPanelContent } from '../../components/panels/FocusClientPanelContent';
import { ProviderPreviewPanelContent } from '../../components/panels/ProviderPreviewPanelContent';
import { CategoriesPanelContent } from '../../components/panels/CategoriesPanelContent';
import { ProviderPanelContent } from '../../components/panels/ProviderPanelContent';
import type { SheetKey } from '../core/bottomSheet.types';

let mockRole = 'provider';
const mockSetRole = jest.fn();
const mockShowNotification = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
  useRoute: () => ({ params: { orderId: 101 } }),
  createNavigationContainerRef: () => ({ isReady: () => true, navigate: jest.fn() }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, isProfileFullyComplete: true, provider: { id: 99, isRealtimeActive: true } },
    token: 'jwt_token',
    role: mockRole,
    setRole: mockSetRole,
  }),
}));

jest.mock('../../context/RoleContext', () => ({
  useRole: () => ({
    role: mockRole,
    setRole: mockSetRole,
  }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../context/LocationContext', () => ({
  useLocation: () => ({
    location: { coords: { latitude: -33.4372, longitude: -70.6506 } },
    permissionStatus: 'granted',
  }),
}));

jest.mock('../../context/CategoriesContext', () => ({
  useCategories: () => ({
    categories: [
      { id: 1, name: 'Gasfitería', slug: 'gasfiteria' },
      { id: 2, name: 'Electricidad', slug: 'electricidad' },
    ],
    categoryTree: [
      { id: 1, name: 'Gasfitería', slug: 'gasfiteria', services: [], type: 'category' },
      { id: 2, name: 'Electricidad', slug: 'electricidad', services: [], type: 'category' },
    ],
    servicesLoading: false,
    categoriesLoading: false,
    mainLoading: false,
    servicesError: null,
    categoriesError: null,
    mainError: null,
    loading: false,
    error: null,
    fetchServicesByCategory: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('../../hooks/useAds', () => ({
  useAds: () => ({
    data: [],
    loading: false,
    error: null,
    getAdsData: null,
    ads: [],
    marketingHero: [],
    marketingHorizontal: [],
    marketingVertical: [],
    horizontal: [],
    vertical: [],
    getTransitionDuration: (_t: string, _o: string, fallback: number) => fallback,
  }),
}));

jest.mock('../../hooks/usePlans', () => ({
  usePlans: () => ({
    wallet: { balance: 50000 },
    loading: false,
    registerCard: jest.fn().mockResolvedValue({ url: 'https://register.cl' }),
  }),
}));

jest.mock('../../hooks/useServices', () => ({
  useServices: () => ({
    myServices: [{ id: 10, name: 'Reparación de cañerías' }],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

const mockQuoteOrder = jest.fn().mockResolvedValue(undefined);
const mockAcceptQuote = jest.fn().mockResolvedValue(undefined);
const mockRejectQuote = jest.fn().mockResolvedValue(undefined);
const mockSendCounterOffer = jest.fn().mockResolvedValue(undefined);
const mockAcceptCounterOffer = jest.fn().mockResolvedValue(undefined);
const mockRejectCounterOffer = jest.fn().mockResolvedValue(undefined);
const mockRejectRequest = jest.fn().mockResolvedValue(undefined);
const mockCancelOrder = jest.fn().mockResolvedValue(undefined);
const mockStartOrder = jest.fn().mockResolvedValue(undefined);
const mockFinishOrder = jest.fn().mockResolvedValue(undefined);
const mockRespondToCounterOffer = jest.fn().mockResolvedValue(undefined);
const mockToggleAvailability = jest.fn().mockResolvedValue(undefined);
const mockInitPayment = jest.fn().mockResolvedValue({ url: 'https://flow.cl' });

let mockSessionValue: any = {
  activeOrder: null,
  orderState: 'VIEW_REQUEST',
  setOrderState: jest.fn(),
  provider: null,
  distanceLabel: '1.2 km',
  etaLabel: '5 min',
  distanceToProviderKm: 0.2,
  realtime: {
    initPayment: mockInitPayment,
    cancelOrder: mockCancelOrder,
    rejectQuote: mockRejectQuote,
    clientCounterOffer: mockSendCounterOffer,
    startOrder: mockStartOrder,
    quoteOrder: mockQuoteOrder,
    rejectRequest: mockRejectRequest,
    finishOrder: mockFinishOrder,
    respondToCounterOffer: mockRespondToCounterOffer,
    toggleAvailability: mockToggleAvailability,
    isRealtimeActive: true,
  },
  showChat: false,
  setShowChat: jest.fn(),
  handleFinish: jest.fn(),
};

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => ({
    activeOrder: mockSessionValue.activeOrder,
    localActiveOrder: mockSessionValue.activeOrder,
    providerActiveOrder: mockSessionValue.activeOrder,
    quoteOrder: mockQuoteOrder,
    acceptQuote: mockAcceptQuote,
    rejectQuote: mockRejectQuote,
    sendCounterOffer: mockSendCounterOffer,
    acceptCounterOffer: mockAcceptCounterOffer,
    rejectCounterOffer: mockRejectCounterOffer,
    respondToCounterOffer: mockRespondToCounterOffer,
    rejectRequest: mockRejectRequest,
    cancelOrder: mockCancelOrder,
    startOrder: mockStartOrder,
    finishOrder: mockFinishOrder,
    toggleAvailability: mockToggleAvailability,
    initPayment: mockInitPayment,
    isRealtimeActive: true,
  }),
}));

jest.mock('../../features/focus-session/useFocusSession', () => ({
  useFocusSession: () => mockSessionValue,
}));

jest.mock('../../features/focus-session/FocusSessionProvider', () => ({
  useFocusSession: () => mockSessionValue,
}));

jest.mock('../primitives', () => {
  const React = require('react');
  const { View, TextInput, ScrollView } = require('react-native');
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetView: View,
    BottomSheetFlatList: ({ ListHeaderComponent, data, renderItem, ...props }: any) =>
      React.createElement(
        View,
        props,
        typeof ListHeaderComponent === 'function' ? React.createElement(ListHeaderComponent) : ListHeaderComponent,
        data?.map((item: any, index: number) =>
          React.createElement(View, { key: index }, renderItem ? renderItem({ item, index }) : null),
        ),
      ),
    BottomSheetTextInput: ({ ...props }: any) => React.createElement(TextInput, props),
    Sheet: View,
    SheetContent: View,
    SheetHeader: ({ title, subtitle, trailing }: any) => {
      const { Text } = require('react-native');
      return React.createElement(
        View,
        null,
        title ? React.createElement(Text, null, title) : null,
        subtitle ? React.createElement(Text, null, subtitle) : null,
        trailing || null,
      );
    },
  };
});

jest.mock('../../bottom-sheet/primitives', () => {
  const React = require('react');
  const { View, TextInput, ScrollView } = require('react-native');
  return {
    BottomSheetScrollView: ScrollView,
    BottomSheetView: View,
    BottomSheetFlatList: ({ ListHeaderComponent, data, renderItem, ...props }: any) =>
      React.createElement(
        View,
        props,
        typeof ListHeaderComponent === 'function' ? React.createElement(ListHeaderComponent) : ListHeaderComponent,
        data?.map((item: any, index: number) =>
          React.createElement(View, { key: index }, renderItem ? renderItem({ item, index }) : null),
        ),
      ),
    BottomSheetTextInput: ({ ...props }: any) => React.createElement(TextInput, props),
    Sheet: View,
    SheetContent: View,
    SheetHeader: ({ title, subtitle, trailing }: any) => {
      const { Text } = require('react-native');
      return React.createElement(
        View,
        null,
        title ? React.createElement(Text, null, title) : null,
        subtitle ? React.createElement(Text, null, subtitle) : null,
        trailing || null,
      );
    },
  };
});

describe('Collapsible Bottom Sheets with Compact Mode (E2E Contract)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Focus Provider: Open Original vs Collapsed Compact & State Preservation', () => {
    beforeEach(() => {
      mockRole = 'provider';
      mockSessionValue.orderState = 'VIEW_REQUEST';
      mockSessionValue.activeOrder = {
        id: 501,
        status: 'PENDING',
        clientDescription: 'Fuga bajo lavaplatos',
        serviceProvider: { price: 20000 },
        client: { displayName: 'Camila Silva' },
      };
    });

    it('renders 100% original full panel when OPEN', async () => {
      const view = await render(
        <BottomSheetProvider>
          <FocusProviderPanelContent
            sheetKey="focus_provider"
            requestId={1}
            payload={{ orderId: 501 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={false}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Camila Silva')).toBeTruthy();
      expect(view.getByText('Oferta del servicio')).toBeTruthy();
      expect(view.getByText('Horas de servicio')).toBeTruthy();
      expect(view.getByText('Km de transporte')).toBeTruthy();
      expect(view.getByText('Detalles del problema')).toBeTruthy();
      expect(view.getByText('Fuga bajo lavaplatos')).toBeTruthy();
      expect(view.getByText('Enviar oferta')).toBeTruthy();
      expect(view.getByText('Rechazar solicitud')).toBeTruthy();
    });

    it('renders compact summary and key CTA when COLLAPSED', async () => {
      const view = await render(
        <BottomSheetProvider>
          <FocusProviderPanelContent
            sheetKey="focus_provider"
            requestId={1}
            payload={{ orderId: 501 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Camila Silva')).toBeTruthy();
      expect(view.getByText('Solicitud de oferta')).toBeTruthy();
      expect(view.getByText('$20.000')).toBeTruthy();
      expect(view.getByText('Enviar oferta')).toBeTruthy();
      // Expanded-only elements are NOT in compact mode
      expect(view.queryByText('Horas de servicio')).toBeNull();
      expect(view.queryByText('Km de transporte')).toBeNull();
    });

    it('preserves quote inputs across OPEN -> modify -> COLLAPSE -> EXPAND without reset', async () => {
      const setIndexMock = jest.fn();

      // 1. Render Open
      const view = await render(
        <BottomSheetProvider>
          <FocusProviderPanelContent
            sheetKey="focus_provider"
            requestId={1}
            payload={{ orderId: 501 }}
            dismiss={jest.fn()}
            setIndex={setIndexMock}
            isCollapsed={false}
          />
        </BottomSheetProvider>,
      );

      // 2. Adjust quote hours: 1h -> 2h (+ $20.000)
      await fireEvent.press(view.getByLabelText('Aumentar horas de oferta'));

      // Adjust transport: 0km -> 1km (+ $1.000)
      await fireEvent.press(view.getByLabelText('Aumentar transporte en kilómetros'));

      // Total is now (2 * 20000) + (1 * 1000) = 41.000
      expect(view.getByText('$41.000')).toBeTruthy();

      // 3. User drags down -> Sheet becomes COLLAPSED
      await view.rerender(
        <BottomSheetProvider>
          <FocusProviderPanelContent
            sheetKey="focus_provider"
            requestId={1}
            payload={{ orderId: 501 }}
            dismiss={jest.fn()}
            setIndex={setIndexMock}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      // Compact view displays the adjusted total!
      expect(view.getByText('$41.000')).toBeTruthy();
      expect(view.getByText('Solicitud de oferta')).toBeTruthy();

      // 4. User drags up -> Sheet becomes OPEN again
      await view.rerender(
        <BottomSheetProvider>
          <FocusProviderPanelContent
            sheetKey="focus_provider"
            requestId={1}
            payload={{ orderId: 501 }}
            dismiss={jest.fn()}
            setIndex={setIndexMock}
            isCollapsed={false}
          />
        </BottomSheetProvider>,
      );

      // Original full panel restored with the EXACT preserved values (2h, 1km, $41.000)
      expect(view.getByText('2h')).toBeTruthy();
      expect(view.getByText('1km')).toBeTruthy();
      expect(view.getByText('$41.000')).toBeTruthy();
    });

    it('triggers the identical quoteOrder handler when pressing CTA in compact mode', async () => {
      const view = await render(
        <BottomSheetProvider>
          <FocusProviderPanelContent
            sheetKey="focus_provider"
            requestId={1}
            payload={{ orderId: 501 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      const sendBtn = view.getByText('Enviar oferta');
      fireEvent.press(sendBtn);

      expect(mockQuoteOrder).toHaveBeenCalledWith({
        orderRealtimeId: 501,
        quotedPrice: 20000,
        quotedHours: 1,
        quotedTransport: 0,
      });
    });
  });

  describe('2. Focus Client: Open Original vs Collapsed Compact & Phase Actions', () => {
    beforeEach(() => {
      mockRole = 'client';
      mockSessionValue.orderState = 'QUOTED';
      mockSessionValue.activeOrder = {
        id: 701,
        status: 'QUOTED',
        quotedPrice: 35000,
        quotedHours: 2,
        quotedTransport: 5000,
        serviceProvider: { service: { name: 'Gasfitería' } },
        clientDescription: 'Fuga urgente',
      };
      mockSessionValue.provider = {
        id: '99',
        name: 'Roberto Gasfiter',
        avatar: 'https://example.com/avatar.jpg',
        rating: 4.9,
        reviewsCount: 22,
        serviceName: 'Gasfitería',
      };
    });

    it('renders 100% original full panel when OPEN', async () => {
      const view = await render(
        <BottomSheetProvider>
          <FocusClientPanelContent
            sheetKey="focus_client"
            requestId={2}
            payload={{ orderId: 701 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={false}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Roberto Gasfiter')).toBeTruthy();
      expect(view.getByText('Oferta del profesional')).toBeTruthy();
      expect(view.getByText('Tu contraoferta')).toBeTruthy();
      expect(view.getByText('Aceptar oferta')).toBeTruthy();
    });

    it('renders compact summary and payment CTA when COLLAPSED in QUOTED state', async () => {
      const view = await render(
        <BottomSheetProvider>
          <FocusClientPanelContent
            sheetKey="focus_client"
            requestId={2}
            payload={{ orderId: 701 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Roberto Gasfiter')).toBeTruthy();
      expect(view.getByText('Oferta recibida')).toBeTruthy();
      expect(view.getByText('$35.000')).toBeTruthy();
      expect(view.getByText('Aceptar oferta')).toBeTruthy();
    });

    it('triggers expansion and transitions to payment step when pressing Aceptar oferta in compact mode', async () => {
      const mockSetIndex = jest.fn();
      const view = await render(
        <BottomSheetProvider>
          <FocusClientPanelContent
            sheetKey="focus_client"
            requestId={2}
            payload={{ orderId: 701 }}
            dismiss={jest.fn()}
            setIndex={mockSetIndex}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      const acceptBtn = view.getByText('Aceptar oferta');
      fireEvent.press(acceptBtn);

      expect(mockSetIndex).toHaveBeenCalledWith(1);
    });
  });

  describe('3. Provider Preview: Open Carousel vs Collapsed Compact Summary', () => {
    beforeEach(() => {
      mockRole = 'client';
    });

    const mockProviders = [
      { id: 10, name: 'Pedro Electricista', rating: 5.0, reviewsCount: 8, serviceName: 'Electricidad' },
    ];

    it('renders full card with all details and CTA cleanly as a low-height content-driven sheet', async () => {
      const view = await render(
        <BottomSheetProvider>
          <ProviderPreviewPanelContent
            sheetKey="provider_preview"
            requestId={3}
            payload={{ providers: mockProviders, selectedIndex: 0 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={false}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Pedro Electricista')).toBeTruthy();
      expect(view.getAllByLabelText('Ver perfil del profesional').length).toBeGreaterThan(0);
      expect(view.getByLabelText('Cancelar selección de servicio')).toBeTruthy();
    });

    it('renders compact summary row with profile and dismiss actions when COLLAPSED', async () => {
      const view = await render(
        <BottomSheetProvider>
          <ProviderPreviewPanelContent
            sheetKey="provider_preview"
            requestId={3}
            payload={{ providers: mockProviders, selectedIndex: 0 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Pedro Electricista')).toBeTruthy();
      expect(view.getByText('Perfil')).toBeTruthy();
      expect(view.getByLabelText('Cancelar selección de servicio')).toBeTruthy();
    });
  });

  describe('4. Categories: Open Category Tree vs Collapsed Filter Summary', () => {
    beforeEach(() => {
      mockRole = 'client';
    });

    it('renders full promos & filter when OPEN', async () => {
      const view = await render(
        <BottomSheetProvider>
          <CategoriesPanelContent
            sheetKey="categories"
            requestId={4}
            payload={{
              selectedCategory: {
                id: '1',
                name: 'Gasfitería Express',
                slug: 'gasfiteria-express',
              },
            }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={false}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Gasfitería Express')).toBeTruthy();
      expect(view.getByText('Limpiar')).toBeTruthy();
    });

    it('renders compact filter banner when COLLAPSED with selected category', async () => {
      const view = await render(
        <BottomSheetProvider>
          <CategoriesPanelContent
            sheetKey="categories"
            requestId={4}
            payload={{
              selectedCategory: {
                id: '1',
                name: 'Gasfitería Express',
                slug: 'gasfiteria-express',
              },
            }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Filtrando por')).toBeTruthy();
      expect(view.getByText('Gasfitería Express')).toBeTruthy();
      expect(view.getByText('Limpiar')).toBeTruthy();
    });
  });

  describe('5. Provider Dashboard: Open Full vs Collapsed Online/Offline Switch', () => {
    beforeEach(() => {
      mockRole = 'provider';
    });

    it('renders full dashboard when OPEN', async () => {
      const view = await render(
        <BottomSheetProvider>
          <ProviderPanelContent
            sheetKey="provider_dashboard"
            requestId={5}
            payload={undefined}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={false}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Disponible para órdenes')).toBeTruthy();
      expect(view.getByText('Saldo disponible')).toBeTruthy();
      expect(view.getByText('$50.000')).toBeTruthy();
    });

    it('renders compact status & switch when COLLAPSED', async () => {
      const view = await render(
        <BottomSheetProvider>
          <ProviderPanelContent
            sheetKey="provider_dashboard"
            requestId={5}
            payload={undefined}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Disponible para órdenes')).toBeTruthy();
      expect(view.getByText(/Saldo: \$50\.000/)).toBeTruthy();
      expect(view.getByLabelText('Desactivar disponibilidad')).toBeTruthy();
    });
  });

  describe('6. Phase Matrix Coverage for Focus Provider & Focus Client', () => {
    beforeEach(() => {
      mockRole = 'provider';
    });

    it('focus_provider renders phase-derived CTA for IN_PROGRESS', async () => {
      mockRole = 'provider';
      mockSessionValue.orderState = 'IN_PROGRESS';
      mockSessionValue.activeOrder = {
        id: 502,
        status: 'IN_PROGRESS',
        client: { displayName: 'Mario Cliente' },
      };

      const view = await render(
        <BottomSheetProvider>
          <FocusProviderPanelContent
            sheetKey="focus_provider"
            requestId={6}
            payload={{ orderId: 502 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Completar Trabajo')).toBeTruthy();
    });

    it('focus_provider renders phase-derived CTA for EN_CAMINO', async () => {
      mockRole = 'provider';
      mockSessionValue.orderState = 'EN_CAMINO';
      mockSessionValue.activeOrder = {
        id: 503,
        status: 'ACCEPTED',
        client: { displayName: 'Mario Cliente' },
      };

      const view = await render(
        <BottomSheetProvider>
          <FocusProviderPanelContent
            sheetKey="focus_provider"
            requestId={7}
            payload={{ orderId: 503 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={true}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Abrir Chat')).toBeTruthy();
    });
  });
});
