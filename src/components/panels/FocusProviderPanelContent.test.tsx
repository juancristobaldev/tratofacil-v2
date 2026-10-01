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
const mockUpdateQuote = jest.fn();
const mockFinishOrder = jest.fn().mockResolvedValue(undefined);
const mockConfirmArrival = jest.fn().mockResolvedValue(undefined);

let mockSessionValue: any = {
  activeOrder: null,
  orderState: 'VIEW_REQUEST',
  setOrderState: mockSetOrderState,
  distanceLabel: '2.1 km',
  etaLabel: '10 min',
  distanceMeters: 2100,
  isWithinArrivalRadius: false,
  providerCoords: { latitude: -33.45, longitude: -70.66 },
  setShowChat: mockSetShowChat,
  handleFinish: mockHandleFinish,
  realtime: {
    quoteOrder: mockQuoteOrder,
    updateQuote: mockUpdateQuote,
    respondToCounterOffer: mockRespondToCounterOffer,
    respondRequest: mockRespondRequest,
    cancelOrder: mockCancelOrder,
    finishOrder: mockFinishOrder,
    confirmArrival: mockConfirmArrival,
  },
};

jest.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

jest.mock('../../features/focus-session/useFocusSession', () => ({
  useFocusSession: () => mockSessionValue,
}));

jest.mock('../../bottom-sheet/primitives', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    BottomSheetScrollView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    BottomSheetView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    TouchableOpacity,
  };
});

const mockSheetProps: any = { sheetKey: 'focus_provider', payload: {}, dismiss: jest.fn(), setIndex: jest.fn() };

