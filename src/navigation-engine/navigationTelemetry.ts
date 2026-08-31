import type {
  NavigationMotionSample,
  MotionEstimate,
  SmartCameraTarget,
  GpsQuality,
  TurnType,
  RouteProgress,
  TurnAnalysis,
} from './types';
import { shortestAngularDelta } from './geoMathCore';

export type NavigationEventName =
  | 'NAV:SESSION_START'
  | 'NAV:SESSION_END'
  | 'NAV:RAW_SAMPLE'
  | 'NAV:FILTERED_SAMPLE'
  | 'NAV:QUALITY'
  | 'NAV:SPEED'
  | 'NAV:HEADING'
  | 'NAV:HEADING_SOURCE'
  | 'NAV:ROUTE_PROGRESS'
  | 'NAV:OFF_ROUTE'
  | 'NAV:TURN_DETECTED'
  | 'NAV:TURN_BLEND'
  | 'NAV:LOOKAHEAD'
  | 'NAV:ZOOM'
  | 'NAV:CAMERA_TARGET'
  | 'NAV:CAMERA_WRITE'
  | 'NAV:CAMERA_SKIP'
  | 'NAV:USER_GESTURE'
  | 'NAV:RECENTER'
  | 'NAV:REROUTE'
  | 'NAV:REMOTE_SAMPLE'
  | 'NAV:REMOTE_STALE';

export interface TelemetrySampleLog {
  timestamp: number;
  source: 'LOCAL_GPS' | 'REMOTE_TRACKING';
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  rawHeading?: number | null;
  filteredHeading?: number;
  headingSource?: string;
  gpsQuality?: GpsQuality;
  routeSegment?: number;
  routeProgress?: number;
  distanceFromRoute?: number;
  turnType?: TurnType;
  distanceToTurn?: number;
  timeToTurn?: number;
  lookAheadMeters?: number;
  targetZoom?: number;
  targetPitch?: number;
  cameraWriteReason?: string;
}

export interface NavigationSessionSummary {
  sessionId: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  samplesReceived: number;
  samplesAccepted: number;
  samplesRejected: number;
  cameraTargetsGenerated: number;
  cameraWrites: number;
  cameraSkips: number;
  cameraWriteRatio: number; // cameraWrites / samplesAccepted
  averageCameraWritesPerSecond: number;
  teleportsRejected: number;
  gpsDistribution: {
    excellentPercent: number;
    goodPercent: number;
    degradedPercent: number;
    poorPercent: number;
    invalidPercent: number;
  };
  offRouteEvents: number;
  turnsDetected: number;
  headingStats: {
    averageHeadingDelta: number;
    maxHeadingDelta: number;
  };
  zoomStats: {
    minZoom: number;
    maxZoom: number;
    averageZoom: number;
  };
  userGestureOverrides: number;
  reroutes: number;
  visualSmoothnessScore: 'SMOOTH' | 'MINOR_JITTER' | 'VISIBLE_JITTER' | 'SNAP' | 'CAMERA_FIGHT';
}

export class NavigationTelemetryCollector {
  private sessionId: string = '';
  private startTime: number = 0;
  private isSessionActive: boolean = false;

  private samplesReceived: number = 0;
  private samplesAccepted: number = 0;
  private samplesRejected: number = 0;
  private cameraTargetsGenerated: number = 0;
  private cameraWrites: number = 0;
  private cameraSkips: number = 0;
  private teleportsRejected: number = 0;
  private offRouteEvents: number = 0;
  private turnsDetected: number = 0;
  private userGestureOverrides: number = 0;
  private reroutes: number = 0;

  private qualityCounts: Record<GpsQuality, number> = {
    EXCELLENT: 0,
    GOOD: 0,
    DEGRADED: 0,
    POOR: 0,
    INVALID: 0,
  };

  private headingDeltas: number[] = [];
  private zoomValues: number[] = [];
  private lastHeading: number | null = null;
  private maxHeadingDeltaObserved: number = 0;

