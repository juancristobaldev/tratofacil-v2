import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { setAuthToken } from '../graphql/apollo';
import { saveToken, getToken, clearToken } from '../utils/secureStorage';
import {
  ME_QUERY,
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  LOGIN_WITH_GOOGLE_MUTATION,
  SET_GUEST_PASSWORD,
} from '../graphql/operations/auth';
import { User, AppRole, Role } from '../types/graphql';

function mapRole(role: Role): AppRole {
  if (role === Role.PROVIDER) return 'provider';
  if (role === Role.CLIENT) return 'client';
  return 'guest';
}

interface LoginResult {
  accessToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authResolved: boolean;
  error: any;
  logout: () => Promise<void>;
  refetch: () => Promise<any>;
  isAuthenticated: boolean;
  role: AppRole;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginLoading: boolean;
  loginError: any;
  register: (input: {
    displayName: string;
    email: string;
    phone: string;
    password: string;
    role: Role;
  }) => Promise<LoginResult>;
  registerLoading: boolean;
  registerError: any;
  loginWithGoogle: (idToken: string) => Promise<LoginResult>;
  googleLoading: boolean;
  googleError: any;
  setRole: (role: AppRole) => void;
  setSession: (token: string, user: User) => Promise<void>;
  isGuest: boolean;
  setGuestPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authResolved: false,
  error: undefined,
  logout: async () => {},
  refetch: async () => {},
  isAuthenticated: false,
  role: 'guest',
  token: null,
  login: async () => ({ accessToken: '', user: {} as User }),
  loginLoading: false,
  loginError: undefined,
  register: async () => ({ accessToken: '', user: {} as User }),
  registerLoading: false,
  registerError: undefined,
  loginWithGoogle: async () => ({ accessToken: '', user: {} as User }),
  googleLoading: false,
  googleError: undefined,
  setRole: () => {},
  setSession: async () => {},
  isGuest: false,
  setGuestPassword: async (_newPassword: string) => {},
});

export const useAuth = () => useContext(AuthContext);

export const useRole = useAuth;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);

  const client = useApolloClient();

  useEffect(() => {
    getToken().then((stored) => {
      setToken(stored);
      setAuthToken(stored);
      setTokenLoaded(true);
    });
  }, []);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const { data, loading, error, refetch } = useQuery<{ me: User }>(ME_QUERY, {
    skip: !token,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (data?.me) {
      setUser(data.me);
    }
  }, [data]);

  const [loginMut, { loading: loginLoading, error: loginError }] = useMutation<{
    login: LoginResult;
  }>(LOGIN_MUTATION);

  const [registerMut, { loading: registerLoading, error: registerError }] = useMutation<{
    register: LoginResult;
  }>(REGISTER_MUTATION);

  const [googleMut, { loading: googleLoading, error: googleError }] = useMutation<{
    loginWithGoogle: LoginResult;
  }>(LOGIN_WITH_GOOGLE_MUTATION);

  const [setGuestPasswordMut] = useMutation<{ setGuestPassword: boolean }>(SET_GUEST_PASSWORD);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const { data: loginData } = await loginMut({
        variables: { loginInput: { email, password } },
      });
      if (!loginData?.login) {
        throw new Error('Error al iniciar sesión');
      }
      const { accessToken } = loginData.login;
      await saveToken(accessToken);
      setToken(accessToken);
      await refetch();
      return loginData.login;
    },
    [loginMut, refetch],
  );

  const register = useCallback(
    async (input: {
      displayName: string;
      email: string;
      phone: string;
      password: string;
      role: Role;
    }): Promise<LoginResult> => {
      const { data: registerData } = await registerMut({
        variables: { input },
      });
      if (!registerData?.register) {
        throw new Error('Error al registrarse');
      }
      const { accessToken } = registerData.register;
      await saveToken(accessToken);
      setToken(accessToken);
      await refetch();
      return registerData.register;
    },
    [registerMut, refetch],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<LoginResult> => {
      const { data: googleData } = await googleMut({
        variables: { idToken },
      });
      if (!googleData?.loginWithGoogle) {
        throw new Error('Error al iniciar sesión con Google');
      }
      const { accessToken } = googleData.loginWithGoogle;
      await saveToken(accessToken);
      setToken(accessToken);
      await refetch();
      return googleData.loginWithGoogle;
    },
    [googleMut, refetch],
  );

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
    setToken(null);
    await client.clearStore();
  }, [client]);

  const isAuthenticated = !!user;
  const isLoading = loading && !user;
  const authResolved = tokenLoaded && (!token || !loading);
  const isGuest = user?.isGuest === true;

  const setGuestPassword = useCallback(async (newPassword: string) => {
    await setGuestPasswordMut({ variables: { newPassword } });
    await refetch();
  }, [setGuestPasswordMut, refetch]);

  const serverRole: AppRole = user ? mapRole(user.role) : 'guest';
  const hasProvider = !!user?.provider;
  const role: AppRole = activeRole ?? serverRole;

  const setRole = useCallback((newRole: AppRole) => {
    if (newRole === 'provider' && !hasProvider) return;
    setActiveRole(newRole === serverRole ? null : newRole);
  }, [serverRole, hasProvider]);

  const setSession = useCallback(async (newToken: string, newUser: User) => {
    await saveToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const value = useMemo(() => ({
    user,
    loading: isLoading,
    authResolved,
    error,
    logout,
    refetch,
    isAuthenticated,
    role,
    token,
    login,
    loginLoading,
    loginError,
    register,
    registerLoading,
    registerError,
    loginWithGoogle,
    googleLoading,
    googleError,
    setRole,
    setSession,
    isGuest,
    setGuestPassword,
  }), [
    user,
    isLoading,
    authResolved,
    error,
    logout,
    refetch,
    isAuthenticated,
    role,
    token,
    login,
    loginLoading,
    loginError,
    register,
    registerLoading,
    registerError,
    loginWithGoogle,
    googleLoading,
    googleError,
    setRole,
    setSession,
    isGuest,
    setGuestPassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
