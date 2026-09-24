import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, PermissionsAndroid, AppState } from 'react-native';
import Geolocation, { GeoPosition } from 'react-native-geolocation-service';
import { locationSimulator } from '../dev/joystick/locationSimulator';
import { GeoHoldingPointFilter, type GpsQualityRating } from '../utils/geoHoldingPoint';

export type GpsSignalStatus = 'active' | 'stale' | 'denied' | 'error' | 'pending';

export interface LocationContextData {
  /** Ubicación estabilizada a través del punto de espera (Holding Point) */
  location: GeoPosition | null;
  /** Ubicación cruda sin filtrar recibida directamente del sensor */
  rawLocation: GeoPosition | null;
  /** Indica si el usuario está actualmente estacionario en el punto de espera */
  isStationary: boolean;
  /** Estado de permisos del sistema operativo */
  permissionStatus: 'pending' | 'granted' | 'denied';
  /** Estado de salud de la señal GPS */
  gpsStatus: GpsSignalStatus;
  /** Calidad estimada del GPS según precisión */
  gpsQuality: GpsQualityRating;
  /** Función para forzar un refresco inmediato de GPS */
  refreshLocation: () => void;
  /** Resetea el anclaje del punto de espera */
  resetHoldingPoint: () => void;
}

const LocationContext = createContext<LocationContextData>({} as LocationContextData);

export const LocationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [location, setLocation] = useState<GeoPosition | null>(null);
  const [rawLocation, setRawLocation] = useState<GeoPosition | null>(null);
  const [isStationary, setIsStationary] = useState<boolean>(true);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [gpsStatus, setGpsStatus] = useState<GpsSignalStatus>('pending');
  const [gpsQuality, setGpsQuality] = useState<GpsQualityRating>('DEGRADED');

  const holdingFilterRef = useRef<GeoHoldingPointFilter>(new GeoHoldingPointFilter({
    stationaryRadiusMeters: 10,
    stationarySpeedThresholdMps: 0.6,
    maxAcceptableAccuracyMeters: 65,
    consecutiveBreaksToMove: 2,
    maxPhysicalSpeedMps: 50,
    staleTimeoutMs: 25000,
  }));

  const updateLocation = useCallback((position: GeoPosition | null) => {
    if (__DEV__) {
      locationSimulator.setRealPosition(position);
      if (locationSimulator.isSimulating()) {
        return;
      }
    }

    if (!position) {
      setLocation(null);
      setRawLocation(null);
      return;
    }

    setRawLocation(position);

    const filterResult = holdingFilterRef.current.process(position);
    if (filterResult) {
      setLocation(filterResult.position);
      setIsStationary(filterResult.isStationary);
      setGpsQuality(filterResult.quality);
      setGpsStatus('active');

      if (__DEV__ && filterResult.anchorChanged) {
        console.log(
          `[GPS:HOLDING_POINT] anchor_shifted reason=${filterResult.reason} lat=${filterResult.position.coords.latitude.toFixed(5)} lng=${filterResult.position.coords.longitude.toFixed(5)} dist=${filterResult.distanceFromAnchorMeters.toFixed(1)}m`,
        );
      }
    } else {
      setLocation(position);
      setGpsStatus('active');
    }
  }, []);

  const resetHoldingPoint = useCallback(() => {
    holdingFilterRef.current.reset();
  }, []);

  const getLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        updateLocation(position);
      },
      (error) => {
        console.warn('Error getting high accuracy location, retrying with standard accuracy', error);
        Geolocation.getCurrentPosition(
          (pos) => {
            updateLocation(pos);
          },
          (err2) => {
            console.warn('Error getting location fallback', err2);
            setGpsStatus('error');
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        showLocationDialog: true,
      }
    );
  }, [updateLocation]);

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
          setGpsStatus('denied');
        }
      } else {
        try {
          const status = await Geolocation.requestAuthorization('whenInUse');
          if (status === 'granted') {
            setPermissionStatus('granted');
            getLocation();
          } else {
            setPermissionStatus('denied');
            setGpsStatus('denied');
          }
        } catch (error) {
          console.warn(error);
          setPermissionStatus('denied');
          setGpsStatus('denied');
        }
      }
    } catch (err) {
      console.warn(err);
      setPermissionStatus('denied');
      setGpsStatus('denied');
    }
  }, [getLocation]);

  useEffect(() => {
    if (__DEV__) {
      const unsubscribe = locationSimulator.subscribe((simulatedPos) => {
        if (simulatedPos) {
          setRawLocation(simulatedPos);
          setLocation(simulatedPos);
          setIsStationary(false);
          setGpsStatus('active');
        }
      });
      return unsubscribe;
    }
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

  // Suscripción a watchPosition en primer plano
  useEffect(() => {
    if (permissionStatus !== 'granted') return;

    let watchId: number | null = null;
    try {
      watchId = Geolocation.watchPosition(
        (position) => {
          updateLocation(position);
        },
        (error) => {
          console.warn('[LocationContext] Watch error:', error);
          if (error.code === 3) {
            // TIMEOUT: intentar fallback de menor precisión
            Geolocation.getCurrentPosition(
              (pos) => updateLocation(pos),
              () => setGpsStatus('error'),
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
            );
          } else {
            setGpsStatus('error');
          }
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 2,
          interval: 2000,
          fastestInterval: 1000,
        }
      );
    } catch (err) {
      console.warn('[LocationContext] Watch start error:', err);
      setGpsStatus('error');
    }

    return () => {
      if (watchId != null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [permissionStatus, updateLocation]);

  // Watchdog de frescura: verifica cada 6 segundos si el GPS ha dejado de emitir
  useEffect(() => {
    if (permissionStatus !== 'granted') return;

    const watchdogTimer = setInterval(() => {
      if (holdingFilterRef.current.isStale() && gpsStatus === 'active') {
        if (__DEV__) {
          console.log('[GPS:WATCHDOG] Señal GPS desactualizada (>25s sin lecturas nuevas).');
        }
        setGpsStatus('stale');
      }
    }, 6000);

    return () => clearInterval(watchdogTimer);
  }, [permissionStatus, gpsStatus]);

  const value = useMemo(() => ({
    location,
    rawLocation,
    isStationary,
    permissionStatus,
    gpsStatus,
    gpsQuality,
    refreshLocation: getLocation,
    resetHoldingPoint,
  }), [location, rawLocation, isStationary, permissionStatus, gpsStatus, gpsQuality, getLocation, resetHoldingPoint]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
