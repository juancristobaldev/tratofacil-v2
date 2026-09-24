import { useRef, useCallback, useEffect, useState } from 'react';
import type { SheetKey } from './bottomSheet.types';
import { bottomSheetDebug } from './bottomSheet.debug';
import { isSheetCollapsible } from './bottomSheet.registry';

export interface UseMapSheetCollapseOptions {
  activeSheet: SheetKey | null;
  sheetIndex?: number;
  isCollapsed?: boolean;
  setIndex: (index: number) => void;
  debounceMs?: number;
  enabled?: boolean;
}

export function useMapSheetCollapse(options: UseMapSheetCollapseOptions) {
  const {
    activeSheet,
    sheetIndex = 1,
    isCollapsed = false,
    setIndex,
    debounceMs = 450,
    enabled = true,
  } = options;

  const [isMapManipulating, setIsMapManipulating] = useState(false);
  const isManipulatingRef = useRef(false);
  const wasOpenBeforeManipulationRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSheetRef = useRef(activeSheet);
  activeSheetRef.current = activeSheet;

  const sheetIndexRef = useRef(sheetIndex);
  sheetIndexRef.current = sheetIndex;

  const isCollapsedRef = useRef(isCollapsed);
  isCollapsedRef.current = isCollapsed;

  const setIndexRef = useRef(setIndex);
  setIndexRef.current = setIndex;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const dragSheetKeyRef = useRef<SheetKey | null>(null);

  const cancelPendingRestore = useCallback(() => {
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }
  }, []);

  const resetMapCollapseState = useCallback(() => {
    cancelPendingRestore();
    isManipulatingRef.current = false;
    wasOpenBeforeManipulationRef.current = false;
    dragSheetKeyRef.current = null;
    setIsMapManipulating(false);
  }, [cancelPendingRestore]);

  const handleMapPanDrag = useCallback(() => {
    if (!enabledRef.current) return;

    cancelPendingRestore();

    if (!isManipulatingRef.current) {
      isManipulatingRef.current = true;
      setIsMapManipulating(true);
      const currentActive = activeSheetRef.current;
      dragSheetKeyRef.current = currentActive;
      const isCollapsible = currentActive ? isSheetCollapsible(currentActive) : false;
      const currentlyOpen = !isCollapsedRef.current && sheetIndexRef.current > 0;

      if (currentActive && isCollapsible && currentlyOpen) {
        wasOpenBeforeManipulationRef.current = true;
        bottomSheetDebug('MAP_AUTO_COLLAPSE', {
          key: currentActive,
          fromIndex: sheetIndexRef.current,
          toIndex: 0,
          reason: 'map_pan_drag_start',
        });
        setIndexRef.current(0);
      } else {
        wasOpenBeforeManipulationRef.current = false;
      }
    }
  }, [cancelPendingRestore]);

  const handleMapRegionChangeComplete = useCallback(() => {
    if (!enabledRef.current || !isManipulatingRef.current) return;

    cancelPendingRestore();

    settleTimeoutRef.current = setTimeout(() => {
      isManipulatingRef.current = false;
      setIsMapManipulating(false);
      const currentActive = activeSheetRef.current;
      const isCollapsible = currentActive ? isSheetCollapsible(currentActive) : false;
      const isSameSheetAsDrag = currentActive === dragSheetKeyRef.current;

      if (wasOpenBeforeManipulationRef.current && currentActive && isCollapsible && isSameSheetAsDrag) {
        wasOpenBeforeManipulationRef.current = false;
        bottomSheetDebug('MAP_AUTO_RESTORE', {
          key: currentActive,
          fromIndex: 0,
          toIndex: 1,
          reason: 'map_manipulation_settled',
        });
        setIndexRef.current(1);
      } else {
        wasOpenBeforeManipulationRef.current = false;
      }
    }, debounceMs);
  }, [cancelPendingRestore, debounceMs]);

  // Si cambia el activeSheet o se cierra, limpiar estado para no dejar restores stale
  useEffect(() => {
    resetMapCollapseState();
  }, [activeSheet, resetMapCollapseState]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      cancelPendingRestore();
    };
  }, [cancelPendingRestore]);

  return {
    handleMapPanDrag,
    handleMapRegionChangeComplete,
    cancelPendingRestore,
    resetMapCollapseState,
    isMapManipulating,
  };
}
