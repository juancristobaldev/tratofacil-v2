import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE = 'com.tratofacilv2.auth';
const FALLBACK_KEY = `${SERVICE}:token`;

async function tryKeychainSet(token: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword('authToken', token, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch {
    return false;
  }
}

export async function saveToken(token: string): Promise<void> {
  const ok = await tryKeychainSet(token);
  await AsyncStorage.setItem(FALLBACK_KEY, token);
  if (!ok && __DEV__) {
    console.warn('[secureStorage] Keychain falló; token guardado solo en AsyncStorage.');
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    if (creds && creds.password) return creds.password;
  } catch {
    // fallback
  }
  return AsyncStorage.getItem(FALLBACK_KEY);
}

export async function clearToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // noop
  }
  try {
    await AsyncStorage.removeItem(FALLBACK_KEY);
  } catch {
    // noop
  }
}
