import type { RouteCoordinate } from '../utils/directions';

export type MotionSourceType = 'LOCAL_GPS' | 'REMOTE_TRACKING';

export type GpsQuality = 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'POOR' | 'INVALID';

export type TurnType =
  | 'STRAIGHT'
  | 'SOFT_CURVE'
  | 'TURN'
  | 'SHARP_TURN'
  | 'U_TURN';

export interface NavigationMotionSample {
  coordinate: RouteCoordinate;
  timestamp: number;
  heading?: number | null;
  speed?: number | null; // en m/s
  accuracy?: number | null; // en metros
  source: MotionSourceType;
  routeCoords?: RouteCoordinate[] | null;
}

export interface MotionEstimate {
  coordinate: RouteCoordinate;
  speedMps: number;
  isStationary: boolean;
  quality: GpsQuality;
  heading: number;
  headingConfidence: number; // 0..1
  timestamp?: number;
}

export interface RouteProgress {
  currentSegmentIndex: number;
  progressAlongSegment: number; // 0..1
  distanceAlongRoute: number; // metros desde el inicio de la ruta
  distanceFromRoute: number; // metros ortogonales
  isOffRoute: boolean;
  remainingDistance: number; // metros hasta el destino
  routeBearing: number; // rumbo del segmento actual [0, 360)
  lookAheadBearing: number; // rumbo ponderado en la ventana de anticipación
}

export interface TurnAnalysis {
  turnDetected: boolean;
  turnType: TurnType;
  deltaAngle: number; // en grados [-180, 180]
  distanceToTurn: number; // en metros
  timeToTurnSec: number; // en segundos según velocidad actual
  blendedHeading: number; // rumbo fusionado con anticipación
}

export interface SmartCameraTarget {
  center: RouteCoordinate;
  heading: number;
  pitch: number;
  zoom: number;
  altitude: number;
  duration: number;
  reason: string;
}

export interface NavigationEngineMetrics {
  samplesReceived: number;
  samplesAccepted: number;
  samplesRejected: number;
  cameraTargetsGenerated: number;
  cameraWrites: number;
  cameraSkips: number;
  teleportRejections: number;
  lastQuality: GpsQuality;
  lastReason: string;
}

export const SMART_NAV_CONSTANTS = {
  CANONICAL_PITCH: 40, // 40° para perspectiva vehicular óptima
  DEFAULT_ALTITUDE: 350,
  BASE_ZOOM: 18.0,
  MIN_ZOOM: 15.8,
  MAX_ZOOM: 18.2,
  STATIONARY_SPEED_THRESHOLD_MPS: 0.8, // < 2.88 km/h
  CITY_SPEED_THRESHOLD_MPS: 14.0, // ~50 km/h
  HIGHWAY_SPEED_THRESHOLD_MPS: 25.0, // ~90 km/h
  MAX_PHYSICAL_SPEED_MPS: 55.0, // 198 km/h (teleport cutoff)
  OFF_ROUTE_DISTANCE_THRESHOLD_METERS: 35.0,
  POSITION_DEADBAND_METERS: 2.0,
  HEADING_DEADBAND_DEGREES: 2.5,
  ZOOM_DEADBAND: 0.1,
  MIN_WRITE_INTERVAL_MS: 200,
  DEFAULT_ANIM_DURATION_MS: 500,
};
