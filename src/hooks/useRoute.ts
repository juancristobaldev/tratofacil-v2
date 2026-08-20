import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getDirections,
  isUsableRoutingCoordinate,
  type RouteCoordinate,
  type RouteResult,
  type RouteProvider,
  type RouteError,
} from '../utils/directions';

export type RouteStatus = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';

export interface UseRoutePolylineReturn {
  routeCoords: RouteCoordinate[];
  routeDuration: number | null; // segundos
  routeDistance: number | null; // metros
  routeProvider: RouteProvider | null;
  loading: boolean;
  status: RouteStatus;
  error: RouteError | null;
  refresh: () => void;
}

// Constantes de política de actualización en tiempo real (anti-starvation & anti-jitter)
export const ROUTE_REFRESH_MIN_DISTANCE_METERS = 20; // 20m de desplazamiento mínimo para recalcular en movimiento
export const DESTINATION_CHANGE_THRESHOLD_METERS = 10; // 10m de cambio de destino fuerza recálculo inmediato
export const ROUTE_REFRESH_MIN_INTERVAL_MS = 1500; // 1.5s intervalo mínimo entre solicitudes (throttle)
export const ROUTE_REFRESH_MAX_INTERVAL_MS = 6000; // 6.0s espera máxima en movimiento continuo (anti-starvation)
export const MAX_STALE_DISTANCE_METERS = 2000; // 2 km de deriva máxima permitida para conservar ruta previa ante fallos
export const MAX_STALE_AGE_MS = 5 * 60 * 1000; // 5 minutos de antigüedad máxima para conservar ruta previa ante fallos

