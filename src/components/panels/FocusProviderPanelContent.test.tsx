import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FocusProviderPanelContent } from './FocusProviderPanelContent';

const mockShowNotification = jest.fn();
const mockSetOrderState = jest.fn();
const mockSetShowChat = jest.fn();
const mockHandleFinish = jest.fn();
const mockQuoteOrder = jest.fn();
const mockRespondToCounterOffer = jest.fn();
const mockRespondRequest = jest.fn();
const mockCancelOrder = jest.fn();

let mockSessionValue: any = {
  activeOrder: null,
  orderState: 'VIEW_REQUEST',
  setOrderState: mockSetOrderState,
  distanceLabel: '2.1 km',
  etaLabel: '10 min',
  setShowChat: mockSetShowChat,
  handleFinish: mockHandleFinish,
  realtime: {
    quoteOrder: mockQuoteOrder,
    respondToCounterOffer: mockRespondToCounterOffer,
    respondRequest: mockRespondRequest,
    cancelOrder: mockCancelOrder,
  },
};

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

const mockSheetProps: any = { sheetKey: 'focus_provider', payload: {}, dismiss: jest.fn(), setIndex: jest.fn() };

describe('FocusProviderPanelContent Component (Flujos 8, 9, 31)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionValue = {
      activeOrder: {
        id: 201,
        status: 'PENDING',
        clientAddress: 'Calle Los Alerces 456',
        clientDescription: 'Instalación de enchufe trifásico',
        client: { displayName: 'Carlos Cliente' },
        serviceProvider: { price: 20000, service: { name: 'Electricidad' } },
        counterOfferPrice: null,
      },
      orderState: 'VIEW_REQUEST',
      setOrderState: mockSetOrderState,
      distanceLabel: '2.1 km',
      etaLabel: '10 min',
      setShowChat: mockSetShowChat,
      handleFinish: mockHandleFinish,
      realtime: {
        quoteOrder: mockQuoteOrder,
        respondToCounterOffer: mockRespondToCounterOffer,
        respondRequest: mockRespondRequest,
        cancelOrder: mockCancelOrder,
      },
    };
  });

  it('PENDING (VIEW_REQUEST): muestra datos de cliente, panel de oferta y botones Enviar oferta / Rechazar', async () => {
    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('Carlos Cliente')).toBeTruthy();
    expect(view.getByText('Instalación de enchufe trifásico')).toBeTruthy();
    expect(view.getByText('Oferta del servicio')).toBeTruthy();
    expect(view.getByText('Enviar oferta')).toBeTruthy();
    expect(view.getByText('Rechazar solicitud')).toBeTruthy();
  });

  it('SEND_QUOTE: envía la oferta con horas y transporte calculados', async () => {
    mockQuoteOrder.mockResolvedValueOnce(undefined);
    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    const sendBtn = view.getByText('Enviar oferta');
    fireEvent.press(sendBtn);

    await waitFor(() => {
      expect(mockQuoteOrder).toHaveBeenCalledWith({
        orderRealtimeId: 201,
        quotedPrice: 20000,
        quotedHours: 1,
        quotedTransport: 0,
      });
      expect(mockSetOrderState).toHaveBeenCalledWith('WAITING_CLIENT_RESPONSE');
    });
  });

  it('COUNTEROFFER: cuando el cliente envía contraoferta, el proveedor puede Aceptar o Rechazar', async () => {
    mockSessionValue.activeOrder.counterOfferPrice = 18000;
    mockSessionValue.activeOrder.counterOfferHours = 1;
    mockSessionValue.activeOrder.counterOfferTransport = 0;
    mockSessionValue.orderState = 'VIEW_REQUEST';

    mockRespondToCounterOffer.mockResolvedValueOnce(undefined);

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('CONTRAOFERTA DEL CLIENTE')).toBeTruthy();
    expect(view.getByText('$18.000')).toBeTruthy();
    expect(view.getByText('Aceptar')).toBeTruthy();
    expect(view.getByText('Rechazar')).toBeTruthy();

    const acceptBtn = view.getByText('Aceptar');
    fireEvent.press(acceptBtn);

    await waitFor(() => {
      expect(mockRespondToCounterOffer).toHaveBeenCalledWith(201, 'ACCEPTED');
      expect(mockSetOrderState).toHaveBeenCalledWith('WAITING_CLIENT_RESPONSE');
    });
  });

  it('REJECT_REQUEST: permite al proveedor rechazar la solicitud entrante', async () => {
    mockRespondRequest.mockResolvedValueOnce(undefined);
    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    const rejectBtn = view.getByText('Rechazar solicitud');
    fireEvent.press(rejectBtn);

    await waitFor(() => {
      expect(mockRespondRequest).toHaveBeenCalledWith(201, 'reject');
    });
  });

  it('WAITING_CLIENT_RESPONSE: muestra oferta enviada y opción de actualizar o cancelar', async () => {
    mockSessionValue.orderState = 'WAITING_CLIENT_RESPONSE';
    mockSessionValue.activeOrder.counterOfferPrice = null;

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('Oferta enviada')).toBeTruthy();
    expect(view.getByText('Esperando confirmación o respuesta del cliente...')).toBeTruthy();
    expect(view.getByText('Actualizar Oferta')).toBeTruthy();
    expect(view.getByText('Cancelar orden')).toBeTruthy();
  });

  it('WAITING_CLIENT_RESPONSE con contraoferta: muestra tarjeta de contraoferta con Aceptar y Rechazar', async () => {
    mockSessionValue.orderState = 'WAITING_CLIENT_RESPONSE';
    mockSessionValue.activeOrder.counterOfferPrice = 15000;
    mockSessionValue.activeOrder.counterOfferHours = 2;
    mockSessionValue.activeOrder.counterOfferTransport = 3;

    mockRespondToCounterOffer.mockResolvedValueOnce(undefined);

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('CONTRAOFERTA DEL CLIENTE')).toBeTruthy();
    expect(view.getByText('$15.000')).toBeTruthy();
    expect(view.getByText('Propuesta: 2h / 3km')).toBeTruthy();
    expect(view.getByText('Aceptar')).toBeTruthy();
    expect(view.getByText('Rechazar')).toBeTruthy();
  });

  it('EN_CAMINO: muestra botón de chat y no permite cancelar la orden una vez pagada', async () => {
    mockSessionValue.orderState = 'EN_CAMINO';
    mockSessionValue.activeOrder.status = 'ACCEPTED';

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('DIRIGIÉNDOSE AL CLIENTE')).toBeTruthy();
    expect(view.getByText('Abrir Chat')).toBeTruthy();
    expect(view.queryByText('Cancelar orden')).toBeNull();
  });
});
