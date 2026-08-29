import { locationSimulator } from './locationSimulator';
import type { GeoPosition } from 'react-native-geolocation-service';

describe('locationSimulator', () => {
  const mockRealPos: GeoPosition = {
    coords: {
      latitude: -33.4489,
      longitude: -70.6693,
      altitude: 570,
      accuracy: 10,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  };

  afterEach(() => {
    locationSimulator.disableSimulation();
  });

  it('starts with simulation disabled', () => {
    expect(locationSimulator.isSimulating()).toBe(false);
  });

  it('enables simulation and notifies subscribers with simulated coordinates', () => {
    const subscriber = jest.fn();
    const unsubscribe = locationSimulator.subscribe(subscriber);

    locationSimulator.setRealPosition(mockRealPos);
    locationSimulator.enableSimulation();

    expect(locationSimulator.isSimulating()).toBe(true);
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        coords: expect.objectContaining({
          latitude: mockRealPos.coords.latitude,
          longitude: mockRealPos.coords.longitude,
          accuracy: 5,
        }),
      }),
    );

    unsubscribe();
  });

  it('disables simulation and restores real GPS', () => {
    locationSimulator.setRealPosition(mockRealPos);
    locationSimulator.enableSimulation();
    expect(locationSimulator.isSimulating()).toBe(true);

    locationSimulator.disableSimulation();
    expect(locationSimulator.isSimulating()).toBe(false);
    expect(locationSimulator.getCurrentPosition()).toBe(mockRealPos);
  });
});
