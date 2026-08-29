import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Polyline } from 'react-native-maps';
import { TOKENS } from '../../theme';
import { getAdaptivePolylineWidth } from '../../utils/mapGeometry';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface AnimatedPolylineProps {
  /** Array de coordenadas que definen la ruta completa */
  coordinates: LatLng[];
  /** Color del trazo principal (default: TOKENS.colors.brand500) */
  strokeColor?: string;
  /** Ancho del trazo principal en px (si no se especifica y hay latitudeDelta, se calcula adaptativamente) */
  strokeWidth?: number;
  /** Si debe tener patrón de línea punteada estilo ui-kit (default: true) */
  dashed?: boolean;
  /** Color del resplandor/halo exterior (default: rgba(230, 0, 126, 0.22)) */
  glowColor?: string;
  /** Ancho del halo exterior en px (si no se especifica, se calcula proporcionalmente) */
  glowWidth?: number;
  /** Nivel de zoom o delta de latitud actual del mapa para adaptar el ancho a la calle */
  latitudeDelta?: number;
  /** Si debe calcular automáticamente el ancho adaptativo según latitudeDelta (default: true) */
  adaptiveWidth?: boolean;
  /** Duración de la animación en ms (default: 1000) */
  duration?: number;
  /** Si la animación progresiva debe ejecutarse al recibir una nueva ruta (default: true) */
  animate?: boolean;
  /** Callback opcional al finalizar la animación de revelación */
  onAnimationComplete?: () => void;
  /** Base zIndex para las capas de la Polyline (default: 900) */
  zIndex?: number;
}

/**
 * Calcula la distancia ortodrómica en metros entre dos puntos geográficos (Haversine).
 */
export function computeHaversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Pre-calcula el array de distancias acumuladas a lo largo de la ruta en metros.
 */
export function computeCumulativeDistances(coords: LatLng[]): {
  cumulativeDistances: number[];
  totalDistance: number;
} {
  const len = coords.length;
  if (len < 2) {
    return { cumulativeDistances: [0], totalDistance: 0 };
  }

  const cumulativeDistances = new Array<number>(len);
  cumulativeDistances[0] = 0;
  let total = 0;

  for (let i = 1; i < len; i++) {
    const d = computeHaversineDistance(coords[i - 1], coords[i]);
    total += d;
    cumulativeDistances[i] = total;
  }

  return { cumulativeDistances, totalDistance: total };
}

/**
 * Busca por bisección binaria el segmento en el que se encuentra `targetDist`.
 * Retorna el índice k tal que cumulativeDistances[k] <= targetDist <= cumulativeDistances[k+1].
 */
export function findSegmentIndex(
  cumulativeDistances: number[],
  targetDist: number,
): number {
  let low = 0;
  let high = cumulativeDistances.length - 2;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (cumulativeDistances[mid + 1] < targetDist) {
      low = mid + 1;
    } else if (cumulativeDistances[mid] > targetDist) {
      high = mid - 1;
    } else {
      return mid;
    }
  }

  return Math.max(0, Math.min(cumulativeDistances.length - 2, low));
}

/**
 * Interpola geodésicamente la porción visible de la ruta para un progreso t in [0, 1].
 */
export function interpolateRouteAtProgress(
  coords: LatLng[],
  cumulativeDistances: number[],
  totalDistance: number,
  t: number,
): LatLng[] {
  if (coords.length < 2) return coords;
  if (t <= 0) return [coords[0], coords[0]];
  if (t >= 1 || totalDistance <= 0) return coords;

  const targetDist = t * totalDistance;
  const k = findSegmentIndex(cumulativeDistances, targetDist);

  const dStart = cumulativeDistances[k];
  const dEnd = cumulativeDistances[k + 1];
  const segmentLen = dEnd - dStart;

  const ratio = segmentLen > 0 ? (targetDist - dStart) / segmentLen : 0;
  const clampedRatio = Math.max(0, Math.min(1, ratio));

  const p0 = coords[k];
  const p1 = coords[k + 1];

  const interpLat = p0.latitude + clampedRatio * (p1.latitude - p0.latitude);
  const interpLon = p0.longitude + clampedRatio * (p1.longitude - p0.longitude);

  const result: LatLng[] = new Array(k + 2);
  for (let i = 0; i <= k; i++) {
    result[i] = coords[i];
  }
  result[k + 1] = { latitude: interpLat, longitude: interpLon };

  return result;
}

