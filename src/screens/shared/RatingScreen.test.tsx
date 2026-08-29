import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RatingScreen } from './RatingScreen';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockCreateProviderReview = jest.fn();
const mockCreateClientReview = jest.fn();
const mockReviewJob = jest.fn();

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
    reset: mockReset,
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
      expect(mockNavigate).toHaveBeenCalledWith('ServiceSuccess');
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
      expect(mockNavigate).toHaveBeenCalledWith('ServiceSuccess');
    });
  });

  it('COMPONENT: submits job review for worker and resets navigation to MainApp', async () => {
    mockRouteParams = {
      role: 'client',
      jobId: 55,
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
        jobId: 55,
        workerId: 66,
      });
      expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'MainApp' }] });
    });
  });
});
