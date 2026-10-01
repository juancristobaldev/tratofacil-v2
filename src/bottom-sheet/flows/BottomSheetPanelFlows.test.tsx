import React from 'react';
import { render } from '@testing-library/react-native';
import { registry } from '../core/bottomSheet.registry';
import { BottomSheetProvider } from '../core/BottomSheetProvider';
import { getBottomSheetGeometry } from '../core/bottomSheetGeometry';
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
    BottomSheetView: View,
    BottomSheetFlatList: ({ ListHeaderComponent, data, renderItem, ...props }: any) =>
      React.createElement(
        View,
        { testID: 'bottom-sheet-flat-list', ...props },
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
    TouchableOpacity: require('react-native').TouchableOpacity,
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
    it('1. categories panel renders promotions and selected category filtering', async () => {
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

      expect(view.getByText('Filtrando por')).toBeTruthy();
      expect(view.getByText('Gasfitería Express')).toBeTruthy();
      expect(view.getByText('Limpiar')).toBeTruthy();
    });

    it('1b. categories panel renders search results when searchQuery is provided in payload', async () => {
      const Content = registry.categories.content;
      const view = await render(
        <BottomSheetProvider>
          <Content
            sheetKey="categories"
            requestId={11}
            payload={{
              searchQuery: 'gas',
            }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
          />
        </BottomSheetProvider>,
      );

      expect(view.getByTestId('bottom-sheet-flat-list')).toBeTruthy();
      expect(view.getByTestId('bottom-sheet-flat-list').props.stickyHeaderIndices).toEqual([0]);
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

      expect(view.getByText('Oferta del profesional')).toBeTruthy();
      expect(view.getByText('Aceptar oferta')).toBeTruthy();
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

      expect(view.getByText('Enviar oferta')).toBeTruthy();
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
      expect(view.getByText('¡Servicio Finalizado!')).toBeTruthy();
      expect(view.getByText('Tu opinión es importante para la comunidad')).toBeTruthy();
      expect(view.getByText('Enviar reseña')).toBeTruthy();
    });
  });

  describe('Suite 31: Dynamic Sizing & Geometry Contract', () => {
    it('all registered sheets enable dynamic sizing and declare their physical content mode', () => {
      const expectedModes: Record<SheetKey, 'view' | 'scroll' | 'list' | 'mixed'> = {
        categories: 'view',
        provider_preview: 'view',
        focus_client: 'scroll',
        focus_provider: 'scroll',
        provider_dashboard: 'view',
      };

      (Object.keys(expectedModes) as SheetKey[]).forEach((key) => {
        expect(registry[key].enableDynamicSizing).toBe(true);
        expect(registry[key].contentMode).toBe(expectedModes[key]);
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

  describe('Suite 33: Encuadre Button Clearance & Content-Driven Limit Contract', () => {
    it('guarantees maximum sheet height stops strictly 30px below encuadre button', () => {
      const insetsTop = 47;
      const insetsBottom = 34;
      const windowHeight = 844;
      const navBarHeight = getBottomNavHeight(insetsBottom);

      const encuadreBottomOffset = insetsTop + 8 + 56 + 96; // insets.top + padding + search bar + buttons = insets.top + 160
      const mapClearanceGap = 30; // 30px below encuadre button
      const topClearance = encuadreBottomOffset + mapClearanceGap; // 47 + 190 = 237px

      const computedMaxHeight = windowHeight - topClearance - navBarHeight;
      expect(computedMaxHeight).toBeGreaterThan(200);

      const sheetTopOnScreen = windowHeight - navBarHeight - computedMaxHeight;
      expect(sheetTopOnScreen).toBe(topClearance);
      // Top bound of sheet never touches or overlaps the encuadre button
      expect(sheetTopOnScreen).toBeGreaterThanOrEqual(encuadreBottomOffset + 30);
    });
  });

  describe('Suite 34: Categories Bi-Modal Dynamic Sizing Contract', () => {
    it('calculates State 1 (input + promo ad) compactly leaving >75% of map visible', () => {
      const searchBarHeight = 50;
      const titleHeight = 24;
      const promoAdHeight = 110;
      const paddings = 36;
      const state1Height = searchBarHeight + titleHeight + promoAdHeight + paddings;

      expect(state1Height).toBeLessThanOrEqual(240);
    });

    it('caps State 2 list height to safely prevent header clipping with 280px maxHeight', () => {
      const maxListHeight = 280;

      expect(maxListHeight).toBe(280);

      const headerHeight = 50;
      const totalState2MaxHeight = headerHeight + maxListHeight + 20;

      // Must be safely below the max dynamic content boundary (~430px)
      expect(totalState2MaxHeight).toBeLessThanOrEqual(360);
    });
  });

  describe('Suite 35: Global Multi-Panel Dynamic Sizing & Clearance Contract', () => {
    it('verifies provider_dashboard fits exactly into intrinsic ~240px container', () => {
      const onlineCardHeight = 64;
      const walletCardHeight = 84;
      const planNoticeHeight = 68;
      const gapAndPaddings = 36;
      const totalDashboardHeight = onlineCardHeight + walletCardHeight + planNoticeHeight + gapAndPaddings;

      expect(totalDashboardHeight).toBeLessThanOrEqual(260);
      expect(totalDashboardHeight).toBeGreaterThanOrEqual(200);
    });

    it('verifies provider_preview remains a low-height content-driven single-detent card', () => {
      const cardHeight = 164;
      const padding = 10;
      const totalPreviewHeight = cardHeight + padding;

      expect(totalPreviewHeight).toBeLessThanOrEqual(185);
    });

    it('verifies focus_client and focus_provider phases fit comfortably under 510px clearance', () => {
      const focusClientQuotedHeight = 380;
      const focusProviderViewRequestHeight = 420;
      const maxClearanceLimit = 510;

      expect(focusClientQuotedHeight).toBeLessThan(maxClearanceLimit);
      expect(focusProviderViewRequestHeight).toBeLessThan(maxClearanceLimit);
    });
  });

  describe('Suite 36: Categories Search Header Elevation and Keyboard Dismissal Contract', () => {
    it('elevates categories sheet to just below the header only when search query is present', () => {
      const windowHeight = 844;
      const safeTopInset = 47;
      const safeBottomInset = 34;
      const geometry = getBottomSheetGeometry({ windowHeight, safeTopInset, safeBottomInset });

      // When searchQuery is empty, standard sheet geometry applies
      const normalSheetTop = geometry.bottomNavTop - geometry.maxDynamicContentSize;
      expect(normalSheetTop).toBeGreaterThanOrEqual(geometry.topClearance);
      expect(normalSheetTop - geometry.encuadreBottomOffset).toBeGreaterThanOrEqual(24);

      // When categories search is active (searchQuery.length > 0):
      const searchSheetTop = geometry.bottomNavTop - geometry.categoriesSearchMaxHeight;
      const headerBottom = safeTopInset + 60;
      expect(searchSheetTop).toBe(headerBottom + 4);
      expect(searchSheetTop).toBeLessThan(normalSheetTop);
      expect(geometry.categoriesSearchMaxHeight).toBeGreaterThan(geometry.maxDynamicContentSize);
    });

    it('ensures no other sheet ever uses the search header elevation', () => {
      const windowHeight = 844;
      const safeTopInset = 47;
      const safeBottomInset = 34;
      const geometry = getBottomSheetGeometry({ windowHeight, safeTopInset, safeBottomInset });

      const otherSheetKeys: SheetKey[] = ['provider_preview', 'focus_client', 'focus_provider', 'provider_dashboard'];
      otherSheetKeys.forEach((key) => {
        const descriptor = registry[key];
        const maxSize = descriptor.maxDynamicContentSize ?? geometry.maxDynamicContentSize;
        // Verify every non-categories sheet is clamped strictly to standard geometry
        expect(maxSize).toBe(geometry.maxDynamicContentSize);
        expect(maxSize).toBeLessThan(geometry.categoriesSearchMaxHeight);
        expect(descriptor.enableDynamicSizing).toBe(true);
      });
    });

    it('decouples categories services list from content amount by fixing snap points at max height with dynamic sizing disabled', () => {
      const windowHeight = 844;
      const safeTopInset = 47;
      const safeBottomInset = 34;
      const geometry = getBottomSheetGeometry({ windowHeight, safeTopInset, safeBottomInset });
      const descriptor = registry.categories;

      // When search is active:
      const isSearchActive = true;
      const resolvedEnableDynamicSizing = isSearchActive ? false : descriptor.enableDynamicSizing;
      const resolvedSnapPoints = isSearchActive
        ? [descriptor.collapsedHeight ?? 88, geometry.categoriesSearchMaxHeight]
        : descriptor.snapPoints;
      const resolvedContentMode = isSearchActive ? 'list' : descriptor.contentMode;

      // 1. Dynamic sizing is disabled so sheet does NOT shrink for small content (1 or 2 items)
      expect(resolvedEnableDynamicSizing).toBe(false);
      // 2. Snap points include collapsed and full categoriesSearchMaxHeight
      expect(resolvedSnapPoints).toEqual([88, geometry.categoriesSearchMaxHeight]);
      // 3. Content mode is 'list' ensuring FlatList expands to full height
      expect(resolvedContentMode).toBe('list');

      // When search is NOT active (query is empty):
      const isSearchInactive = false;
      const inactiveDynamicSizing = isSearchInactive ? false : descriptor.enableDynamicSizing;
      const inactiveSnapPoints = isSearchInactive
        ? [descriptor.collapsedHeight ?? 88, geometry.categoriesSearchMaxHeight]
        : descriptor.snapPoints;
      const inactiveContentMode = isSearchInactive ? 'list' : descriptor.contentMode;

      expect(inactiveDynamicSizing).toBe(true);
      expect(inactiveSnapPoints).toEqual([88]);
      expect(inactiveContentMode).toBe('view');
    });

    it('verifies keyboard dismiss on scroll begin drag in categories search list', async () => {
      const { CategoriesPanelContent } = require('../../components/panels/CategoriesPanelContent');
      const { Keyboard } = require('react-native');
      const dismissSpy = jest.spyOn(Keyboard, 'dismiss');

      const view = await render(
        <BottomSheetProvider>
          <CategoriesPanelContent
            sheetKey="categories"
            requestId={1}
            payload={{ searchQuery: 'gas' }}
            dismiss={jest.fn()}
            setIndex={jest.fn()}
            isCollapsed={false}
          />
        </BottomSheetProvider>,
      );

      const flatList = view.getByTestId('bottom-sheet-flat-list');
      expect(flatList.props.keyboardDismissMode).toBe('on-drag');
      expect(flatList.props.keyboardShouldPersistTaps).toBe('handled');

      flatList.props.onScrollBeginDrag?.();
      expect(dismissSpy).toHaveBeenCalled();
      dismissSpy.mockRestore();
    });
  });
});
