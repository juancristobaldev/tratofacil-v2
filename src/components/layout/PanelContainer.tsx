import React from 'react';
import { Dimensions } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { usePanel } from '../../context/PanelContext';
import { ProviderPanelContent } from '../panels/ProviderPanelContent';
import { CategoriesPanelContent } from '../panels/CategoriesPanelContent';
import { FocusClientPanelContent } from '../panels/FocusClientPanelContent';
import { FocusProviderPanelContent } from '../panels/FocusProviderPanelContent';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PanelContainerProps {
  bottomNavHeight: number;
}

export const PanelContainer: React.FC<PanelContainerProps> = ({ bottomNavHeight }) => {
  const { activePanel, closePanel, panelState, setPanelState, panelData } = usePanel();

  const renderContent = () => {
    switch (activePanel) {
      case 'categories':
        return <CategoriesPanelContent />;
      case 'focus_client':
        return <FocusClientPanelContent />;
      case 'focus_provider':
        return <FocusProviderPanelContent />;
      case 'provider_dashboard':
        return <ProviderPanelContent />;
      default:
        return null;
    }
  };

  const shouldShowCloseButton = () => {
    if (activePanel === 'focus_client') {
      return panelData?.orderState !== 'CALIFICAR';
    }
    if (activePanel === 'focus_provider') {
      return panelData?.orderState !== 'COMPLETED';
    }
    return activePanel !== 'provider_dashboard';
  };

  if (!activePanel) return null;

  return (
    <BottomSheet
      state={panelState}
      onStateChange={setPanelState}
      onClose={closePanel}
      showHandle={true}
      showCloseButton={shouldShowCloseButton()}
      bottomInset={bottomNavHeight}
    >
      {renderContent()}
    </BottomSheet>
  );
};
