const DEBUG_SOCKET = __DEV__;

interface SocketLogEntry {
  timestamp: string;
  socketId: string;
  userId: string;
  orderId?: string;
  event: string;
  payload: string;
  direction: 'in' | 'out';
}

let currentSocketId = '';
let currentUserId = '';

export function setSocketLogIdentifiers(socketId: string, userId: string) {
  currentSocketId = socketId;
  currentUserId = userId;
}

export function logSocketIn(event: string, payload?: unknown) {
  if (!DEBUG_SOCKET) return;
  const entry: SocketLogEntry = {
    timestamp: new Date().toISOString(),
    socketId: currentSocketId,
    userId: currentUserId,
    event,
    payload: summarize(payload),
    direction: 'in',
  };
  if (entry.orderId) {
    console.log(`[SOCKET] ← ${event} (order:${entry.orderId}) ${entry.payload}`);
  } else {
    console.log(`[SOCKET] ← ${event} ${entry.payload}`);
  }
}

export function logSocketOut(event: string, payload?: unknown) {
  if (!DEBUG_SOCKET) return;
  const entry: SocketLogEntry = {
    timestamp: new Date().toISOString(),
    socketId: currentSocketId,
    userId: currentUserId,
    event,
    payload: summarize(payload),
    direction: 'out',
  };
  console.log(`[SOCKET] → ${event} ${entry.payload}`);
}

export function summarize(payload: unknown): string {
  if (payload == null) return '';
  if (typeof payload !== 'object') return String(payload);
  const obj = payload as Record<string, unknown>;
  const parts: string[] = [];
  if ('status' in obj) parts.push(`status:${obj.status}`);
  if ('orderRealtimeId' in obj) {
    parts.push(`orderId:${obj.orderRealtimeId}`);
  }
  if ('clientId' in obj) parts.push(`client:${obj.clientId}`);
  if ('providerId' in obj) parts.push(`provider:${obj.providerId}`);
  if ('orderId' in obj) parts.push(`orderId:${obj.orderId}`);
  if (parts.length === 0) return JSON.stringify(obj).slice(0, 80);
  return parts.join(' ');
}
