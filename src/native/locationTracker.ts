import { NativeModules, Platform } from 'react-native';

const { LocationTracker } = NativeModules;

export function isAndroid(): boolean {
  return Platform.OS === 'android';
}

export function startLocationTracking(): void {
  if (Platform.OS === 'android' && LocationTracker) {
    LocationTracker.startTracking();
  }
}

export function stopLocationTracking(): void {
  if (Platform.OS === 'android' && LocationTracker) {
    LocationTracker.stopTracking();
  }
}
