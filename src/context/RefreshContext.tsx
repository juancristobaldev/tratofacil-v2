import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

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

  const value = useMemo(
    () => ({ isRefreshing, setIsRefreshing: setRefreshing }),
    [isRefreshing, setRefreshing],
  );

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => useContext(RefreshContext);
