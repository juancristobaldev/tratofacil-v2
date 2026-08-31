import type {
  NavigationMotionSample,
  MotionEstimate,
  SmartCameraTarget,
  GpsQuality,
  TurnType,
  RouteProgress,
  TurnAnalysis,
} from './types';
import type { RouteCoordinate } from '../utils/directions';
import type { CameraWriteDecision } from './cameraCoalescer';

export type QAObservationTag =
  | 'SMOOTH'
  | 'MINOR_JITTER'
  | 'VISIBLE_JITTER'
  | 'SNAP'
  | 'LATE_TURN'
  | 'EARLY_TURN'
  | 'CAMERA_FIGHT'
  | 'WRONG_ROUTE_ORIENTATION'
  | 'ZOOM_PUMPING'
  | 'FREEZE_STUCK'
  | 'RECENTER_GLITCH';

export interface QAObservation {
  timestamp: number;
  tag: QAObservationTag;
  notes?: string;
}

export interface FieldRecordedSample {
  timestamp: number;
  source: 'LOCAL_GPS' | 'REMOTE_TRACKING';
  raw: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
    altitude?: number | null;
  };
  filtered?: {
    latitude: number;
    longitude: number;
    gpsQuality: GpsQuality;
    isStationary: boolean;
    accepted: boolean;
    reason?: string;
    speedMps: number;
  };
  heading?: {
    rawHeading?: number | null;
    targetHeading: number;
    headingSource: string;
    angularDelta?: number;
  };
  route?: {
    segmentIndex: number;
    distanceFromRoute: number;
    progressAlongSegment: number;
    isOffRoute: boolean;
    turnType?: TurnType;
    distanceToTurn?: number;
    timeToTurn?: number;
    routeBearing?: number;
  };
  camera?: {
    center: RouteCoordinate;
    heading: number;
    pitch: number;
    zoom: number;
    altitude: number;
    duration: number;
    action: 'APPLY' | 'SKIP';
    decisionReason: string;
  };
  remote?: {
    providerTimestamp?: number;
    clientReceiveTimestamp: number;
    remoteDistanceDelta?: number;
    inferredHeading?: number;
    staleAgeMs?: number;
  };
}

export interface FieldSessionMetadata {
  sessionId: string;
  platform: 'android' | 'ios' | 'unknown';
  osVersion?: string;
  deviceModel?: string;
  mapProvider?: 'google' | 'apple' | 'unknown';
  appVersion?: string;
  screen?: 'HomePage' | 'FocusModeProvider' | 'FocusModeClient' | 'Unknown';
  startTime: number;
  endTime?: number;
  initialRoute?: RouteCoordinate[] | null;
}

export interface FieldSessionRecording {
  version: '1.0';
  metadata: FieldSessionMetadata;
  samples: FieldRecordedSample[];
  qaObservations: QAObservation[];
  summary?: {
    totalSamples: number;
    acceptedSamples: number;
    rejectedSamples: number;
    cameraWrites: number;
    cameraSkips: number;
    durationSeconds: number;
  };
}

export class NavigationFieldRecorder {
  private isRecording: boolean = false;
  private currentSession: FieldSessionRecording | null = null;
  private maxSamplesLimit: number = 5000;

  public startRecording(
    metadata: Partial<FieldSessionMetadata> = {},
    initialRoute?: RouteCoordinate[] | null,
    now: number = Date.now(),
  ): string {
    const sessionId = metadata.sessionId || `nav_field_${now}_${Math.random().toString(36).substring(2, 7)}`;
    
    this.currentSession = {
      version: '1.0',
      metadata: {
        sessionId,
        platform: metadata.platform || 'unknown',
        osVersion: metadata.osVersion,
        deviceModel: metadata.deviceModel,
        mapProvider: metadata.mapProvider || 'unknown',
        appVersion: metadata.appVersion || '2.0.0',
        screen: metadata.screen || 'Unknown',
        startTime: now,
        initialRoute: initialRoute || null,
      },
      samples: [],
      qaObservations: [],
    };

    this.isRecording = true;
    if (__DEV__) {
      console.log(`[RECORDER:START] sessionId=${sessionId} platform=${this.currentSession.metadata.platform}`);
    }
    return sessionId;
  }

