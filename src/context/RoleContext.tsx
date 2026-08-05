import { useAuth } from './AuthContext';
import type { AppRole } from '../types/graphql';

export type { AppRole };

export const useRole = () => {
  const { role, setRole } = useAuth();
  return { role, setRole };
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