  public startSession(customSessionId?: string, now: number = Date.now()): string {
    this.sessionId = customSessionId || `nav_${now}_${Math.random().toString(36).substring(2, 7)}`;
    this.startTime = now;
    this.isSessionActive = true;
    this.resetAccumulators();

    if (__DEV__) {
      console.log(`[NAV:SESSION_START] sessionId=${this.sessionId} startTs=${this.startTime}`);
    }
    return this.sessionId;
  }

  public recordRawSample(sample: NavigationMotionSample): void {
    if (!this.isSessionActive) return;
    this.samplesReceived++;
  }

  public recordFilteredSample(
    estimate: MotionEstimate,
    routeProgress: RouteProgress | null,
    turnAnalysis: TurnAnalysis | null,
    lookAheadMeters: number,
  ): void {
    if (!this.isSessionActive) return;
    this.samplesAccepted++;
    this.qualityCounts[estimate.quality]++;

    if (routeProgress?.isOffRoute) {
      this.offRouteEvents++;
    }

    if (turnAnalysis?.turnDetected && turnAnalysis.turnType !== 'STRAIGHT') {
      this.turnsDetected++;
    }

    if (this.lastHeading != null) {
      const signedDelta = shortestAngularDelta(this.lastHeading, estimate.heading);
      const absDelta = Math.abs(signedDelta);
      this.headingDeltas.push(signedDelta);
      if (absDelta > this.maxHeadingDeltaObserved) {
        this.maxHeadingDeltaObserved = absDelta;
      }
    }
    this.lastHeading = estimate.heading;
  }

  public recordSampleRejected(reason: string): void {
    if (!this.isSessionActive) return;
    this.samplesRejected++;
    if (reason.includes('TELEPORT')) {
      this.teleportsRejected++;
    }
  }

  public recordCameraTarget(target: SmartCameraTarget): void {
    if (!this.isSessionActive) return;
    this.cameraTargetsGenerated++;
    this.zoomValues.push(target.zoom);
  }

  public recordCameraWrite(reason: string, durationMs: number): void {
    if (!this.isSessionActive) return;
    this.cameraWrites++;
    if (__DEV__) {
      console.log(`[NAV:CAMERA_WRITE] reason=${reason} duration=${durationMs}ms totalWrites=${this.cameraWrites}`);
    }
  }

  public recordCameraSkip(reason: string): void {
    if (!this.isSessionActive) return;
    this.cameraSkips++;
  }

  public recordUserGesture(): void {
    if (!this.isSessionActive) return;
    this.userGestureOverrides++;
    if (__DEV__) {
      console.log(`[NAV:USER_GESTURE] sessionId=${this.sessionId} action=SUSPEND_NAVIGATION`);
    }
  }

  public recordReroute(): void {
    if (!this.isSessionActive) return;
    this.reroutes++;
    if (__DEV__) {
      console.log(`[NAV:REROUTE] sessionId=${this.sessionId} totalReroutes=${this.reroutes}`);
    }
  }