/**
 * Curva de aceleración/desaceleración suave (Cubic Ease-Out).
 */
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Polyline de alto rendimiento y fidelidad visual inspirado en ui-kit.html (#screen-tracking).
 *
 * Características:
 * - Animación progresiva (draw-in) con interpolación geográfica basada en distancia real (Haversine).
 * - Cero re-renders en componentes padre (el bucle RAF está 100% aislado dentro de este componente).
 * - Control atómico de concurrencia y cancelación de frames para evitar race conditions.
 * - Sincronización limpia con ciclo de vida (desmontaje, cambios de ruta y AppState background/foreground).
 * - Renderizado en doble capa: Halo exterior difuso (glow) + trazo magenta de alto contraste.
 */
export const AnimatedPolyline: React.FC<AnimatedPolylineProps> = ({
  coordinates,
  strokeColor = TOKENS.colors.brand500,
  strokeWidth,
  dashed = true,
  glowColor = 'rgba(230, 0, 126, 0.22)',
  glowWidth,
  latitudeDelta,
  adaptiveWidth = true,
  duration = 1000,
  animate = true,
  onAnimationComplete,
  zIndex = 900,
}) => {
  const adaptiveDimensions = useMemo(() => {
    if (adaptiveWidth && latitudeDelta != null) {
      return getAdaptivePolylineWidth(latitudeDelta);
    }
    return null;
  }, [adaptiveWidth, latitudeDelta]);

  const effectiveStrokeWidth = strokeWidth ?? adaptiveDimensions?.strokeWidth ?? 4;
  const effectiveGlowWidth = glowWidth ?? adaptiveDimensions?.glowWidth ?? (effectiveStrokeWidth + 4);

  const [displayedCoords, setDisplayedCoords] = useState<LatLng[]>(() => {
    if (!coordinates || coordinates.length < 2) return [];
    // Si animate está activo, iniciamos en los primeros puntos para no parpadear
    return animate ? [coordinates[0], coordinates[0]] : coordinates;
  });

  const animationSeqRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<LatLng[] | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Pre-calcular distancias acumuladas solo cuando cambian las coordenadas de entrada
  const { cumulativeDistances, totalDistance } = useMemo(() => {
    if (!coordinates || coordinates.length < 2) {
      return { cumulativeDistances: [0], totalDistance: 0 };
    }
    return computeCumulativeDistances(coordinates);
  }, [coordinates]);

  const cancelActiveAnimation = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelActiveAnimation();
    };
  }, []);

  // Manejo de AppState: si pasa a background, pausar y fijar la ruta completa
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState.match(/inactive|background/)) {
          cancelActiveAnimation();
          if (coordinates && coordinates.length >= 2) {
            setDisplayedCoords(coordinates);
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [coordinates]);

  // Efecto principal de animación y transición de coordenadas
  useEffect(() => {
    if (!coordinates || coordinates.length < 2) {
      cancelActiveAnimation();
      setDisplayedCoords([]);
      lastCoordsRef.current = null;
      return;
    }

    const prevCoords = lastCoordsRef.current;
    lastCoordsRef.current = coordinates;

    // Verificar si es un update menor de GPS (mismo destino y origen similar < 40m)
    if (prevCoords && prevCoords.length >= 2) {
      const prevDest = prevCoords[prevCoords.length - 1];
      const newDest = coordinates[coordinates.length - 1];
      const prevOrig = prevCoords[0];
      const newOrig = coordinates[0];

      const destDrift = computeHaversineDistance(prevDest, newDest);
      const origDrift = computeHaversineDistance(prevOrig, newOrig);

      // Si el destino es el mismo y el cambio es un desplazamiento incremental en tiempo real
      if (destDrift < 15 && origDrift < 40 && !animate) {
        cancelActiveAnimation();
        setDisplayedCoords(coordinates);
        return;
      }
    }

    if (!animate || duration <= 0) {
      cancelActiveAnimation();
      setDisplayedCoords(coordinates);
      onAnimationComplete?.();
      return;
    }

    // Iniciar nueva animación progresiva con Sequence Token para evitar race conditions
    cancelActiveAnimation();
    const currentSeq = ++animationSeqRef.current;
    const startTime = Date.now();

    const frame = () => {
      if (!isMountedRef.current || currentSeq !== animationSeqRef.current) {
        return;
      }

      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutCubic(rawProgress);

      const interpolated = interpolateRouteAtProgress(
        coordinates,
        cumulativeDistances,
        totalDistance,
        easedProgress,
      );

      setDisplayedCoords(interpolated);

      if (rawProgress < 1) {
        rafIdRef.current = requestAnimationFrame(frame);
      } else {
        rafIdRef.current = null;
        setDisplayedCoords(coordinates); // Asegurar coordenadas exactas finales
        onAnimationComplete?.();
      }
    };

    rafIdRef.current = requestAnimationFrame(frame);

    return () => {
      cancelActiveAnimation();
    };
  }, [
    coordinates,
    cumulativeDistances,
    totalDistance,
    duration,
    animate,
    onAnimationComplete,
  ]);

  if (!displayedCoords || displayedCoords.length < 2) {
    return null;
  }

  return (
    <>
      {/* 1. Capa de resplandor / aura exterior (Glow Halo) */}
      <Polyline
        coordinates={displayedCoords}
        strokeColor={glowColor}
        strokeWidth={effectiveGlowWidth}
        lineDashPattern={[0]}
        zIndex={zIndex}
      />
      {/* 2. Capa de trazo principal (Magenta de alto contraste con patrón dashed del mockup) */}
      <Polyline
        coordinates={displayedCoords}
        strokeColor={strokeColor}
        strokeWidth={effectiveStrokeWidth}
        lineDashPattern={dashed ? [8, 5] : [0]}
        zIndex={zIndex + 1}
      />
    </>
  );
};

