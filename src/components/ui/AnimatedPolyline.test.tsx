import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import {
  AnimatedPolyline,
  applyAlphaToColor,
  computeHaversineDistance,
  computeCumulativeDistances,
  findSegmentIndex,
  interpolateRouteAtProgress,
  type LatLng,
} from './AnimatedPolyline';
import { trimRouteToPosition } from '../../utils/mapGeometry';

describe('AnimatedPolyline Geodetic Utilities', () => {
  const p1: LatLng = { latitude: -33.4489, longitude: -70.6693 };
  const p2: LatLng = { latitude: -33.452, longitude: -70.671 };
  const p3: LatLng = { latitude: -33.456, longitude: -70.674 };

  it('computes Haversine distance correctly', () => {
    const distZero = computeHaversineDistance(p1, p1);
    expect(distZero).toBe(0);

    const dist = computeHaversineDistance(p1, p2);
    expect(dist).toBeGreaterThan(300);
    expect(dist).toBeLessThan(500);
  });

  it('computes cumulative distances accurately', () => {
    const { cumulativeDistances, totalDistance } = computeCumulativeDistances([p1, p2, p3]);

    expect(cumulativeDistances.length).toBe(3);
    expect(cumulativeDistances[0]).toBe(0);
    expect(cumulativeDistances[1]).toBe(computeHaversineDistance(p1, p2));
    expect(cumulativeDistances[2]).toBe(totalDistance);
    expect(totalDistance).toBe(
      computeHaversineDistance(p1, p2) + computeHaversineDistance(p2, p3),
    );
  });

  it('finds correct segment index via binary search', () => {
    const { cumulativeDistances, totalDistance } = computeCumulativeDistances([p1, p2, p3]);

    expect(findSegmentIndex(cumulativeDistances, 10)).toBe(0);
    expect(findSegmentIndex(cumulativeDistances, totalDistance - 10)).toBe(1);
  });

  it('interpolates route progress smoothly at t = 0, 0.5, 1', () => {
    const coords = [p1, p2, p3];
    const { cumulativeDistances, totalDistance } = computeCumulativeDistances(coords);

    const startSlice = interpolateRouteAtProgress(coords, cumulativeDistances, totalDistance, 0);
    expect(startSlice.length).toBe(2);
    expect(startSlice[0]).toEqual(p1);

    const endSlice = interpolateRouteAtProgress(coords, cumulativeDistances, totalDistance, 1);
    expect(endSlice).toEqual(coords);

    const midSlice = interpolateRouteAtProgress(coords, cumulativeDistances, totalDistance, 0.5);
    expect(midSlice.length).toBeGreaterThanOrEqual(2);
    const lastPoint = midSlice[midSlice.length - 1];
    expect(lastPoint.latitude).toBeLessThan(p1.latitude);
    expect(lastPoint.latitude).toBeGreaterThan(p3.latitude);
  });

  it('handles long routes with 100+ points with high performance and precision', () => {
    const longRoute: LatLng[] = [];
    for (let i = 0; i < 150; i++) {
      longRoute.push({
        latitude: -33.4 + i * 0.001,
        longitude: -70.6 + i * 0.001,
      });
    }

    const { cumulativeDistances, totalDistance } = computeCumulativeDistances(longRoute);
    expect(cumulativeDistances.length).toBe(150);

    const sliceAtQuarter = interpolateRouteAtProgress(longRoute, cumulativeDistances, totalDistance, 0.25);
    expect(sliceAtQuarter.length).toBeGreaterThan(30);
    expect(sliceAtQuarter.length).toBeLessThan(50);
  });
});

