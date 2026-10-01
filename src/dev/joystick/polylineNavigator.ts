import type { GeoPoint } from './geoMath';
import { getDistanceMeters, calculateBearing, projectPointOnSegment } from './geoMath';

export interface PolylineStepResult {
  nextPosition: GeoPoint;
  heading: number;
  isArrived: boolean;
  isStart: boolean;
  progressFraction: number; // 0.0 a 1.0
  remainingMeters: number;
  traveledMeters: number;
  totalMeters: number;
}

export class PolylineNavigator {
  private routePoints: GeoPoint[] = [];
  private segmentLengths: number[] = [];
  private cumulativeDistances: number[] = []; // Longitud N, donde [0] = 0, [i] = dist acumulada hasta punto i
  private segmentBearings: number[] = []; // Longitud N - 1
  private totalDistanceMeters = 0;
  private currentDistanceMeters = 0;

  /**
   * Asigna una nueva polyline de ruta.
   * Si se pasa currentPos, proyecta suavemente la posición actual al tramo más cercano
   * para comenzar la navegación sin saltos ni teletransportes.
   */
  public setRoute(points: GeoPoint[] | null | undefined, currentPos?: GeoPoint): void {
    if (!points || points.length < 2) {
      this.clearRoute();
      return;
    }

    this.routePoints = points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
    const n = this.routePoints.length;

    this.segmentLengths = [];
    this.cumulativeDistances = [0];
    this.segmentBearings = [];
    let acc = 0;

    for (let i = 0; i < n - 1; i++) {
      const p1 = this.routePoints[i];
      const p2 = this.routePoints[i + 1];
      const dist = getDistanceMeters(p1, p2);
      const bearing = calculateBearing(p1, p2);

      this.segmentLengths.push(dist);
      this.segmentBearings.push(bearing);
      acc += dist;
      this.cumulativeDistances.push(acc);
    }

    this.totalDistanceMeters = acc;

    // Si se provee una posición actual, proyectar sobre la ruta para encontrar el punto inicial
    if (currentPos && this.totalDistanceMeters > 0) {
      this.currentDistanceMeters = this.findDistanceAlongRoute(currentPos);
    } else {
      this.currentDistanceMeters = 0;
    }
  }

  public clearRoute(): void {
    this.routePoints = [];
    this.segmentLengths = [];
    this.cumulativeDistances = [];
    this.segmentBearings = [];
    this.totalDistanceMeters = 0;
    this.currentDistanceMeters = 0;
  }

  public hasRoute(): boolean {
    return this.routePoints.length >= 2 && this.totalDistanceMeters > 0;
  }

  public getPointCount(): number {
    return this.routePoints.length;
  }

  public getTotalDistance(): number {
    return this.totalDistanceMeters;
  }

  public getTraveledDistance(): number {
    return this.currentDistanceMeters;
  }

  public getRemainingDistance(): number {
    return Math.max(0, this.totalDistanceMeters - this.currentDistanceMeters);
  }

  public getProgressFraction(): number {
    if (this.totalDistanceMeters <= 0) return 0;
    return Math.min(1, Math.max(0, this.currentDistanceMeters / this.totalDistanceMeters));
  }

  public getDestination(): GeoPoint | null {
    if (this.routePoints.length === 0) return null;
    return { ...this.routePoints[this.routePoints.length - 1] };
  }

  public getOrigin(): GeoPoint | null {
    if (this.routePoints.length === 0) return null;
    return { ...this.routePoints[0] };
  }

  /**
   * Resetea el recorrido al inicio de la ruta (0 metros).
   */
  public resetToStart(): void {
    this.currentDistanceMeters = 0;
  }

  /**
   * Posiciona el recorrido al final de la ruta (destino).
   */
  public jumpToEnd(): void {
    this.currentDistanceMeters = this.totalDistanceMeters;
  }

