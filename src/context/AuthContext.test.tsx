import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import * as secureStorage from '../utils/secureStorage';
import * as apolloModule from '../graphql/apollo';
import { Role } from '../types/graphql';

const mockQuery = jest.fn();
const mockClearStore = jest.fn();

const mockMutationByOperation = new Map<string, jest.Mock>();

let mockAuthErrorHandler: (() => void) | null = null;

jest.mock('../utils/secureStorage', () => ({
  saveToken: jest.fn(),
  getToken: jest.fn(),
  clearToken: jest.fn(),
}));

jest.mock('../graphql/apollo', () => ({
  setAuthToken: jest.fn(),
  setAuthErrorHandler: jest.fn((handler) => {
    mockAuthErrorHandler = handler;
  }),
}));

let mockQueryResult: any = { data: undefined, loading: false, error: undefined };
const mockRefetch = jest.fn();

jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({
    query: mockQuery,
    clearStore: mockClearStore,
  }),
  useQuery: (_query: any, options: any) => {
    if (options?.skip) {
      return { data: undefined, loading: false, error: undefined, refetch: mockRefetch };
    }
    return { ...mockQueryResult, refetch: mockRefetch };
  },
  useMutation: (document: { definitions?: Array<{ name?: { value?: string } }> }) => {
    const operationName = document.definitions?.[0]?.name?.value ?? 'UnknownOperation';
    const mutation = mockMutationByOperation.get(operationName) ?? jest.fn();
    mockMutationByOperation.set(operationName, mutation);
    return [mutation, { loading: false, error: undefined }];
  },
}));

describe('AuthContext lifecycle and session management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutationByOperation.clear();
    mockQueryResult = { data: undefined, loading: false, error: undefined };
    mockAuthErrorHandler = null;
    (secureStorage.getToken as jest.Mock).mockResolvedValue(null);
    (secureStorage.saveToken as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.clearToken as jest.Mock).mockResolvedValue(undefined);
    mockClearStore.mockResolvedValue(undefined);
  });

  it('LIFECYCLE: initializes with guest session when no token is stored', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.authResolved).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.role).toBe('guest');
    });
  });

  it('LIFECYCLE: restores stored token on startup and populates user profile', async () => {
    (secureStorage.getToken as jest.Mock).mockResolvedValue('stored-jwt-token');
    mockQueryResult = {
      data: {
        me: {
          id: 10,
          email: 'usuario@tratofacil.test',
          role: Role.CLIENT,
          displayName: 'Usuario Restaurado',
        },
      },
      loading: false,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(apolloModule.setAuthToken).toHaveBeenCalledWith('stored-jwt-token');
      expect(result.current.user?.email).toBe('usuario@tratofacil.test');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.role).toBe('client');
    });
  });

  it('LIFECYCLE: logs in user, saves token in secure storage, and queries me profile', async () => {
    const mockLoginMut = jest.fn().mockResolvedValue({
      data: {
        login: {
          accessToken: 'newly-issued-token',
          user: { id: 25, email: 'nuevo@tratofacil.test', role: Role.CLIENT },
        },
      },
    });
    mockMutationByOperation.set('Login', mockLoginMut);

    mockQuery.mockResolvedValue({
      data: {
        me: {
          id: 25,
          email: 'nuevo@tratofacil.test',
          role: Role.CLIENT,
          displayName: 'Nuevo Logueado',
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const loginRes = await result.current.login('nuevo@tratofacil.test', 'Password123!');
      expect(loginRes.accessToken).toBe('newly-issued-token');
    });

    expect(secureStorage.saveToken).toHaveBeenCalledWith('newly-issued-token');
    expect(apolloModule.setAuthToken).toHaveBeenCalledWith('newly-issued-token');
  });

  it('LIFECYCLE: logs out user, clears token from Keychain, and resets Apollo store', async () => {
    (secureStorage.getToken as jest.Mock).mockResolvedValue('active-token');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(secureStorage.clearToken).toHaveBeenCalled();
    expect(mockClearStore).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('SECURITY: triggers automatic logout on 401 unauthenticated error handler', async () => {
    (secureStorage.getToken as jest.Mock).mockResolvedValue('expired-token');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = await renderHook(() => useAuth(), { wrapper });

    expect(mockAuthErrorHandler).not.toBeNull();

    await act(async () => {
      mockAuthErrorHandler!();
    });

    expect(secureStorage.clearToken).toHaveBeenCalled();
    expect(mockClearStore).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

});
