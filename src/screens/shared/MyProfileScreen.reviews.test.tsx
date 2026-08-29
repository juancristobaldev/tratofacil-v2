import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MyProfileScreen } from './MyProfileScreen';

const mockNavigate = jest.fn();
const mockLogout = jest.fn();
const mockRefetch = jest.fn();

let mockRole = 'client';
let mockUser: any = {
  id: 1,
  displayName: 'Camila Cliente',
  email: 'camila@example.com',
  phone: '+56912345678',
  identitys: [{ status: 'APPROVED' }],
  reviewsReceived: [
    {
      id: 1,
      rating: 5,
      comment: 'Excelente cliente!',
      createdAt: '2026-08-20T10:00:00.000Z',
      provider: { id: 10, name: 'Electro Chile' },
    },
    {
      id: 2,
      rating: 5,
      comment: 'Muy responsable y amable.',
      createdAt: '2026-08-22T10:00:00.000Z',
      provider: { id: 11, name: 'Pintores Pro' },
    },
  ],
  provider: {
    id: 99,
    name: 'Servicios Integrales SPA',
    location: 'Providencia',
    rut: '76123456-7',
    logoImage: null,
    bank: {
      bankName: 'Banco de Chile',
      accountType: 'Cuenta Corriente',
      accountNumber: '12345678',
      rut: '76123456-7',
    },
    certificates: [],
    realtimeReviews: [
      {
        id: 10,
        rating: 5,
        comment: 'Excelente servicio en tiempo real!',
        createdAt: '2026-08-24T10:00:00.000Z',
        client: { id: 50, displayName: 'Ana Ruiz' },
      },
    ],
    reviews: [
      {
        id: 11,
        rating: 5,
        comment: 'Puntual y muy limpio.',
        createdAt: '2026-08-25T10:00:00.000Z',
        client: { id: 51, displayName: 'Pedro Soto' },
      },
    ],
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: jest.fn(),
    goBack: jest.fn(),
  }),
  createNavigationContainerRef: () => ({
    isReady: () => false,
    navigate: jest.fn(),
    dispatch: jest.fn(),
    getCurrentRoute: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    role: mockRole,
    user: mockUser,
    logout: mockLogout,
    refetch: mockRefetch,
  }),
}));

jest.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    updateProfile: jest.fn(),
    updateProviderProfile: jest.fn(),
    updateProviderBank: jest.fn(),
    saving: false,
  }),
}));

jest.mock('../../context/RefreshContext', () => ({
  useRefresh: () => ({
    setIsRefreshing: jest.fn(),
  }),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

describe('MyProfileScreen - Reviews & Ratings in Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders client profile with rating badge and navigates to ReviewsList when clicking reviews option', async () => {
    mockRole = 'client';

    const view = await render(<MyProfileScreen />);

    expect(view.getByText('Camila Cliente')).toBeTruthy();
    expect(view.getByText('5.0 (2 reseñas)')).toBeTruthy();
    expect(view.getByText('Mis Reseñas de Servicios')).toBeTruthy();
    expect(view.getByText('2 opiniones de profesionales')).toBeTruthy();

    const reviewsMenuItem = view.getByText('Mis Reseñas de Servicios');
    await fireEvent.press(reviewsMenuItem);
    expect(mockNavigate).toHaveBeenCalledWith('ReviewsList', { role: 'client' });
  });

  it('renders provider profile with Reseñas tab, star distribution and review cards', async () => {
    mockRole = 'provider';

    const view = await render(<MyProfileScreen />);

    expect(view.getByText('Servicios Integrales SPA')).toBeTruthy();
    expect(view.getByText('Reseñas')).toBeTruthy();

    // Click on Reseñas tab
    await fireEvent.press(view.getByText('Reseñas'));

    await waitFor(() => {
      expect(view.getByText('Mis Reseñas y Calificaciones')).toBeTruthy();
      expect(view.getByText('Opiniones recibidas de tus clientes en tiempo real.')).toBeTruthy();
      expect(view.getByText('Ana Ruiz')).toBeTruthy();
      expect(view.getByText('"Excelente servicio en tiempo real!"')).toBeTruthy();
      expect(view.getByText('Pedro Soto')).toBeTruthy();
      expect(view.getByText('"Puntual y muy limpio."')).toBeTruthy();
      expect(view.getByText('2 opiniones')).toBeTruthy();
    });
  });
});
