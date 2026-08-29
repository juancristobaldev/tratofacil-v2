import React from 'react';
import { render } from '@testing-library/react-native';
import { ReviewsListScreen } from './ReviewsListScreen';

const mockRefetch = jest.fn();
let mockRole = 'client';
let mockUser: any = {
  id: 1,
  displayName: 'Juan Cliente',
  reviewsReceived: [
    {
      id: 101,
      rating: 5,
      comment: 'Excelente cliente, muy puntual y amable.',
      createdAt: '2026-08-20T10:00:00.000Z',
      provider: {
        id: 1,
        name: 'Gasfitería Express',
      },
    },
    {
      id: 102,
      rating: 4,
      comment: 'Todo bien durante el servicio.',
      createdAt: '2026-08-22T15:30:00.000Z',
      provider: {
        id: 2,
        name: 'Electricidad Pro',
      },
    },
  ],
  provider: {
    id: 1,
    name: 'Gasfitería Express',
    realtimeReviews: [
      {
        id: 201,
        rating: 5,
        comment: 'Solucionó la fuga de agua muy rápido!',
        createdAt: '2026-08-25T12:00:00.000Z',
        client: { id: 10, displayName: 'María González' },
      },
    ],
    reviews: [
      {
        id: 202,
        rating: 5,
        comment: 'Muy recomendable y profesional.',
        createdAt: '2026-08-26T14:00:00.000Z',
        client: { id: 11, displayName: 'Carlos Rojas' },
      },
    ],
  },
};

let mockRouteParams: any = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    role: mockRole,
    user: mockUser,
    refetch: mockRefetch,
  }),
}));

jest.mock('../../context/RefreshContext', () => ({
  useRefresh: () => ({
    setIsRefreshing: jest.fn(),
  }),
}));

describe('ReviewsListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockUser = {
      id: 1,
      displayName: 'Juan Cliente',
      reviewsReceived: [
        {
          id: 101,
          rating: 5,
          comment: 'Excelente cliente, muy puntual y amable.',
          createdAt: '2026-08-20T10:00:00.000Z',
          provider: {
            id: 1,
            name: 'Gasfitería Express',
          },
        },
        {
          id: 102,
          rating: 4,
          comment: 'Todo bien durante el servicio.',
          createdAt: '2026-08-22T15:30:00.000Z',
          provider: {
            id: 2,
            name: 'Electricidad Pro',
          },
        },
      ],
      provider: {
        id: 1,
        name: 'Gasfitería Express',
        realtimeReviews: [
          {
            id: 201,
            rating: 5,
            comment: 'Solucionó la fuga de agua muy rápido!',
            createdAt: '2026-08-25T12:00:00.000Z',
            client: { id: 10, displayName: 'María González' },
          },
        ],
        reviews: [
          {
            id: 202,
            rating: 5,
            comment: 'Muy recomendable y profesional.',
            createdAt: '2026-08-26T14:00:00.000Z',
            client: { id: 11, displayName: 'Carlos Rojas' },
          },
        ],
      },
    };
  });

  it('renders client reviews correctly when role is client', async () => {
    mockRole = 'client';
    mockRouteParams = { role: 'client' };

    const view = await render(<ReviewsListScreen />);

    expect(view.getByText('Gasfitería Express')).toBeTruthy();
    expect(view.getByText('"Excelente cliente, muy puntual y amable."')).toBeTruthy();
    expect(view.getByText('Electricidad Pro')).toBeTruthy();
    expect(view.getByText('"Todo bien durante el servicio."')).toBeTruthy();
    expect(view.getByText('2 opiniones')).toBeTruthy();
    expect(view.getByText('4.5')).toBeTruthy();
  });

  it('renders provider reviews correctly when role is provider', async () => {
    mockRole = 'provider';
    mockRouteParams = { role: 'provider' };

    const view = await render(<ReviewsListScreen />);

    expect(view.getByText('María González')).toBeTruthy();
    expect(view.getByText('"Solucionó la fuga de agua muy rápido!"')).toBeTruthy();
    expect(view.getByText('Carlos Rojas')).toBeTruthy();
    expect(view.getByText('"Muy recomendable y profesional."')).toBeTruthy();
    expect(view.getByText('2 opiniones')).toBeTruthy();
    expect(view.getByText('5.0')).toBeTruthy();
  });

  it('renders empty state when there are no reviews', async () => {
    mockRole = 'client';
    mockUser = {
      ...mockUser,
      reviewsReceived: [],
    };
    mockRouteParams = { role: 'client' };

    const view = await render(<ReviewsListScreen />);

    expect(view.getByText('Sin reseñas aún')).toBeTruthy();
    expect(
      view.getByText(
        'Las opiniones y valoraciones que los profesionales te dejen tras completar un servicio aparecerán aquí.'
      )
    ).toBeTruthy();
  });
});
