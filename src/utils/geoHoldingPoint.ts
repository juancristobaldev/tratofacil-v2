import type { GeoPosition } from 'react-native-geolocation-service';

export interface HoldingPointConfig {
  /** Radio en metros dentro del cual se considera que el usuario está en el punto de espera (default: 10m) */
  stationaryRadiusMeters: number;
  /** Velocidad máxima en m/s considerada como estado detenido (default: 0.6 m/s ~ 2.16 km/h) */
  stationarySpeedThresholdMps: number;
  /** Precisión máxima aceptable en metros para considerar una muestra válida (default: 65m) */
  maxAcceptableAccuracyMeters: number;
  /** Cantidad de muestras consecutivas fuera del radio para romper el punto de espera (default: 2) */
  consecutiveBreaksToMove: number;
  /** Velocidad implícita máxima en m/s para descartar saltos imposibles por rebote de señal (default: 50 m/s ~ 180 km/h) */
  maxPhysicalSpeedMps: number;
  /** Tiempo en ms tras el cual una posición se considera desactualizada / congelada (default: 25000ms) */
  staleTimeoutMs: number;
}

export const DEFAULT_HOLDING_POINT_CONFIG: HoldingPointConfig = {
  stationaryRadiusMeters: 10,
  stationarySpeedThresholdMps: 0.6,
  maxAcceptableAccuracyMeters: 65,
  consecutiveBreaksToMove: 2,
  maxPhysicalSpeedMps: 50,
  staleTimeoutMs: 25000,
};

export type GpsQualityRating = 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'POOR' | 'INVALID';

export interface FilteredLocationResult {
  /** Posición resultante (anclada si está en espera, o actualizada si hay movimiento real) */
  position: GeoPosition;
  /** Indica si el usuario está actualmente estacionario en el punto de espera */
  isStationary: boolean;
  /** Calidad estimada de la señal GPS */
  quality: GpsQualityRating;
  /** Motivo del procesamiento aplicado */
  reason: string;
  /** Si el punto de espera cambió de posición en esta lectura */
  anchorChanged: boolean;
  /** Distancia calculada en metros respecto al anclaje anterior */
  distanceFromAnchorMeters: number;
}

/**
 * Calcula la distancia ortodrómica en metros entre dos coordenadas geográficas (Fórmula de Haversine).
 */
export function getHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }
  const R = 6371e3; // Radio medio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Clasifica la calidad de una lectura GPS según su precisión reportada.
 */
export function evaluateGpsQuality(accuracy: number | null | undefined): GpsQualityRating {
  if (accuracy == null || !Number.isFinite(accuracy) || accuracy < 0) {
    return 'DEGRADED';
  }
  if (accuracy <= 10) return 'EXCELLENT';
  if (accuracy <= 25) return 'GOOD';
  if (accuracy <= 65) return 'DEGRADED';
  return 'POOR';
}

/**
 * Filtro inteligente de Punto de Espera (Holding Point / Stationary Anchor).
 *
 * Mantiene la ubicación del cliente estable y fija cuando está en reposo (evita el "baile" o salto
 * continuo por ruido de GPS de 2 a 12 metros), y traslada el anclaje de forma suave cuando se
 * confirma un desplazamiento real e intencional.
 */
export class GeoHoldingPointFilter {
  private config: HoldingPointConfig;
  private anchorPosition: GeoPosition | null = null;
  private lastAcceptedPosition: GeoPosition | null = null;
  private consecutiveOutliersCount: number = 0;
  private lastUpdateTime: number = 0;

  constructor(config: Partial<HoldingPointConfig> = {}) {
    this.config = { ...DEFAULT_HOLDING_POINT_CONFIG, ...config };
  }

