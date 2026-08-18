import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { BottomSheetContext, type Present } from './useBottomSheet';
import { BottomSheetHost } from './BottomSheetHost';
import { isSheetAllowedForRole, registry } from './bottomSheet.registry';
import { bottomSheetDebug, nextBottomSheetActionId, nextBottomSheetTransitionId } from './bottomSheet.debug';
import type {
  BottomSheetActionName,
  BottomSheetActionPayload,
  BottomSheetRequest,
  BottomSheetState,
  BottomSheetTransitionOperation,
  SheetKey,
  SheetModalRef,
  SheetPayloadMap,
  RuntimeHandlerOwner,
  RuntimeHandlersMap,
  RuntimeActionHandlersMap,
} from './bottomSheet.types';
import { useRole } from '../../context/RoleContext';
import { navigationRef } from '../../navigation/navigationRef';

type AnyBottomSheetRequest = BottomSheetRequest<SheetKey>;

type PhysicalOperationType = 'PRESENT' | 'RESTORE_PRESENT' | 'SUSPEND_DISMISS' | 'LOGICAL_DISMISS' | 'DISMISS_ALL';

type PhysicalOperation = {
  operationId: number;
  requestId: number;
  key: SheetKey;
  type: PhysicalOperationType;
};

export const BottomSheetProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const modalRef = useRef<SheetModalRef | null>(null);
  const { role } = useRole();

  const requestIdRef = useRef(0);
  const physicalOperationIdRef = useRef(0);
  const stateRef = useRef<BottomSheetState>('CLOSED');
  const mapFlowActiveRef = useRef(false);
  const currentPhysicalOperationRef = useRef<PhysicalOperation | null>(null);
  const pendingDismissOperationRef = useRef<PhysicalOperation | null>(null);
  const activeRequestRef = useRef<AnyBottomSheetRequest | null>(null);
  const runtimeHandlersRef = useRef<RuntimeHandlersMap>({});
  const runtimeActionHandlersRef = useRef<RuntimeActionHandlersMap>({});
  const runtimeHandlerOwnerRef = useRef<RuntimeHandlerOwner | null>(null);
  const maxRuntimeHandlerGenerationRef = useRef(0);
  const pendingSheetRequestRef = useRef<AnyBottomSheetRequest | null>(null);
  const pendingMapFlowRequestRef = useRef<AnyBottomSheetRequest | null>(null);
  const panelStateCacheRef = useRef<Record<string, unknown>>({});

  const [, setStateValue] = useState<BottomSheetState>('CLOSED');
  const [activeRequest, setActiveRequest] = useState<AnyBottomSheetRequest | null>(null);
  const [activeOperation, setActiveOperation] = useState<BottomSheetTransitionOperation>('PRESENT');
  const [isMapFlowActive, setIsMapFlowActive] = useState(false);
  const [pendingMapFlowKey, setPendingMapFlowKey] = useState<SheetKey | null>(null);
  const [runtimeHandlersVersion, setRuntimeHandlersVersion] = useState(0);

  const setState = useCallback((next: BottomSheetState, request?: AnyBottomSheetRequest | null) => {
    stateRef.current = next;
    setStateValue(next);
    bottomSheetDebug('STATE', {
      requestId: request?.requestId,
      key: request?.key ?? null,
      state: next,
    });
  }, []);

  const setCurrentRequest = useCallback((request: AnyBottomSheetRequest | null) => {
    activeRequestRef.current = request;
    setActiveRequest(request);
  }, []);

  const createRequest = useCallback(<K extends SheetKey>(key: K, payload: SheetPayloadMap[K]): BottomSheetRequest<K> => {
    requestIdRef.current += 1;
    return { requestId: requestIdRef.current, key, payload };
  }, []);

  const stripRuntimeHandlers = useCallback(<K extends SheetKey>(key: K, payload: SheetPayloadMap[K]): SheetPayloadMap[K] => {
    if (!payload || typeof payload !== 'object') return payload;

    const runtimeKeysBySheet: Record<SheetKey, string[]> = {
      categories: ['onCategoryPress', 'onClearCategory'],
      provider_preview: ['onIndexChange', 'onViewProfile', 'onDeselect'],
      focus_client: [],
      focus_provider: [],
      provider_dashboard: [],
    };

    const runtimeKeys = runtimeKeysBySheet[key];
    if (runtimeKeys.length === 0) return payload;

    const next: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
    runtimeKeys.forEach((runtimeKey) => {
      delete next[runtimeKey];
    });
    return next as unknown as SheetPayloadMap[K];
  }, []);

  const createPhysicalOperation = useCallback((type: PhysicalOperationType, request: AnyBottomSheetRequest): PhysicalOperation => {
    physicalOperationIdRef.current += 1;
    const operation = {
      operationId: physicalOperationIdRef.current,
      requestId: request.requestId,
      key: request.key,
      type,
    };
    currentPhysicalOperationRef.current = operation;
    bottomSheetDebug('PHYSICAL_OP', {
      operationId: operation.operationId,
      type: operation.type,
      requestId: operation.requestId,
      key: operation.key,
      state: stateRef.current,
      mapFlowActive: mapFlowActiveRef.current,
    });
    return operation;
  }, []);

  const canReplaceContent = useCallback((from: SheetKey, to: SheetKey): boolean => {
    const targetConfig = registry[to];
    if (from === to) return targetConfig.replaceSameKey === true;
    return targetConfig.replaceFrom?.includes(from) === true;
  }, []);

  const logRoleMismatch = useCallback((request: AnyBottomSheetRequest, reason: string) => {
    bottomSheetDebug('INVARIANT_VIOLATION', {
      type: 'ACTIVE_REQUEST_ROLE_MISMATCH',
      role,
      key: request.key,
      requestId: request.requestId,
      reason,
    });
  }, [role]);

  const requestMapFlow = useCallback((request: AnyBottomSheetRequest) => {
    pendingMapFlowRequestRef.current = request;
    setPendingMapFlowKey(request.key);
    bottomSheetDebug('MAP_FLOW', {
      requestId: request.requestId,
      key: request.key,
      role,
      mapFlowActive: mapFlowActiveRef.current,
      reason: 'queued_until_map_flow_active',
    });

    if (navigationRef.isReady()) {
      navigationRef.navigate('MainApp' as never);
    }
  }, [role]);

  const startRequest = useCallback((request: AnyBottomSheetRequest) => {
    bottomSheetDebug('REQUEST', {
      requestId: request.requestId,
      key: request.key,
      role,
      mapFlowActive: mapFlowActiveRef.current,
      state: stateRef.current,
    });

    const currentState = stateRef.current;
    const currentActive = activeRequestRef.current;

    if (currentState === 'CLOSED' || currentState === 'SUSPENDED' || !currentActive) {
      createPhysicalOperation('PRESENT', request);
      setActiveOperation('PRESENT');
      bottomSheetDebug('TRANSITION', {
        transitionId: nextBottomSheetTransitionId(),
        requestId: request.requestId,
        from: null,
        to: request.key,
        operation: 'PRESENT',
        physicalState: currentState,
      });
      setCurrentRequest(request);
      setState('REQUESTED', request);
      return;
    }

    const currentActiveAllowedForRole = isSheetAllowedForRole(currentActive.key, role);
    if (!currentActiveAllowedForRole && currentState !== 'OPEN' && currentState !== 'DISMISSING') {
      createPhysicalOperation('RESTORE_PRESENT', request);
      setActiveOperation('PRESENT');
      logRoleMismatch(currentActive, 'role_reconcile_restarts_physical_present');
      bottomSheetDebug('TRANSITION', {
        transitionId: nextBottomSheetTransitionId(),
        requestId: request.requestId,
        from: currentActive.key,
        to: request.key,
        operation: 'PRESENT',
        physicalState: currentState,
        reason: 'current_active_role_mismatch_unstable_physical_state',
      });
      setCurrentRequest(request);
      setState('REQUESTED', request);
      return;
    }

    if (currentState !== 'DISMISSING' && (!currentActiveAllowedForRole || canReplaceContent(currentActive.key, request.key))) {
      setActiveOperation('REPLACE');
      bottomSheetDebug('TRANSITION', {
        transitionId: nextBottomSheetTransitionId(),
        requestId: request.requestId,
        from: currentActive.key,
        to: request.key,
        operation: 'REPLACE',
        physicalState: currentState,
        reason: currentActiveAllowedForRole ? 'replace_allowed' : 'current_active_role_mismatch',
      });
      if (!currentActiveAllowedForRole) {
        logRoleMismatch(currentActive, 'replaced_by_role_reconcile');
      }
      setCurrentRequest(request);
      return;
    }

    pendingSheetRequestRef.current = request;
    setActiveOperation('DISMISS_THEN_PRESENT');
    bottomSheetDebug('REQUEST', {
      requestId: request.requestId,
      key: request.key,
      state: currentState,
      reason: 'latest_request_wins_after_dismiss',
    });
    bottomSheetDebug('TRANSITION', {
      transitionId: nextBottomSheetTransitionId(),
      requestId: request.requestId,
      from: currentActive.key,
      to: request.key,
      operation: 'DISMISS_THEN_PRESENT',
      physicalState: currentState,
    });

    if (currentState !== 'DISMISSING') {
      const dismissOperation = createPhysicalOperation('LOGICAL_DISMISS', currentActive);
      pendingDismissOperationRef.current = dismissOperation;
      setState('DISMISSING', currentActive);
      modalRef.current?.dismiss();
    }
  }, [canReplaceContent, createPhysicalOperation, logRoleMismatch, role, setCurrentRequest, setState]);

  const validateRequest = useCallback((request: AnyBottomSheetRequest): boolean => {
    const config = registry[request.key];
    if (!config.allowedRoles.includes(role)) {
      bottomSheetDebug('GUARD', {
        requestId: request.requestId,
        key: request.key,
        role,
        mapFlowActive: mapFlowActiveRef.current,
        allowed: false,
        reason: 'role_not_allowed',
      });
      return false;
    }

    if (config.requiresMapFlow && !mapFlowActiveRef.current) {
      bottomSheetDebug('GUARD', {
        requestId: request.requestId,
        key: request.key,
        role,
        mapFlowActive: false,
        allowed: false,
        reason: 'requires_map_flow',
      });
      requestMapFlow(request);
      return false;
    }

    bottomSheetDebug('GUARD', {
      requestId: request.requestId,
      key: request.key,
      role,
      mapFlowActive: mapFlowActiveRef.current,
      allowed: true,
    });
    return true;
  }, [requestMapFlow, role]);

  const present: Present = useCallback((key, payload) => {
    const domainPayload = stripRuntimeHandlers(key, payload);
    const request = createRequest(key, domainPayload) as AnyBottomSheetRequest;
    bottomSheetDebug('CALL', {
      requestId: request.requestId,
      key,
      role,
      mapFlowActive: mapFlowActiveRef.current,
      payload: domainPayload,
    });

    if (!validateRequest(request)) return;
    startRequest(request);
  }, [createRequest, role, startRequest, stripRuntimeHandlers, validateRequest]);

  const dismiss = useCallback(() => {
    const currentActive = activeRequestRef.current;
    bottomSheetDebug('DISMISS', {
      requestId: currentActive?.requestId,
      key: currentActive?.key ?? null,
      state: stateRef.current,
      reason: 'dismiss_invoked',
    });

    if (!currentActive || stateRef.current === 'CLOSED' || stateRef.current === 'DISMISSING') return;

    pendingSheetRequestRef.current = null;
    const dismissOperation = createPhysicalOperation('LOGICAL_DISMISS', currentActive);
    pendingDismissOperationRef.current = dismissOperation;
    setState('DISMISSING', currentActive);
    modalRef.current?.dismiss();
  }, [createPhysicalOperation, setState]);

  const dismissAll = useCallback(() => {
    const currentActive = activeRequestRef.current;
    bottomSheetDebug('DISMISS', {
      requestId: currentActive?.requestId,
      key: currentActive?.key ?? null,
      state: stateRef.current,
      reason: 'dismiss_all_invoked',
    });

    pendingSheetRequestRef.current = null;
    pendingMapFlowRequestRef.current = null;
    if (currentActive) {
      const dismissOperation = createPhysicalOperation('DISMISS_ALL', currentActive);
      pendingDismissOperationRef.current = dismissOperation;
    }
    setPendingMapFlowKey(null);
    modalRef.current?.dismiss();
    setCurrentRequest(null);
    setState('CLOSED', currentActive);
  }, [createPhysicalOperation, setCurrentRequest, setState]);

  const handleHostPresent = useCallback((request: AnyBottomSheetRequest) => {
    if (activeRequestRef.current?.requestId !== request.requestId) return;
    setState('PRESENTING', request);
  }, [setState]);

  const handleHostChange = useCallback((request: AnyBottomSheetRequest, index: number) => {
    bottomSheetDebug('CHANGE', {
      requestId: request.requestId,
      key: request.key,
      index,
      state: stateRef.current,
    });

    if (activeRequestRef.current?.requestId !== request.requestId) return;
    if (index >= 0 && stateRef.current !== 'OPEN') {
      setState('OPEN', request);
    }
  }, [setState]);

  const handleHostDismiss = useCallback((request: AnyBottomSheetRequest) => {
    const dismissOperation = pendingDismissOperationRef.current;
    const currentOperation = currentPhysicalOperationRef.current;
    const stale = !!dismissOperation && !!currentOperation && dismissOperation.operationId !== currentOperation.operationId;

    bottomSheetDebug('HOST_DISMISS', {
      operationId: dismissOperation?.operationId ?? null,
      requestId: request.requestId,
      key: request.key,
      currentOperationId: currentOperation?.operationId ?? null,
      stale,
      action: stale ? 'IGNORE' : 'HANDLE',
      state: stateRef.current,
    });

    if (stale) {
      pendingDismissOperationRef.current = null;
      return;
    }

    pendingDismissOperationRef.current = null;

    if (activeRequestRef.current?.requestId !== request.requestId && stateRef.current !== 'DISMISSING' && stateRef.current !== 'SUSPENDING') return;

    bottomSheetDebug('DISMISS', {
      requestId: request.requestId,
      key: request.key,
      state: stateRef.current,
      reason: 'host_dismissed',
    });

    const pending = pendingSheetRequestRef.current;
    pendingSheetRequestRef.current = null;

    if (stateRef.current === 'SUSPENDING') {
      bottomSheetDebug('SUSPEND', {
        requestId: request.requestId,
        key: request.key,
        state: stateRef.current,
        reason: 'host_dismissed_while_suspended',
      });
      setState('SUSPENDED', request);
      return;
    }

    if (pending) {
      setActiveOperation('PRESENT');
      bottomSheetDebug('TRANSITION', {
        transitionId: nextBottomSheetTransitionId(),
        requestId: pending.requestId,
        from: null,
        to: pending.key,
        operation: 'PRESENT',
        physicalState: stateRef.current,
      });
      setCurrentRequest(pending);
      setState('REQUESTED', pending);
      return;
    }

    setCurrentRequest(null);
    setState('CLOSED', request);
  }, [setCurrentRequest, setState]);

  const setMapFlowActive = useCallback((active: boolean) => {
    if (mapFlowActiveRef.current === active) {
      bottomSheetDebug('MAP_FLOW', {
        state: stateRef.current,
        mapFlowActive: active,
        pendingKey: pendingMapFlowRequestRef.current?.key ?? null,
        reason: 'no_op',
      });
      return;
    }

    const previousActive = mapFlowActiveRef.current;
    mapFlowActiveRef.current = active;
    setIsMapFlowActive(active);
    bottomSheetDebug('MAP_FLOW', {
      state: stateRef.current,
      mapFlowActive: active,
      pendingKey: pendingMapFlowRequestRef.current?.key ?? null,
      reason: previousActive ? 'blur' : 'focus',
    });
    bottomSheetDebug('MAP_LIFECYCLE', {
      state: stateRef.current,
      mapFlowActive: active,
      key: activeRequestRef.current?.key ?? null,
      requestId: activeRequestRef.current?.requestId,
      reason: active ? 'FOCUS' : 'BLUR',
    });

    if (!active) {
      const currentActive = activeRequestRef.current;
      if (currentActive && stateRef.current !== 'CLOSED' && stateRef.current !== 'SUSPENDED' && stateRef.current !== 'SUSPENDING') {
        pendingSheetRequestRef.current = null;
        const dismissOperation = createPhysicalOperation('SUSPEND_DISMISS', currentActive);
        pendingDismissOperationRef.current = dismissOperation;
        bottomSheetDebug('SUSPEND', {
          requestId: currentActive.requestId,
          key: currentActive.key,
          state: stateRef.current,
          reason: 'map_flow_inactive',
          operationId: dismissOperation.operationId,
        });
        setState('SUSPENDING', currentActive);
        modalRef.current?.dismiss();
      }
      return;
    }

    if (activeRequestRef.current && (stateRef.current === 'SUSPENDING' || stateRef.current === 'SUSPENDED' || stateRef.current === 'CLOSED')) {
      const request = activeRequestRef.current;
      if (!isSheetAllowedForRole(request.key, role)) {
        logRoleMismatch(request, 'skip_restore_role_mismatch');
        return;
      }
      createPhysicalOperation('RESTORE_PRESENT', request);
      setActiveOperation('PRESENT');
      bottomSheetDebug('RESTORE', {
        requestId: request.requestId,
        key: request.key,
        state: stateRef.current,
        reason: stateRef.current === 'CLOSED' ? 'map_focus_closed_with_logical_request' : 'map_flow_active',
        operationId: currentPhysicalOperationRef.current?.operationId ?? null,
      });
      setState('REQUESTED', request);
      return;
    }

    const pending = pendingMapFlowRequestRef.current;
    if (!pending) return;

    pendingMapFlowRequestRef.current = null;
    setPendingMapFlowKey(null);

    if (validateRequest(pending)) {
      startRequest(pending);
    }
  }, [createPhysicalOperation, logRoleMismatch, role, setState, startRequest, validateRequest]);

  const getPanelState = useCallback(<T,>(key: SheetKey, defaultState: T): T => {
    return (panelStateCacheRef.current[key] as T | undefined) ?? defaultState;
  }, []);

  const setPanelState = useCallback(<T,>(key: SheetKey, nextState: T) => {
    panelStateCacheRef.current[key] = nextState;
  }, []);

  const setIndex = useCallback((index: number) => {
    modalRef.current?.snapToIndex(index);
  }, []);

  const update = useCallback((patch: Record<string, unknown>) => {
    setActiveRequest((current) => {
      if (!current || typeof current.payload !== 'object' || current.payload === null) return current;
      const domainPatch = stripRuntimeHandlers(current.key, patch as SheetPayloadMap[typeof current.key]) as Record<string, unknown>;
      const next = {
        ...current,
        payload: { ...current.payload, ...domainPatch } as SheetPayloadMap[typeof current.key],
      };
      activeRequestRef.current = next;
      return next;
    });
  }, [stripRuntimeHandlers]);

  const bindRuntimeHandlers = useCallback((owner: RuntimeHandlerOwner, handlers: RuntimeHandlersMap) => {
    const currentOwner = runtimeHandlerOwnerRef.current;
    if (owner.generation < maxRuntimeHandlerGenerationRef.current) {
      bottomSheetDebug('HANDLERS_BIND', {
        owner: owner.ownerId,
        generation: owner.generation,
        currentOwner: currentOwner?.ownerId ?? null,
        currentGeneration: maxRuntimeHandlerGenerationRef.current,
        action: 'IGNORE_OLD_OWNER',
      });
      return;
    }

    maxRuntimeHandlerGenerationRef.current = owner.generation;
    runtimeHandlerOwnerRef.current = owner;
    runtimeHandlersRef.current = handlers;
    setRuntimeHandlersVersion((version) => version + 1);

    Object.keys(registry).forEach((key) => {
      const sheetKey = key as SheetKey;
      bottomSheetDebug('HANDLERS_BIND', {
        key: sheetKey,
        owner: owner.ownerId,
        generation: owner.generation,
        mode: handlers[sheetKey] ? 'runtime_handlers' : 'self_contained_or_none',
      });
    });
  }, []);

  const bindRuntimeActionHandlers = useCallback((owner: RuntimeHandlerOwner, handlers: RuntimeActionHandlersMap) => {
    const currentOwner = runtimeHandlerOwnerRef.current;
    if (owner.generation < maxRuntimeHandlerGenerationRef.current) {
      bottomSheetDebug('HANDLERS_BIND', {
        owner: owner.ownerId,
        generation: owner.generation,
        currentOwner: currentOwner?.ownerId ?? null,
        currentGeneration: maxRuntimeHandlerGenerationRef.current,
        action: 'IGNORE_OLD_ACTION_OWNER',
      });
      return;
    }

    maxRuntimeHandlerGenerationRef.current = owner.generation;
    runtimeHandlerOwnerRef.current = owner;
    runtimeActionHandlersRef.current = handlers;

    Object.keys(registry).forEach((key) => {
      const sheetKey = key as SheetKey;
      bottomSheetDebug('HANDLERS_BIND', {
        key: sheetKey,
        owner: owner.ownerId,
        generation: owner.generation,
        mode: handlers[sheetKey] ? 'runtime_action_handlers' : 'self_contained_or_none',
      });
    });
  }, []);

  const unbindRuntimeHandlers = useCallback((owner: RuntimeHandlerOwner) => {
    const currentOwner = runtimeHandlerOwnerRef.current;
    if (!currentOwner || currentOwner.ownerId !== owner.ownerId || currentOwner.generation !== owner.generation) {
      bottomSheetDebug('HANDLERS_BIND', {
        owner: owner.ownerId,
        generation: owner.generation,
        currentOwner: currentOwner?.ownerId ?? null,
        currentGeneration: currentOwner?.generation ?? null,
        action: 'IGNORE_STALE_UNBIND',
      });
      return;
    }

    runtimeHandlerOwnerRef.current = null;
    runtimeHandlersRef.current = {};
    setRuntimeHandlersVersion((version) => version + 1);
    bottomSheetDebug('HANDLERS_BIND', {
      owner: owner.ownerId,
      generation: owner.generation,
      action: 'UNBIND',
    });
  }, []);

  const unbindRuntimeActionHandlers = useCallback((owner: RuntimeHandlerOwner) => {
    const currentOwner = runtimeHandlerOwnerRef.current;
    if (!currentOwner || currentOwner.ownerId !== owner.ownerId || currentOwner.generation !== owner.generation) {
      bottomSheetDebug('HANDLERS_BIND', {
        owner: owner.ownerId,
        generation: owner.generation,
        currentOwner: currentOwner?.ownerId ?? null,
        currentGeneration: currentOwner?.generation ?? null,
        action: 'IGNORE_STALE_ACTION_UNBIND',
      });
      return;
    }

    runtimeActionHandlersRef.current = {};
    bottomSheetDebug('HANDLERS_BIND', {
      owner: owner.ownerId,
      generation: owner.generation,
      action: 'UNBIND_ACTIONS',
    });
  }, []);

  const dispatchBottomSheetAction = useCallback(<K extends SheetKey, A extends BottomSheetActionName<K>>(
    key: K,
    action: A,
    payload: BottomSheetActionPayload<K, A>,
    origin = 'UI_PRESS',
  ): number => {
    const actionId = nextBottomSheetActionId();
    const currentRequest = activeRequestRef.current;
    const currentOwner = runtimeHandlerOwnerRef.current;

    bottomSheetDebug('ACTION', {
      actionId,
      key,
      action,
      origin,
      requestId: currentRequest?.requestId ?? null,
    });

    if (currentRequest?.key !== key) {
      bottomSheetDebug('INVALID_ACTION', {
        actionId,
        key,
        action,
        requestId: currentRequest?.requestId ?? null,
        reason: 'sheet_not_active',
      });
      return actionId;
    }

    const handlersForKey = runtimeActionHandlersRef.current[key];
    const handler = handlersForKey?.[action] as ((nextPayload: BottomSheetActionPayload<K, A>, meta: { actionId: number; key: K; action: A; owner: RuntimeHandlerOwner | null; requestId: number | null }) => void) | undefined;
    bottomSheetDebug('HANDLER_RESOLVE', {
      actionId,
      key,
      action,
      found: typeof handler === 'function',
      owner: currentOwner?.ownerId ?? null,
      generation: currentOwner?.generation,
    });

    if (typeof handler !== 'function') {
      bottomSheetDebug('HANDLER_MISSING', {
        actionId,
        key,
        action,
        owner: currentOwner?.ownerId ?? null,
        generation: currentOwner?.generation,
        reason: 'required_runtime_action_handler_missing',
      });
      return actionId;
    }

    handler(payload, {
      actionId,
      key,
      action,
      owner: currentOwner,
      requestId: currentRequest?.requestId ?? null,
    });
    return actionId;
  }, []);

  const effectiveActiveRequest = useMemo(() => {
    if (!activeRequest) return null;
    if (!isSheetAllowedForRole(activeRequest.key, role)) {
      logRoleMismatch(activeRequest, 'suppress_host_render_role_mismatch');
      return null;
    }
    const runtimeHandlers = runtimeHandlersRef.current[activeRequest.key];
    if (!runtimeHandlers) return activeRequest;
    return {
      ...activeRequest,
      payload: {
        ...(activeRequest.payload as Record<string, unknown>),
        ...(runtimeHandlers as Record<string, unknown>),
      } as SheetPayloadMap[typeof activeRequest.key],
    } as AnyBottomSheetRequest;
  }, [activeRequest, logRoleMismatch, role, runtimeHandlersVersion]);

  const value = useMemo(
    () => ({
      present,
      dismiss,
      dismissAll,
      setMapFlowActive,
      setIndex,
      update,
      bindRuntimeHandlers,
      unbindRuntimeHandlers,
      bindRuntimeActionHandlers,
      unbindRuntimeActionHandlers,
      dispatchBottomSheetAction,
      active: activeRequest?.key ?? null,
      activePayload: activeRequest?.payload ?? null,
      pendingMapFlowKey,
      getPanelState,
      setPanelState,
    }),
    [present, dismiss, dismissAll, setMapFlowActive, setIndex, update, bindRuntimeHandlers, unbindRuntimeHandlers, bindRuntimeActionHandlers, unbindRuntimeActionHandlers, dispatchBottomSheetAction, activeRequest, pendingMapFlowKey, getPanelState, setPanelState],
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      <BottomSheetContext.Provider value={value}>
        <BottomSheetModalProvider>
          {children}
          <BottomSheetHost
            request={effectiveActiveRequest}
            operation={activeOperation}
            modalRef={modalRef}
            isMapFlowActive={isMapFlowActive}
            onPresent={handleHostPresent}
            onChange={handleHostChange}
            onDismiss={handleHostDismiss}
          />
        </BottomSheetModalProvider>
      </BottomSheetContext.Provider>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
