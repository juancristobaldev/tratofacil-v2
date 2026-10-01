import type { GeoPoint } from './geoMath';
import { StreetEngine, type StreetEngineStepResult } from './streetEngine';
import { PolylineNavigator, type PolylineStepResult } from './polylineNavigator';
import { getDevJoystickConfig, setDevJoystickConfig } from './devFlags';

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
  routeProgress?: {
    fraction: number;
    remainingMeters: number;
    isArrived: boolean;
  };
}

export type MovementListener = (payload: MovementUpdatePayload) => void;

export class MovementController {
  private streetEngine: StreetEngine;
  private polylineNavigator: PolylineNavigator;
  private currentPosition: GeoPoint;
  private currentSpeedMps = 0;
  private currentHeading = 0;
  private isMoving = false;
  private rafId: number | null = null;
  private lastTimestamp: number = 0;
  private listeners: Set<MovementListener> = new Set();
  private currentVector: JoystickVector = { x: 0, y: 0, magnitude: 0, angle: 0 };

  constructor(
    initialPosition: GeoPoint,
    streetEngine?: StreetEngine,
    polylineNavigator?: PolylineNavigator,
  ) {
    this.currentPosition = { ...initialPosition };
    this.streetEngine = streetEngine || new StreetEngine();
    this.polylineNavigator = polylineNavigator || new PolylineNavigator();
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

  public getPolylineNavigator(): PolylineNavigator {
    return this.polylineNavigator;
  }

  /**
   * Carga una polyline de ruta activa en el navegador.
   * Proyecta la posición actual al tramo más cercano.
   */
  public setRouteCoords(coords: GeoPoint[] | null | undefined): void {
    if (!coords || coords.length < 2) {
      this.polylineNavigator.clearRoute();
      return;
    }

    this.polylineNavigator.setRoute(coords, this.currentPosition);
    if (this.polylineNavigator.hasRoute()) {
      const sample = this.polylineNavigator.getCurrentSample();
      this.currentPosition = sample.nextPosition;
      this.currentHeading = sample.heading;
      this.emitUpdate(true, false);
    }
  }

  public hasRoute(): boolean {
    return this.polylineNavigator.hasRoute();
  }

  /**
   * Inicia el modo de piloto automático a lo largo de la polyline.
   */
  public startAutoNav(): boolean {
    if (!this.polylineNavigator.hasRoute()) return false;

    // Si ya estamos en el destino, reiniciar desde el origen para repetir la simulación
    if (this.polylineNavigator.getRemainingDistance() < 5) {
      this.polylineNavigator.resetToStart();
      const sample = this.polylineNavigator.getCurrentSample();
      this.currentPosition = sample.nextPosition;
      this.currentHeading = sample.heading;
    }

    setDevJoystickConfig({ autoNav: true });
    this.startLoop();
    return true;
  }

  public stopAutoNav(): void {
    setDevJoystickConfig({ autoNav: false });
    if (this.currentVector.magnitude === 0) {
      this.stopLoop();
    }
  }

  public subscribe(listener: MovementListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitUpdate(isSnapped: boolean, moving: boolean): void {
    let routeProgress: MovementUpdatePayload['routeProgress'] | undefined;
    if (this.polylineNavigator.hasRoute()) {
      routeProgress = {
        fraction: this.polylineNavigator.getProgressFraction(),
        remainingMeters: this.polylineNavigator.getRemainingDistance(),
        isArrived: this.polylineNavigator.getRemainingDistance() <= 0.5,
      };
    }

    const payload: MovementUpdatePayload = {
      position: { ...this.currentPosition },
      heading: this.currentHeading,
      speedKmh: Math.abs(this.getSpeedKmh()),
      isSnapped,
      isMoving: moving,
      routeProgress,
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
      // Si el usuario toca el stick mientras autoNav está activo, pausar autoNav para control manual
      if (config.autoNav) {
        setDevJoystickConfig({ autoNav: false });
      }

      if (!this.isMoving) {
        this.startLoop();
      }
    }
  }

  public releaseStick(): void {
    this.currentVector = { x: 0, y: 0, magnitude: 0, angle: this.currentHeading };
  }

  public startLoop(): void {
    if (this.isMoving) return;
    this.isMoving = true;
    this.lastTimestamp = Date.now();
    this.tick();
  }

  public stopLoop(): void {
    this.isMoving = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.currentSpeedMps = 0;
    this.emitUpdate(this.polylineNavigator.hasRoute(), false);
  }

  private tick = (): void => {
    if (!this.isMoving) return;

    const now = Date.now();
    const dtSeconds = Math.min(0.1, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;

    const config = getDevJoystickConfig();
    const maxSpeedMps = (config.speedKmh * 1000) / 3600;

    // =========================================================================
    // CASO 1: SEGUIMIENTO ESTRICTO POR POLYLINE DE RUTA (Regla de Oro)
    // =========================================================================
    if (config.routeSnapMode && this.polylineNavigator.hasRoute()) {
      let targetSpeedMps = 0;
      let isActivelyDriving = false;

      if (config.autoNav) {
        // Piloto automático: avanza al 100% de la velocidad máxima seleccionada
        targetSpeedMps = maxSpeedMps;
        isActivelyDriving = true;
      } else {
        // Control manual con stick:
        // En JoystickVector: y < 0 es arriba (adelante), y > 0 es abajo (atrás)
        const forwardRatio = -this.currentVector.y;
        if (this.currentVector.magnitude > 0 && Math.abs(forwardRatio) > 0.05) {
          targetSpeedMps = Math.sign(forwardRatio) * this.currentVector.magnitude * maxSpeedMps;
          isActivelyDriving = true;
        } else {
          targetSpeedMps = 0;
          isActivelyDriving = false;
        }
      }

      // Aceleración y frenado ágil
      const accelRate = isActivelyDriving ? 9.0 : 14.0;
      this.currentSpeedMps +=
        (targetSpeedMps - this.currentSpeedMps) * Math.min(1, dtSeconds * accelRate);

      if (Math.abs(this.currentSpeedMps) < 0.05 && !isActivelyDriving) {
        this.stopLoop();
        return;
      }

      const distanceDelta = this.currentSpeedMps * dtSeconds;
      const stepResult: PolylineStepResult = this.polylineNavigator.step(distanceDelta);

      this.currentPosition = stepResult.nextPosition;
      this.currentHeading = stepResult.heading;

      this.emitUpdate(true, true);

      // Si se alcanzó el destino final
      if (stepResult.isArrived && this.currentSpeedMps > 0) {
        if (config.autoNav) {
          setDevJoystickConfig({ autoNav: false });
        }
        this.stopLoop();
        return;
      }

      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    // =========================================================================
    // CASO 2: MODO LIBRE / STREET SNAPPING (Sin polyline activa)
    // =========================================================================
    const targetSpeedMps = this.currentVector.magnitude * maxSpeedMps;

    const accelRate = this.currentVector.magnitude > 0 ? 8.0 : 12.0;
    this.currentSpeedMps +=
      (targetSpeedMps - this.currentSpeedMps) * Math.min(1, dtSeconds * accelRate);

    if (this.currentSpeedMps < 0.05 && this.currentVector.magnitude === 0) {
      this.stopLoop();
      return;
    }

    const distanceMeters = this.currentSpeedMps * dtSeconds;
    const joystickBearing = this.currentVector.angle;

    // Ejecutar paso en StreetEngine
    const stepResult: StreetEngineStepResult = this.streetEngine.stepMovement(
      this.currentPosition,
      joystickBearing,
      distanceMeters,
      config.streetSnapMode,
    );

    this.currentPosition = stepResult.nextPosition;
    this.currentHeading = stepResult.heading;

    this.emitUpdate(stepResult.isSnapped, true);

    // Pre-fetch en segundo plano de calles si nos movemos
    if (config.streetSnapMode) {
      this.streetEngine.prefetchLocalRoads(this.currentPosition);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
