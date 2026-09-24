import {
  getDirections,
  isValidGeoCoordinate,
  isUsableRoutingCoordinate,
  sanitizeRouteCoordinates,
  clearClientRouteCache,
  computeGeodesicDistance,
  isSensibleRoute,
  MIN_ROUTING_PROXIMITY_METERS,
  MIN_RENDERABLE_POLYLINE_METERS,
  SHORT_RANGE_GEODESIC_THRESHOLD_METERS,
  MAX_SHORT_RANGE_DETOUR_RATIO,
} from './directions';

describe('Directions Subsystem (Mobile Frontend)', () => {
  beforeEach(() => {
    clearClientRouteCache();
    jest.clearAllMocks();
    (globalThis as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Coordinate & Geometry Validation', () => {
    it('should validate geographic coordinates correctly', () => {
      expect(isValidGeoCoordinate({ latitude: -33.4489, longitude: -70.6693 })).toBe(true);
      expect(isValidGeoCoordinate({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidGeoCoordinate({ latitude: 91, longitude: -70.6693 })).toBe(false);
      expect(isValidGeoCoordinate({ latitude: -91, longitude: -70.6693 })).toBe(false);
      expect(isValidGeoCoordinate({ latitude: -33.4489, longitude: 181 })).toBe(false);
      expect(isValidGeoCoordinate({ latitude: NaN, longitude: -70.6693 })).toBe(false);
      expect(isValidGeoCoordinate(null)).toBe(false);
      expect(isValidGeoCoordinate(undefined)).toBe(false);
    });

    it('should distinguish usable routing coordinates from sentinel (0,0)', () => {
      expect(isUsableRoutingCoordinate({ latitude: -33.4489, longitude: -70.6693 })).toBe(true);
      expect(isUsableRoutingCoordinate({ latitude: 0, longitude: 0 })).toBe(false);
      expect(isUsableRoutingCoordinate({ latitude: 0.00001, longitude: 0.00001 })).toBe(false);
      expect(isUsableRoutingCoordinate({ latitude: 10, longitude: 20 })).toBe(true);
    });

    it('should sanitize and deduplicate consecutive identical points', () => {
      const input = [
        { latitude: -33.4489, longitude: -70.6693 },
        { latitude: -33.4489, longitude: -70.6693 }, // Duplicate
        { latitude: -33.4500, longitude: -70.6700 },
      ];
      const sanitized = sanitizeRouteCoordinates(input);
      expect(sanitized).toHaveLength(2);
      expect(sanitized[0]).toEqual({ latitude: -33.4489, longitude: -70.6693 });
      expect(sanitized[1]).toEqual({ latitude: -33.4500, longitude: -70.6700 });
    });

    it('should reject route geometries with fewer than 2 valid points', () => {
      expect(sanitizeRouteCoordinates([{ latitude: -33.4489, longitude: -70.6693 }])).toEqual([]);
      expect(sanitizeRouteCoordinates([])).toEqual([]);
    });
  });

  describe('getDirections Integration & Multi-Provider Fallback', () => {
    const origin = { latitude: -33.4489, longitude: -70.6693 };
    const dest = { latitude: -33.4520, longitude: -70.6710 };

    it('should return RouteResult when Backend Proxy returns valid route', async () => {
      const mockBackendResponse = {
        coordinates: [
          { latitude: -33.4489, longitude: -70.6693 },
          { latitude: -33.4500, longitude: -70.6700 },
          { latitude: -33.4520, longitude: -70.6710 },
        ],
        distanceMeters: 1500,
        durationSeconds: 240,
        provider: 'google',
      };

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await getDirections(origin, dest);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe('google');
      expect(result?.distanceMeters).toBe(1500);
      expect(result?.durationSeconds).toBe(240);
      expect(result?.coordinates).toHaveLength(3);
    });

    it('should fallback to Client OSRM when Backend Proxy returns 500', async () => {
      // 1. Backend Proxy returns 500
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // 2. Client OSRM succeeds with GeoJSON [lng, lat]
      const mockOsrmResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              coordinates: [
                [-70.6693, -33.4489],
                [-70.6700, -33.4500],
                [-70.6710, -33.4520],
              ],
            },
            distance: 1600,
            duration: 250,
          },
        ],
      };
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOsrmResponse,
      });

      const result = await getDirections(origin, dest);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe('osrm');
      expect(result?.distanceMeters).toBe(1600);
      expect(result?.durationSeconds).toBe(250);
      expect(result?.coordinates[0]).toEqual({
        latitude: -33.4489,
        longitude: -70.6693,
      });
    });

    it('should fallback to Client OSRM when Backend Proxy returns empty coordinates', async () => {
      // 1. Backend returns empty coordinates
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ coordinates: [], distanceMeters: 0, durationSeconds: 0 }),
      });

      // 2. Client OSRM succeeds
      const mockOsrmResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              coordinates: [
                [-70.6693, -33.4489],
                [-70.6710, -33.4520],
              ],
            },
            distance: 1200,
            duration: 180,
          },
        ],
      };
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOsrmResponse,
      });

      const result = await getDirections(origin, dest);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe('osrm');
      expect(result?.coordinates).toHaveLength(2);
    });

    it('should return null (NEVER a fake straight line) when both backend and OSRM fail', async () => {
      // 1. Backend fails
      ((globalThis as any).fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      // 2. OSRM fails
      ((globalThis as any).fetch as jest.Mock).mockRejectedValueOnce(new Error('OSRM unavailable'));

      const result = await getDirections(origin, dest);

      expect(result).toBeNull();
    });

    it('should handle AbortSignal properly without false error or fallback', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await getDirections(origin, dest, controller.signal);

      expect(result).toBeNull();
      expect((globalThis as any).fetch).not.toHaveBeenCalled();
    });

    it('should reject invalid coordinates before attempting network calls', async () => {
      const result = await getDirections(
        { latitude: NaN, longitude: -70.6693 },
        { latitude: -33.4520, longitude: -70.6710 },
      );

      expect(result).toBeNull();
      expect((globalThis as any).fetch).not.toHaveBeenCalled();
    });

    it('should hit in-memory cache on subsequent requests with close coordinates', async () => {
      const mockBackendResponse = {
        coordinates: [
          { latitude: -33.4489, longitude: -70.6693 },
          { latitude: -33.4520, longitude: -70.6710 },
        ],
        distanceMeters: 1500,
        durationSeconds: 240,
        provider: 'google',
      };

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      // Call 1 -> Network fetch
      const res1 = await getDirections(
        { latitude: -33.44891, longitude: -70.66931 },
        { latitude: -33.45201, longitude: -70.67101 },
      );
      expect(res1).not.toBeNull();
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);

      // Call 2 with small jitter within ~11m (4 decimal places) -> Cache hit
      const res2 = await getDirections(
        { latitude: -33.44894, longitude: -70.66933 },
        { latitude: -33.45204, longitude: -70.67103 },
      );
      expect(res2).not.toBeNull();
      expect((globalThis as any).fetch).toHaveBeenCalledTimes(1); // No new network call
    });

    it('should suppress directions when origin and destination are in the same house (<= 30m)', async () => {
      // Coordenadas a ~11 metros de distancia
      const origin = { latitude: -33.44890, longitude: -70.66930 };
      const dest = { latitude: -33.44899, longitude: -70.66930 };

      const dist = computeGeodesicDistance(origin, dest);
      expect(dist).toBeLessThanOrEqual(MIN_ROUTING_PROXIMITY_METERS);

      const result = await getDirections(origin, dest);
      expect(result).toBeNull();
      expect((globalThis as any).fetch).not.toHaveBeenCalled();
    });
  });

  describe('Intelligent Route Sanity & Detour Filtering (isSensibleRoute)', () => {
    const origin = { latitude: -33.4489, longitude: -70.6693 };
    const destNearby = { latitude: -33.4493, longitude: -70.6693 }; // ~44m

    it('should reject routes where distance is less than MIN_RENDERABLE_POLYLINE_METERS (35m)', () => {
      const mockResult: any = {
        coordinates: [origin, { latitude: -33.4490, longitude: -70.6693 }],
        distanceMeters: 20, // menor a 35m
      };
      expect(isSensibleRoute(mockResult, origin, { latitude: -33.4494, longitude: -70.6693 })).toBe(false);
    });

    it('should reject routes where origin and destination are in the same house (<= 30m)', () => {
      const inHouseDest = { latitude: -33.4490, longitude: -70.6693 }; // ~11m
      const mockResult: any = {
        coordinates: [origin, inHouseDest],
        distanceMeters: 50,
      };
      expect(isSensibleRoute(mockResult, origin, inHouseDest)).toBe(false);
    });

    it('should reject absurd detour loops around blocks for short distances (detourRatio > 3.5)', () => {
      // 44 metros en línea recta, pero ruta vial devuelta de 650 metros (vuelta a la manzana)
      const mockLoopResult: any = {
        coordinates: [origin, { latitude: -33.450, longitude: -70.670 }, destNearby],
        distanceMeters: 650,
      };
      expect(isSensibleRoute(mockLoopResult, origin, destNearby)).toBe(false);
    });

    it('should accept coherent, realistic driving routes', () => {
      const destFar = { latitude: -33.4589, longitude: -70.6793 }; // ~1.4 km
      const mockGoodResult: any = {
        coordinates: [origin, { latitude: -33.4530, longitude: -70.6740 }, destFar],
        distanceMeters: 1600,
      };
      expect(isSensibleRoute(mockGoodResult, origin, destFar)).toBe(true);
    });
  });
});
