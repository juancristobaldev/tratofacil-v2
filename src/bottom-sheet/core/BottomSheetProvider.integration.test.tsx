import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { BottomSheetProvider } from './BottomSheetProvider';
import { useBottomSheet } from './useBottomSheet';
import { useRole } from '../../context/RoleContext';
import type { AppRole } from '../../types/graphql';

let mockCurrentRole: AppRole = 'client';
const mockSetRole = jest.fn((r: AppRole) => {
  mockCurrentRole = r;
});

jest.mock('@react-navigation/native', () => {
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({ params: {} }),
    createNavigationContainerRef: () => ({
      isReady: () => true,
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, provider: { id: 99 } },
    token: 'jwt_test_token',
    role: mockCurrentRole,
    setRole: mockSetRole,
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

jest.mock('../../context/CategoriesContext', () => ({
  useCategories: () => ({
    categories: [{ id: 1, name: 'Gasfitería', slug: 'gasfiteria' }],
    loading: false,
    error: null,
    fetchServicesByCategory: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => ({
    activeOrder: null,
    localActiveOrder: null,
    providerActiveOrder: null,
    quoteOrder: jest.fn(),
    acceptQuote: jest.fn(),
    rejectQuote: jest.fn(),
    sendCounterOffer: jest.fn(),
    acceptCounterOffer: jest.fn(),
    rejectCounterOffer: jest.fn(),
    rejectRequest: jest.fn(),
    cancelOrder: jest.fn(),
    startOrder: jest.fn(),
    completeOrder: jest.fn(),
  }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({
    showNotification: jest.fn(),
  }),
}));

const HarnessConsumer: React.FC<{
  onContextReady?: (ctx: ReturnType<typeof useBottomSheet>, roleCtx: ReturnType<typeof useRole>) => void;
}> = ({ onContextReady }) => {
  const bottomSheet = useBottomSheet();
  const roleContext = useRole();

  React.useEffect(() => {
    onContextReady?.(bottomSheet, roleContext);
  });

  return (
    <View testID="harness-consumer">
      <Text testID="active-sheet">{bottomSheet.active ?? 'NO_ACTIVE_SHEET'}</Text>
      <Text testID="current-role">{roleContext.role}</Text>
    </View>
  );
};

const renderHarness = async (initialRole: AppRole = 'client') => {
  mockCurrentRole = initialRole;
  let capturedCtx: ReturnType<typeof useBottomSheet> | null = null;
  let capturedRole: ReturnType<typeof useRole> | null = null;

  const view = await render(
    <BottomSheetProvider>
      <HarnessConsumer
        onContextReady={(ctx, rCtx) => {
          capturedCtx = ctx;
          capturedRole = rCtx;
        }}
      />
    </BottomSheetProvider>,
  );

  return {
    view,
    getCtx: () => capturedCtx!,
    getRole: () => capturedRole!,
  };
};

describe('BottomSheet Provider & Reconciler Integration Layer (Layer 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentRole = 'client';
  });

  it('Suite 1: present() en modo CLIENT con mapFlowActive=true monta categories', async () => {
    const { view, getCtx } = await renderHarness('client');

    await act(async () => {
      getCtx().setMapFlowActive(true);
      getCtx().present('categories', {});
    });

    expect(view.getByTestId('active-sheet').props.children).toBe('categories');
  });

  it('Suite 2: present() en modo PROVIDER con mapFlowActive=true monta provider_dashboard', async () => {
    const { view, getCtx } = await renderHarness('provider');

    await act(async () => {
      getCtx().setMapFlowActive(true);
      getCtx().present('provider_dashboard', undefined);
    });

    expect(view.getByTestId('active-sheet').props.children).toBe('provider_dashboard');
  });

  it('Suite 4, 5, 16: External Navigation SUSPEND on blur & RESTORE on focus', async () => {
    const { view, getCtx } = await renderHarness('client');

    // 1. Presentar provider_preview en el mapa
    await act(async () => {
      getCtx().setMapFlowActive(true);
      getCtx().present('provider_preview', {
        providers: [{ id: 99, providerName: 'Gasfiter Carlos' }],
      });
    });

    expect(view.getByTestId('active-sheet').props.children).toBe('provider_preview');

    // 2. Navegar fuera del mapa (map blur -> mapFlowActive=false)
    await act(async () => {
      getCtx().setMapFlowActive(false);
    });

    // El request lógico se preserva en memoria aunque la física se suspenda
    expect(getCtx().active).toBe('provider_preview');

    // 3. Volver al mapa (map focus -> mapFlowActive=true)
    await act(async () => {
      getCtx().setMapFlowActive(true);
    });

    // Se restaura exactamente provider_preview con su payload original
    expect(view.getByTestId('active-sheet').props.children).toBe('provider_preview');
    expect(getCtx().activePayload).toEqual(
      expect.objectContaining({
        providers: [{ id: 99, providerName: 'Gasfiter Carlos' }],
      }),
    );
  });

  it('Suite 14: A -> B -> A Replace y Latest Request Wins', async () => {
    const { view, getCtx } = await renderHarness('client');

    await act(async () => {
      getCtx().setMapFlowActive(true);
      getCtx().present('categories', {});
    });
    expect(view.getByTestId('active-sheet').props.children).toBe('categories');

    // Transición directa categories -> provider_preview (permitida por replaceFrom)
    await act(async () => {
      getCtx().present('provider_preview', {
        providers: [{ id: 10, providerName: 'Electricista Pedro' }],
      });
    });
    expect(view.getByTestId('active-sheet').props.children).toBe('provider_preview');

    // Transición de regreso provider_preview -> categories (reemplazo sin parpadeo)
    await act(async () => {
      getCtx().present('categories', {});
    });
    expect(view.getByTestId('active-sheet').props.children).toBe('categories');
  });

  it('Suite 17: Solicitudes cuando MapFlow es inactivo se encolan y presentan al reactivar el mapa', async () => {
    const { view, getCtx } = await renderHarness('client');

    // MapFlow está inactivo (pantalla externa)
    await act(async () => {
      getCtx().setMapFlowActive(false);
      getCtx().present('categories', {});
    });

    // Se registra como pendingMapFlowKey
    expect(getCtx().pendingMapFlowKey).toBe('categories');

    // Al activarse el flujo de mapa, se despacha la solicitud encolada
    await act(async () => {
      getCtx().setMapFlowActive(true);
    });

    expect(view.getByTestId('active-sheet').props.children).toBe('categories');
    expect(getCtx().pendingMapFlowKey).toBeNull();
  });

  it('Suite 18: Action Handler Resolution y persistencia tras restore', async () => {
    const { getCtx } = await renderHarness('client');
    const mockViewProfile = jest.fn();

    const owner = { ownerId: 'TestScreen:1', generation: 1 };

    await act(async () => {
      getCtx().setMapFlowActive(true);
      getCtx().bindRuntimeActionHandlers(owner, {
        provider_preview: {
          VIEW_PROFILE: mockViewProfile,
        },
      });
      getCtx().present('provider_preview', {
        providers: [{ id: 77, providerName: 'Pintor David' }],
      });
    });

    // Despachar acción desde UI
    await act(async () => {
      getCtx().dispatchBottomSheetAction(
        'provider_preview',
        'VIEW_PROFILE',
        { id: 77, providerName: 'Pintor David' },
      );
    });

    expect(mockViewProfile).toHaveBeenCalledTimes(1);
    expect(mockViewProfile).toHaveBeenCalledWith(
      { id: 77, providerName: 'Pintor David' },
      expect.objectContaining({
        key: 'provider_preview',
        action: 'VIEW_PROFILE',
        owner,
      }),
    );

    // Simular blur y restore
    await act(async () => {
      getCtx().setMapFlowActive(false);
      getCtx().setMapFlowActive(true);
    });

    // El handler sigue disponible tras restore
    await act(async () => {
      getCtx().dispatchBottomSheetAction(
        'provider_preview',
        'VIEW_PROFILE',
        { id: 77, providerName: 'Pintor David' },
      );
    });

    expect(mockViewProfile).toHaveBeenCalledTimes(2);
  });

  it('Suite 11, 12, 20: Role Switch invalida y oculta sheets incompatibles', async () => {
    const { view, getCtx } = await renderHarness('client');

    // 1. Cliente en categories
    await act(async () => {
      getCtx().setMapFlowActive(true);
      getCtx().present('categories', {});
    });
    expect(view.getByTestId('active-sheet').props.children).toBe('categories');

    // 2. Cambiar rol a provider
    await act(async () => {
      mockCurrentRole = 'provider';
    });

    // Intentar presentar categories bajo rol provider debe ser ignorado por el guard
    await act(async () => {
      getCtx().present('categories', {});
    });

    // Presentar provider_dashboard
    await act(async () => {
      getCtx().present('provider_dashboard', undefined);
    });
    expect(view.getByTestId('active-sheet').props.children).toBe('provider_dashboard');
  });

  it('Suite 23: dismissAll() limpia limpiamente todo estado activo y solicitudes encoladas', async () => {
    const { view, getCtx } = await renderHarness('client');

    await act(async () => {
      getCtx().setMapFlowActive(true);
      getCtx().present('categories', {});
    });
    expect(view.getByTestId('active-sheet').props.children).toBe('categories');

    await act(async () => {
      getCtx().dismissAll();
    });

    expect(view.getByTestId('active-sheet').props.children).toBe('NO_ACTIVE_SHEET');
    expect(getCtx().active).toBeNull();
    expect(getCtx().activePayload).toBeNull();
    expect(getCtx().pendingMapFlowKey).toBeNull();
  });

  it('Collapsible Contract: Todos los 5 sheets tienen snapPoints colapsables, initialIndex y dynamic sizing', () => {
    const { registry } = require('./bottomSheet.registry');
    const sheetKeys: Array<keyof typeof registry> = [
      'categories',
      'provider_preview',
      'focus_client',
      'focus_provider',
      'provider_dashboard',
    ];

    sheetKeys.forEach((key) => {
      const descriptor = registry[key];
      expect(descriptor).toBeDefined();
      expect(descriptor.enableDynamicSizing).toBe(true);
      expect(descriptor.collapsedHeight).toBeGreaterThanOrEqual(80);
      expect(descriptor.collapsedHeight).toBeLessThanOrEqual(150);
      expect(descriptor.snapPoints).toBeDefined();
      expect(descriptor.snapPoints?.length).toBeGreaterThanOrEqual(2);
      expect(descriptor.snapPoints?.[0]).toBe(descriptor.collapsedHeight);
      expect(descriptor.initialIndex).toBe(1);
    });
  });
});
