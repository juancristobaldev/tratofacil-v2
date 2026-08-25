import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CustomDrawerContent } from './AppNavigator';

const mockSetRole = jest.fn();
const mockLogout = jest.fn();
const mockToggleAvailability = jest.fn();
const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

let mockAuth = {
  role: 'provider',
  user: {
    id: 10,
    displayName: 'Juan Proveedor',
    email: 'juan@tratofacil.test',
    isProfileFullyComplete: true,
    provider: { id: 99, isRealtimeActive: true, activeRealtimeOrder: null },
  },
  logout: mockLogout,
  setRole: mockSetRole,
};

let mockRealtime = {
  isRealtimeActive: true,
  providerActiveOrder: null as any,
  toggleAvailability: mockToggleAvailability,
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../realtime/RealtimeContext', () => ({
  useRealtime: () => mockRealtime,
}));

jest.mock('../push/usePushNavigation', () => ({
  usePushNavigation: jest.fn(),
}));

jest.mock('../context/RefreshContext', () => ({
  useRefresh: () => ({ isRefreshing: false, triggerRefresh: jest.fn() }),
}));

describe('CustomDrawerContent role switching rules and alerts', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {
      role: 'provider',
      user: {
        id: 10,
        displayName: 'Juan Proveedor',
        email: 'juan@tratofacil.test',
        isProfileFullyComplete: true,
        provider: { id: 99, isRealtimeActive: true, activeRealtimeOrder: null },
      },
      logout: mockLogout,
      setRole: mockSetRole,
    };
    mockRealtime = {
      isRealtimeActive: true,
      providerActiveOrder: null,
      toggleAvailability: mockToggleAvailability,
    };
  });

  const mockProps: any = {
    navigation: {
      dispatch: mockDispatch,
      navigate: mockNavigate,
      reset: jest.fn(),
    },
  };

  it('RULE 1: blocks switching to client mode with an alert when provider has an active non-terminal order', async () => {
    mockRealtime.providerActiveOrder = { id: 101, status: 'IN_PROGRESS' };

    const view = await render(<CustomDrawerContent {...mockProps} />);
    const switchBtn = view.getByText('Cambiar a Modo Cliente');

    fireEvent.press(switchBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Servicio en curso',
      'No puedes cambiar a modo cliente mientras tengas una orden en curso.',
      expect.any(Array)
    );
    expect(mockSetRole).not.toHaveBeenCalled();
    expect(mockToggleAvailability).not.toHaveBeenCalled();
  });

  it('RULE 2: prompts confirmation alert when provider is online with no active orders before switching to client', async () => {
    mockRealtime.isRealtimeActive = true;
    mockRealtime.providerActiveOrder = null;

    const view = await render(<CustomDrawerContent {...mockProps} />);
    const switchBtn = view.getByText('Cambiar a Modo Cliente');

    fireEvent.press(switchBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Desconexión de Proveedor',
      'Te desconectarás y dejarás de recibir órdenes. ¿Deseas continuar?',
      expect.any(Array)
    );

    // Verify confirmation action
    const buttons = alertSpy.mock.calls[0][2] as any[];
    const confirmButton = buttons.find((b) => b.text === 'Desconectar y cambiar');
    expect(confirmButton).toBeDefined();

    confirmButton.onPress();
    expect(mockToggleAvailability).toHaveBeenCalledWith(false);
    expect(mockSetRole).toHaveBeenCalledWith('client');
  });

  it('RULE 3: directly switches to client mode when provider is offline and has no active orders', async () => {
    mockRealtime.isRealtimeActive = false;
    mockAuth.user.provider.isRealtimeActive = false;
    mockRealtime.providerActiveOrder = null;

    const view = await render(<CustomDrawerContent {...mockProps} />);
    const switchBtn = view.getByText('Cambiar a Modo Cliente');

    fireEvent.press(switchBtn);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockSetRole).toHaveBeenCalledWith('client');
  });
});
