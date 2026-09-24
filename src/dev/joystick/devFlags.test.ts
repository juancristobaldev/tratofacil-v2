import {
  isDevJoystickEnabled,
  getDevJoystickConfig,
  setDevJoystickConfig,
  resetDevJoystickConfig,
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
  });

  it('updates configuration dynamically', () => {
    setDevJoystickConfig({ speedKmh: 60, streetSnapMode: false });
    const updated = getDevJoystickConfig();
    expect(updated.speedKmh).toBe(60);
    expect(updated.streetSnapMode).toBe(false);
  });

  it('resets configuration back to defaults', () => {
    setDevJoystickConfig({ speedKmh: 90 });
    resetDevJoystickConfig();
    expect(getDevJoystickConfig().speedKmh).toBe(35);
  });
});
