import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { BottomSheetState } from '../components/ui/BottomSheet';

export type PanelType = 'provider_dashboard' | 'order_detail' | 'focus_client' | 'focus_provider' | 'categories' | null;

interface PanelContextProps {
  activePanel: PanelType;
  panelData: any;
  panelState: BottomSheetState;
  openPanel: (type: Exclude<PanelType, null>, data?: any) => void;
  closePanel: () => void;
  clearPanel: () => void;
  updatePanelData: (data: any) => void;
  setPanelState: (state: BottomSheetState) => void;
  isPanelOpen: boolean;
}

const PanelContext = createContext<PanelContextProps>({
  activePanel: null,
  panelData: null,
  panelState: 'hidden',
  openPanel: () => {},
  closePanel: () => {},
  clearPanel: () => {},
  updatePanelData: () => {},
  setPanelState: () => {},
  isPanelOpen: false,
});

export const usePanel = () => useContext(PanelContext);

export const PanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [panelData, setPanelData] = useState<any>(null);
  const [panelState, setPanelState] = useState<BottomSheetState>('hidden');

  const openPanel = useCallback((type: Exclude<PanelType, null>, data?: any) => {
    setActivePanel(type);
    setPanelData(data ?? null);
    setPanelState('expanded');
  }, []);

  const closePanel = useCallback(() => {
    setPanelState('hidden');
  }, []);

  const clearPanel = useCallback(() => {
    setActivePanel(null);
    setPanelData(null);
    setPanelState('hidden');
  }, []);

  const updatePanelData = useCallback((data: any) => {
    setPanelData((prev: any) => ({ ...prev, ...data }));
  }, []);

  const value = useMemo(() => ({
    activePanel,
    panelData,
    panelState,
    openPanel,
    closePanel,
    clearPanel,
    updatePanelData,
    setPanelState,
    isPanelOpen: activePanel !== null && panelState !== 'hidden',
  }), [activePanel, panelData, panelState, openPanel, closePanel, clearPanel, updatePanelData, setPanelState]);

  return (
    <PanelContext.Provider value={value}>
      {children}
    </PanelContext.Provider>
  );
};
