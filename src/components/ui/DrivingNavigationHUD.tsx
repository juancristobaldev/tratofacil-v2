import React from 'react';
import { StyleSheet, View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { TOKENS } from '../../theme';
import { Icon, type IconName } from './Icon';
import type { TurnAnalysis } from '../../navigation-engine/types';

export interface DrivingNavigationHUDProps {
  /** Análisis de giro calculado en tiempo real por SmartNavigationEngine */
  turn?: TurnAnalysis | null;
  /** Tiempo estimado de llegada legible (ej. "8 min") */
  etaLabel?: string | null;
  /** Distancia restante legible (ej. "2.4 km") */
  distanceLabel?: string | null;
  /** Dirección o calle de destino */
  destinationAddress?: string | null;
  /** Nombre del cliente o destinatario */
  clientName?: string | null;
  /** Estilo opcional para contenedor exterior */
  style?: StyleProp<ViewStyle>;
  /** TestID opcional */
  testID?: string;
}

export function getManeuverDetails(turn?: TurnAnalysis | null): {
  iconName: IconName;
  instructionText: string;
  distanceText: string;
} {
  if (!turn || !turn.turnDetected || !Number.isFinite(turn.distanceToTurn)) {
    return {
      iconName: 'ArrowUp',
      instructionText: 'Continúe por la ruta',
      distanceText: '',
    };
  }

  const isRight = turn.deltaAngle > 0;
  let iconName: IconName;
  let instructionText: string;

  switch (turn.turnType) {
    case 'U_TURN':
      iconName = 'RotateCcw';
      instructionText = 'Retorno en U';
      break;
    case 'SHARP_TURN':
      iconName = isRight ? 'CornerUpRight' : 'CornerUpLeft';
      instructionText = isRight ? 'Curva cerrada a la derecha' : 'Curva cerrada a la izquierda';
      break;
    case 'TURN':
      iconName = isRight ? 'CornerUpRight' : 'CornerUpLeft';
      instructionText = isRight ? 'Gire a la derecha' : 'Gire a la izquierda';
      break;
    case 'SOFT_CURVE':
      iconName = isRight ? 'CornerUpRight' : 'CornerUpLeft';
      instructionText = isRight ? 'Curva suave a la derecha' : 'Curva suave a la izquierda';
      break;
    case 'STRAIGHT':
    default:
      iconName = 'ArrowUp';
      instructionText = 'Continúe recto';
      break;
  }

  // Acción inmediata cuando el vehículo está en la maniobra o a <= 20m del vértice
  if (turn.distanceToTurn <= 20) {
    return {
      iconName,
      instructionText,
      distanceText: turn.turnType === 'STRAIGHT' ? 'Continúe' : 'Gire ahora',
    };
  }

  const distM = Math.round(turn.distanceToTurn);
  const formattedDist = distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;

  return {
    iconName,
    instructionText,
    distanceText: turn.turnType === 'STRAIGHT' ? `Por ${formattedDist}` : `En ${formattedDist}`,
  };
}

export const DrivingNavigationHUD: React.FC<DrivingNavigationHUDProps> = ({
  turn,
  etaLabel,
  distanceLabel,
  destinationAddress: _destinationAddress,
  clientName: _clientName,
  style,
  testID = 'driving-navigation-hud',
}) => {
  const maneuver = getManeuverDetails(turn);
  const turnDistance = maneuver.distanceText || 'En ruta';
  const eta = etaLabel || '...';
  const dist = distanceLabel || '';

  return (
    <View style={[styles.container, style]} pointerEvents="box-none" testID={testID}>
      <View style={styles.hudCard}>
        {/* 1. Icono de maniobra direccional de alto contraste */}
        <View style={styles.maneuverIconBox} testID="hud-maneuver-icon-box">
          <Icon
            name={maneuver.iconName}
            size={24}
            color={TOKENS.colors.white}
            testID="hud-maneuver-icon"
          />
        </View>

        {/* 2. Distancia del giro en tipografía prominente de lectura inmediata */}
        <View style={styles.turnDistanceCol}>
          <Text
            style={styles.turnDistanceText}
            numberOfLines={1}
            testID="hud-turn-distance"
          >
            {turnDistance}
          </Text>
        </View>

        {/* 3. Minutos de llegada y 4. Km a la ubicación de llegada */}
        {(etaLabel || distanceLabel) && (
          <View style={styles.etaCol} testID="hud-eta-col">
            <Text
              style={styles.etaValue}
              numberOfLines={1}
              testID="hud-eta-minutes"
            >
              {eta}
            </Text>
            {dist ? (
              <Text
                style={styles.distanceValue}
                numberOfLines={1}
                testID="hud-arrival-distance"
              >
                {dist}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: TOKENS.spacing.md,
    zIndex: 999,
    elevation: 999,
  },
  hudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 22, 0.94)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...TOKENS.shadows.floating,
  },
  maneuverIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  turnDistanceCol: {
    flex: 1,
    justifyContent: 'center',
  },
  turnDistanceText: {
    fontSize: 20,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.white,
    letterSpacing: -0.3,
  },
  etaCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.12)',
    minWidth: 64,
  },
  etaValue: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.extrabold,
    color: TOKENS.colors.white,
  },
  distanceValue: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: TOKENS.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.70)',
    marginTop: 1,
  },
});
