import {
  isDevJoystickEnabled,
  getDevJoystickConfig,
  setDevJoystickConfig,
  resetDevJoystickConfig,
  subscribeDevJoystickConfig,
  cycleDevJoystickSpeed,
  stepDevJoystickSpeed,
  toggleDevJoystickAutoNav,
  toggleDevJoystickRouteSnap,
  DEV_JOYSTICK_SPEED_PRESETS,
} from './devFlags';

describe('devFlags', () => {
  beforeEach(() => {
    resetDevJoystickConfig();
  });

  it('returns default enabled state in __DEV__', () => {
    expect(isDevJoystickEnabled()).toBe(true);
    const config = getDevJoystickConfig();
    expect(config.enabled).toBe(true);
    expect(config.streetSnapMode).toBe(false);
    expect(config.followCamera).toBe(true);
    expect(config.speedKmh).toBe(90);
    expect(config.autoNav).toBe(false);
    expect(config.routeSnapMode).toBe(true);
  });

  it('updates configuration dynamically', () => {
    setDevJoystickConfig({ speedKmh: 180, streetSnapMode: false });
    const updated = getDevJoystickConfig();
    expect(updated.speedKmh).toBe(180);
    expect(updated.streetSnapMode).toBe(false);
  });

  it('resets configuration back to defaults', () => {
    setDevJoystickConfig({ speedKmh: 360 });
    resetDevJoystickConfig();
    expect(getDevJoystickConfig().speedKmh).toBe(90);
  });

  it('includes complete speed presets from 15k to 720k', () => {
    expect(DEV_JOYSTICK_SPEED_PRESETS.length).toBe(6);
    expect(DEV_JOYSTICK_SPEED_PRESETS.map(p => p.kmh)).toEqual([15, 45, 90, 180, 360, 720]);
    expect(DEV_JOYSTICK_SPEED_PRESETS.map(p => p.label)).toEqual(['15k', '45k', '90k', '180k', '360k', '720k']);
  });

  it('cycles speeds smoothly through DEV_JOYSTICK_SPEED_PRESETS', () => {
    setDevJoystickConfig({ speedKmh: 90 });
    expect(cycleDevJoystickSpeed()).toBe(180);
    expect(cycleDevJoystickSpeed()).toBe(360);
    expect(cycleDevJoystickSpeed()).toBe(720);
    expect(cycleDevJoystickSpeed()).toBe(15);
    expect(cycleDevJoystickSpeed()).toBe(45);
    expect(cycleDevJoystickSpeed()).toBe(90);
  });

  it('steps speeds up and down with bounds clamping', () => {
    setDevJoystickConfig({ speedKmh: 90 });
    expect(stepDevJoystickSpeed('up')).toBe(180);
    expect(stepDevJoystickSpeed('up')).toBe(360);
    expect(stepDevJoystickSpeed('up')).toBe(720);
    // At maximum boundary
    expect(stepDevJoystickSpeed('up')).toBe(720);

    expect(stepDevJoystickSpeed('down')).toBe(360);
    expect(stepDevJoystickSpeed('down')).toBe(180);
    expect(stepDevJoystickSpeed('down')).toBe(90);
    expect(stepDevJoystickSpeed('down')).toBe(45);
    expect(stepDevJoystickSpeed('down')).toBe(15);
    // At minimum boundary
    expect(stepDevJoystickSpeed('down')).toBe(15);
  });

  it('notifies subscribers upon configuration changes', () => {
    const subscriber = jest.fn();
    const unsubscribe = subscribeDevJoystickConfig(subscriber);

    setDevJoystickConfig({ speedKmh: 360 });
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ speedKmh: 360 }));

    unsubscribe();
    setDevJoystickConfig({ speedKmh: 720 });
    expect(subscriber).toHaveBeenCalledTimes(1); // No further calls after unsubscribe
  });

  it('toggles autoNav and routeSnapMode correctly', () => {
    expect(getDevJoystickConfig().autoNav).toBe(false);
    expect(toggleDevJoystickAutoNav()).toBe(true);
    expect(getDevJoystickConfig().autoNav).toBe(true);
    expect(toggleDevJoystickAutoNav()).toBe(false);
    expect(getDevJoystickConfig().autoNav).toBe(false);

    expect(getDevJoystickConfig().routeSnapMode).toBe(true);
    expect(toggleDevJoystickRouteSnap()).toBe(false);
    expect(getDevJoystickConfig().routeSnapMode).toBe(false);
    expect(toggleDevJoystickRouteSnap()).toBe(true);
    expect(getDevJoystickConfig().routeSnapMode).toBe(true);
  });
});


