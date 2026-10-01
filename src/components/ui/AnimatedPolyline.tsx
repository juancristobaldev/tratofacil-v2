import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Polyline } from 'react-native-maps';
import { TOKENS } from '../../theme';
import { getAdaptivePolylineWidth, trimRouteToPosition } from '../../utils/mapGeometry';
import { MIN_RENDERABLE_POLYLINE_METERS } from '../../utils/directions';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface AnimatedPolylineProps {
  /** Array de coordenadas que definen la ruta completa */
  coordinates: LatLng[];
  /**
   * Posición actual del vehículo/proveedor para recortar automáticamente el tramo ya recorrido.
   * Elimina la cola de polyline detrás del pin en movimiento y conecta la ruta directamente al vehículo.
   */
  currentPosition?: LatLng | null;
  /** Color del trazo principal (default: TOKENS.colors.brand500) */
  strokeColor?: string;
  /** Ancho del trazo principal en px (si no se especifica y hay latitudeDelta, se calcula adaptativamente) */
  strokeWidth?: number;
  /**
   * @deprecated Directriz de diseño: Las rutas nunca deben ser segmentadas ni punteadas. Se mantiene por retrocompatibilidad de tipos, pero el trazo es siempre continuo.
   */
  dashed?: boolean;
  /** Color del resplandor/halo exterior (default: rgba(230, 0, 126, 0.22)) */
  glowColor?: string;
  /** Ancho del halo exterior en px (si no se especifica, se calcula proporcionalmente) */
  glowWidth?: number;
  /** Nivel de zoom o delta de latitud actual del mapa para adaptar el ancho a la calle */
  latitudeDelta?: number;
  /** Si debe calcular automáticamente el ancho adaptativo según latitudeDelta (default: true) */
  adaptiveWidth?: boolean;
  /** Duración de la animación de dibujado en ms (default: 1000) */
  duration?: number;
  /** Duración del desvanecimiento al limpiarse la ruta en ms (default: 250) */
  fadeDuration?: number;
  /** Si la animación progresiva debe ejecutarse al recibir una nueva ruta (default: true) */
  animate?: boolean;
  /** Callback opcional al finalizar la animación de revelación */
  onAnimationComplete?: () => void;
  /** Base zIndex para las capas de la Polyline (default: 900) */
  zIndex?: number;
}

/**
 * Modula el canal alfa de un color hexadecimal o rgb/rgba para transiciones suaves de opacidad.
 */
