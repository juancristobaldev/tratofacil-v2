import React, { createContext, useContext, useEffect } from 'react';
import {
  useTimeRealServices as useRealtimeController,
  UseTimeRealServicesReturn,
} from '../hooks/useTimeRealServices';
import { setOrderOpenHandler } from '../utils/deepLinks';
import { navigate } from '../navigation/navigationRef';
import { useAuth } from '../context/AuthContext';
import { DeviceSessionConflictModal } from '../components/modals/DeviceSessionConflictModal';

const RealtimeContext = createContext<UseTimeRealServicesReturn | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const value = useRealtimeController();
  const { refetch, deviceConflict, dismissDeviceConflict, claimSessionControl } = value;
  const { logout } = useAuth();

  useEffect(() => {
    setOrderOpenHandler(() => {
      navigate('MainApp');
      refetch();
    });
    return () => {
      setOrderOpenHandler(null);
    };
  }, [refetch]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      {deviceConflict && (
        <DeviceSessionConflictModal
          visible={Boolean(deviceConflict)}
          orderRealtimeId={deviceConflict.orderRealtimeId}
          currentActiveDeviceId={deviceConflict.currentActiveDeviceId}
          onContinueHere={() => {
            claimSessionControl(deviceConflict.orderRealtimeId);
          }}
          onLogoutThisDevice={async () => {
            dismissDeviceConflict();
            await logout();
          }}
          onClose={dismissDeviceConflict}
        />
      )}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): UseTimeRealServicesReturn {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return ctx;
}
