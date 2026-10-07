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

const mockRegisterCard = jest.fn();
jest.mock('../../hooks/usePlans', () => ({
  usePlans: () => ({ registerCard: mockRegisterCard }),
}));

jest.mock('../../bottom-sheet/primitives', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    BottomSheetScrollView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    BottomSheetView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    TouchableOpacity,
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

  it('QUOTED: muestra la oferta del profesional, avatar y opciones de negociación', async () => {
    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('Mario Profesional')).toBeTruthy();
    expect(view.getByText('Oferta del profesional')).toBeTruthy();
    expect(view.getByText('Aceptar oferta')).toBeTruthy();
    expect(view.getByText('Cancelar orden')).toBeTruthy();
    expect(view.queryByText('Rechazar oferta')).toBeNull();
    expect(view.queryByText('Cancelar servicio')).toBeNull();
  });

  it('NEGOTIATION: ajustar monto cambia la acción a Enviar contraoferta', async () => {
    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    const minusBtn = view.getByLabelText('Disminuir monto de contraoferta');
    fireEvent.press(minusBtn);

    await waitFor(() => {
      expect(view.getByText('Enviar contraoferta')).toBeTruthy();
      expect(view.getByText('Cancelar orden')).toBeTruthy();
    });

    const sendCounterBtn = view.getByText('Enviar contraoferta');
    fireEvent.press(sendCounterBtn);

    await waitFor(() => {
      expect(mockClientCounterOffer).toHaveBeenCalledWith(101, 34000, 2, 5000);
      expect(view.getByText('Esperando respuesta del profesional')).toBeTruthy();
      expect(view.getByText('TU CONTRAOFERTA ENVIADA')).toBeTruthy();
      expect(view.getByText('$34.000')).toBeTruthy();
      expect(view.getByText('Cancelar orden')).toBeTruthy();
      expect(view.queryByText('Aceptar oferta')).toBeNull();
    });
  });

  it('WAITING_PROVIDER_RESPONSE: cuando se monta con contraoferta activa existente, muestra tarjeta de espera con spinner y nunca Aceptar oferta', async () => {
    mockSessionValue.activeOrder = {
      ...mockSessionValue.activeOrder,
      counterOfferPrice: 32000,
      counterOfferHours: 2,
      counterOfferTransport: 3000,
    };

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('Esperando respuesta del profesional')).toBeTruthy();
    expect(view.getByText('TU CONTRAOFERTA ENVIADA')).toBeTruthy();
    expect(view.getByText('$32.000')).toBeTruthy();
    expect(view.getByText('Propuesta: 2h de trabajo • 3000km traslado')).toBeTruthy();
    expect(view.getByText('Cancelar orden')).toBeTruthy();
    expect(view.queryByText('Aceptar oferta')).toBeNull();
    expect(view.queryByLabelText('Disminuir monto de contraoferta')).toBeNull();
  });

  it('WAITING_PROVIDER_RESPONSE (isCollapsed): muestra resumen compacto de contraoferta enviada y badge con monto', async () => {
    mockSessionValue.activeOrder = {
      ...mockSessionValue.activeOrder,
      counterOfferPrice: 32000,
      counterOfferHours: 2,
      counterOfferTransport: 3000,
    };

    const view = await render(
      <FocusClientPanelContent {...mockSheetProps} isCollapsed={true} />,
    );

    expect(view.getByText('Mario Profesional')).toBeTruthy();
    expect(view.getByText('Contraoferta enviada • Esperando')).toBeTruthy();
    expect(view.getByText('$32.000')).toBeTruthy();
    expect(view.getByText('Esperando al profesional')).toBeTruthy();
    expect(view.queryByText('Aceptar oferta')).toBeNull();
  });

  it('RESOLUTION: cuando el profesional rechaza la contraoferta, notifica y restaura negociación', async () => {
    mockSessionValue.activeOrder = {
      ...mockSessionValue.activeOrder,
      counterOfferPrice: 32000,
    };

    const { rerender } = await render(<FocusClientPanelContent {...mockSheetProps} />);

    mockSessionValue.activeOrder = {
      ...mockSessionValue.activeOrder,
      counterOfferPrice: null,
      quotedPrice: 35000,
    };

    await rerender(<FocusClientPanelContent {...mockSheetProps} />);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Contraoferta rechazada',
          type: 'error',
        }),
      );
    });
  });

  it('RESOLUTION: cuando el profesional acepta la contraoferta, notifica éxito y actualiza el precio pactado', async () => {
    mockSessionValue.activeOrder = {
      ...mockSessionValue.activeOrder,
      counterOfferPrice: 32000,
    };

    const { rerender } = await render(<FocusClientPanelContent {...mockSheetProps} />);

    mockSessionValue.activeOrder = {
      ...mockSessionValue.activeOrder,
      counterOfferPrice: null,
      quotedPrice: 32000,
    };

    await rerender(<FocusClientPanelContent {...mockSheetProps} />);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '¡Contraoferta aceptada!',
          type: 'success',
        }),
      );
    });
  });

  it('CANCEL: al presionar cancelar orden ejecuta directamente la cancelación sin modal', async () => {
    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    const cancelBtn = view.getByText('Cancelar orden');
    fireEvent.press(cancelBtn);

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalledWith(101);
      expect(view.queryByText('¿Deseas cancelar la orden o hacer una contraoferta?')).toBeNull();
    });
  });

  it('ACCEPTED: muestra servicio en camino y botón de chat sin duplicar telemetría del HUD (sin botón de cancelar)', async () => {
    mockSessionValue.activeOrder.status = 'ACCEPTED';
    mockSessionValue.distanceToProviderKm = 1.2;

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('Servicio en camino')).toBeTruthy();
    expect(view.getByText('Gasfitería Express')).toBeTruthy();
    expect(view.getByText('Abrir Chat')).toBeTruthy();
    expect(view.getByText('Profesional verificado y asegurado por TratoFácil')).toBeTruthy();
    expect(view.queryByText('Llegada estimada')).toBeNull();
    expect(view.queryByText('Cancelar servicio')).toBeNull();
  });

  it('QUOTED: al aceptar oferta pasa al paso de pago y permite pagar con tarjeta guardada', async () => {
    mockUser = {
      id: 1,
      cardActive: true,
      creditCardType: 'MASTERCARD',
      last4CardDigits: '9876',
    };

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('Aceptar oferta')).toBeTruthy();
    const acceptOfferBtn = view.getByText('Aceptar oferta');
    fireEvent.press(acceptOfferBtn);

    await waitFor(() => {
      expect(view.getByText('Método de Pago')).toBeTruthy();
      expect(view.getByText('MASTERCARD •••• 9876')).toBeTruthy();
      expect(view.getByText('1-CLICK')).toBeTruthy();
      expect(view.getByText('Pagar con Flow')).toBeTruthy();
    });

    const payCardBtn = view.getByText('MASTERCARD •••• 9876');
    fireEvent.press(payCardBtn);

    await waitFor(() => {
      expect(mockPayWithSavedCard).toHaveBeenCalledWith(101);
      expect(mockShowNotification).toHaveBeenCalledWith(expect.objectContaining({
        id: 'clientOrder:101:ACCEPTED',
        title: 'Pago exitoso',
        message: 'Tu pago ha sido procesado con tu tarjeta vinculada.',
        type: 'success',
      }));
    });
  });

  it('ACCEPTED: NO muestra botón de confirmar inicio si el proveedor no ha confirmado su llegada (incluso a <= 20m)', async () => {
    mockSessionValue.activeOrder.status = 'ACCEPTED';
    mockSessionValue.distanceToProviderKm = 0.015;

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.queryByText('LLEGÓ AL DOMICILIO')).toBeNull();
    expect(view.queryByText('Confirmar inicio de servicio')).toBeNull();
    expect(view.getByText('Servicio en camino')).toBeTruthy();
    expect(view.getByText('Abrir Chat')).toBeTruthy();
    expect(view.queryByText('Llegada estimada')).toBeNull();
  });

  it('ARRIVED: permite iniciar orden sin importar la distancia cuando el estado es ARRIVED', async () => {
    mockSessionValue.activeOrder.status = 'ARRIVED';
    // Distancia mayor a 50m o desconocida, sin importar los metros
    mockSessionValue.distanceToProviderKm = 0.150;

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    expect(view.getByText('LLEGÓ AL DOMICILIO')).toBeTruthy();
    expect(view.getByText('Listo para iniciar servicio')).toBeTruthy();

    const startBtn = view.getByText('Confirmar inicio de servicio');
    fireEvent.press(startBtn);

    await waitFor(() => {
      expect(mockStartOrder).toHaveBeenCalledWith(101);
    });
  });

  it('ARRIVED: notifica error si la mutación de startOrder falla', async () => {
    mockSessionValue.activeOrder.status = 'ARRIVED';
    mockStartOrder.mockRejectedValueOnce(new Error('El proveedor debe confirmar su llegada en el domicilio'));

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    const startBtn = view.getByText('Confirmar inicio de servicio');
    fireEvent.press(startBtn);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'No se pudo iniciar el servicio',
          message: 'El proveedor debe confirmar su llegada en el domicilio',
          type: 'error',
        }),
      );
    });
  });

  it('QUOTED: alerta con error si la pasarela de pago Flow falla al iniciar', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockInitPayment.mockRejectedValueOnce(new Error('Network gateway timeout'));

    const view = await render(<FocusClientPanelContent {...mockSheetProps} />);

    const acceptOfferBtn = view.getByText('Aceptar oferta');
    fireEvent.press(acceptOfferBtn);

    await waitFor(() => {
      expect(view.getByText('Pagar con Flow')).toBeTruthy();
    });

    const payFlowBtn = view.getByText('Pagar con Flow');
    fireEvent.press(payFlowBtn);

    await waitFor(() => {
      expect(mockInitPayment).toHaveBeenCalledWith(101, expect.any(String));
      expect(alertSpy).toHaveBeenCalledWith(
        'Error de Pago',
        'Network gateway timeout'
      );
    });

    alertSpy.mockRestore();
  });
});
