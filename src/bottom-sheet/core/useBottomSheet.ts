import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  BottomSheetActionName,
  BottomSheetActionPayload,
  RuntimeActionHandlersMap,
  RuntimeHandlerOwner,
  RuntimeHandlersMap,
  SheetKey,
  SheetPayloadMap,
} from './bottomSheet.types';

export type Present = <K extends SheetKey>(key: K, payload: SheetPayloadMap[K]) => void;
export type DispatchBottomSheetAction = <K extends SheetKey, A extends BottomSheetActionName<K>>(
  key: K,
  action: A,
  payload: BottomSheetActionPayload<K, A>,
  origin?: string,
) => number;

export interface BottomSheetContextValue {
  present: Present;
  dismiss: () => void;
  dismissAll: () => void;
  setMapFlowActive: (active: boolean) => void;
  setIndex: (index: number) => void;
  update: (patch: Record<string, unknown>) => void;
  bindRuntimeHandlers: (owner: RuntimeHandlerOwner, handlers: RuntimeHandlersMap) => void;
  unbindRuntimeHandlers: (owner: RuntimeHandlerOwner) => void;
  bindRuntimeActionHandlers: (owner: RuntimeHandlerOwner, handlers: RuntimeActionHandlersMap) => void;
  unbindRuntimeActionHandlers: (owner: RuntimeHandlerOwner) => void;
  dispatchBottomSheetAction: DispatchBottomSheetAction;
  active: SheetKey | null;
  activePayload: SheetPayloadMap[SheetKey] | null;
  pendingMapFlowKey: SheetKey | null;
  getPanelState: <T>(key: SheetKey, defaultState: T) => T;
  setPanelState: <T>(key: SheetKey, state: T) => void;
}

export const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

export function useBottomSheet(): BottomSheetContextValue {
  const ctx = useContext(BottomSheetContext);
  if (!ctx) {
    throw new Error('useBottomSheet debe usarse dentro de <BottomSheetProvider>');
  }
  return ctx;
}

export function usePanelState<T>(key: SheetKey, defaultState: T): [T, (val: T | ((prev: T) => T)) => void] {
  const ctx = useContext(BottomSheetContext);
  const [state, setState] = useState<T>(() => (ctx ? ctx.getPanelState(key, defaultState) : defaultState));

  const setPanelState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        if (ctx) {
          ctx.setPanelState(key, next);
        }
        return next;
      });
    },
    [ctx, key],
  );

  return [state, setPanelState];
}
