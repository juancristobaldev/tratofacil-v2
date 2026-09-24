import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CHAT_KEYBOARD_VERTICAL_OFFSET, FocusChatOverlay } from './FocusChatOverlay';

let mockQueryData: any = { messages: [] };

jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({
    cache: { modify: jest.fn() },
    refetchQueries: jest.fn(),
  }),
  useQuery: jest.fn(() => ({
    data: mockQueryData,
    loading: false,
    refetch: jest.fn(),
  })),
  useMutation: () => [jest.fn().mockResolvedValue({ data: {} })],
}));

jest.mock('../../../utils/sanitizer', () => ({
  containsContactInfo: jest.fn((text: string) => text.includes('+569')),
  maskContactInfo: jest.fn((text: string) => text.replace('+56911112222', '[contacto protegido]')),
}));

describe('FocusChatOverlay - Message Duplication & Lifecycle Hardening', () => {
  let mockSubscribeHandlers: Record<string, (msg: any) => void>;
  let mockRealtime: any;
  const activeOrder = { id: 100, status: 'IN_PROGRESS' };
  const chatUser = { name: 'Juan Pro' };

  beforeEach(() => {
    mockSubscribeHandlers = {};
    mockQueryData = { messages: [] };
    mockRealtime = {
      clientId: 5,
      subscribe: jest.fn((event: string, handler: (msg: any) => void) => {
        mockSubscribeHandlers[event] = handler;
        return () => {
          delete mockSubscribeHandlers[event];
        };
      }),
      joinChat: jest.fn(),
      leaveChat: jest.fn(),
      sendMessage: jest.fn().mockImplementation((orderId: number, message: string) => Promise.resolve({
        id: 42,
        message,
        senderId: 5,
        createdAt: '2026-09-08T06:00:00.000Z',
      })),
    };
  });

  it('sends message optimistically and reconciles with server ID on socket chat:received without duplicating', async () => {
    const view = await render(
      <FocusChatOverlay
        chatUser={chatUser}
        activeOrder={activeOrder}
        realtime={mockRealtime}
        role="client"
        onClose={jest.fn()}
      />,
    );

    const input = view.getByPlaceholderText('Escribe un mensaje aquí...');
    const sendBtn = view.getByLabelText('Enviar mensaje');

    // 1. User types and sends message
    await act(async () => {
      fireEvent.changeText(input, 'Hola mundo');
    });
    await act(async () => {
      fireEvent.press(sendBtn);
    });

    // Should call realtime.sendMessage with orderId and text
    expect(mockRealtime.sendMessage).toHaveBeenCalledWith(100, 'Hola mundo');

    // UI should show exactly 1 instance of 'Hola mundo'
    expect(view.getAllByText('Hola mundo')).toHaveLength(1);

    // 2. Server broadcasts chat:received socket event for our message (senderId: 5, id: 42)
    await act(async () => {
      mockSubscribeHandlers['chat:received']?.({
        id: 42,
        orderRealtimeId: 100,
        senderId: 5,
        message: 'Hola mundo',
        createdAt: '2026-09-08T06:00:00.000Z',
      });
    });

    // Message must remain exactly 1 (reconciled, NOT duplicated)
    expect(view.getAllByText('Hola mundo')).toHaveLength(1);
  });

  it('reconciles cleanly when mutation resolves before socket event', async () => {
    let resolveMutation: (val: any) => void;
    mockRealtime.sendMessage = jest.fn(() => new Promise((resolve) => {
      resolveMutation = resolve;
    }));

    const view = await render(
      <FocusChatOverlay
        chatUser={chatUser}
        activeOrder={activeOrder}
        realtime={mockRealtime}
        role="client"
        onClose={jest.fn()}
      />,
    );

    const input = view.getByPlaceholderText('Escribe un mensaje aquí...');
    const sendBtn = view.getByLabelText('Enviar mensaje');

    await act(async () => {
      fireEvent.changeText(input, 'Mensaje rapido');
    });
    await act(async () => {
      fireEvent.press(sendBtn);
    });

    // 1 message pending
    expect(view.getAllByText('Mensaje rapido')).toHaveLength(1);

    // Mutation resolves first
    await act(async () => {
      resolveMutation!({
        id: 77,
        message: 'Mensaje rapido',
        senderId: 5,
        createdAt: '2026-09-08T06:01:00.000Z',
      });
    });

    expect(view.getAllByText('Mensaje rapido')).toHaveLength(1);

    // Later socket event arrives with same ID 77
    await act(async () => {
      mockSubscribeHandlers['chat:received']?.({
        id: 77,
        orderRealtimeId: 100,
        senderId: 5,
        message: 'Mensaje rapido',
        createdAt: '2026-09-08T06:01:00.000Z',
      });
    });

    // Still exactly 1 message
    expect(view.getAllByText('Mensaje rapido')).toHaveLength(1);
  });

  it('appends incoming message from other user exactly once', async () => {
    const view = await render(
      <FocusChatOverlay
        chatUser={chatUser}
        activeOrder={activeOrder}
        realtime={mockRealtime}
        role="client"
        onClose={jest.fn()}
      />,
    );

    expect(view.queryByText('Hola desde el proveedor')).toBeNull();

    // Incoming socket event from provider (senderId: 8)
    await act(async () => {
      mockSubscribeHandlers['chat:received']?.({
        id: 99,
        orderRealtimeId: 100,
        senderId: 8,
        message: 'Hola desde el proveedor',
        createdAt: '2026-09-08T06:02:00.000Z',
      });
    });

    expect(view.getAllByText('Hola desde el proveedor')).toHaveLength(1);

    // Duplicate socket emission with same id: 99 is discarded
    await act(async () => {
      mockSubscribeHandlers['chat:received']?.({
        id: 99,
        orderRealtimeId: 100,
        senderId: 8,
        message: 'Hola desde el proveedor',
        createdAt: '2026-09-08T06:02:00.000Z',
      });
    });

    expect(view.getAllByText('Hola desde el proveedor')).toHaveLength(1);
  });

  it('loads and merges historical messages from GET_MESSAGES query', async () => {
    mockQueryData = {
      messages: [
        {
          id: 1,
          message: 'Mensaje historico 1',
          senderId: 5,
          createdAt: '2026-09-08T05:00:00.000Z',
        },
        {
          id: 2,
          message: 'Mensaje historico 2',
          senderId: 8,
          createdAt: '2026-09-08T05:01:00.000Z',
        },
      ],
    };

    const view = await render(
      <FocusChatOverlay
        chatUser={chatUser}
        activeOrder={activeOrder}
        realtime={mockRealtime}
        role="client"
        onClose={jest.fn()}
      />,
    );

    expect(view.getByText('Mensaje historico 1')).toBeTruthy();
    expect(view.getByText('Mensaje historico 2')).toBeTruthy();
  });

  it('masks contact information and displays security warning banner', async () => {
    const view = await render(
      <FocusChatOverlay
        chatUser={chatUser}
        activeOrder={activeOrder}
        realtime={mockRealtime}
        role="client"
        onClose={jest.fn()}
      />,
    );

    const input = view.getByPlaceholderText('Escribe un mensaje aquí...');
    const sendBtn = view.getByLabelText('Enviar mensaje');

    await act(async () => {
      fireEvent.changeText(input, 'Mi celular es +56911112222');
    });
    await act(async () => {
      fireEvent.press(sendBtn);
    });

    expect(view.getByText(/Por seguridad y protección de garantía/i)).toBeTruthy();
    expect(view.getByText('Mi celular es [contacto protegido]')).toBeTruthy();
  });

  it('does not use a negative keyboard offset that could hide the composer on iOS', async () => {
    expect(CHAT_KEYBOARD_VERTICAL_OFFSET).toBe(0);
  });
});
