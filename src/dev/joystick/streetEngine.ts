import type { GeoPoint } from './geoMath';
import {
  calculateBearing,
  destinationPoint,
  getDistanceMeters,
  normalizeAngleDiff,
  projectPointOnSegment,
} from './geoMath';
import { getDirections } from '../../utils/directions';

export interface RoadSegment {
  id: string;
  start: GeoPoint;
  end: GeoPoint;
  bearing: number;
  lengthMeters: number;
}

export interface StreetEngineStepResult {
  nextPosition: GeoPoint;
  heading: number;
  isSnapped: boolean;
  activeRoadId?: string;
}

const MAX_SNAP_DISTANCE_METERS = 60;
const MAX_ANGLE_ALIGNMENT_DEG = 80;
const LOOKAHEAD_METERS = 350;

export class StreetEngine {
  private roadSegments: RoadSegment[] = [];
  private lastFetchCenter: GeoPoint | null = null;
  private isFetching = false;

  /**
   * Agrega una polilínea de calle a la red de segmentos cacheados.
   */
  public addRoadPolyline(points: GeoPoint[], baseId = 'road'): void {
    if (!points || points.length < 2) return;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = getDistanceMeters(p1, p2);
      if (dist < 1) continue; // Ignorar puntos idénticos

      const brng = calculateBearing(p1, p2);
      const segmentId = `${baseId}-${i}`;

      // Evitar duplicados exactos
      const exists = this.roadSegments.some(
        s =>
          (Math.abs(s.start.latitude - p1.latitude) < 1e-6 &&
            Math.abs(s.start.longitude - p1.longitude) < 1e-6 &&
            Math.abs(s.end.latitude - p2.latitude) < 1e-6 &&
            Math.abs(s.end.longitude - p2.longitude) < 1e-6) ||
          (Math.abs(s.start.latitude - p2.latitude) < 1e-6 &&
            Math.abs(s.start.longitude - p2.longitude) < 1e-6 &&
            Math.abs(s.end.latitude - p1.latitude) < 1e-6 &&
            Math.abs(s.end.longitude - p1.longitude) < 1e-6),
      );

      if (!exists) {
        this.roadSegments.push({
          id: segmentId,
          start: p1,
          end: p2,
          bearing: brng,
          lengthMeters: dist,
        });
      }
    }
  }

  public clearRoadCache(): void {
    this.roadSegments = [];
    this.lastFetchCenter = null;
  }

  public getSegmentCount(): number {
    return this.roadSegments.length;
  }

  /**
   * Pre-fetches calles en la zona actual consultando rutas en cruz (Norte, Sur, Este, Oeste).
   */
  public async prefetchLocalRoads(currentPos: GeoPoint): Promise<void> {
    if (this.isFetching) return;

    if (this.lastFetchCenter) {
      const distFromLast = getDistanceMeters(currentPos, this.lastFetchCenter);
      if (distFromLast < LOOKAHEAD_METERS / 2 && this.roadSegments.length > 5) {
        return;
      }
    }

    this.isFetching = true;
    this.lastFetchCenter = { ...currentPos };

    try {
      const bearings = [0, 90, 180, 270];
      const fetchPromises = bearings.map(async bearing => {
        const target = destinationPoint(currentPos, LOOKAHEAD_METERS, bearing);
        try {
          const res = await getDirections(currentPos, target);
          if (res?.coordinates && res.coordinates.length >= 2) {
            this.addRoadPolyline(res.coordinates, `osrm-${bearing}`);
          }
        } catch {
          // Ignorar fallo puntual de ruta
        }
      });

      await Promise.all(fetchPromises);
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Ejecuta un paso de movimiento a lo largo de las calles o en modo libre.
   */
  public stepMovement(
    currentPos: GeoPoint,
    joystickBearing: number,
    distanceMeters: number,
    streetMode = true,
  ): StreetEngineStepResult {
    if (distanceMeters <= 0) {
      return {
        nextPosition: { ...currentPos },
        heading: joystickBearing,
        isSnapped: false,
      };
    }

    if (!streetMode || this.roadSegments.length === 0) {
      const next = destinationPoint(currentPos, distanceMeters, joystickBearing);
      return {
        nextPosition: next,
        heading: joystickBearing,
        isSnapped: false,
      };
    }

    // 1. Buscar candidatos de segmentos cercanos
    let bestSegment: RoadSegment | null = null;
    let bestProjection: ReturnType<typeof projectPointOnSegment> | null = null;
    let bestTravelForward = true;
    let bestScore = Infinity;

    for (const seg of this.roadSegments) {
      const proj = projectPointOnSegment(currentPos, seg.start, seg.end);
      if (proj.distanceMeters > MAX_SNAP_DISTANCE_METERS) continue;

      // Evaluar alineación hacia adelante y hacia atrás
      const angleDiffFwd = Math.abs(normalizeAngleDiff(joystickBearing, seg.bearing));
      const reverseBearing = (seg.bearing + 180) % 360;
      const angleDiffRev = Math.abs(normalizeAngleDiff(joystickBearing, reverseBearing));

      const isFwdEligible = angleDiffFwd <= MAX_ANGLE_ALIGNMENT_DEG;
      const isRevEligible = angleDiffRev <= MAX_ANGLE_ALIGNMENT_DEG;

      if (!isFwdEligible && !isRevEligible) continue;

      const travelForward = angleDiffFwd <= angleDiffRev;
      const angleDiff = travelForward ? angleDiffFwd : angleDiffRev;

      // Score pondera distancia perpendicular y desviación angular
      const score = proj.distanceMeters * 1.5 + angleDiff * 0.4;
      if (score < bestScore) {
        bestScore = score;
        bestSegment = seg;
        bestProjection = proj;
        bestTravelForward = travelForward;
      }
    }

    // 2. Si no hay calle que coincida con el ángulo del joystick, permitir avance suave
    if (!bestSegment || !bestProjection) {
      const next = destinationPoint(currentPos, distanceMeters, joystickBearing);
      return {
        nextPosition: next,
        heading: joystickBearing,
        isSnapped: false,
      };
    }

    // 3. Avanzar a lo largo del segmento seleccionado
    const travelBearing = bestTravelForward ? bestSegment.bearing : (bestSegment.bearing + 180) % 360;
    const targetEndpoint = bestTravelForward ? bestSegment.end : bestSegment.start;
    const distToEnd = getDistanceMeters(bestProjection.closestPoint, targetEndpoint);

    if (distanceMeters <= distToEnd) {
      // Avanza dentro del mismo segmento
      const nextPos = destinationPoint(bestProjection.closestPoint, distanceMeters, travelBearing);
      return {
        nextPosition: nextPos,
        heading: travelBearing,
        isSnapped: true,
        activeRoadId: bestSegment.id,
      };
    }

    // 4. Se sobrepasa el segmento actual -> comprobar si hay intersección conectada
    const remainingDist = distanceMeters - distToEnd;
    let nextSegment: RoadSegment | null = null;
    let nextTravelFwd = true;
    let nextBestAngleDiff = Infinity;

    for (const seg of this.roadSegments) {
      if (seg.id === bestSegment.id) continue;

      const nearStart = getDistanceMeters(targetEndpoint, seg.start) < 15;
      const nearEnd = getDistanceMeters(targetEndpoint, seg.end) < 15;

      if (nearStart) {
        const diff = Math.abs(normalizeAngleDiff(joystickBearing, seg.bearing));
        if (diff < MAX_ANGLE_ALIGNMENT_DEG && diff < nextBestAngleDiff) {
          nextBestAngleDiff = diff;
          nextSegment = seg;
          nextTravelFwd = true;
        }
      } else if (nearEnd) {
        const rev = (seg.bearing + 180) % 360;
        const diff = Math.abs(normalizeAngleDiff(joystickBearing, rev));
        if (diff < MAX_ANGLE_ALIGNMENT_DEG && diff < nextBestAngleDiff) {
          nextBestAngleDiff = diff;
          nextSegment = seg;
          nextTravelFwd = false;
        }
      }
    }

    if (nextSegment) {
      const nextBearing = nextTravelFwd ? nextSegment.bearing : (nextSegment.bearing + 180) % 360;
      const startPt = nextTravelFwd ? nextSegment.start : nextSegment.end;
      const nextPos = destinationPoint(startPt, Math.min(remainingDist, nextSegment.lengthMeters), nextBearing);
      return {
        nextPosition: nextPos,
        heading: nextBearing,
        isSnapped: true,
        activeRoadId: nextSegment.id,
      };
    }

    // Si es fin de calle sin salida, posicionar en el endpoint
    return {
      nextPosition: { ...targetEndpoint },
      heading: travelBearing,
      isSnapped: true,
      activeRoadId: bestSegment.id,
    };
  }
}
