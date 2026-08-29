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
});
