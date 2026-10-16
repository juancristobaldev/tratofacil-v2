import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TratoDirectoScreen } from './TratoDirectoScreen';
import { CustomAlert as Alert } from '../../components/ui/CustomAlert';

const mockCreateAd = jest.fn();
const mockCreateFlowAd = jest.fn();
const mockPayWithSavedCard = jest.fn();
const mockRefetchMyAds = jest.fn();

let mockUser: any = {
  id: 1,
  cardActive: true,
  last4CardDigits: '4242',
  creditCardType: 'Visa',
};
let mockRole = 'client';
let mockMyAdsData: any = { getMyAds: [] };
let mockMyAdsLoading = false;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, role: mockRole }),
}));

jest.mock('../../hooks/usePlans', () => ({
  usePlans: () => ({
    createAd: mockCreateAd,
    createFlowAd: mockCreateFlowAd,
  }),
}));

jest.mock('../../hooks/useFlow', () => ({
  useFlow: () => ({
    payWithSavedCard: mockPayWithSavedCard,
  }),
}));

jest.mock('../../context/CategoriesContext', () => ({
  useCategories: () => ({
    categories: [
      {
        id: 10,
        name: 'Hogar y Reparaciones',
        subCategories: [{ id: 101, name: 'Gasfitería' }],
      },
    ],
    categoriesLoading: false,
  }),
}));

jest.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: mockMyAdsData,
    loading: mockMyAdsLoading,
    refetch: mockRefetchMyAds,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../components/ui/CustomAlert', () => ({
  CustomAlert: {
    alert: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(true),
}));

describe('TratoDirectoScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'client';
    mockUser = {
      id: 1,
      cardActive: true,
      last4CardDigits: '4242',
      creditCardType: 'Visa',
    };
    mockMyAdsData = { getMyAds: [] };
    mockMyAdsLoading = false;
  });

  it('renders tab switch between Crear Anuncio and Mis Anuncios', async () => {
    const view = await render(<TratoDirectoScreen />);
    expect(await view.findByText('Crear Anuncio')).toBeTruthy();
    expect(await view.findByText('Mis Anuncios')).toBeTruthy();
  });

  it('switches to Mis Anuncios tab and displays empty state when no ads exist', async () => {
    const view = await render(<TratoDirectoScreen />);
    const misAnunciosTab = await view.findByText('Mis Anuncios');
    fireEvent.press(misAnunciosTab);

    expect(await view.findByText('Tus Campañas Publicitarias')).toBeTruthy();
    expect(await view.findByText('Aún no tienes anuncios activos')).toBeTruthy();
    expect(await view.findByText('Crear mi primer anuncio')).toBeTruthy();
  });

  it('displays user active ads when available', async () => {
    mockMyAdsData = {
      getMyAds: [
        {
          id: 55,
          expiredAt: new Date(Date.now() + 86400000 * 30).toISOString(),
          orders: [
            {
              id: 99,
              status: 'CONFIRMED',
              days: 30,
              total: 30000,
              info: 'Servicio de gasfitería premium',
              city: 'Santiago',
              link: 'https://gasfiter.cl',
              category: { id: 10, name: 'Hogar y Reparaciones' },
            },
          ],
        },
      ],
    };

    const view = await render(<TratoDirectoScreen />);
    const tabWithCount = await view.findByText('Mis Anuncios (1)');
    fireEvent.press(tabWithCount);

    expect(await view.findByText('Hogar y Reparaciones')).toBeTruthy();
    expect(await view.findByText('Servicio de gasfitería premium')).toBeTruthy();
    expect(await view.findByText('30 días')).toBeTruthy();
    expect(await view.findByText('Santiago')).toBeTruthy();
    expect(await view.findByText('ACTIVO')).toBeTruthy();
    expect(await view.findByText('https://gasfiter.cl')).toBeTruthy();
  });

  it('allows entering coupon code and selecting saved card payment method', async () => {
    const view = await render(<TratoDirectoScreen />);

    // Check coupon input
    const couponInput = await view.findByPlaceholderText('EJ: VERANO2026');
    expect(couponInput).toBeTruthy();
    fireEvent.changeText(couponInput, 'PROMO50');

    // Check saved card option is shown
    expect(await view.findByText('Tarjeta Guardada (•••• 4242)')).toBeTruthy();
    expect(await view.findByText('Pagar con Tarjeta Guardada')).toBeTruthy();
  });

  it('validates required fields before submitting', async () => {
    const view = await render(<TratoDirectoScreen />);
    const payBtn = await view.findByText('Pagar con Tarjeta Guardada');
    fireEvent.press(payBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Completa todos los campos requeridos antes de continuar.'
    );
  });
});
