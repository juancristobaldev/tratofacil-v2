import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FocusClientPanelContent } from './FocusClientPanelContent';

const mockShowNotification = jest.fn();
const mockSetShowChat = jest.fn();
const mockInitPayment = jest.fn().mockResolvedValue({ url: 'https://flow.cl' });
const mockPayWithSavedCard = jest.fn().mockResolvedValue({ id: 101, status: 'ACCEPTED' });
const mockCancelOrder = jest.fn().mockResolvedValue(undefined);
const mockRejectQuote = jest.fn().mockResolvedValue(undefined);
const mockClientCounterOffer = jest.fn().mockResolvedValue(undefined);
const mockStartOrder = jest.fn().mockResolvedValue(undefined);

let mockUser: any = null;

let mockSessionValue: any = {
  activeOrder: null,
  provider: null,
  distanceLabel: '1.2 km',
  etaLabel: '6 min',
  distanceToProviderKm: 1.2,
  realtime: {
    initPayment: mockInitPayment,
    payWithSavedCard: mockPayWithSavedCard,
    cancelOrder: mockCancelOrder,
    rejectQuote: mockRejectQuote,
    clientCounterOffer: mockClientCounterOffer,
    startOrder: mockStartOrder,
  },
  showChat: false,
  setShowChat: mockSetShowChat,
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../features/focus-session/useFocusSession', () => ({
  useFocusSession: () => mockSessionValue,
}));

jest.mock('../../bottom-sheet/primitives', () => {
  const { View } = require('react-native');
  return {
    BottomSheetScrollView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

const mockSheetProps: any = { sheetKey: 'focus_client', payload: {}, dismiss: jest.fn(), setIndex: jest.fn() };

describe('FocusClientPanelContent Component (Flujos 6, 7, 30)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockStartOrder.mockResolvedValue(undefined);
    mockRejectQuote.mockResolvedValue(undefined);
    mockClientCounterOffer.mockResolvedValue(undefined);
    mockInitPayment.mockResolvedValue({ url: 'https://flow.cl' });
    mockPayWithSavedCard.mockResolvedValue({ id: 101, status: 'ACCEPTED' });
    mockCancelOrder.mockResolvedValue(undefined);

    mockSessionValue = {
      activeOrder: {
        id: 101,
        status: 'QUOTED',
        quotedPrice: 35000,
        quotedHours: 2,
        quotedTransport: 5000,
        serviceProvider: { service: { name: 'Gasfitería Express' } },
        clientDescription: 'Fuga bajo el lavaplatos',
      },
      provider: {
        id: '202',
        name: 'Mario Profesional',
        avatar: 'https://example.com/avatar.jpg',
        rating: 4.8,
        reviewsCount: 15,
        serviceName: 'Gasfitería Express',
        description: 'Especialista en cañerías',
      },
      distanceLabel: '1.5 km',
      etaLabel: '8 min',
      distanceToProviderKm: 1.5,
      realtime: {
        initPayment: mockInitPayment,
        payWithSavedCard: mockPayWithSavedCard,
        cancelOrder: mockCancelOrder,
        rejectQuote: mockRejectQuote,
        clientCounterOffer: mockClientCounterOffer,
        startOrder: mockStartOrder,
      },
      showChat: false,
      setShowChat: mockSetShowChat,
    };
  });

  it('QUOTED: muestra la cotización del profesional, avatar y opciones de negociación', async () => {
    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('Mario Profesional')).toBeTruthy();
    expect(view.getByText('Cotización del profesional')).toBeTruthy();
    expect(view.getByText('Pagar ahora')).toBeTruthy();
    expect(view.getByText('Rechazar cotización')).toBeTruthy();
    expect(view.getByText('Cancelar orden')).toBeTruthy();
  });

  it('NEGOTIATION: ajustar monto cambia la acción a Enviar contraoferta', async () => {
    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    const minusBtn = view.getByLabelText('Disminuir monto de contraoferta');
    fireEvent.press(minusBtn);

    await waitFor(() => {
      expect(view.getByText('Enviar contraoferta')).toBeTruthy();
    });

    const sendCounterBtn = view.getByText('Enviar contraoferta');
    fireEvent.press(sendCounterBtn);

    await waitFor(() => {
      expect(mockClientCounterOffer).toHaveBeenCalledWith(101, 34000, 2, 5000);
      expect(view.getByText('Contraoferta enviada')).toBeTruthy();
      expect(view.getByText('Esperando respuesta del profesional...')).toBeTruthy();
    });
  });

  it('REJECT: permite rechazar la cotización recibida', async () => {
    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    const rejectBtn = view.getByText('Rechazar cotización');
    fireEvent.press(rejectBtn);

    await waitFor(() => {
      expect(mockRejectQuote).toHaveBeenCalledWith(101);
    });
  });

  it('ACCEPTED: muestra estado en camino si la distancia > 300m', async () => {
    mockSessionValue.activeOrder.status = 'ACCEPTED';
    mockSessionValue.distanceToProviderKm = 1.2;

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('Llegada estimada')).toBeTruthy();
    expect(view.getByText('8 min')).toBeTruthy();
    expect(view.getByText('A 1200m de tu ubicación')).toBeTruthy();
    expect(view.getByText('Cancelar servicio')).toBeTruthy();
  });

  it('QUOTED: realiza pago directo con tarjeta guardada cuando el usuario la tiene vinculada', async () => {
    mockUser = {
      id: 1,
      cardActive: true,
      creditCardType: 'MASTERCARD',
      last4CardDigits: '9876',
    };

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('MASTERCARD •••• 9876')).toBeTruthy();
    expect(view.getByText('VINCULADA')).toBeTruthy();
    expect(view.getByText('Pagar con •••• 9876')).toBeTruthy();
    expect(view.getByText('Pagar con Flow / Webpay')).toBeTruthy();

    const payCardBtn = view.getByText('Pagar con •••• 9876');
    fireEvent.press(payCardBtn);

    await waitFor(() => {
      expect(mockPayWithSavedCard).toHaveBeenCalledWith(101);
      expect(mockShowNotification).toHaveBeenCalledWith({
        title: 'Pago exitoso',
        message: 'Tu pago ha sido procesado con tu tarjeta vinculada.',
        type: 'success',
      });
    });
  });

  it('ACCEPTED: muestra botón de confirmar inicio cuando el profesional llegó (<= 300m)', async () => {
    mockSessionValue.activeOrder.status = 'ACCEPTED';
    mockSessionValue.distanceToProviderKm = 0.05;

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('LLEGÓ AL DOMICILIO')).toBeTruthy();
    expect(view.getByText('Listo para iniciar servicio')).toBeTruthy();

    const startBtn = view.getByText('Confirmar inicio de servicio');
    fireEvent.press(startBtn);

    await waitFor(() => {
      expect(mockStartOrder).toHaveBeenCalledWith(101);
    });
  });
});


