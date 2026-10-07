import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken, getToken, clearToken } from './secureStorage';

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('secureStorage security invariants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guarda el token en Keychain y NO en AsyncStorage cuando Keychain tiene éxito', async () => {
    (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

    await saveToken('jwt_super_secure_token');

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'authToken',
      'jwt_super_secure_token',
      expect.objectContaining({
        service: 'com.tratofacilv2.auth',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      })
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('com.tratofacilv2.auth:token');
  });

  it('recurre a AsyncStorage SOLO cuando Keychain arroja error', async () => {
    (Keychain.setGenericPassword as jest.Mock).mockRejectedValue(new Error('Keychain unavailable'));

    await saveToken('jwt_fallback_token');

    expect(Keychain.setGenericPassword).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'com.tratofacilv2.auth:token',
      'jwt_fallback_token'
    );
  });

  it('elimina credenciales tanto de Keychain como de AsyncStorage en clearToken', async () => {
    await clearToken();

    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'com.tratofacilv2.auth',
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('com.tratofacilv2.auth:token');
  });
});
