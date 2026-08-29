import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';

describe('Modal Component', () => {
  it('renders children when visible', async () => {
    const onClose = jest.fn();
    const view = await render(
      <Modal visible={true} onClose={onClose}>
        <Text>Contenido de prueba</Text>
      </Modal>
    );

    expect(view.getByText('Contenido de prueba')).toBeTruthy();
  });

  it('calls onClose when close icon button is pressed', async () => {
    const onClose = jest.fn();
    const view = await render(
      <Modal visible={true} onClose={onClose} showCloseButton={true}>
        <Text>Contenido con close button</Text>
      </Modal>
    );

    const closeBtn = view.getByLabelText('Cerrar modal');
    fireEvent.press(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('executes button actions within the modal without error', async () => {
    const onClose = jest.fn();
    const onAction = jest.fn();

    const view = await render(
      <Modal visible={true} onClose={onClose}>
        <Button title="Acción interna" onPress={onAction} />
      </Modal>
    );

    const actionBtn = view.getByText('Acción interna');
    fireEvent.press(actionBtn);

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
