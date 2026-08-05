import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface RefreshContextValue {
  isRefreshing: boolean;
  setIsRefreshing: (v: boolean) => void;
}

const RefreshContext = createContext<RefreshContextValue>({
  isRefreshing: false,
  setIsRefreshing: () => {},
});

export const RefreshProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setRefreshing = useCallback((v: boolean) => {
    setIsRefreshing(v);
  }, []);

  return (
    <RefreshContext.Provider value={{ isRefreshing, setIsRefreshing: setRefreshing }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => useContext(RefreshContext);