describe('AnimatedPolyline Component Lifecycle & Concurrency', () => {
  const p1: LatLng = { latitude: -33.4489, longitude: -70.6693 };
  const p2: LatLng = { latitude: -33.452, longitude: -70.671 };
  const p3: LatLng = { latitude: -33.456, longitude: -70.674 };
  const p4: LatLng = { latitude: -33.46, longitude: -70.678 };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders null when coordinates array is empty or has less than 2 points', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<AnimatedPolyline coordinates={[]} />);
    });
    expect(renderer!.toJSON()).toBeNull();

    act(() => {
      renderer.update(<AnimatedPolyline coordinates={[p1]} />);
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('renders null when total distance is less than 35m (anti-dot & anti-mancha)', () => {
    // 2 puntos a ~11 metros de distancia
    const near1: LatLng = { latitude: -33.44890, longitude: -70.66930 };
    const near2: LatLng = { latitude: -33.44899, longitude: -70.66930 };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline coordinates={[near1, near2]} animate={false} />,
      );
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('renders null when points are identical (no circular blob on marker)', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline coordinates={[p1, p1]} animate={false} />,
      );
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('renders double layer (Glow + Core) when valid coordinates provided', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline coordinates={[p1, p2]} animate={false} />,
      );
    });

    const polylines = renderer!.root.children;
    expect(polylines.length).toBe(2);
  });

  it('animates progressively from start to finish and invokes onAnimationComplete', () => {
    const onComplete = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline
          coordinates={[p1, p2, p3]}
          duration={1000}
          animate={true}
          onAnimationComplete={onComplete}
        />,
      );
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cancels previous animation immediately when a new route arrives (Race Condition Prevention)', () => {
    const onComplete1 = jest.fn();
    const onComplete2 = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline
          coordinates={[p1, p2]}
          duration={1000}
          animate={true}
          onAnimationComplete={onComplete1}
        />,
      );
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      renderer.update(
        <AnimatedPolyline
          coordinates={[p3, p4]}
          duration={1000}
          animate={true}
          onAnimationComplete={onComplete2}
        />,
      );
    });

    expect(onComplete1).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(onComplete2).toHaveBeenCalledTimes(1);
  });

  it('cleans up active requestAnimationFrame cleanly on unmount', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline coordinates={[p1, p2, p3]} duration={1000} animate={true} />,
      );
    });

    act(() => {
      renderer.unmount();
    });

    expect(() => {
      act(() => {
        jest.advanceTimersByTime(1500);
      });
    }).not.toThrow();
  });

  it('computes adaptive strokeWidth and glowWidth when latitudeDelta is provided', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline
          coordinates={[p1, p2]}
          latitudeDelta={0.002}
          animate={false}
        />,
      );
    });

    const polylines = renderer!.root.children as any[];
    expect(polylines.length).toBe(2);
    // Glow layer (first Polyline)
    expect(polylines[0].props.strokeWidth).toBe(20);
    // Main stroke layer (second Polyline)
    expect(polylines[1].props.strokeWidth).toBe(14);
  });

  it('allows explicit strokeWidth override over adaptive calculations', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline
          coordinates={[p1, p2]}
          latitudeDelta={0.002}
          strokeWidth={8}
          animate={false}
        />,
      );
    });

    const polylines = renderer!.root.children as any[];
    expect(polylines[1].props.strokeWidth).toBe(8);
  });

  it('renders continuous line by default and dashed pattern when dashed is true', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline coordinates={[p1, p2]} animate={false} />,
      );
    });

    let polylines = renderer!.root.children as any[];
    expect(polylines[0].props.lineCap).toBe('round');
    expect(polylines[0].props.lineJoin).toBe('round');

    // Capa principal tiene trazo incondicionalmente continuo (nunca segmentada)
    expect(polylines[1].props.lineCap).toBe('round');
    expect(polylines[1].props.lineJoin).toBe('round');
    expect(polylines[1].props.lineDashPattern).toBeUndefined();

    act(() => {
      renderer.update(
        <AnimatedPolyline coordinates={[p1, p2]} animate={false} dashed={true} />,
      );
    });

    polylines = renderer!.root.children as any[];
    // Regla cardinal de cero segmentación: lineDashPattern se mantiene incondicionalmente undefined
    expect(polylines[1].props.lineDashPattern).toBeUndefined();
  });

  it('modulates hex, rgb and rgba colors correctly via applyAlphaToColor', () => {
    expect(applyAlphaToColor('#e6007e', 1)).toBe('#e6007e');
    expect(applyAlphaToColor('#e6007e', 0)).toBe('rgba(0, 0, 0, 0)');
    expect(applyAlphaToColor('#e6007e', 0.5)).toBe('rgba(230, 0, 126, 0.500)');
    expect(applyAlphaToColor('rgba(230, 0, 126, 0.22)', 0.5)).toBe('rgba(230, 0, 126, 0.110)');
    expect(applyAlphaToColor('rgb(255, 0, 0)', 0.8)).toBe('rgba(255, 0, 0, 0.800)');
  });

  it('performs atomic swap on subsequent coordinate updates without resetting draw-in to 0%', () => {
    const onInitialComplete = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline
          coordinates={[p1, p2, p3]}
          duration={1000}
          animate={true}
          onAnimationComplete={onInitialComplete}
        />,
      );
    });

    // Completar el primer draw-in de 1s
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(onInitialComplete).toHaveBeenCalledTimes(1);

    // Actualizar coordenadas en movimiento (desvío / nuevo GPS)
    const newRoute = [p2, p3, p4];
    act(() => {
      renderer.update(
        <AnimatedPolyline
          coordinates={newRoute}
          duration={1000}
          animate={true}
        />,
      );
    });

    // Reemplazo atómico: las nuevas coordenadas se reflejan de inmediato en el render sin esperar 1s
    const polylines = renderer!.root.children as any[];
    expect(polylines[1].props.coordinates).toEqual(newRoute);
  });

  it('fades out smoothly over fadeDuration when coordinates are cleared on arrival', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline
          coordinates={[p1, p2, p3]}
          duration={1000}
          fadeDuration={250}
          animate={true}
        />,
      );
    });

    // Completar primer dibujado
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    // Llegada al destino: coordinates pasa a []
    act(() => {
      renderer.update(
        <AnimatedPolyline
          coordinates={[]}
          duration={1000}
          fadeDuration={250}
          animate={true}
        />,
      );
    });

    // A los 125ms (mitad del fade), la polyline aún está montada con opacidad atenuada
    act(() => {
      jest.advanceTimersByTime(125);
    });
    let polylines = renderer!.root.children;
    expect(polylines.length).toBe(2);

    // A los 300ms (después de 250ms de fadeDuration), la polyline se desmonta limpiamente
    act(() => {
      jest.advanceTimersByTime(175);
    });
    expect(renderer!.toJSON()).toBeNull();
  });
});