export function applyAlphaToColor(color: string, alphaMultiplier: number): string {
  if (alphaMultiplier >= 1) return color;
  if (alphaMultiplier <= 0) return 'rgba(0, 0, 0, 0)';

  const trimmed = color.trim();

  // Hexadecimal (#rrggbb o #rgb)
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alphaMultiplier.toFixed(3)})`;
    }
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${alphaMultiplier.toFixed(3)})`;
    }
  }

  // rgba(r, g, b, a)
  const rgbaMatch = trimmed.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    const finalAlpha = Math.max(0, Math.min(1, parseFloat(a) * alphaMultiplier));
    return `rgba(${r}, ${g}, ${b}, ${finalAlpha.toFixed(3)})`;
  }

  // rgb(r, g, b)
  const rgbMatch = trimmed.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${alphaMultiplier.toFixed(3)})`;
  }

  return color;
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
 * - Trazo 100% continuo y sólido (NUNCA segmentada ni punteada, cero lineDashPattern).
 * - Cobertura adaptativa del ancho completo de la calle según el nivel de zoom (latitudeDelta).
 * - Animación progresiva (draw-in) con interpolación geográfica basada en distancia real (Haversine).
 * - Cero re-renders en componentes padre (el bucle RAF está 100% aislado dentro de este componente).
 * - Control atómico de concurrencia y cancelación de frames para evitar race conditions.
 * - Sincronización limpia con ciclo de vida (desmontaje, cambios de ruta y AppState background/foreground).
 * - Renderizado en doble capa: Halo exterior difuso (glow) + trazo continuo de alto contraste.
 */
export const AnimatedPolyline: React.FC<AnimatedPolylineProps> = ({
  coordinates,
  currentPosition,
  strokeColor = TOKENS.colors.brand500,
  strokeWidth,
  dashed = false,
  glowColor = 'rgba(230, 0, 126, 0.22)',
  glowWidth,
  latitudeDelta,
  adaptiveWidth = true,
  duration = 1000,
  fadeDuration = 250,
  animate = true,
  onAnimationComplete,
  zIndex = 900,
}) => {
  const lastSegmentIndexRef = useRef<number>(0);
  const prevCoordsKeyRef = useRef<string>('');

  const currentCoordsKey = useMemo(() => {
    if (!coordinates || coordinates.length < 2) return '';
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    return `${first.latitude.toFixed(5)},${first.longitude.toFixed(5)}->${last.latitude.toFixed(5)},${last.longitude.toFixed(5)}`;
  }, [coordinates]);

  if (currentCoordsKey !== prevCoordsKeyRef.current) {
    prevCoordsKeyRef.current = currentCoordsKey;
    lastSegmentIndexRef.current = 0;
  }

  // Recorte dinámico de ruta (Vanishing Polyline): si currentPosition está presente,
  // recorta los tramos ya transitados para que la polyline nazca directamente en el pin.
  const activeCoordinates = useMemo(() => {
    if (!currentPosition || !coordinates || coordinates.length < 2) {
      return coordinates;
    }
    const trimmed = trimRouteToPosition(coordinates, currentPosition, {
      lastSegmentIndex: lastSegmentIndexRef.current,
      maxSnapDistanceMeters: 40,
    });
    return trimmed;
  }, [coordinates, currentPosition]);

  const adaptiveDimensions = useMemo(() => {
    if (adaptiveWidth && latitudeDelta != null) {
      return getAdaptivePolylineWidth(latitudeDelta);
    }
    return null;
  }, [adaptiveWidth, latitudeDelta]);

  const effectiveStrokeWidth = strokeWidth ?? adaptiveDimensions?.strokeWidth ?? 8;
  const effectiveGlowWidth = glowWidth ?? adaptiveDimensions?.glowWidth ?? (effectiveStrokeWidth + 6);

  const [opacity, setOpacity] = useState<number>(1);
  const [displayedCoords, setDisplayedCoords] = useState<LatLng[]>(() => {
    if (!activeCoordinates || activeCoordinates.length < 2) return [];
    // Si animate está activo, iniciamos en [] hasta que el primer frame calcule el avance visible.
    // NUNCA inicializar con [c0, c0], ya que 2 puntos idénticos con lineCap="round" dibujan un punto/círculo sólido en el mapa.
    return animate ? [] : activeCoordinates;
  });

  const displayedCoordsRef = useRef<LatLng[]>(displayedCoords);
  displayedCoordsRef.current = displayedCoords;

  const animationSeqRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const fadeRafIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<LatLng[] | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const hasDrawnInitialRef = useRef<boolean>(!animate && Boolean(activeCoordinates && activeCoordinates.length >= 2));

  // Pre-calcular distancias acumuladas solo cuando cambian las coordenadas activas de entrada
  const { cumulativeDistances, totalDistance } = useMemo(() => {
    if (!activeCoordinates || activeCoordinates.length < 2) {
      return { cumulativeDistances: [0], totalDistance: 0 };
    }
    return computeCumulativeDistances(activeCoordinates);
  }, [activeCoordinates]);

  const cancelActiveAnimation = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const cancelFadeAnimation = () => {
    if (fadeRafIdRef.current !== null) {
      cancelAnimationFrame(fadeRafIdRef.current);
      fadeRafIdRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelActiveAnimation();
      cancelFadeAnimation();
    };
  }, []);

  // Manejo de AppState: si pasa a background, pausar y fijar la ruta completa
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState.match(/inactive|background/)) {
          cancelActiveAnimation();
          cancelFadeAnimation();
          if (activeCoordinates && activeCoordinates.length >= 2) {
            setDisplayedCoords(activeCoordinates);
            setOpacity(1);
            hasDrawnInitialRef.current = true;
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [activeCoordinates]);

  // Efecto principal de animación y transición de coordenadas
  useEffect(() => {
    // 1. Coordenadas ausentes o vacías: manejar fade-out suave o limpieza inmediata
    if (!activeCoordinates || activeCoordinates.length < 2) {
      cancelActiveAnimation();

      const prevDisplayed = displayedCoordsRef.current;
      // Iniciar fade-out suave si había una ruta visible previamente
      if (
        prevDisplayed.length >= 2 &&
        animate &&
        fadeDuration > 0 &&
        isMountedRef.current
      ) {
        cancelFadeAnimation();
        const startFade = Date.now();
        const fadeFrame = () => {
          if (!isMountedRef.current) return;
          const elapsed = Date.now() - startFade;
          const progress = Math.min(1, elapsed / fadeDuration);
          const currentAlpha = 1 - progress;

          setOpacity(currentAlpha);

          if (progress < 1) {
            fadeRafIdRef.current = requestAnimationFrame(fadeFrame);
          } else {
            fadeRafIdRef.current = null;
            setDisplayedCoords([]);
            setOpacity(1);
            lastCoordsRef.current = null;
            hasDrawnInitialRef.current = false;
          }
        };
        fadeRafIdRef.current = requestAnimationFrame(fadeFrame);
        return;
      }

      // Limpieza instantánea si no se requiere fade-out
      cancelFadeAnimation();
      setDisplayedCoords([]);
      setOpacity(1);
      lastCoordsRef.current = null;
      hasDrawnInitialRef.current = false;
      return;
    }

    // 2. Coordenadas válidas: cancelar fade-out si estaba activo y restablecer opacidad
    cancelFadeAnimation();
    setOpacity(1);

    lastCoordsRef.current = activeCoordinates;

    // 3. Reemplazo Atómico en Movimiento (Hallazgo 3):
    // Si la ruta inicial ya se dibujó con anterioridad (o animate=false), cualquier recálculo,
    // giro o actualización de GPS se aplica instantáneamente sin vaciar la pantalla ni rehacer el draw-in de 1s.
    if (hasDrawnInitialRef.current || !animate || duration <= 0) {
      cancelActiveAnimation();
      setDisplayedCoords(activeCoordinates);
      hasDrawnInitialRef.current = true;
      onAnimationComplete?.();
      return;
    }

    // 4. Primer dibujado progresivo (Draw-in inicial 1000ms al cargar una nueva ruta)
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
        activeCoordinates,
        cumulativeDistances,
        totalDistance,
        easedProgress,
      );

      setDisplayedCoords(interpolated);

      if (rawProgress < 1) {
        rafIdRef.current = requestAnimationFrame(frame);
      } else {
        rafIdRef.current = null;
        setDisplayedCoords(activeCoordinates); // Asegurar coordenadas exactas finales
        hasDrawnInitialRef.current = true;
        onAnimationComplete?.();
      }
    };

    rafIdRef.current = requestAnimationFrame(frame);

    return () => {
      cancelActiveAnimation();
      cancelFadeAnimation();
    };
  }, [
    activeCoordinates,
    cumulativeDistances,
    totalDistance,
    duration,
    fadeDuration,
    animate,
    onAnimationComplete,
  ]);

  // Salvaguarda: no renderizar si no hay coordenadas visibles,
  // si la opacidad llegó a 0, o si el primer y último punto son idénticos (anti-blob).
  if (!displayedCoords || displayedCoords.length < 2 || opacity <= 0) {
    return null;
  }

  // Cuando no estamos en fade-out (opacidad plena), verificar el umbral mínimo de renderizado (35m)
  if (opacity >= 1 && totalDistance < MIN_RENDERABLE_POLYLINE_METERS) {
    return null;
  }

  if (computeHaversineDistance(displayedCoords[0], displayedCoords[displayedCoords.length - 1]) < 1) {
    return null;
  }

  const effectiveGlowColor = applyAlphaToColor(glowColor, opacity);
  const effectiveStrokeColor = applyAlphaToColor(strokeColor, opacity);

  return (
    <>
      {/* 1. Capa de resplandor / aura exterior (Glow Halo continuo y suave) */}
      <Polyline
        coordinates={displayedCoords}
        strokeColor={effectiveGlowColor}
        strokeWidth={effectiveGlowWidth}
        lineCap="round"
        lineJoin="round"
        zIndex={zIndex}
      />
      {/* 2. Capa de trazo principal (Magenta de alto contraste con uniones redondeadas continuas) */}
      <Polyline
        coordinates={displayedCoords}
        strokeColor={effectiveStrokeColor}
        strokeWidth={effectiveStrokeWidth}
        lineCap="round"
        lineJoin="round"
        zIndex={zIndex + 1}
      />
    </>
  );
};

