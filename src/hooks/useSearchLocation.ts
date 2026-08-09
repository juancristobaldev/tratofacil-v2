import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from '../context/LocationContext';
import { reverseGeocode } from '../utils/geocode';

const STORAGE_KEY = 'search_location';

interface UseSearchLocationReturn {
  location: string;
  setLocation: (value: string) => void;
  loaded: boolean;
}

/**
 * Ubicación de búsqueda con persistencia.
 * - Por defecto usa la ubicación real del usuario (reverse-geocode del GPS).
 * - Si el usuario elige otra, queda guardada y se usa en futuras sesiones.
 */
export function useSearchLocation(): UseSearchLocationReturn {
  const { location: gpsLocation } = useLocation();
  const [location, setLocationValue] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          if (!cancelled) setLocationValue(saved);
          return;
        }

        const coords = gpsLocation?.coords;
        if (coords) {
          const name = await reverseGeocode(coords.latitude, coords.longitude);
          if (name && !cancelled) setLocationValue(name);
        }
      } catch {
        // silencioso: si no se puede resolver, queda vacío
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [gpsLocation?.coords]);

  const setLocation = useCallback((value: string) => {
    setLocationValue(value);
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
  }, []);

  return { location, setLocation, loaded };
}
