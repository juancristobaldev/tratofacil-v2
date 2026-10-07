import type { TurnAnalysis, TurnType } from './types';
import type { RouteManeuver, RouteNavigationPlan } from './routeManeuverGraph';
import { smoothHeadingEMA } from './geoMathCore';

export type ManeuverPhase =
  | 'IDLE'
  | 'APPROACHING'
  | 'IMMINENT'
  | 'EXECUTING_IN_INTERSECTION'
  | 'COMPLETED';

export interface ManeuverGuidanceState {
  activeManeuver: RouteManeuver | null;
  phase: ManeuverPhase;
  turn: TurnAnalysis;
  distanceToManeuver: number;
}

export const MANEUVER_CONSTANTS = {
  IMMINENT_DISTANCE_METERS: 25.0,
  INTERSECTION_RETENTION_METERS: 20.0, // Retención activa al cruzar el vértice (0m a +20m)
  MAX_GUIDANCE_HORIZON_METERS: 500.0,
  TEMPORAL_HOLD_MS: 2500, // 2.5s de gracia ante interrupciones de señal
};

export class ManeuverGuidanceStateMachine {
  private activeManeuverIdx: number = 0;
  private currentPhase: ManeuverPhase = 'IDLE';
  private lastReportedTurn: TurnAnalysis | null = null;
  private lastTurnReportedAt: number = 0;
  private maxProgressAlongRoute: number = 0;

  /**
   * Resetea la máquina de estados para una nueva ruta o re-enrutamiento.
   */
  public reset(): void {
    this.activeManeuverIdx = 0;
    this.currentPhase = 'IDLE';
    this.lastReportedTurn = null;
    this.lastTurnReportedAt = 0;
    this.maxProgressAlongRoute = 0;
  }

  /**
   * Evalúa el avance del vehículo contra el plan de navegación y retorna la maniobra
   * activa con garantías de retención de intersección y progresión monótona.
   */
  public updateProgress(
    plan: RouteNavigationPlan | null | undefined,
    distanceAlongRoute: number,
    speedMps: number,
    currentSegmentBearing: number,
    isOffRoute: boolean,
    now: number = Date.now(),
  ): TurnAnalysis {
    // Si no hay plan de ruta o el vehículo se desvió totalmente
    if (!plan || plan.maneuvers.length === 0 || isOffRoute) {
      return this.handleNoManeuver(currentSegmentBearing, now);
    }

    // Filtro de monotonicidad acotado: previene que jitter GPS salte hacia atrás
    // pero permite pequeñas correcciones de hasta 15m
    if (distanceAlongRoute > this.maxProgressAlongRoute) {
      this.maxProgressAlongRoute = distanceAlongRoute;
    } else if (distanceAlongRoute < this.maxProgressAlongRoute - 35) {
      // El vehículo realmente retrocedió o hubo recálculo mayor
      this.maxProgressAlongRoute = distanceAlongRoute;
    }

    const effectiveVehicleDist = Math.max(distanceAlongRoute, this.maxProgressAlongRoute - 10);
    const maneuvers = plan.maneuvers;
    const numManeuvers = maneuvers.length;

    // 1. Avanzar índice de maniobra si ya salimos de la zona de intersección de la anterior
    while (
      this.activeManeuverIdx < numManeuvers &&
      effectiveVehicleDist >
        maneuvers[this.activeManeuverIdx].distanceAlongRoute + MANEUVER_CONSTANTS.INTERSECTION_RETENTION_METERS
    ) {
      this.activeManeuverIdx++;
    }

    // 2. Si no quedan más maniobras en la ruta
    if (this.activeManeuverIdx >= numManeuvers) {
      this.currentPhase = 'COMPLETED';
      return this.handleNoManeuver(currentSegmentBearing, now);
    }

    const currentManeuver = maneuvers[this.activeManeuverIdx];
    const distToVertex = currentManeuver.distanceAlongRoute - effectiveVehicleDist;

    // Si la siguiente maniobra está más allá del horizonte de visibilidad (500m)
    if (distToVertex > MANEUVER_CONSTANTS.MAX_GUIDANCE_HORIZON_METERS) {
      this.currentPhase = 'IDLE';
      return this.handleNoManeuver(currentSegmentBearing, now);
    }

    // 3. Determinación de fase de la maniobra
    let distanceToTurn = Math.max(0, distToVertex);
    let phase: ManeuverPhase;

    if (distToVertex <= 0 && distToVertex >= -MANEUVER_CONSTANTS.INTERSECTION_RETENTION_METERS) {
      // El vehículo está cruzando la intersección (0m a +20m post-vértice)
      phase = 'EXECUTING_IN_INTERSECTION';
      distanceToTurn = 0; // "Gire ahora"
    } else if (distToVertex <= MANEUVER_CONSTANTS.IMMINENT_DISTANCE_METERS) {
      phase = 'IMMINENT';
    } else {
      phase = 'APPROACHING';
    }

    this.currentPhase = phase;

    const safeSpeed = Math.max(2.0, speedMps);
    const timeToTurnSec = distanceToTurn / safeSpeed;

    // Blending de rumbo hacia la maniobra
    let blendedHeading = currentSegmentBearing;
    if (distanceToTurn < 40 || timeToTurnSec < 3.5) {
      const proximityWeight = Math.max(0, Math.min(0.65, 1 - distanceToTurn / 40));
      blendedHeading = smoothHeadingEMA(currentSegmentBearing, currentManeuver.exitBearing, proximityWeight);
    }

    const activeTurn: TurnAnalysis = {
      turnDetected: true,
      turnType: currentManeuver.turnType,
      deltaAngle: currentManeuver.deltaAngle,
      distanceToTurn,
      timeToTurnSec,
      blendedHeading,
    };

    this.lastReportedTurn = activeTurn;
    this.lastTurnReportedAt = now;

    return activeTurn;
  }

  public getCurrentPhase(): ManeuverPhase {
    return this.currentPhase;
  }

  public getActiveManeuverIndex(): number {
    return this.activeManeuverIdx;
  }

  private handleNoManeuver(currentSegmentBearing: number, now: number): TurnAnalysis {
    // Si teníamos una maniobra activa reciente dentro de la ventana de gracia temporal (2.5s)
    if (
      this.lastReportedTurn &&
      this.lastReportedTurn.turnDetected &&
      now - this.lastTurnReportedAt < MANEUVER_CONSTANTS.TEMPORAL_HOLD_MS
    ) {
      return {
        ...this.lastReportedTurn,
        blendedHeading: currentSegmentBearing,
      };
    }

    const fallback: TurnAnalysis = {
      turnDetected: false,
      turnType: 'STRAIGHT',
      deltaAngle: 0,
      distanceToTurn: Infinity,
      timeToTurnSec: Infinity,
      blendedHeading: currentSegmentBearing,
    };

    this.lastReportedTurn = fallback;
    return fallback;
  }
}
