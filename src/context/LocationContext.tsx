import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, PermissionsAndroid, AppState } from 'react-native';
import Geolocation, { GeoPosition } from 'react-native-geolocation-service';

interface LocationContextData {
  location: GeoPosition | null;
  permissionStatus: string;
  refreshLocation: () => void;
}

const LocationContext = createContext<LocationContextData>({} as LocationContextData);

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [location, setLocation] = useState<GeoPosition | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');

  const requestPermission = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (hasPermission) {
          setPermissionStatus('granted');
          getLocation();
          return;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de Ubicación',
            message: 'TratoFacil necesita acceder a tu ubicación para funcionar correctamente.',
            buttonNeutral: 'Preguntar luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('granted');
          getLocation();
        } else {
          setPermissionStatus('denied');
        }
      } else {
        try {
          const status = await Geolocation.requestAuthorization('whenInUse');
          if (status === 'granted') {
            setPermissionStatus('granted');
            getLocation();
          } else {
            setPermissionStatus('denied');
          }
        } catch (error) {
          console.warn(error);
          setPermissionStatus('denied');
        }
      }
    } catch (err) {
      console.warn(err);
      setPermissionStatus('denied');
    }
  }, []);

  const getLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation(position);
      },
      (error) => {
        console.warn('Error getting location', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    requestPermission();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        requestPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestPermission]);

  const value = useMemo(() => ({
    location,
    permissionStatus,
    refreshLocation: getLocation,
  }), [location, permissionStatus, getLocation]);

  // El Provider ya no bloquea el render: siempre expone `children`. Las pantallas que no
  // pueden funcionar en absoluto sin ubicación (ej. MainLayout/home, mapa de proveedores)
  // se envuelven puntualmente en <RequireLocation> (src/components/ui/RequireLocation.tsx),
  // que lee `permissionStatus`/`location` de este mismo contexto para decidir su propio
  // bloqueo local. Pantallas que solo necesitan la ubicación para una acción puntual
  // (ej. GuestCheckoutScreen, ProviderProfileScreen) ya manejan `location == null` de forma
  // local y no requieren bloqueo de pantalla completa.
  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
