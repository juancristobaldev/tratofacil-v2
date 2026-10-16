import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@tratofacil:device_id';
let cachedDeviceId: string | null = null;

function generateUUID(): string {
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let pendingDeviceIdPromise: Promise<string> | null = null;

/**
 * Obtiene o crea un identificador único y persistente para este dispositivo.
 * Se almacena en AsyncStorage para sobrevivir a recargas y reinicios de la app.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  if (pendingDeviceIdPromise) {
    return pendingDeviceIdPromise;
  }

  pendingDeviceIdPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (stored && stored.trim().length > 0) {
        cachedDeviceId = stored.trim();
        return cachedDeviceId;
      }

      const newId = generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
      cachedDeviceId = newId;
      return newId;
    } catch (err) {
      if (__DEV__) {
        console.warn('[deviceId] Error al acceder a AsyncStorage:', err);
      }
      if (!cachedDeviceId) {
        cachedDeviceId = generateUUID();
      }
      return cachedDeviceId;
    } finally {
      pendingDeviceIdPromise = null;
    }
  })();

  return pendingDeviceIdPromise;
}

/**
 * Devuelve el deviceId actualmente en memoria (o un fallback generado).
 */
export function getCachedDeviceId(): string {
  if (!cachedDeviceId) {
    cachedDeviceId = generateUUID();
  }
  return cachedDeviceId;
}
