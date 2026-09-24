/**
 * Configuración de Feature Flags y Seguridad para el Dev Joystick.
 * 
 * En producción (__DEV__ === false), todas las llamadas resuelven a constantes
 * deshabilitadas y ningún componente o worklet de simulación es ejecutado.
 */

export interface DevJoystickConfig {
  enabled: boolean;
  debugHud: boolean;
  streetSnapMode: boolean;
  followCamera: boolean;
  speedKmh: number; // Velocidad máxima en km/h
  deadZone: number; // Ratio de deadzone [0..1]
}

const DEFAULT_CONFIG: DevJoystickConfig = {
  enabled: true,
  debugHud: true,
  streetSnapMode: false,
  followCamera: true,
  speedKmh: 35,
  deadZone: 0.08,
};

let currentConfig: DevJoystickConfig = { ...DEFAULT_CONFIG };

/**
 * Comprueba si el Dev Joystick está habilitado.
 * Garantiza 100% que en production builds retorna false inmediatamente.
 */
export function isDevJoystickEnabled(): boolean {
  if (!__DEV__) return false;
  return currentConfig.enabled;
}

export function getDevJoystickConfig(): DevJoystickConfig {
  if (!__DEV__) {
    return {
      enabled: false,
      debugHud: false,
      streetSnapMode: false,
      followCamera: false,
      speedKmh: 0,
      deadZone: 1,
    };
  }
  return { ...currentConfig };
}

export function setDevJoystickConfig(updates: Partial<DevJoystickConfig>): void {
  if (!__DEV__) return;
  currentConfig = { ...currentConfig, ...updates };
}

export function resetDevJoystickConfig(): void {
  if (!__DEV__) return;
  currentConfig = { ...DEFAULT_CONFIG };
}
