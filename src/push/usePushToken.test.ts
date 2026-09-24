import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePushToken } from './usePushToken';

const mockRegisterToken = jest.fn();

jest.mock('@apollo/client/react', () => ({
  useMutation: () => [mockRegisterToken, { loading: false }],
}));

let mockIsAuthenticated = true;
let mockAuthToken: string | null = 'mock-jwt-token';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    token: mockAuthToken,
  }),
}));

describe('usePushToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockAuthToken = 'mock-jwt-token';
    mockRegisterToken.mockResolvedValue({ data: { registerPushToken: true } });

    NativeModules.PushTokenModule = {
      getToken: jest.fn().mockResolvedValue('test-fcm-token-123'),
      requestPermission: jest.fn().mockResolvedValue(true),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };
  });

  it('registers push token when permissions are granted on Android', async () => {
    Platform.OS = 'android';
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);

    renderHook(() => usePushToken());

    await waitFor(() => {
      expect(mockRegisterToken).toHaveBeenCalledWith({
        variables: {
          token: 'test-fcm-token-123',
          platform: 'android',
        },
      });
    });
  });

  it('requests permission and registers token when granted', async () => {
    Platform.OS = 'android';
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);

    renderHook(() => usePushToken());

    await waitFor(() => {
      expect(mockRegisterToken).toHaveBeenCalledWith({
        variables: {
          token: 'test-fcm-token-123',
          platform: 'android',
        },
      });
    });
  });

  it('does not register token when permission is denied', async () => {
    Platform.OS = 'android';
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    renderHook(() => usePushToken());

    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 50);
      });
    });

    expect(mockRegisterToken).not.toHaveBeenCalled();
  });

  it('does not register token when user is unauthenticated', async () => {
    mockIsAuthenticated = false;
    mockAuthToken = null;
    Platform.OS = 'android';
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);

    renderHook(() => usePushToken());

    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 50);
      });
    });

    expect(mockRegisterToken).not.toHaveBeenCalled();
  });
});
