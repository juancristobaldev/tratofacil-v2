import type { GeoPoint } from './geoMath';
import { StreetEngine, type StreetEngineStepResult } from './streetEngine';
import { getDevJoystickConfig } from './devFlags';

export interface JoystickVector {
  x: number; // [-1, 1]
  y: number; // [-1, 1] (y negativo es hacia arriba / Norte)
  magnitude: number; // [0, 1]
  angle: number; // [0, 360) rumbo en grados (0° Norte, 90° Este, 180° Sur, 270° Oeste)
}

export interface MovementUpdatePayload {
  position: GeoPoint;
  heading: number;
  speedKmh: number;
  isSnapped: boolean;
  isMoving: boolean;
}

export type MovementListener = (payload: MovementUpdatePayload) => void;

export class MovementController {
  private streetEngine: StreetEngine;
  private currentPosition: GeoPoint;
  private currentSpeedMps = 0;
  private currentHeading = 0;
  private isMoving = false;
  private rafId: number | null = null;
  private lastTimestamp: number = 0;
  private listeners: Set<MovementListener> = new Set();
  private currentVector: JoystickVector = { x: 0, y: 0, magnitude: 0, angle: 0 };

  constructor(initialPosition: GeoPoint, streetEngine?: StreetEngine) {
    this.currentPosition = { ...initialPosition };
    this.streetEngine = streetEngine || new StreetEngine();
  }

  public setPosition(pos: GeoPoint): void {
    this.currentPosition = { ...pos };
    this.emitUpdate(false, false);
  }

  public getPosition(): GeoPoint {
    return { ...this.currentPosition };
  }

  public getHeading(): number {
    return this.currentHeading;
  }

  public getSpeedKmh(): number {
    return (this.currentSpeedMps * 3600) / 1000;
  }

  public getStreetEngine(): StreetEngine {
    return this.streetEngine;
  }

  public subscribe(listener: MovementListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitUpdate(isSnapped: boolean, moving: boolean): void {
    const payload: MovementUpdatePayload = {
      position: { ...this.currentPosition },
      heading: this.currentHeading,
      speedKmh: this.getSpeedKmh(),
      isSnapped,
      isMoving: moving,
    };
    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  /**
   * Actualiza el vector del joystick proveniente del Gesture Handler.
   */
  public updateVector(vector: JoystickVector): void {
    const config = getDevJoystickConfig();
    const effectiveMagnitude = vector.magnitude < config.deadZone ? 0 : vector.magnitude;

    this.currentVector = {
      ...vector,
      magnitude: effectiveMagnitude,
    };

    if (effectiveMagnitude > 0) {
      if (!this.isMoving) {
        this.startLoop();
      }
    }
  }

  public releaseStick(): void {
    this.currentVector = { x: 0, y: 0, magnitude: 0, angle: this.currentHeading };
  }

  private startLoop(): void {
    if (this.isMoving) return;
    this.isMoving = true;
    this.lastTimestamp = Date.now();
    this.tick();
  }

  private stopLoop(): void {
    this.isMoving = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.currentSpeedMps = 0;
    this.emitUpdate(false, false);
  }

  private tick = (): void => {
    if (!this.isMoving) return;

    const now = Date.now();
    const dtSeconds = Math.min(0.1, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;

    const config = getDevJoystickConfig();
    const maxSpeedMps = (config.speedKmh * 1000) / 3600;
    const targetSpeedMps = this.currentVector.magnitude * maxSpeedMps;

    // Aceleración y desaceleración suave (lerp)
    const accelRate = this.currentVector.magnitude > 0 ? 6.0 : 10.0;
    this.currentSpeedMps += (targetSpeedMps - this.currentSpeedMps) * Math.min(1, dtSeconds * accelRate);

    if (this.currentSpeedMps < 0.05 && this.currentVector.magnitude === 0) {
      this.stopLoop();
      return;
    }

    const distanceMeters = this.currentSpeedMps * dtSeconds;
    const joystickBearing = this.currentVector.angle;

    // Ejecutar paso de simulación en StreetEngine
    const stepResult: StreetEngineStepResult = this.streetEngine.stepMovement(
      this.currentPosition,
      joystickBearing,
      distanceMeters,
      config.streetSnapMode,
    );

    this.currentPosition = stepResult.nextPosition;
    this.currentHeading = stepResult.heading;

    this.emitUpdate(stepResult.isSnapped, true);

    // Pre-fetch asíncrono de calles en segundo plano si nos movemos
    if (config.streetSnapMode) {
      this.streetEngine.prefetchLocalRoads(this.currentPosition);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
