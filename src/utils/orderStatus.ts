export const TERMINAL_ORDER_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
] as const;

export const NON_TERMINAL_ORDER_STATUSES = [
  'ACCEPTED',
  'ARRIVED',
  'IN_PROGRESS',
  'PAYMENT_PENDING',
  'PENDING',
  'QUOTED',
] as const;

export type TerminalOrderStatus = (typeof TERMINAL_ORDER_STATUSES)[number];
export type NonTerminalOrderStatus = (typeof NON_TERMINAL_ORDER_STATUSES)[number];

/**
 * Determina si el estado de una orden en tiempo real es terminal (finalizada, cancelada, rechazada, expirada).
 */
export function isTerminalOrderStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return (TERMINAL_ORDER_STATUSES as readonly string[]).includes(status);
}

/**
 * Determina si el estado de una orden en tiempo real es activo y no terminal.
 */
export function isNonTerminalOrderStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (NON_TERMINAL_ORDER_STATUSES as readonly string[]).includes(status);
}

export interface CanUseProviderNavigationParams {
  role?: string | null;
  isFocusModeProviderActive?: boolean;
  activeOrder?: { status?: string | null } | null;
  orderState?: string | null;
}

/**
 * Regla única y centralizada de disponibilidad del modo de navegación 3D:
 * SOLO disponible para el proveedor con orden activa en estado NO terminal dentro de FocusModeProviderScreen.
 */
export function canUseProviderNavigation({
  role,
  isFocusModeProviderActive = false,
  activeOrder,
  orderState,
}: CanUseProviderNavigationParams): boolean {
  if (role !== 'provider') return false;
  if (!isFocusModeProviderActive) return false;
  if (!activeOrder) return false;
  if (isTerminalOrderStatus(activeOrder.status)) return false;
  if (orderState === 'COMPLETED' || orderState === 'CANCELLED') return false;
  return true;
}
