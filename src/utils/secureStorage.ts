import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.tratofacilv2.auth';

export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('authToken', token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getToken(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // noop
  }
}