describe('FocusProviderPanelContent Component (Flujos 8, 9, 31)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFinishOrder.mockResolvedValue(undefined);
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
        updateQuote: mockUpdateQuote,
        respondToCounterOffer: mockRespondToCounterOffer,
        respondRequest: mockRespondRequest,
        cancelOrder: mockCancelOrder,
        finishOrder: mockFinishOrder,
        confirmArrival: mockConfirmArrival,
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

  it('WAITING_CLIENT_RESPONSE: al presionar Actualizar Oferta abre edición interactiva y confirma con updateQuote', async () => {
    mockSessionValue.orderState = 'WAITING_CLIENT_RESPONSE';
    mockSessionValue.activeOrder.counterOfferPrice = null;
    mockSessionValue.activeOrder.quotedHours = 2;
    mockSessionValue.activeOrder.quotedTransport = 3;
    mockUpdateQuote.mockResolvedValueOnce(undefined);

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    const updateBtn = view.getAllByText('Actualizar Oferta')[0];
    fireEvent.press(updateBtn);

    // Debe mostrar la vista de modificación con el nuevo total y botones
    await waitFor(() => {
      expect(view.getByText('Modificar cotización')).toBeTruthy();
      expect(view.getByText('Confirmar nueva oferta')).toBeTruthy();
      expect(view.getByText('Descartar cambios')).toBeTruthy();
    });

    const confirmBtn = view.getByText('Confirmar nueva oferta');
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(mockUpdateQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          orderRealtimeId: 201,
        }),
      );
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Oferta actualizada',
          type: 'success',
        }),
      );
    });
  });

  it('WAITING_CLIENT_RESPONSE con contraoferta: muestra tarjeta de contraoferta con Aceptar y Rechazar y permite rechazarlas', async () => {
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
    expect(view.getByText('Cancelar orden')).toBeTruthy();

    const rejectBtn = view.getByText('Rechazar');
    fireEvent.press(rejectBtn);

    await waitFor(() => {
      expect(mockRespondToCounterOffer).toHaveBeenCalledWith(201, 'REJECTED');
    });
  });

  it('WAITING_CLIENT_RESPONSE con contraoferta: permite cancelar orden directamente', async () => {
    mockSessionValue.orderState = 'WAITING_CLIENT_RESPONSE';
    mockSessionValue.activeOrder.counterOfferPrice = 15000;
    mockSessionValue.activeOrder.counterOfferHours = 2;
    mockSessionValue.activeOrder.counterOfferTransport = 3;

    mockCancelOrder.mockResolvedValueOnce(undefined);

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    const cancelBtn = view.getByText('Cancelar orden');
    fireEvent.press(cancelBtn);

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalledWith(201);
    });
  });

  it('EN_CAMINO: botón de llegada deshabilitado si está a más de 50m', async () => {
    mockSessionValue.orderState = 'EN_CAMINO';
    mockSessionValue.activeOrder.status = 'ACCEPTED';
    mockSessionValue.isWithinArrivalRadius = false;
    mockSessionValue.distanceMeters = 150;

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('DIRIGIÉNDOSE AL CLIENTE')).toBeTruthy();
    expect(view.getByText('Acércate para confirmar llegada (150m)')).toBeTruthy();
    expect(view.getByText('Abrir Chat')).toBeTruthy();
    expect(view.queryByText('Cancelar orden')).toBeNull();
  });

  it('EN_CAMINO: permite confirmar llegada cuando está a <= 50m y pasa a ARRIVED', async () => {
    mockSessionValue.orderState = 'EN_CAMINO';
    mockSessionValue.activeOrder.status = 'ACCEPTED';
    mockSessionValue.isWithinArrivalRadius = true;
    mockSessionValue.distanceMeters = 30;
    mockSessionValue.providerCoords = { latitude: -33.456, longitude: -70.654 };

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    const confirmBtn = view.getByText('Confirmar llegada');
    expect(confirmBtn).toBeTruthy();
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(mockConfirmArrival).toHaveBeenCalledWith(201, -33.456, -70.654);
      expect(mockShowNotification).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Llegada confirmada',
        type: 'success',
      }));
    });
  });

  it('ARRIVED: muestra LLEGADO AL DESTINO y esperando confirmación del cliente', async () => {
    mockSessionValue.orderState = 'ARRIVED';
    mockSessionValue.activeOrder.status = 'ARRIVED';
    mockSessionValue.activeOrder.arrivedAt = '2026-09-17T20:00:00.000Z';

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('LLEGADO AL DESTINO')).toBeTruthy();
    expect(view.getByText('Listo para iniciar trabajo')).toBeTruthy();
    expect(view.getByText('Esperando confirmación')).toBeTruthy();
    expect(view.getByText('Abrir Chat')).toBeTruthy();
    expect(view.queryByText('Confirmar llegada')).toBeNull();
  });

  it('ARRIVED fallback: si el estado es ARRIVED pero backend sigue en ACCEPTED sin arrivedAt, mantiene botón Confirmar llegada disponible', async () => {
    mockSessionValue.orderState = 'ARRIVED';
    mockSessionValue.activeOrder.status = 'ACCEPTED';
    mockSessionValue.activeOrder.arrivedAt = null;
    mockSessionValue.isWithinArrivalRadius = true;
    mockSessionValue.providerCoords = { latitude: -33.456, longitude: -70.654 };

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    const confirmBtn = view.getAllByText('Confirmar llegada')[0];
    expect(confirmBtn).toBeTruthy();
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(mockConfirmArrival).toHaveBeenCalledWith(201, -33.456, -70.654);
    });
  });

  it('IN_PROGRESS: al presionar Completar Trabajo finaliza la orden y transiciona a COMPLETED', async () => {
    mockSessionValue.orderState = 'IN_PROGRESS';
    mockSessionValue.activeOrder.status = 'IN_PROGRESS';

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('Completar Trabajo')).toBeTruthy();
    const completeBtn = view.getByText('Completar Trabajo');
    fireEvent.press(completeBtn);

    await waitFor(() => {
      expect(mockFinishOrder).toHaveBeenCalledWith(201);
      expect(mockSetOrderState).toHaveBeenCalledWith('COMPLETED');
    });
  });

  it('COMPLETED: muestra tarjeta de resumen de ganancias y botón para volver al panel / calificar', async () => {
    mockSessionValue.orderState = 'COMPLETED';
    mockSessionValue.activeOrder.status = 'COMPLETED';
    mockSessionValue.activeOrder.quotedPrice = 25000;

    const view = await render(<FocusProviderPanelContent {...mockSheetProps} />);

    expect(view.getByText('¡Servicio Completado!')).toBeTruthy();
    expect(view.getByText('Has ganado $25.000')).toBeTruthy();
    const returnBtn = view.getByText('Volver al Panel');
    fireEvent.press(returnBtn);

    expect(mockHandleFinish).toHaveBeenCalledWith('COMPLETED');
  });

  it('EN_CAMINO: auto-colapsa el panel a index 0 para mantener visión despejada del mapa y navegación', async () => {
    mockSessionValue.orderState = 'EN_CAMINO';
    const mockSetIndex = jest.fn();

    await render(<FocusProviderPanelContent {...mockSheetProps} setIndex={mockSetIndex} />);

    expect(mockSetIndex).toHaveBeenCalledWith(0);
  });
});
