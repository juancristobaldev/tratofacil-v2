import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CustomAlert, CustomAlertHost, inferAlertType } from './CustomAlert';

describe('CustomAlert', () => {
  beforeEach(() => {
    CustomAlert.hide();
    jest.clearAllMocks();
  });

  describe('inferAlertType', () => {
    it('detects destructive when destructive button style is provided', () => {
      expect(
        inferAlertType('Confirmación', '¿Seguro?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive' },
        ]),
      ).toBe('destructive');
    });

    it('detects destructive when text indicates account/session deletion with multiple buttons', () => {
      expect(
        inferAlertType('Cerrar sesión', '¿Deseas salir?', [
          { text: 'No' },
          { text: 'Sí' },
        ]),
      ).toBe('destructive');
    });

    it('detects success when text has success keywords', () => {
      expect(inferAlertType('Éxito', 'Operación completada exitosamente')).toBe('success');
      expect(inferAlertType('Confirmado', 'Tu servicio fue reactivado')).toBe('success');
    });

    it('detects error when text has error keywords', () => {
      expect(inferAlertType('Error', 'No se pudo procesar la solicitud')).toBe('error');
      expect(inferAlertType('Fallo', 'RUT inválido')).toBe('error');
    });

    it('detects warning when text has warning keywords', () => {
      expect(inferAlertType('Atención', 'Selecciona un postulante')).toBe('warning');
      expect(inferAlertType('Límite alcanzado', 'Has superado el máximo')).toBe('warning');
    });

    it('defaults to info', () => {
      expect(inferAlertType('Información', 'Mensaje genérico')).toBe('info');
    });
  });

  describe('CustomAlertHost component', () => {
    it('renders nothing when there is no active alert', async () => {
      const view = await render(<CustomAlertHost />);
      expect(view.queryByLabelText('Cerrar alerta')).toBeNull();
    });

    it('displays alert on CustomAlert.alert() with default single button', async () => {
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.alert('¡Éxito!', 'Perfil actualizado correctamente.');
      });

      expect(view.getByText('¡Éxito!')).toBeTruthy();
      expect(view.getByText('Perfil actualizado correctamente.')).toBeTruthy();
      expect(view.getByText('Aceptar')).toBeTruthy();
    });

    it('dismisses when button is pressed and executes onPress callback', async () => {
      const mockPress = jest.fn();
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.alert('Atención', 'Selecciona una opción', [
          { text: 'Entendido', onPress: mockPress },
        ]);
      });

      expect(view.getByText('Entendido')).toBeTruthy();

      await act(async () => {
        fireEvent.press(view.getByText('Entendido'));
      });

      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    it('renders two buttons in horizontal layout and executes respective callbacks', async () => {
      const mockCancel = jest.fn();
      const mockConfirm = jest.fn();
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.alert(
          'Eliminar elemento',
          '¿Estás seguro?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: mockCancel },
            { text: 'Eliminar', style: 'destructive', onPress: mockConfirm },
          ],
        );
      });

      expect(view.getByText('Cancelar')).toBeTruthy();
      expect(view.getByText('Eliminar')).toBeTruthy();

      await act(async () => {
        fireEvent.press(view.getByText('Eliminar'));
      });

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('allows CustomAlert.show() with explicit options', async () => {
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.show({
          title: 'Notificación explícita',
          message: 'Cuerpo del mensaje',
          type: 'info',
          buttons: [{ text: 'Ok' }],
        });
      });

      expect(view.getByText('Notificación explícita')).toBeTruthy();
      expect(view.getByText('Cuerpo del mensaje')).toBeTruthy();
    });

    it('allows CustomAlert.hide() to dismiss immediately', async () => {
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.alert('Alerta temporal', 'Desaparecerá');
      });

      expect(view.getByText('Alerta temporal')).toBeTruthy();

      await act(async () => {
        CustomAlert.hide();
      });

      expect(view.queryByText('Alerta temporal')).toBeNull();
    });

    it('handles alert with only title and no message or buttons', async () => {
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.alert('Solo Título');
      });

      expect(view.getByText('Solo Título')).toBeTruthy();
      expect(view.getByText('Aceptar')).toBeTruthy();
    });

    it('renders 3 or more buttons in stacked layout', async () => {
      const b1 = jest.fn();
      const b2 = jest.fn();
      const b3 = jest.fn();
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.alert('Opciones múltiples', 'Elige una', [
          { text: 'Opción 1', onPress: b1 },
          { text: 'Opción 2', onPress: b2 },
          { text: 'Cancelar', style: 'cancel', onPress: b3 },
        ]);
      });

      expect(view.getByText('Opción 1')).toBeTruthy();
      expect(view.getByText('Opción 2')).toBeTruthy();
      expect(view.getByText('Cancelar')).toBeTruthy();

      await act(async () => {
        fireEvent.press(view.getByText('Opción 1'));
      });

      expect(b1).toHaveBeenCalledTimes(1);
    });

    it('handles chained alerts sequentially without crashing', async () => {
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.alert('Paso 1', 'Confirmar acción', [
          {
            text: 'Proceder',
            onPress: () => {
              CustomAlert.alert('Paso 2', 'Completado');
            },
          },
        ]);
      });

      expect(view.getByText('Paso 1')).toBeTruthy();

      await act(async () => {
        fireEvent.press(view.getByText('Proceder'));
      });

      expect(view.getByText('Paso 2')).toBeTruthy();
      expect(view.getByText('Completado')).toBeTruthy();
    });

    it('handles backdrop dismissal when cancelable is true', async () => {
      const onDismiss = jest.fn();
      const view = await render(<CustomAlertHost />);

      await act(async () => {
        CustomAlert.alert(
          'Aviso cancelable',
          'Toca fuera para cerrar',
          [{ text: 'Ok' }],
          { cancelable: true, onDismiss },
        );
      });

      const backdrop = view.getByLabelText('Cerrar alerta');
      await act(async () => {
        fireEvent.press(backdrop);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(view.queryByText('Aviso cancelable')).toBeNull();
    });
  });
});