  public recordSample(
    rawSample: NavigationMotionSample,
    estimate: MotionEstimate | null,
    routeProgress: RouteProgress | null,
    turnAnalysis: TurnAnalysis | null,
    target: SmartCameraTarget | null,
    decision: CameraWriteDecision | null,
    filterAccepted: boolean = true,
    filterReason: string = 'ACCEPTED',
    remoteMetadata?: { providerTimestamp?: number; staleAgeMs?: number },
  ): void {
    if (!this.isRecording || !this.currentSession) return;
    if (this.currentSession.samples.length >= this.maxSamplesLimit) return;

    const entry: FieldRecordedSample = {
      timestamp: rawSample.timestamp,
      source: rawSample.source,
      raw: {
        latitude: rawSample.coordinate.latitude,
        longitude: rawSample.coordinate.longitude,
        accuracy: rawSample.accuracy,
        speed: rawSample.speed,
        heading: rawSample.heading,
      },
    };

    if (estimate) {
      entry.filtered = {
        latitude: estimate.coordinate.latitude,
        longitude: estimate.coordinate.longitude,
        gpsQuality: estimate.quality,
        isStationary: estimate.isStationary,
        accepted: filterAccepted,
        reason: filterReason,
        speedMps: estimate.speedMps,
      };
    }

    if (target) {
      entry.heading = {
        rawHeading: rawSample.heading,
        targetHeading: target.heading,
        headingSource: target.reason,
      };
    }

    if (routeProgress) {
      entry.route = {
        segmentIndex: routeProgress.currentSegmentIndex,
        distanceFromRoute: routeProgress.distanceFromRoute,
        progressAlongSegment: routeProgress.progressAlongSegment,
        isOffRoute: routeProgress.isOffRoute,
        turnType: turnAnalysis?.turnType,
        distanceToTurn: turnAnalysis?.distanceToTurn,
        timeToTurn: turnAnalysis?.timeToTurnSec,
        routeBearing: routeProgress.routeBearing,
      };
    }

    if (target && decision) {
      entry.camera = {
        center: target.center,
        heading: target.heading,
        pitch: target.pitch,
        zoom: target.zoom,
        altitude: target.altitude,
        duration: decision.durationMs,
        action: decision.shouldWrite ? 'APPLY' : 'SKIP',
        decisionReason: decision.reason,
      };
    }

    if (rawSample.source === 'REMOTE_TRACKING') {
      entry.remote = {
        providerTimestamp: remoteMetadata?.providerTimestamp,
        clientReceiveTimestamp: rawSample.timestamp,
        staleAgeMs: remoteMetadata?.staleAgeMs,
      };
    }

    this.currentSession.samples.push(entry);
  }

  public addQAObservation(tag: QAObservationTag, notes?: string, timestamp: number = Date.now()): void {
    if (!this.isRecording || !this.currentSession) return;
    this.currentSession.qaObservations.push({ timestamp, tag, notes });
    if (__DEV__) {
      console.log(`[RECORDER:QA_OBSERVATION] tag=${tag} notes=${notes || ''}`);
    }
  }

  public stopRecording(now: number = Date.now()): FieldSessionRecording | null {
    if (!this.isRecording || !this.currentSession) return null;

    this.currentSession.metadata.endTime = now;
    const durationSeconds = Math.max(0.1, (now - this.currentSession.metadata.startTime) / 1000);

    const totalSamples = this.currentSession.samples.length;
    const acceptedSamples = this.currentSession.samples.filter(s => s.filtered?.accepted !== false).length;
    const rejectedSamples = totalSamples - acceptedSamples;
    const cameraWrites = this.currentSession.samples.filter(s => s.camera?.action === 'APPLY').length;
    const cameraSkips = this.currentSession.samples.filter(s => s.camera?.action === 'SKIP').length;

    this.currentSession.summary = {
      totalSamples,
      acceptedSamples,
      rejectedSamples,
      cameraWrites,
      cameraSkips,
      durationSeconds,
    };

    const finished = this.currentSession;
    this.isRecording = false;
    this.currentSession = null;

    if (__DEV__) {
      console.log(`[RECORDER:STOP] sessionId=${finished.metadata.sessionId} duration=${durationSeconds.toFixed(1)}s writes=${cameraWrites}`);
    }
    return finished;
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public exportSessionJson(recording: FieldSessionRecording): string {
    return JSON.stringify(recording, null, 2);
  }

  public importSessionJson(jsonString: string): FieldSessionRecording {
    return JSON.parse(jsonString) as FieldSessionRecording;
  }
}

export const navigationFieldRecorder = new NavigationFieldRecorder();
