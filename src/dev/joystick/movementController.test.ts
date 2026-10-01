import { MovementController, type JoystickVector } from './movementController';
import { StreetEngine } from './streetEngine';
import { setDevJoystickConfig, resetDevJoystickConfig } from './devFlags';

describe('MovementController', () => {
  let controller: MovementController;
  const initialPos = { latitude: -33.4489, longitude: -70.6693 };

  beforeEach(() => {
    resetDevJoystickConfig();
    controller = new MovementController(initialPos, new StreetEngine());
  });

  it('initializes with given position and zero speed', () => {
    expect(controller.getPosition()).toEqual(initialPos);
    expect(controller.getSpeedKmh()).toBe(0);
  });

  it('filters input within deadzone', () => {
    const deadzoneVector: JoystickVector = {
      x: 0.02,
      y: -0.02,
      magnitude: 0.03, // menor a deadZone (0.08)
      angle: 45,
    };

    controller.updateVector(deadzoneVector);
    expect(controller.getSpeedKmh()).toBe(0);
  });

  it('updates position and notifies subscribers on manual setPosition', () => {
    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);

    const newPos = { latitude: -33.4500, longitude: -70.6700 };
    controller.setPosition(newPos);

    expect(controller.getPosition()).toEqual(newPos);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        position: newPos,
        isMoving: false,
      }),
    );

    unsubscribe();
  });

  describe('Polyline following & Auto-Nav', () => {
    const route = [
      { latitude: -33.4489, longitude: -70.6693 }, // Inicio
      { latitude: -33.4489, longitude: -70.6593 }, // Este
      { latitude: -33.4389, longitude: -70.6593 }, // Norte
    ];

    it('loads route polyline and detects active route', () => {
      controller.setRouteCoords(route);
      expect(controller.hasRoute()).toBe(true);
      expect(controller.getPolylineNavigator().getPointCount()).toBe(3);
    });

    it('advances forward along polyline when stick is pushed forward (y < 0)', () => {
      jest.useFakeTimers();
      controller.setRouteCoords(route);
      const startPos = controller.getPosition();

      // Stick empujado hacia adelante (arriba en la pantalla, y = -1)
      const forwardStick: JoystickVector = {
        x: 0,
        y: -1,
        magnitude: 1,
        angle: 0,
      };

      controller.updateVector(forwardStick);

      // Simular 500ms de movimiento
      jest.advanceTimersByTime(500);

      const movedPos = controller.getPosition();
      expect(movedPos.longitude).toBeGreaterThan(startPos.longitude);
      expect(movedPos.latitude).toBeCloseTo(startPos.latitude, 4);

      controller.releaseStick();
      controller.stopLoop();
      jest.useRealTimers();
    });

    it('reverses along polyline when stick is pulled backward (y > 0)', () => {
      jest.useFakeTimers();
      controller.setRouteCoords(route);

      // Avanzar primero un poco
      controller.getPolylineNavigator().step(300);
      controller.setPosition(controller.getPolylineNavigator().getCurrentSample().nextPosition);
      const midPos = controller.getPosition();

      // Stick tirado hacia atrás (abajo en la pantalla, y = +1)
      const reverseStick: JoystickVector = {
        x: 0,
        y: 1,
        magnitude: 1,
        angle: 180,
      };

      controller.updateVector(reverseStick);
      jest.advanceTimersByTime(300);

      const reversedPos = controller.getPosition();
      expect(reversedPos.longitude).toBeLessThan(midPos.longitude);

      controller.releaseStick();
      controller.stopLoop();
      jest.useRealTimers();
    });

    it('starts auto-nav and automatically advances along polyline', () => {
      jest.useFakeTimers();
      controller.setRouteCoords(route);
      const startPos = controller.getPosition();

      const started = controller.startAutoNav();
      expect(started).toBe(true);

      jest.advanceTimersByTime(500);

      const autoNavPos = controller.getPosition();
      expect(autoNavPos.longitude).toBeGreaterThan(startPos.longitude);

      controller.stopAutoNav();
      jest.useRealTimers();
    });
  });
});
