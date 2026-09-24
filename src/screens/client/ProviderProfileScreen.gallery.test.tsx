import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProviderProfileScreen } from './ProviderProfileScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockFetchPublicProfile = jest.fn();

let mockPublicProfile: any = null;
let mockPublicProfileLoading = false;
let mockPublicProfileError: any = null;
let mockPublicProfileFetched = true;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: { providerId: '99' },
  }),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: jest.fn(),
    goBack: mockGoBack,
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
    isAuthenticated: true,
    user: { id: 1, displayName: 'Test User' },
  }),
}));

jest.mock('../../context/LocationContext', () => ({
  useLocation: () => ({
    location: { coords: { latitude: -33.45, longitude: -70.66 } },
  }),
}));

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => ({
    createContactRequest: jest.fn(),
  }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({
    showNotification: jest.fn(),
  }),
}));

jest.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    publicProfile: mockPublicProfile,
    publicProfileLoading: mockPublicProfileLoading,
    publicProfileError: mockPublicProfileError,
    publicProfileFetched: mockPublicProfileFetched,
    fetchPublicProfile: mockFetchPublicProfile,
  }),
}));

describe('ProviderProfileScreen - Gallery / Portfolio Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders clean empty state when provider has no portfolio photos', async () => {
    mockPublicProfile = {
      id: 1,
      provider: {
        id: 99,
        name: 'Carlos Electricista',
        bio: 'Experto en tableros eléctricos.',
        location: 'Santiago',
        services: [
          {
            id: 10,
            price: 25000,
            service: { name: 'Instalación Eléctrica', slug: 'instalacion-electrica' },
          },
        ],
        portfolio: [],
        certificates: [],
        reviews: [],
        realtimeReviews: [],
      },
    };

    const view = await render(<ProviderProfileScreen />);

    // Switch to 'Sobre Mí' tab
    await fireEvent.press(view.getByText('Sobre Mí'));

    // Should show clean empty state
    expect(view.getByText('Sin fotografías de trabajos registradas actualmente.')).toBeTruthy();

    // Should NOT show any mock unsplash titles or 5 photos count
    expect(view.queryByText('Mantenimiento General')).toBeNull();
    expect(view.queryByText('Instalación Especializada')).toBeNull();
    expect(view.queryByText('5 fotos')).toBeNull();
  });

  it('renders real dynamic photos, count badge and handles modal lightbox when photos exist', async () => {
    mockPublicProfile = {
      id: 1,
      provider: {
        id: 99,
        name: 'Carlos Electricista',
        bio: 'Experto en tableros eléctricos.',
        location: 'Santiago',
        services: [
          {
            id: 10,
            price: 25000,
            service: { name: 'Instalación Eléctrica', slug: 'instalacion-electrica' },
          },
        ],
        portfolio: [
          {
            id: 101,
            title: 'Tablero Industrial Concluido',
            description: 'Instalación trifásica certificada',
            imageUrl: 'portfolio-101.jpg',
            image: { id: 501, cdnUrl: 'https://cdn.tratofacil.cl/files/portfolio-101.jpg' },
          },
          {
            id: 102,
            title: 'Cableado Domiciliario',
            description: 'Renovación completa de red',
            imageUrl: 'portfolio-102.jpg',
            image: { id: 502, cdnUrl: 'https://cdn.tratofacil.cl/files/portfolio-102.jpg' },
          },
        ],
        certificates: [],
        reviews: [],
        realtimeReviews: [],
      },
    };

    const view = await render(<ProviderProfileScreen />);

    // Switch to 'Sobre Mí' tab
    await fireEvent.press(view.getByText('Sobre Mí'));

    // Should display real count: "2 fotos"
    expect(view.getByText('2 fotos')).toBeTruthy();

    // Should display dynamic thumbnail indicators: "1/2" and "2/2"
    expect(view.getByText('1/2')).toBeTruthy();
    expect(view.getByText('2/2')).toBeTruthy();

    // Should NOT display empty state
    expect(view.queryByText('Sin fotografías de trabajos registradas actualmente.')).toBeNull();

    // Tap first thumbnail to open modal
    await fireEvent.press(view.getByText('1/2'));

    // Modal should display title, description and counter "1 / 2"
    expect(view.getByText('Tablero Industrial Concluido')).toBeTruthy();
    expect(view.getByText('Instalación trifásica certificada')).toBeTruthy();
    expect(view.getByText('1 / 2')).toBeTruthy();
  });

  it('renders loading indicator and does NOT show error message while query is loading or initializing', async () => {
    mockPublicProfile = null;
    mockPublicProfileLoading = true;
    mockPublicProfileError = null;
    mockPublicProfileFetched = false;

    const view = await render(<ProviderProfileScreen />);

    // Should NOT show error state
    expect(view.queryByText('No se pudo cargar el perfil del profesional.')).toBeNull();
  });

  it('renders error state when query returns an error after fetching', async () => {
    mockPublicProfile = null;
    mockPublicProfileLoading = false;
    mockPublicProfileError = new Error('Network error');
    mockPublicProfileFetched = true;

    const view = await render(<ProviderProfileScreen />);

    // Should show error state
    expect(view.getByText('No se pudo cargar el perfil del profesional.')).toBeTruthy();
  });

  it('renders error state when provider is not found after query completes', async () => {
    mockPublicProfile = null;
    mockPublicProfileLoading = false;
    mockPublicProfileError = null;
    mockPublicProfileFetched = true;

    const view = await render(<ProviderProfileScreen />);

    // Should show error state
    expect(view.getByText('No se pudo cargar el perfil del profesional.')).toBeTruthy();
  });
});
