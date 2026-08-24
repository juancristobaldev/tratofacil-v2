import React from 'react';
import { render } from '@testing-library/react-native';
import { registry } from '../core/bottomSheet.registry';
import { BottomSheetProvider } from '../core/BottomSheetProvider';
import { RatingScreen } from '../../screens/shared/RatingScreen';
import { getBottomNavHeight } from '../../components/layout/bottomNavMetrics';
import type { SheetKey } from '../core/bottomSheet.types';

let mockRole = 'client';
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
    user: { id: 42, provider: { id: 99, isRealtimeActive: true } },
    token: 'jwt_token',
    role: mockRole,
    setRole: mockSetRole,
  }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../context/LocationContext', () => ({
  useLocation: () => ({
    location: { latitude: -33.4372, longitude: -70.6506 },
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
  }),
}));

jest.mock('../../hooks/useServices', () => ({
  useServices: () => ({
    myServices: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../hooks/useJobs', () => ({
  useJobs: () => ({
    reviewJob: jest.fn().mockResolvedValue(undefined),
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
const mockCompleteOrder = jest.fn().mockResolvedValue(undefined);
const mockCreateProviderReview = jest.fn().mockResolvedValue(undefined);
const mockCreateClientReview = jest.fn().mockResolvedValue(undefined);

let mockSessionValue: any = {
  activeOrder: null,
  orderState: 'VIEW_REQUEST',
  setOrderState: jest.fn(),
  provider: null,
  distanceLabel: '1.2 km',
  etaLabel: '5 min',
  distanceToProviderKm: 0.2,
  realtime: {
    initPayment: jest.fn().mockResolvedValue({ url: 'https://flow.cl' }),
    cancelOrder: mockCancelOrder,
    rejectQuote: mockRejectQuote,
    clientCounterOffer: mockSendCounterOffer,
    startOrder: mockStartOrder,
    quoteOrder: mockQuoteOrder,
    rejectRequest: mockRejectRequest,
  },
  showChat: false,
  setShowChat: jest.fn(),
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
    rejectRequest: mockRejectRequest,
    cancelOrder: mockCancelOrder,
    startOrder: mockStartOrder,
    completeOrder: mockCompleteOrder,
    createProviderReview: mockCreateProviderReview,
    createClientReview: mockCreateClientReview,
  }),
}));

jest.mock('../../features/focus-session/useFocusSession', () => ({
  useFocusSession: () => mockSessionValue,
}));

jest.mock('../primitives', () => {
  const React = require('react');
  const { View, TextInput, ScrollView } = require('react-native');
  return {
    BottomSheetScrollView: ScrollView,
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
    SheetHeader: View,
  };
});

describe('BottomSheet Panel & Action Flow Layer (Layer 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'client';
    mockSessionValue.activeOrder = null;
    mockSessionValue.orderState = 'VIEW_REQUEST';
  });

  describe('Suite 30: All 5 Sheets Semantic Rendering', () => {
    it('1. categories panel renders search input, promos and selected category filtering', async () => {
      const Content = registry.categories.content;
      const view = await render(
        <BottomSheetProvider>
          <Content
            sheetKey="categories"
            requestId={1}
            payload={{
              selectedCategory: {
                id: '1',
                name: 'Gasfitería Express',
                slug: 'gasfiteria-express',
                icon: 'Grid',
                subcategories: [],
              },
            }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByPlaceholderText('¿Qué servicio necesitas?')).toBeTruthy();
      expect(view.getByText('Filtrando por')).toBeTruthy();
      expect(view.getByText('Gasfitería Express')).toBeTruthy();
      expect(view.getByText('Limpiar')).toBeTruthy();
    });

    it('2. provider_preview panel renders provider name, rating and actions', async () => {
      const Content = registry.provider_preview.content;
      const view = await render(
        <BottomSheetProvider>
          <Content
            sheetKey="provider_preview"
            requestId={2}
            payload={{
              providers: [
                { id: 77, name: 'Carlos Gasfiter', rating: 4.8, reviewsCount: 10, serviceName: 'Instalación' },
              ],
              selectedIndex: 0,
            }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Carlos Gasfiter')).toBeTruthy();
      expect(view.getAllByLabelText('Ver perfil del profesional').length).toBeGreaterThan(0);
      expect(view.getByLabelText('Cancelar selección de servicio')).toBeTruthy();
    });

    it('3. focus_client panel renders client active negotiation state', async () => {
      mockSessionValue.activeOrder = {
        id: 101,
        status: 'QUOTED',
        quotedPrice: 35000,
        quotedHours: 2,
        quotedTransport: 5000,
        serviceProvider: { service: { name: 'Gasfitería Express' } },
        clientDescription: 'Fuga bajo el lavaplatos',
      };
      mockSessionValue.provider = {
        id: '202',
        name: 'Mario Profesional',
        avatar: 'https://example.com/avatar.jpg',
        rating: 4.8,
        reviewsCount: 15,
        serviceName: 'Gasfitería Express',
      };

      const Content = registry.focus_client.content;
      const view = await render(
        <BottomSheetProvider>
          <Content
            sheetKey="focus_client"
            requestId={3}
            payload={{ orderId: 101 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Cotización del profesional')).toBeTruthy();
      expect(view.getByText('Pagar ahora')).toBeTruthy();
    });

    it('4. focus_provider panel renders provider quote negotiation view', async () => {
      mockRole = 'provider';
      mockSessionValue.orderState = 'VIEW_REQUEST';
      mockSessionValue.activeOrder = {
        id: 201,
        status: 'PENDING',
        clientDescription: 'Fuga en el baño',
        serviceProvider: { price: 20000 },
        client: { displayName: 'Juan Cliente' },
      };

      const Content = registry.focus_provider.content;
      const view = await render(
        <BottomSheetProvider>
          <Content
            sheetKey="focus_provider"
            requestId={4}
            payload={{ orderId: 201 }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Enviar cotización')).toBeTruthy();
      expect(view.getByText('Rechazar solicitud')).toBeTruthy();
    });

    it('5. provider_dashboard panel renders provider balance and quick actions', async () => {
      mockRole = 'provider';
      const Content = registry.provider_dashboard.content;
      const view = await render(
        <BottomSheetProvider>
          <Content
            sheetKey="provider_dashboard"
            requestId={5}
            payload={undefined}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByText('Saldo disponible')).toBeTruthy();
      expect(view.getByText('$50.000')).toBeTruthy();
      expect(view.getByText('Actívate para recibir solicitudes')).toBeTruthy();
    });
  });

  describe('Suite 22: Rating Screen Independence Regression', () => {
    it('RatingScreen renders safely without BottomSheetProvider context', async () => {
      const view = await render(<RatingScreen />);
      expect(view.getByText('¡Trabajo Terminado!')).toBeTruthy();
      expect(view.getByText('Servicio completado con éxito')).toBeTruthy();
      expect(view.getByText('Enviar calificación')).toBeTruthy();
    });
  });

  describe('Suite 31: Dynamic Sizing & Geometry Contract', () => {
    it('all registered sheets enable dynamic sizing', () => {
      const sheetKeys: SheetKey[] = [
        'categories',
        'provider_preview',
        'focus_client',
        'focus_provider',
        'provider_dashboard',
      ];

      sheetKeys.forEach((key) => {
        expect(registry[key].enableDynamicSizing).toBe(true);
      });
    });
  });

  describe('Suite 32: BottomNav Height Metric Contract', () => {
    it('getBottomNavHeight calculates consistent offset factoring safe bottom inset', () => {
      const heightNoInset = getBottomNavHeight(0);
      const heightWithInset = getBottomNavHeight(34);

      expect(heightNoInset).toBeGreaterThan(0);
      expect(heightWithInset).toBe(heightNoInset + 34);
    });
  });
});
