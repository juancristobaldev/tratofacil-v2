import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RatingScreen } from './RatingScreen';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockReset = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockCreateProviderReview = jest.fn();
const mockCreateClientReview = jest.fn();
const mockReviewJob = jest.fn();
const mockMarkOrderReviewed = jest.fn();
const mockResetOrderSession = jest.fn();

let mockClientOrders: any[] = [];
let mockLocalActiveOrder: any = null;

let mockRouteParams: any = {
  role: 'client',
  orderRealtimeId: 101,
  providerId: 202,
  targetUser: { name: 'Mario Gasfiter', avatar: 'https://example.com/avatar.jpg' },
  amount: 25000,
  address: 'Av. Providencia 123',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    reset: mockReset,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../context/RoleContext', () => ({
  useRole: () => ({ role: 'client' }),
}));

jest.mock('../../realtime/RealtimeContext', () => ({
  useRealtime: () => ({
    createProviderReview: mockCreateProviderReview,
    createClientReview: mockCreateClientReview,
    markOrderReviewed: mockMarkOrderReviewed,
    resetOrderSession: mockResetOrderSession,
    clientOrders: mockClientOrders,
    localActiveOrder: mockLocalActiveOrder,
  }),
}));

jest.mock('../../hooks/useJobs', () => ({
  useJobs: () => ({
    reviewJob: mockReviewJob,
  }),
}));

jest.mock('../../components/ui', () => {
  const mockReact = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    Icon: ({ name }: { name: string }) => <Text>{name}</Text>,
    Button: ({ title, onPress, disabled }: any) => (
      <TouchableOpacity onPress={onPress} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <>{children}</>,
    Rating: ({ rating, onRatingChange }: any) => (
      <TouchableOpacity onPress={() => onRatingChange(4)}>
        <Text>RatingStars-{rating}</Text>
      </TouchableOpacity>
    ),
  };
});

describe('RatingScreen component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {
      role: 'client',
      orderRealtimeId: 101,
      providerId: 202,
      targetUser: { name: 'Mario Gasfiter', avatar: 'https://example.com/avatar.jpg' },
      amount: 25000,
      address: 'Av. Providencia 123',
    };
    mockCreateProviderReview.mockResolvedValue(undefined);
    mockCreateClientReview.mockResolvedValue(undefined);
    mockReviewJob.mockResolvedValue(undefined);
  });

  it('COMPONENT: submits provider review from client and navigates to ServiceSuccess', async () => {
    const view = await render(<RatingScreen />);

    expect(await view.findByText('Mario Gasfiter')).toBeTruthy();
    expect(await view.findByText('* La reseña escrita es obligatoria')).toBeTruthy();

    const commentInput = view.getByPlaceholderText('Escribe tu reseña sobre el servicio aquí (obligatorio)...');
    await fireEvent.changeText(commentInput, 'Excelente servicio, muy puntual');

    const submitBtn = view.getByText('Enviar reseña');
    await fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockCreateProviderReview).toHaveBeenCalledWith({
        rating: 5,
        comment: 'Excelente servicio, muy puntual',
        orderRealtimeId: 101,
        providerId: 202,
      });
      expect(mockReplace).toHaveBeenCalledWith('ServiceSuccess');
    });
  });

  it('COMPONENT: submits client review from provider for realtime order', async () => {
    mockRouteParams = {
      role: 'provider',
      orderRealtimeId: 101,
      clientId: 303,
      targetUser: { name: 'Carlos Cliente' },
      amount: 25000,
    };

    const view = await render(<RatingScreen />);

    const commentInput = view.getByPlaceholderText('Escribe tu reseña sobre el servicio aquí (obligatorio)...');
    await fireEvent.changeText(commentInput, 'Cliente muy amable');

    const submitBtn = view.getByText('Enviar reseña');
    await fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockCreateClientReview).toHaveBeenCalledWith({
        rating: 5,
        comment: 'Cliente muy amable',
        orderRealtimeId: 101,
        clientId: 303,
      });
      expect(mockReplace).toHaveBeenCalledWith('ServiceSuccess');
    });
  });

  it('COMPONENT: submits job review for worker and resets navigation to MainApp', async () => {
    mockRouteParams = {
      role: 'client',
      orderJobId: 55,
      workerId: 66,
      targetUser: { name: 'Pedro Electricista' },
      amount: 40000,
    };

    const view = await render(<RatingScreen />);

    const commentInput = view.getByPlaceholderText('Escribe tu reseña sobre el servicio aquí (obligatorio)...');
    await fireEvent.changeText(commentInput, 'Trabajo impecable');

    const submitBtn = view.getByText('Enviar reseña');
    await fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockReviewJob).toHaveBeenCalledWith({
        rating: 5,
        comment: 'Trabajo impecable',
        orderJobId: 55,
        workerId: 66,
      });
      expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'MainApp' }] });
    });
  });

  it('COMPONENT: allows skipping review via "Calificar más tarde" and cleans up order session', async () => {
    mockRouteParams = {
      role: 'client',
      orderRealtimeId: 101,
      providerId: 202,
    };

    const view = await render(<RatingScreen />);
    const skipBtn = view.getByText('Calificar más tarde');
    await fireEvent.press(skipBtn);

    expect(mockMarkOrderReviewed).toHaveBeenCalledWith(101);
    expect(mockResetOrderSession).toHaveBeenCalledWith(101);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('COMPONENT: resolves providerId fallback from clientOrders when omitted in route params', async () => {
    mockRouteParams = {
      role: 'client',
      orderRealtimeId: 101,
      // providerId omitted deliberately
    };
    mockClientOrders.length = 0;
    mockClientOrders.push({
      id: 101,
      provider: { id: 888, name: 'Fallback Provider' },
    });

    const view = await render(<RatingScreen />);

    const commentInput = view.getByPlaceholderText('Escribe tu reseña sobre el servicio aquí (obligatorio)...');
    await fireEvent.changeText(commentInput, 'Buena atención');

    const submitBtn = view.getByText('Enviar reseña');
    await fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockCreateProviderReview).toHaveBeenCalledWith({
        rating: 5,
        comment: 'Buena atención',
        orderRealtimeId: 101,
        providerId: 888,
      });
      expect(mockMarkOrderReviewed).toHaveBeenCalledWith(101);
      expect(mockResetOrderSession).toHaveBeenCalledWith(101);
    });
  });

  it('COMPONENT: performs cleanup and navigates even if review mutation fails with already reviewed error', async () => {
    mockRouteParams = {
      role: 'client',
      orderRealtimeId: 101,
      providerId: 202,
    };
    mockCreateProviderReview.mockRejectedValueOnce(new Error('La orden ya tiene una calificación'));

    const view = await render(<RatingScreen />);

    const commentInput = view.getByPlaceholderText('Escribe tu reseña sobre el servicio aquí (obligatorio)...');
    await fireEvent.changeText(commentInput, 'Excelente servicio');

    const submitBtn = view.getByText('Enviar reseña');
    await fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockMarkOrderReviewed).toHaveBeenCalledWith(101);
      expect(mockResetOrderSession).toHaveBeenCalledWith(101);
      expect(mockReplace).toHaveBeenCalledWith('ServiceSuccess');
    });
  });
});