function getDistanceMeters(p1: RouteCoordinate, p2: RouteCoordinate): number {
  const R = 6371e3;
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.latitude * Math.PI) / 180) * Math.cos((p2.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useRoutePolyline(
  origin: RouteCoordinate | null | undefined,
  dest: RouteCoordinate | null | undefined,
  active: boolean,
): UseRoutePolylineReturn {
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>([]);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeProvider, setRouteProvider] = useState<RouteProvider | null>(null);
  const [status, setStatus] = useState<RouteStatus>('idle');
  const [error, setError] = useState<RouteError | null>(null);

  // Referencias para control de concurrencia y carreras (latest-wins)
  const requestSeqRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  // Referencias de estado de la última ruta calculada (para Last-Known-Good y anti-starvation)
  const lastGoodRouteRef = useRef<RouteResult | null>(null);
  const lastCalculatedOriginRef = useRef<RouteCoordinate | null>(null);
  const lastCalculatedDestRef = useRef<RouteCoordinate | null>(null);
  const lastCalculatedAtRef = useRef<number>(0);
  const lastRequestTimeRef = useRef<number>(0);

  // Temporizadores
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
  }, []);

  const executeFetch = useCallback(
    async (
      orig: RouteCoordinate,
      destination: RouteCoordinate,
      isInitial: boolean,
    ) => {
      clearTimers();

      // Cancelar request anterior en vuelo
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentSeq = ++requestSeqRef.current;
      lastRequestTimeRef.current = Date.now();

      setStatus(isInitial ? 'loading' : 'refreshing');
      if (__DEV__) console.log(`[ROUTE:${isInitial ? 'INITIAL' : 'REFRESH'}] seq=${currentSeq} orig=(${orig.latitude.toFixed(4)},${orig.longitude.toFixed(4)}) dest=(${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)})`);

      try {
        const result = await getDirections(orig, destination, controller.signal);

        // Si la request fue cancelada o superada por una más reciente (race condition), descartar
        if (controller.signal.aborted || currentSeq !== requestSeqRef.current) {
          if (__DEV__) console.log(`[ROUTE:STALE_RESPONSE] seq=${currentSeq} latestSeq=${requestSeqRef.current}`);
          return;
        }

        if (result && result.coordinates.length >= 2) {
          // SWAP ATÓMICO: actualizar toda la geometría y metadatos en un solo ciclo
          setRouteCoords(result.coordinates);
          setRouteDuration(result.durationSeconds);
          setRouteDistance(result.distanceMeters);
          setRouteProvider(result.provider);
          setStatus('ready');
          setError(null);

          lastGoodRouteRef.current = result;
          lastCalculatedOriginRef.current = { ...orig };
          lastCalculatedDestRef.current = { ...destination };
          lastCalculatedAtRef.current = Date.now();

          if (__DEV__) console.log(`[ROUTE:SUCCESS] seq=${currentSeq} provider=${result.provider} points=${result.coordinates.length} distance=${result.distanceMeters}m`);
        } else {
          // Fallo al calcular ruta nueva
          handleRoutingFailure(orig, destination, currentSeq, {
            reason: 'NO_ROUTE',
            message: 'No se encontró ruta vial disponible.',
          });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted || currentSeq !== requestSeqRef.current) {
          return; // Abort deliberado no es un fallo
        }

        handleRoutingFailure(orig, destination, currentSeq, {
          reason: 'NETWORK_ERROR',
          message: err?.message || 'Error de red al consultar ruta.',
        });
      }
    },
    [clearTimers], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleRoutingFailure = (
    orig: RouteCoordinate,
    destination: RouteCoordinate,
    seq: number,
    err: RouteError,
  ) => {
    if (seq !== requestSeqRef.current) return;

    setError(err);
    const lastGood = lastGoodRouteRef.current;

    // Verificar si la última ruta conocida aún es razonable (Last-Known-Good)
    if (lastGood && lastCalculatedOriginRef.current && lastCalculatedDestRef.current) {
      const distFromLastOrigin = getDistanceMeters(orig, lastCalculatedOriginRef.current);
      const distFromLastDest = getDistanceMeters(destination, lastCalculatedDestRef.current);
      const ageMs = Date.now() - lastCalculatedAtRef.current;

      const isStillUsable =
        distFromLastOrigin <= MAX_STALE_DISTANCE_METERS &&
        distFromLastDest <= DESTINATION_CHANGE_THRESHOLD_METERS &&
        ageMs <= MAX_STALE_AGE_MS;

      if (isStillUsable) {
        if (__DEV__) console.warn(`[ROUTE:KEEP_LAST_GOOD] seq=${seq} conservando ruta previa (deriva=${Math.round(distFromLastOrigin)}m, edad=${Math.round(ageMs / 1000)}s)`);
        setStatus('error'); // Estado error pero manteniendo visualmente la ruta previa
        return;
      }

      if (__DEV__) console.warn(`[ROUTE:STALE_LAST_GOOD] seq=${seq} ruta previa expirada o fuera de rango (deriva=${Math.round(distFromLastOrigin)}m). Limpiando ruta.`);
    }

    // Si no hay ruta previa válida o quedó excesivamente obsoleta:
    setRouteCoords([]);
    setRouteDuration(null);
    setRouteDistance(null);
    setRouteProvider(null);
    setStatus('error');
  };

  const manualRefresh = useCallback(() => {
    if (!active || !isUsableRoutingCoordinate(origin) || !isUsableRoutingCoordinate(dest)) return;
    executeFetch(origin!, dest!, false);
  }, [active, origin, dest, executeFetch]);

  useEffect(() => {
    // 1. Estado inactivo o coordenadas ausentes / sentinela
    if (!active || !isUsableRoutingCoordinate(origin) || !isUsableRoutingCoordinate(dest)) {
      clearTimers();
      abortRef.current?.abort();
      setRouteCoords([]);
      setRouteDuration(null);
      setRouteDistance(null);
      setRouteProvider(null);
      setStatus('idle');
      setError(null);
      lastGoodRouteRef.current = null;
      lastCalculatedOriginRef.current = null;
      lastCalculatedDestRef.current = null;
      return;
    }

    const currentOrigin: RouteCoordinate = { latitude: origin!.latitude, longitude: origin!.longitude };
    const currentDest: RouteCoordinate = { latitude: dest!.latitude, longitude: dest!.longitude };

    // 2. CARGA INICIAL: Si aún no tenemos ruta calculada, ejecutar INMEDIATAMENTE (0ms delay)
    if (!lastGoodRouteRef.current || lastGoodRouteRef.current.coordinates.length < 2) {
      executeFetch(currentOrigin, currentDest, true);
      return;
    }

    // 3. CAMBIO DE DESTINO: Si el destino cambió significativamente (> 10m), recálculo inmediato
    const lastDest = lastCalculatedDestRef.current;
    if (lastDest && getDistanceMeters(currentDest, lastDest) > DESTINATION_CHANGE_THRESHOLD_METERS) {
      executeFetch(currentOrigin, currentDest, false);
      return;
    }

    // 4. MOVIMIENTO EN TIEMPO REAL (GPS / Socket):
    const lastOrig = lastCalculatedOriginRef.current;
    if (lastOrig) {
      const movedMeters = getDistanceMeters(currentOrigin, lastOrig);

      // Jitter / movimiento insignificante (< 20 metros): ignorar para evitar spam de requests
      if (movedMeters < ROUTE_REFRESH_MIN_DISTANCE_METERS) {
        return;
      }

      // Movimiento significativo (>= 20 metros):
      const timeSinceLastRequest = Date.now() - lastRequestTimeRef.current;

      // Throttle: respetar intervalo mínimo de 1.5s
      const delayMs =
        timeSinceLastRequest < ROUTE_REFRESH_MIN_INTERVAL_MS
          ? Math.max(200, ROUTE_REFRESH_MIN_INTERVAL_MS - timeSinceLastRequest)
          : 400;

      // Debounce timer para agrupar actualizaciones rápidas consecutivas
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        executeFetch(currentOrigin, currentDest, false);
      }, delayMs);

      // Anti-Starvation: Garantizar que si el GPS emite constantemente cada 500ms,
      // se ejecute un recálculo a más tardar después de ROUTE_REFRESH_MAX_INTERVAL_MS (6s).
      if (!maxWaitTimerRef.current) {
        maxWaitTimerRef.current = setTimeout(() => {
          executeFetch(currentOrigin, currentDest, false);
        }, ROUTE_REFRESH_MAX_INTERVAL_MS);
      }
    }

    return () => {
      // Limpiar timers en cleanup del efecto
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [
    active,
    origin?.latitude,
    origin?.longitude,
    dest?.latitude,
    dest?.longitude,
    executeFetch,
    clearTimers,
  ]);

  // Limpieza al desmontar el hook
  useEffect(() => {
    return () => {
      clearTimers();
      abortRef.current?.abort();
    };
  }, [clearTimers]);

  return {
    routeCoords,
    routeDuration,
    routeDistance,
    routeProvider,
    loading: status === 'loading' || status === 'refreshing',
    status,
    error,
    refresh: manualRefresh,
  };
}
