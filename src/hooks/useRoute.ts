import { useState, useEffect, useRef } from 'react';
import { getDirections } from '../utils/directions';

interface Coords {
  latitude: number;
  longitude: number;
}

export function useRoutePolyline(
  origin: Coords | null,
  dest: Coords | null,
  active: boolean,
) {
  const [routeCoords, setRouteCoords] = useState<Coords[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastKeyRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || !origin || !dest) {
      setRouteCoords([]);
      return;
    }

    const key = `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)};${dest.latitude.toFixed(5)},${dest.longitude.toFixed(5)}`;
    if (key === lastKeyRef.current) return;

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const result = await getDirections(origin, dest, controller.signal);
        if (controller.signal.aborted) return;
        if (result) {
          setRouteCoords(result.coordinates);
          lastKeyRef.current = key;
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 2000);

    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [active, origin?.latitude, origin?.longitude, dest?.latitude, dest?.longitude]);

  return { routeCoords, loading };
}
