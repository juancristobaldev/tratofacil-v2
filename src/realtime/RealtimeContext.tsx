import React, { createContext, useContext, useEffect } from 'react';
import {
  useTimeRealServices as useRealtimeController,
  UseTimeRealServicesReturn,
} from '../hooks/useTimeRealServices';
import { setOrderOpenHandler } from '../utils/deepLinks';
import { navigate } from '../navigation/navigationRef';

const RealtimeContext = createContext<UseTimeRealServicesReturn | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const value = useRealtimeController();
  const { refetch } = value;

  useEffect(() => {
    setOrderOpenHandler(() => {
      navigate('MainApp');
      refetch();
    });
    return () => {
      setOrderOpenHandler(null);
    };
  }, [refetch]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): UseTimeRealServicesReturn {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return ctx;
}