  public endSession(now: number = Date.now()): NavigationSessionSummary {
    const endTime = now;
    const durationSeconds = Math.max(0.1, (endTime - this.startTime) / 1000);
    const totalQuality = Math.max(1, this.samplesAccepted);

    const totalDeltas = this.headingDeltas.length;
    const avgHeadingDelta = totalDeltas > 0
      ? this.headingDeltas.reduce((acc, d) => acc + Math.abs(d), 0) / totalDeltas
      : 0;

    const minZoom = this.zoomValues.length > 0 ? Math.min(...this.zoomValues) : 18.0;
    const maxZoom = this.zoomValues.length > 0 ? Math.max(...this.zoomValues) : 18.0;
    const avgZoom = this.zoomValues.length > 0
      ? this.zoomValues.reduce((acc, z) => acc + z, 0) / this.zoomValues.length
      : 18.0;

    const cameraWriteRatio = this.samplesAccepted > 0 ? this.cameraWrites / this.samplesAccepted : 0;
    const avgWritesPerSec = this.cameraWrites / durationSeconds;

    // Clasificación determinista de suavidad visual basada en oscilaciones y telemetría
    let signFlips = 0;
    for (let i = 1; i < this.headingDeltas.length; i++) {
      // detecta jitter oscilatorio (cambio alternante de signo en la corrección)
      if (this.headingDeltas[i] * this.headingDeltas[i - 1] < 0 && Math.abs(this.headingDeltas[i]) > 3.0) {
        signFlips++;
      }
    }

    let visualSmoothnessScore: NavigationSessionSummary['visualSmoothnessScore'] = 'SMOOTH';
    if (this.maxHeadingDeltaObserved > 90 && this.samplesAccepted > 10) {
      visualSmoothnessScore = 'SNAP';
    } else if (this.userGestureOverrides > 5 && avgWritesPerSec > 6) {
      visualSmoothnessScore = 'CAMERA_FIGHT';
    } else if (signFlips > 10 && avgHeadingDelta > 15) {
      visualSmoothnessScore = 'VISIBLE_JITTER';
    } else if (signFlips > 5 && avgHeadingDelta > 8) {
      visualSmoothnessScore = 'MINOR_JITTER';
    }

    const summary: NavigationSessionSummary = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      durationSeconds,
      samplesReceived: this.samplesReceived,
      samplesAccepted: this.samplesAccepted,
      samplesRejected: this.samplesRejected,
      cameraTargetsGenerated: this.cameraTargetsGenerated,
      cameraWrites: this.cameraWrites,
      cameraSkips: this.cameraSkips,
      cameraWriteRatio,
      averageCameraWritesPerSecond: avgWritesPerSec,
      teleportsRejected: this.teleportsRejected,
      gpsDistribution: {
        excellentPercent: (this.qualityCounts.EXCELLENT / totalQuality) * 100,
        goodPercent: (this.qualityCounts.GOOD / totalQuality) * 100,
        degradedPercent: (this.qualityCounts.DEGRADED / totalQuality) * 100,
        poorPercent: (this.qualityCounts.POOR / totalQuality) * 100,
        invalidPercent: (this.qualityCounts.INVALID / totalQuality) * 100,
      },
      offRouteEvents: this.offRouteEvents,
      turnsDetected: this.turnsDetected,
      headingStats: {
        averageHeadingDelta: avgHeadingDelta,
        maxHeadingDelta: this.maxHeadingDeltaObserved,
      },
      zoomStats: {
        minZoom,
        maxZoom,
        averageZoom: avgZoom,
      },
      userGestureOverrides: this.userGestureOverrides,
      reroutes: this.reroutes,
      visualSmoothnessScore,
    };

    if (__DEV__) {
      console.log(`[NAV:SESSION_END] sessionId=${this.sessionId} duration=${durationSeconds.toFixed(1)}s writes=${summary.cameraWrites} ratio=${summary.cameraWriteRatio.toFixed(2)} smoothness=${summary.visualSmoothnessScore}`);
    }

    this.isSessionActive = false;
    return summary;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public isActive(): boolean {
    return this.isSessionActive;
  }

  private resetAccumulators(): void {
    this.samplesReceived = 0;
    this.samplesAccepted = 0;
    this.samplesRejected = 0;
    this.cameraTargetsGenerated = 0;
    this.cameraWrites = 0;
    this.cameraSkips = 0;
    this.teleportsRejected = 0;
    this.offRouteEvents = 0;
    this.turnsDetected = 0;
    this.userGestureOverrides = 0;
    this.reroutes = 0;
    this.qualityCounts = {
      EXCELLENT: 0,
      GOOD: 0,
      DEGRADED: 0,
      POOR: 0,
      INVALID: 0,
    };
    this.headingDeltas = [];
    this.zoomValues = [];
    this.lastHeading = null;
    this.maxHeadingDeltaObserved = 0;
  }
}

export const navigationTelemetry = new NavigationTelemetryCollector();
