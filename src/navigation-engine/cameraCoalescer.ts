import type { SmartCameraTarget } from './types';
import { SMART_NAV_CONSTANTS } from './types';
import { getDistanceMeters, shortestAngularDelta } from './geoMathCore';

export interface CameraWriteDecision {
  shouldWrite: boolean;
  reason: string;
  durationMs: number;
}

export class CameraCoalescer {
  private lastAppliedTarget: SmartCameraTarget | null = null;
  private lastWriteTime: number = 0;
  private pendingTarget: SmartCameraTarget | null = null;

  public evaluateWrite(
    target: SmartCameraTarget,
    now: number = Date.now(),
    force: boolean = false,
  ): CameraWriteDecision {
    if (force || !this.lastAppliedTarget) {
      this.lastAppliedTarget = target;
      this.lastWriteTime = now;
      this.pendingTarget = null;
      return {
        shouldWrite: true,
        reason: force ? 'FORCE_WRITE' : 'INITIAL_TARGET',
        durationMs: target.duration,
      };
    }

    const elapsedMs = now - this.lastWriteTime;
    const distanceDelta = getDistanceMeters(this.lastAppliedTarget.center, target.center);
    const headingDelta = Math.abs(shortestAngularDelta(this.lastAppliedTarget.heading, target.heading));
    const zoomDelta = Math.abs(this.lastAppliedTarget.zoom - target.zoom);

    // 1. Throttle / Coalescing por intervalo mínimo de escritura (200ms)
    if (elapsedMs < SMART_NAV_CONSTANTS.MIN_WRITE_INTERVAL_MS) {
      this.pendingTarget = target;
      return {
        shouldWrite: false,
        reason: 'THROTTLED_COALESCING',
        durationMs: 0,
      };
    }

    // 2. Deadband de posición, orientación y zoom para descartar micro-cambios imperceptibles
    const isSignificantPosition = distanceDelta >= SMART_NAV_CONSTANTS.POSITION_DEADBAND_METERS;
    const isSignificantHeading = headingDelta >= SMART_NAV_CONSTANTS.HEADING_DEADBAND_DEGREES;
    const isSignificantZoom = zoomDelta >= SMART_NAV_CONSTANTS.ZOOM_DEADBAND;

    if (!isSignificantPosition && !isSignificantHeading && !isSignificantZoom) {
      return {
        shouldWrite: false,
        reason: 'DEADBAND_SKIP',
        durationMs: 0,
      };
    }

    // 3. Duración de animación dinámica y proporcional al intervalo para suavidad continua
    const durationMs = Math.min(600, Math.max(300, elapsedMs * 0.95));

    this.lastAppliedTarget = { ...target, duration: durationMs };
    this.lastWriteTime = now;
    this.pendingTarget = null;

    let reason = 'DELTA_UPDATE';
    if (isSignificantHeading && isSignificantPosition) reason = 'POSITION_AND_HEADING_DELTA';
    else if (isSignificantHeading) reason = 'HEADING_DELTA';
    else if (isSignificantPosition) reason = 'POSITION_DELTA';
    else if (isSignificantZoom) reason = 'ZOOM_DELTA';

    return {
      shouldWrite: true,
      reason,
      durationMs,
    };
  }

  public getLastAppliedTarget(): SmartCameraTarget | null {
    return this.lastAppliedTarget;
  }

  public reset(): void {
    this.lastAppliedTarget = null;
    this.lastWriteTime = 0;
    this.pendingTarget = null;
  }
}
