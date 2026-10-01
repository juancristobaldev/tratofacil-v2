import type { GeoPosition } from 'react-native-geolocation-service';
import type { GeoPoint } from './geoMath';
import { MovementController, type MovementUpdatePayload } from './movementController';
import { isDevJoystickEnabled, getDevJoystickConfig } from './devFlags';

type LocationSimulatorListener = (position: GeoPosition | null) => void;

class LocationSimulator {
  private isSimulated = false;
  private movementController: MovementController;
  private currentSimulatedPosition: GeoPosition | null = null;
  private realPosition: GeoPosition | null = null;
  private listeners: Set<LocationSimulatorListener> = new Set();

  constructor() {
    // Coordenada por defecto (Santiago Centro) si no hay GPS disponible inicialmente
    const defaultPos: GeoPoint = { latitude: -33.4489, longitude: -70.6693 };
    this.movementController = new MovementController(defaultPos);

    this.movementController.subscribe((payload: MovementUpdatePayload) => {
      if (!this.isSimulated) return;

      const simGeoPos: GeoPosition = {
        coords: {
          latitude: payload.position.latitude,
          longitude: payload.position.longitude,
          altitude: 570,
          accuracy: 5,
          altitudeAccuracy: 3,
          heading: payload.heading,
          speed: (payload.speedKmh * 1000) / 3600,
        },
        timestamp: Date.now(),
      };

      this.currentSimulatedPosition = simGeoPos;
      this.notifyListeners(simGeoPos);
    });
  }

  public isSimulating(): boolean {
    if (!isDevJoystickEnabled()) return false;
    return this.isSimulated;
  }

  public getMovementController(): MovementController {
    return this.movementController;
  }

  public setRealPosition(realPos: GeoPosition | null): void {
    this.realPosition = realPos;
    if (!this.isSimulated && realPos?.coords) {
      this.movementController.setPosition({
        latitude: realPos.coords.latitude,
        longitude: realPos.coords.longitude,
      });
    }
  }

  public enableSimulation(customStart?: GeoPoint): void {
    if (!isDevJoystickEnabled()) return;

    this.isSimulated = true;
    const startCoord =
      customStart ||
      (this.realPosition?.coords
        ? { latitude: this.realPosition.coords.latitude, longitude: this.realPosition.coords.longitude }
        : this.movementController.getPosition());

    this.movementController.setPosition(startCoord);

    const initialSimPos: GeoPosition = {
      coords: {
        latitude: startCoord.latitude,
        longitude: startCoord.longitude,
        altitude: 570,
        accuracy: 5,
        altitudeAccuracy: 3,
        heading: this.movementController.getHeading(),
        speed: 0,
      },
      timestamp: Date.now(),
    };

    this.currentSimulatedPosition = initialSimPos;
    this.notifyListeners(initialSimPos);
  }

  public disableSimulation(): void {
    this.isSimulated = false;
    this.currentSimulatedPosition = null;
    this.movementController.releaseStick();
    // Notificar con la posición real recuperada
    this.notifyListeners(this.realPosition);
  }

  public subscribe(listener: LocationSimulatorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setRouteCoords(coords: GeoPoint[] | null | undefined): void {
    this.movementController.setRouteCoords(coords);
  }

  public hasActiveRoute(): boolean {
    return this.movementController.hasRoute();
  }

  public isAutoNavigating(): boolean {
    return getDevJoystickConfig().autoNav;
  }

  public startAutoNav(): boolean {
    if (!this.movementController.hasRoute()) return false;
    if (!this.isSimulated) {
      this.enableSimulation();
    }
    return this.movementController.startAutoNav();
  }

  public stopAutoNav(): void {
    this.movementController.stopAutoNav();
  }

  public toggleAutoNav(): boolean {
    if (this.isAutoNavigating()) {
      this.stopAutoNav();
      return false;
    } else {
      return this.startAutoNav();
    }
  }

  public getCurrentPosition(): GeoPosition | null {
    if (this.isSimulated && this.currentSimulatedPosition) {
      return this.currentSimulatedPosition;
    }
    return this.realPosition;
  }

  private notifyListeners(pos: GeoPosition | null): void {
    for (const listener of this.listeners) {
      listener(pos);
    }
  }
}

export const locationSimulator = new LocationSimulator();
