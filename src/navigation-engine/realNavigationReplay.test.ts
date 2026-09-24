import { SmartNavigationEngine } from './SmartNavigationEngine';
import { NavigationFieldRecorder, type FieldSessionRecording } from './fieldRecorder';
import type { NavigationMotionSample } from './types';

describe('Real Navigation Replay & Field Recording Engine', () => {
  let engine: SmartNavigationEngine;
  let recorder: NavigationFieldRecorder;

  beforeEach(() => {
    engine = new SmartNavigationEngine();
    recorder = new NavigationFieldRecorder();
  });

  it('records a live driving session into structured JSON and imports it cleanly', () => {
    const sessionId = recorder.startRecording({
      platform: 'android',
      osVersion: '14.0',
      deviceModel: 'Pixel 7',
      mapProvider: 'google',
      screen: 'FocusModeProvider',
    });

    expect(sessionId).toBeDefined();
    expect(recorder.isCurrentlyRecording()).toBe(true);

    // Simulate 3 motion samples
    const s1: NavigationMotionSample = {
      coordinate: { latitude: -38.7350, longitude: -72.5900 },
      timestamp: 1000,
      speed: 0,
      heading: 90,
      accuracy: 5,
      source: 'LOCAL_GPS',
    };
    const t1 = engine.processMotionSample(s1);
    const d1 = engine.evaluateCameraWrite(t1!, 1000, true);
    recorder.recordSample(s1, null, null, null, t1, d1);

    // Add QA observation
    recorder.addQAObservation('SMOOTH', 'Initial fix locked on vehicle', 1050);

    const recording = recorder.stopRecording(2000);
    expect(recording).not.toBeNull();
    expect(recording!.samples.length).toBe(1);
    expect(recording!.qaObservations.length).toBe(1);
    expect(recording!.summary?.cameraWrites).toBe(1);

    // Export to JSON string
    const jsonOutput = recorder.exportSessionJson(recording!);
    expect(typeof jsonOutput).toBe('string');
    expect(jsonOutput).toContain('Pixel 7');

    // Import from JSON string
    const imported = recorder.importSessionJson(jsonOutput);
    expect(imported.metadata.sessionId).toBe(sessionId);
    expect(imported.samples[0].raw.latitude).toBe(-38.7350);
  });

  it('replays a recorded field session deterministically and asserts camera invariants', () => {
    // Synthetic recording fixture representing a field session
    const fieldFixture: FieldSessionRecording = {
      version: '1.0',
      metadata: {
        sessionId: 'field_test_temuco_01',
        platform: 'ios',
        osVersion: '17.4',
        deviceModel: 'iPhone 14 Pro',
        mapProvider: 'apple',
        screen: 'FocusModeProvider',
        startTime: 10000,
      },
      samples: [
        {
          timestamp: 10000,
          source: 'LOCAL_GPS',
          raw: { latitude: -38.73500, longitude: -72.59000, speed: 0, heading: 45, accuracy: 5 },
        },
        {
          timestamp: 11000,
          source: 'LOCAL_GPS',
          raw: { latitude: -38.73505, longitude: -72.58995, speed: 6.5, heading: 45, accuracy: 4 },
        },
        {
          timestamp: 12000,
          source: 'LOCAL_GPS',
          raw: { latitude: -38.73510, longitude: -72.58990, speed: 12.0, heading: 45, accuracy: 4 },
        },
      ],
      qaObservations: [
        { timestamp: 11000, tag: 'SMOOTH', notes: 'Smooth acceleration along road' },
      ],
    };

    // Replay runner
    const replayTargets = [];
    const replayWrites = [];

    for (const recordedSample of fieldFixture.samples) {
      const sample: NavigationMotionSample = {
        coordinate: { latitude: recordedSample.raw.latitude, longitude: recordedSample.raw.longitude },
        timestamp: recordedSample.timestamp,
        speed: recordedSample.raw.speed,
        heading: recordedSample.raw.heading,
        accuracy: recordedSample.raw.accuracy,
        source: recordedSample.source,
      };

      const target = engine.processMotionSample(sample);
      if (target) {
        replayTargets.push(target);
        const decision = engine.evaluateCameraWrite(target, recordedSample.timestamp);
        if (decision.shouldWrite) {
          replayWrites.push(decision);
        }
      }
    }

    expect(replayTargets.length).toBe(3);
    // Invariant: Pitch remains canonically 65° across all replayed samples
    replayTargets.forEach((t) => {
      expect(t.pitch).toBe(65);
      expect(t.heading).toBeCloseTo(45, 0);
    });
  });
});
