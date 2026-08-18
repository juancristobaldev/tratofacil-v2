import type { SheetKey } from './bottomSheet.types';

type BottomSheetDebugEvent =
  | 'CALL'
  | 'GUARD'
  | 'REQUEST'
  | 'HOST'
  | 'PRESENT'
  | 'CHANGE'
  | 'CONTENT'
  | 'DISMISS'
  | 'STATE'
  | 'TRANSITION'
  | 'MAP_FLOW'
  | 'SUSPEND'
  | 'RESTORE'
  | 'MAP_LIFECYCLE'
  | 'PHYSICAL_OP'
  | 'HOST_DISMISS'
  | 'HANDLERS_BIND'
  | 'ACTION'
  | 'PANEL_PRESS'
  | 'HANDLER_RESOLVE'
  | 'HANDLER_MISSING'
  | 'FLOW_INTENT'
  | 'ACTION_BLOCKED'
  | 'TRANSITION_REQUEST'
  | 'UNEXPECTED_ROLLBACK'
  | 'STALE_OWNER_ACTION'
  | 'INVALID_ACTION'
  | 'ROLE_RECONCILE'
  | 'DESIRED'
  | 'NO_SHEET'
  | 'RECONCILE_DECISION'
  | 'INVARIANT_VIOLATION'
  | 'HOST_CONTENT'
  | 'PANEL_MOUNT'
  | 'PANEL_UNMOUNT';

type DebugPayload = {
  requestId?: number | null;
  key?: SheetKey | null;
  state?: string;
  role?: string;
  route?: string;
  mapFlowActive?: boolean;
  allowed?: boolean;
  reason?: string;
  index?: number;
  pendingKey?: SheetKey | null;
  from?: SheetKey | null;
  to?: SheetKey | null;
  operation?: string;
  physicalState?: string;
  payload?: unknown;
  operationId?: number | null;
  currentOperationId?: number | null;
  type?: string;
  stale?: boolean;
  action?: string;
  previousRole?: string;
  owner?: string | null;
  generation?: number;
  currentOwner?: string | null;
  currentGeneration?: number | null;
  mode?: string;
  actionId?: number;
  transitionId?: number;
  previousTransitionId?: number | null;
  origin?: string;
  target?: string | null;
  result?: string | null;
  found?: boolean;
  orderId?: number | string | null;
  status?: string | null;
  current?: SheetKey | null;
  desired?: SheetKey | 'NO_SHEET_BY_DESIGN' | null;
  decision?: string;
  hasProvider?: boolean;
  hasServiceProvider?: boolean;
};

const ENABLED = true;
let bottomSheetActionId = 0;
let bottomSheetTransitionId = 0;

export function nextBottomSheetActionId(): number {
  bottomSheetActionId += 1;
  return bottomSheetActionId;
}

export function nextBottomSheetTransitionId(): number {
  bottomSheetTransitionId += 1;
  return bottomSheetTransitionId;
}

export function bottomSheetDebug(event: BottomSheetDebugEvent, payload: DebugPayload = {}): void {
  if (!__DEV__ || !ENABLED) return;

  const parts = Object.entries({ timestamp: new Date().toISOString(), ...payload })
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${formatValue(value)}`);

  console.log(`[BS:${event}] ${parts.join(' ')}`);
}

function formatValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
