import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { TOKENS } from '../../theme';
import { Icon } from './Icon';
import type { RouteCoordinate } from '../../utils/directions';

export interface MapFloatingNavigationControlsProps {
  /** Indica si el modo de navegación 3D está activo (proveniente de useMapCamera.isNavigating) */
  isNavigating: boolean;
  /** Coordenada del actor móvil local que navega (prioritaria) */
  subjectCoordinate?: RouteCoordinate | null;
  /** Coordenada objetivo para enfocar en la activación de la navegación (compatibilidad con subjectCoordinate) */
  targetCoordinate?: RouteCoordinate | null;
  /** Coordenada del punto de destino / llegada (informativa) */
  destinationCoordinate?: RouteCoordinate | null;
  /** Orientación / rumbo en grados [0, 360) (opcional) */
  heading?: number | null;
  /** Callback opcional para alternar navegación (exclusivo para FocusModeProviderScreen) */
  onToggleNavigation?: (
    coord?: RouteCoordinate | null,
    options?: { heading?: number; pitch?: number; animated?: boolean; force?: boolean; duration?: number },
  ) => void;
  /** Callback opcional para encuadre inteligente (Smart Framing / Recenter) */
  onSmartFraming?: () => void;
  /** Deshabilita la interacción con el control */
  disabled?: boolean;
  /** Estilo opcional para el contenedor de botones */
  style?: StyleProp<ViewStyle>;
  /** Posicionamiento superior absoluto opcional */
  topOffset?: number;
  /** Control de visibilidad del botón de Smart Framing */
  showSmartFraming?: boolean;
  /** Control de visibilidad del botón de navegación 3D (SOLO FocusModeProvider) */
  showNavigation?: boolean;
  /** Accessibility label personalizada */
  accessibilityLabel?: string;
  /** TestID opcional para pruebas unitarias y E2E */
  testID?: string;
}

export const MapFloatingNavigationControls: React.FC<MapFloatingNavigationControlsProps> = ({
  isNavigating,
  subjectCoordinate,
  targetCoordinate,
  destinationCoordinate,
  heading,
  onToggleNavigation,
  onSmartFraming,
  disabled = false,
  style,
  topOffset,
  showSmartFraming = false,
  showNavigation = false,
  accessibilityLabel = 'Modo navegación 3D',
  testID = 'map-floating-navigation-controls',
}) => {
  const effectiveSubject = subjectCoordinate ?? targetCoordinate ?? null;
  const isSubjectAvailable = effectiveSubject != null;
  const isButtonDisabled = disabled || (!isNavigating && !isSubjectAvailable);

  const handlePress = () => {
    if (isButtonDisabled || !onToggleNavigation) return;

    if (isNavigating) {
      onToggleNavigation(effectiveSubject, { animated: true });
    } else {
      const sanitizedHeading =
        heading != null && Number.isFinite(heading) && heading >= 0 ? heading : undefined;
      onToggleNavigation(effectiveSubject, {
        heading: sanitizedHeading,
        animated: true,
        force: true,
      });
    }
  };

  return (
    <View
      style={[
        styles.floatingButtonsWrapper,
        topOffset !== undefined && { top: topOffset },
        style,
      ]}
      pointerEvents="box-none"
      testID={testID}
    >
      {showNavigation && (
        <TouchableOpacity
          onPress={handlePress}
          disabled={isButtonDisabled}
          activeOpacity={0.8}
          style={[
            styles.floatingActionBtn,
            isNavigating && styles.floatingActionBtnActive,
            isButtonDisabled && styles.floatingActionBtnDisabled,
          ]}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: isNavigating, disabled: isButtonDisabled }}
          testID="btn-toggle-navigation-mode"
        >
          <Icon
            name="Navigation"
            size={19}
            color={isNavigating ? TOKENS.colors.white : TOKENS.colors.brand500}
            fill={isNavigating ? TOKENS.colors.white : TOKENS.colors.brand500}
          />
        </TouchableOpacity>
      )}

      {showSmartFraming && onSmartFraming && (
        <TouchableOpacity
          onPress={onSmartFraming}
          activeOpacity={0.8}
          style={styles.floatingActionBtn}
          accessibilityLabel="Encuadre inteligente de mapa"
          accessibilityRole="button"
          testID="btn-smart-framing"
        >
          <Icon name="Maximize2" size={18} color={TOKENS.colors.dark900} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  floatingButtonsWrapper: {
    alignItems: 'flex-end',
    gap: 8,
  },
  floatingActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.floating,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
  },
  floatingActionBtnActive: {
    backgroundColor: TOKENS.colors.brand500,
    borderColor: TOKENS.colors.brand600,
  },
  floatingActionBtnDisabled: {
    opacity: 0.45,
  },
});