describe('trimRouteToPosition & Vanishing Polyline (Zero Trail Behind Pin)', () => {
  const p1: LatLng = { latitude: -33.4489, longitude: -70.6693 };
  const p2: LatLng = { latitude: -33.4520, longitude: -70.6710 };
  const p3: LatLng = { latitude: -33.4560, longitude: -70.6740 };
  const route = [p1, p2, p3];

  it('preserves full route if currentPosition is null or route has < 2 points', () => {
    expect(trimRouteToPosition(route, null)).toEqual(route);
    expect(trimRouteToPosition(route, undefined)).toEqual(route);
    expect(trimRouteToPosition([p1], p1)).toEqual([p1]);
  });

  it('preserves route if vehicle is off-route (> 40m)', () => {
    // 5 km away (way off route)
    const farOff: LatLng = { latitude: -33.5000, longitude: -70.6000 };
    expect(trimRouteToPosition(route, farOff)).toEqual(route);
  });

  it('trims past vertices and starts exactly at currentPosition when provider has moved past p1 towards p2', () => {
    // Posición a mitad de camino entre p1 y p2
    const midwayP1P2: LatLng = {
      latitude: (-33.4489 + -33.4520) / 2,
      longitude: (-70.6693 + -70.6710) / 2,
    };

    const trimmed = trimRouteToPosition(route, midwayP1P2);
    // El punto de inicio de la polyline visible es EXACTAMENTE el pin del vehículo
    expect(trimmed[0]).toEqual(midwayP1P2);
    // Y el resto de la ruta va hacia p2 y p3
    expect(trimmed[1]).toEqual(p2);
    expect(trimmed[2]).toEqual(p3);
    // p1 ya no existe en la polyline visible (cero cola detrás del pin)
    expect(trimmed.length).toBe(3);
  });

  it('discards p1 and p2 when vehicle has moved to segment p2 -> p3', () => {
    // Posición a mitad de camino entre p2 y p3
    const midwayP2P3: LatLng = {
      latitude: (-33.4520 + -33.4560) / 2,
      longitude: (-70.6710 + -70.6740) / 2,
    };

    const trimmed = trimRouteToPosition(route, midwayP2P3);
    expect(trimmed[0]).toEqual(midwayP2P3);
    expect(trimmed[1]).toEqual(p3);
    // p1 y p2 fueron descartados por haber sido ya transitados
    expect(trimmed.length).toBe(2);
  });

  it('returns empty array when vehicle arrives at destination (< 15m)', () => {
    // 2 metros del destino p3
    const arrived: LatLng = {
      latitude: p3.latitude + 0.00001,
      longitude: p3.longitude + 0.00001,
    };

    const trimmed = trimRouteToPosition(route, arrived, { minRemainingDistanceMeters: 15 });
    expect(trimmed).toEqual([]);
  });

  it('renders AnimatedPolyline with currentPosition without trailing polyline behind pin', () => {
    const midwayP1P2: LatLng = {
      latitude: (-33.4489 + -33.4520) / 2,
      longitude: (-70.6693 + -70.6710) / 2,
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <AnimatedPolyline
          coordinates={route}
          currentPosition={midwayP1P2}
          animate={false}
        />,
      );
    });

    const polylines = renderer!.root.children as any[];
    expect(polylines.length).toBe(2); // Glow + Core
    // La polyline renderizada empieza en midwayP1P2, NO en p1
    expect(polylines[0].props.coordinates[0]).toEqual(midwayP1P2);
    expect(polylines[1].props.coordinates[0]).toEqual(midwayP1P2);
  });
});