  /**
   * Avanza o retrocede una distancia en metros a lo largo de la polyline.
   * - deltaMeters > 0: avanza hacia el destino.
   * - deltaMeters < 0: retrocede hacia el origen.
   */
  public step(deltaMeters: number): PolylineStepResult {
    if (!this.hasRoute()) {
      return {
        nextPosition: { latitude: 0, longitude: 0 },
        heading: 0,
        isArrived: false,
        isStart: true,
        progressFraction: 0,
        remainingMeters: 0,
        traveledMeters: 0,
        totalMeters: 0,
      };
    }

    const targetDistance = Math.min(
      this.totalDistanceMeters,
      Math.max(0, this.currentDistanceMeters + deltaMeters),
    );
    this.currentDistanceMeters = targetDistance;

    const sample = this.sampleAtDistance(targetDistance);
    const isArrived = targetDistance >= this.totalDistanceMeters - 0.5;
    const isStart = targetDistance <= 0.1;
    const progressFraction = this.getProgressFraction();
    const remainingMeters = this.getRemainingDistance();

    return {
      nextPosition: sample.position,
      heading: sample.heading,
      isArrived,
      isStart,
      progressFraction,
      remainingMeters,
      traveledMeters: targetDistance,
      totalMeters: this.totalDistanceMeters,
    };
  }

  /**
   * Obtiene la posición y rumbo actuales a lo largo de la polyline.
   */
  public getCurrentSample(): PolylineStepResult {
    return this.step(0);
  }

  /**
   * Interpola con precisión la coordenada y rumbo a una distancia acumulada dada.
   */
  private sampleAtDistance(distMeters: number): { position: GeoPoint; heading: number } {
    const n = this.routePoints.length;
    if (n === 0) {
      return { position: { latitude: 0, longitude: 0 }, heading: 0 };
    }
    if (n === 1) {
      return { position: { ...this.routePoints[0] }, heading: 0 };
    }

    // Caso 1: Inicio de la ruta
    if (distMeters <= 0) {
      return {
        position: { ...this.routePoints[0] },
        heading: this.segmentBearings[0] ?? 0,
      };
    }

    // Caso 2: Fin de la ruta (Destino)
    if (distMeters >= this.totalDistanceMeters) {
      const lastSegIdx = this.segmentBearings.length - 1;
      return {
        position: { ...this.routePoints[n - 1] },
        heading: this.segmentBearings[lastSegIdx] ?? 0,
      };
    }

    // Caso 3: Búsqueda del segmento activo [k, k + 1]
    const numSegments = this.segmentLengths.length;
    let segIdx = 0;

    for (let i = 0; i < numSegments; i++) {
      if (distMeters <= this.cumulativeDistances[i + 1]) {
        segIdx = i;
        break;
      }
    }

    const segStartDist = this.cumulativeDistances[segIdx];
    const segLen = this.segmentLengths[segIdx];
    const segBearing = this.segmentBearings[segIdx];

    const offsetInSeg = distMeters - segStartDist;
    const t = segLen > 0 ? Math.min(1, Math.max(0, offsetInSeg / segLen)) : 0;

    const p1 = this.routePoints[segIdx];
    const p2 = this.routePoints[segIdx + 1];

    const lat = p1.latitude + t * (p2.latitude - p1.latitude);
    const lng = p1.longitude + t * (p2.longitude - p1.longitude);

    return {
      position: { latitude: lat, longitude: lng },
      heading: segBearing,
    };
  }

  /**
   * Encuentra la distancia acumulada en metros a lo largo de la polyline
   * que corresponde al punto proyectado más cercano a `targetPos`.
   */
  private findDistanceAlongRoute(targetPos: GeoPoint): number {
    const numSegments = this.segmentLengths.length;
    if (numSegments === 0) return 0;

    let bestDistAlong = 0;
    let minPerpendicularDist = Infinity;

    for (let i = 0; i < numSegments; i++) {
      const p1 = this.routePoints[i];
      const p2 = this.routePoints[i + 1];
      const proj = projectPointOnSegment(targetPos, p1, p2);

      if (proj.distanceMeters < minPerpendicularDist) {
        minPerpendicularDist = proj.distanceMeters;
        const segStartDist = this.cumulativeDistances[i];
        const segLen = this.segmentLengths[i];
        bestDistAlong = segStartDist + proj.fraction * segLen;
      }
    }

    return Math.min(this.totalDistanceMeters, Math.max(0, bestDistAlong));
  }
}
