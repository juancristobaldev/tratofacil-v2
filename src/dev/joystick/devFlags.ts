/**
 * Configuración de Feature Flags y Seguridad para el Dev Joystick.
 * 
 * En producción (__DEV__ === false), todas las llamadas resuelven a constantes
 * deshabilitadas y ningún componente o worklet de simulación es ejecutado.
 */

export interface DevJoystickSpeedPreset {
  label: string;
  kmh: number;
  name: string;
}

export const DEV_JOYSTICK_SPEED_PRESETS: readonly DevJoystickSpeedPreset[] = [
  { label: '15k', kmh: 15, name: 'Paseo' },
  { label: '45k', kmh: 45, name: 'Ciudad' },
  { label: '90k', kmh: 90, name: 'Autopista' },
  { label: '180k', kmh: 180, name: 'Rápido' },
  { label: '360k', kmh: 360, name: 'Turbo' },
  { label: '720k', kmh: 720, name: 'Warp' },
] as const;

export interface DevJoystickConfig {
  enabled: boolean;
  debugHud: boolean;
  streetSnapMode: boolean;
  followCamera: boolean;
  speedKmh: number; // Velocidad máxima en km/h
  deadZone: number; // Ratio de deadzone [0..1]
  autoNav: boolean; // Modo piloto automático a lo largo de la polyline
  routeSnapMode: boolean; // Si es true, avanza por la polyline activa al mover el stick
}

const DEFAULT_CONFIG: DevJoystickConfig = {
  enabled: true,
  debugHud: true,
  streetSnapMode: false,
  followCamera: true,
  speedKmh: 90,
  deadZone: 0.08,
  autoNav: false,
  routeSnapMode: true,
};

let currentConfig: DevJoystickConfig = { ...DEFAULT_CONFIG };
type ConfigListener = (config: DevJoystickConfig) => void;
const configListeners = new Set<ConfigListener>();

function notifyConfigListeners(): void {
  const snapshot = { ...currentConfig };
  for (const listener of configListeners) {
    listener(snapshot);
  }
}

/**
 * Suscribe un callback a cambios de configuración en runtime.
 */
export function subscribeDevJoystickConfig(listener: ConfigListener): () => void {
  configListeners.add(listener);
  return () => {
    configListeners.delete(listener);
  };
}

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
      autoNav: false,
      routeSnapMode: false,
    };
  }
  return { ...currentConfig };
}

export function setDevJoystickConfig(updates: Partial<DevJoystickConfig>): void {
  if (!__DEV__) return;
  currentConfig = { ...currentConfig, ...updates };
  notifyConfigListeners();
}

export function resetDevJoystickConfig(): void {
  if (!__DEV__) return;
  currentConfig = { ...DEFAULT_CONFIG };
  notifyConfigListeners();
}

/**
 * Alterna el modo de auto-navegación autónomo a lo largo de la polyline.
 */
export function toggleDevJoystickAutoNav(): boolean {
  if (!__DEV__) return false;
  const next = !currentConfig.autoNav;
  setDevJoystickConfig({ autoNav: next });
  return next;
}

export function setDevJoystickAutoNav(active: boolean): void {
  if (!__DEV__) return;
  setDevJoystickConfig({ autoNav: active });
}

/**
 * Alterna el enganche a polyline vs modo libre.
 */
export function toggleDevJoystickRouteSnap(): boolean {
  if (!__DEV__) return false;
  const next = !currentConfig.routeSnapMode;
  setDevJoystickConfig({ routeSnapMode: next });
  return next;
}

/**
 * Cicla la velocidad al siguiente preset disponible.
 */
export function cycleDevJoystickSpeed(): number {
  if (!__DEV__) return 0;
  const current = currentConfig.speedKmh;
  const currentIndex = DEV_JOYSTICK_SPEED_PRESETS.findIndex(p => p.kmh === current);
  const nextIndex = currentIndex === -1 || currentIndex >= DEV_JOYSTICK_SPEED_PRESETS.length - 1
    ? 0
    : currentIndex + 1;
  const nextSpeed = DEV_JOYSTICK_SPEED_PRESETS[nextIndex].kmh;
  setDevJoystickConfig({ speedKmh: nextSpeed });
  return nextSpeed;
}

/**
 * Da un paso hacia arriba o hacia abajo en los presets de velocidad.
 */
export function stepDevJoystickSpeed(direction: 'up' | 'down'): number {
  if (!__DEV__) return 0;
  const current = currentConfig.speedKmh;
  const sorted = [...DEV_JOYSTICK_SPEED_PRESETS];
  let targetIndex = sorted.findIndex(p => p.kmh === current);

  if (targetIndex === -1) {
    // Si la velocidad actual no es un preset exacto, busca el más cercano
    targetIndex = sorted.findIndex(p => p.kmh >= current);
    if (targetIndex === -1) targetIndex = sorted.length - 1;
  }

  if (direction === 'up') {
    targetIndex = Math.min(sorted.length - 1, targetIndex + 1);
  } else {
    targetIndex = Math.max(0, targetIndex - 1);
  }

  const nextSpeed = sorted[targetIndex].kmh;
  setDevJoystickConfig({ speedKmh: nextSpeed });
  return nextSpeed;
}