  /**
   * Procesa una lectura cruda de GPS y retorna la posición estabilizada.
   */
  public process(raw: GeoPosition | null | undefined): FilteredLocationResult | null {
    if (!raw || !raw.coords) return null;

    const { latitude, longitude, accuracy, speed } = raw.coords;
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    const now = raw.timestamp || Date.now();
    const quality = evaluateGpsQuality(accuracy);

    // 1. Si no hay anclaje previo (primera lectura válida):
    if (!this.anchorPosition) {
      this.anchorPosition = raw;
      this.lastAcceptedPosition = raw;
      this.lastUpdateTime = now;
      this.consecutiveOutliersCount = 0;
      return {
        position: raw,
        isStationary: true,
        quality,
        reason: 'INITIAL_ANCHOR_ESTABLISHED',
        anchorChanged: true,
        distanceFromAnchorMeters: 0,
      };
    }

    // 2. Filtro de precisión máxima permitida:
    // Si la lectura tiene una precisión peor que el umbral (ej. 150m por triangulación celular errónea),
    // se descarta y se mantiene el anclaje previo para evitar saltos bruscos.
    if (
      accuracy != null &&
      Number.isFinite(accuracy) &&
      accuracy > this.config.maxAcceptableAccuracyMeters
    ) {
      return {
        position: this.anchorPosition,
        isStationary: true,
        quality: 'POOR',
        reason: `LOW_ACCURACY_REJECTED_${Math.round(accuracy)}M`,
        anchorChanged: false,
        distanceFromAnchorMeters: getHaversineDistanceMeters(
          this.anchorPosition.coords.latitude,
          this.anchorPosition.coords.longitude,
          latitude,
          longitude,
        ),
      };
    }

    const distFromAnchor = getHaversineDistanceMeters(
      this.anchorPosition.coords.latitude,
      this.anchorPosition.coords.longitude,
      latitude,
      longitude,
    );

    // 3. Detección de salto imposible (Teleport Guard):
    if (this.lastAcceptedPosition) {
      const dtSec = Math.max(0.2, (now - this.lastUpdateTime) / 1000);
      const distFromLast = getHaversineDistanceMeters(
        this.lastAcceptedPosition.coords.latitude,
        this.lastAcceptedPosition.coords.longitude,
        latitude,
        longitude,
      );
      const impliedSpeed = distFromLast / dtSec;

      if (impliedSpeed > this.config.maxPhysicalSpeedMps && (accuracy == null || accuracy > 20)) {
        return {
          position: this.anchorPosition,
          isStationary: true,
          quality: 'POOR',
          reason: `TELEPORT_REJECTED_${Math.round(impliedSpeed)}MPS`,
          anchorChanged: false,
          distanceFromAnchorMeters: distFromAnchor,
        };
      }
    }

    // 4. Evaluación de velocidad y distancia respecto al punto de espera:
    const reportedSpeed =
      speed != null && Number.isFinite(speed) && speed >= 0 ? speed : null;
    const isSpeedMoving =
      reportedSpeed != null && reportedSpeed >= this.config.stationarySpeedThresholdMps;

    // Caso A: El usuario está dentro del radio del punto de espera (< stationaryRadiusMeters)
    if (distFromAnchor <= this.config.stationaryRadiusMeters) {
      this.consecutiveOutliersCount = 0;
      this.lastUpdateTime = now;

      // Si la nueva lectura tiene significativamente MEJOR precisión que el anclaje actual,
      // refinamos sutilmente el anclaje sin cambiar bruscamente de posición.
      const currentAnchorAcc = this.anchorPosition.coords.accuracy ?? 999;
      const newAcc = accuracy ?? 999;
      if (newAcc < currentAnchorAcc - 8 && distFromAnchor < 4) {
        this.anchorPosition = raw;
      }

      return {
        position: this.anchorPosition, // Retorna exactamente la coordenada anclada fija
        isStationary: true,
        quality,
        reason: 'STATIONARY_HOLDING_POINT',
        anchorChanged: false,
        distanceFromAnchorMeters: distFromAnchor,
      };
    }

    // Caso B: Lectura fuera del radio de espera (> stationaryRadiusMeters)
    // Puede ser una fluctuación aislada o el inicio de un desplazamiento real.
    // Si la velocidad explícita es alta (>= 1.2 m/s) o se acumulan `consecutiveBreaksToMove` lecturas consecutivas fuera,
    // se confirma el desplazamiento y se actualiza el anclaje.
    const isDefiniteMovement =
      (reportedSpeed != null && reportedSpeed >= 1.2) ||
      distFromAnchor >= this.config.stationaryRadiusMeters * 2.5;

    if (isDefiniteMovement) {
      this.consecutiveOutliersCount = 0;
      this.anchorPosition = raw;
      this.lastAcceptedPosition = raw;
      this.lastUpdateTime = now;

      return {
        position: raw,
        isStationary: !isSpeedMoving,
        quality,
        reason: 'DEFINITE_MOVEMENT_BREAKOUT',
        anchorChanged: true,
        distanceFromAnchorMeters: distFromAnchor,
      };
    }

    this.consecutiveOutliersCount++;

    if (this.consecutiveOutliersCount >= this.config.consecutiveBreaksToMove) {
      // Se confirmaron múltiples lecturas consecutivas fuera del radio: trasladar anclaje
      this.consecutiveOutliersCount = 0;
      this.anchorPosition = raw;
      this.lastAcceptedPosition = raw;
      this.lastUpdateTime = now;

      return {
        position: raw,
        isStationary: false,
        quality,
        reason: 'CONSECUTIVE_READINGS_BREAKOUT',
        anchorChanged: true,
        distanceFromAnchorMeters: distFromAnchor,
      };
    }

    // Aún en espera de confirmación: retener el punto de espera previo
    return {
      position: this.anchorPosition,
      isStationary: true,
      quality,
      reason: `OUTLIER_PENDING_CONFIRMATION_${this.consecutiveOutliersCount}`,
      anchorChanged: false,
      distanceFromAnchorMeters: distFromAnchor,
    };
  }

  /**
   * Retorna el punto de espera actualmente anclado.
   */
  public getAnchor(): GeoPosition | null {
    return this.anchorPosition;
  }

  /**
   * Evalúa si la última señal GPS recibida está congelada o desactualizada.
   */
  public isStale(now: number = Date.now()): boolean {
    if (this.lastUpdateTime <= 0) return true;
    return now - this.lastUpdateTime > this.config.staleTimeoutMs;
  }

  /**
   * Resetea el filtro y limpia el anclaje.
   */
  public reset(): void {
    this.anchorPosition = null;
    this.lastAcceptedPosition = null;
    this.consecutiveOutliersCount = 0;
    this.lastUpdateTime = 0;
  }
}
