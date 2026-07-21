import React, { createContext, useContext, useState } from 'react';

export type AppRole = 'guest' | 'client' | 'provider';

interface RoleContextProps {
  role: AppRole;
  setRole: (role: AppRole) => void;
}

const RoleContext = createContext<RoleContextProps>({
  role: 'guest',
  setRole: () => {},
});

export const useRole = () => useContext(RoleContext);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<AppRole>('guest');

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
};
