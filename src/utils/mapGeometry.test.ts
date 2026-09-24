import {
  validateAndSanitizeCoordinates,
  calculateBoundingBox,
  isMaterialRouteChange,
  calculateUsableMapRect,
  calculateSafeMapRect,
  calculateDynamicEdgePadding,
  calculateNavigationAnchorPoint,
  calculateCameraCenterForSubjectAnchor,
  isPointInSafeRect,
  projectCoordinateToScreen,
  getAdaptivePolylineWidth,
  MIN_LATITUDE_DELTA,
  MIN_LONGITUDE_DELTA,
  PROVIDER_PIN_CARD_HEIGHT,
  PROVIDER_PIN_CARD_WIDTH,
  ROUTE_FIT_BOTTOM_CLEARANCE,
  ROUTE_FIT_HORIZONTAL_CLEARANCE,
  ROUTE_FIT_TOP_CLEARANCE,
  ROUTE_FIT_ZOOM_SCALE,
} from './mapGeometry';
import type { RouteCoordinate } from './directions';

describe('mapGeometry - validateAndSanitizeCoordinates', () => {
  it('filters out invalid, NaN, Infinity, and out-of-range coordinates', () => {
    const raw: any[] = [
      { latitude: -33.45, longitude: -70.66 },
      { latitude: NaN, longitude: -70.66 },
      { latitude: -33.45, longitude: Infinity },
      { latitude: 95, longitude: -70.66 }, // out of [-90, 90]
      { latitude: -33.45, longitude: 190 }, // out of [-180, 180]
      null,
      undefined,
      { latitude: -33.4501, longitude: -70.6601 },
    ];

    const sanitized = validateAndSanitizeCoordinates(raw);
    expect(sanitized.length).toBe(2);
    expect(sanitized[0]).toEqual({ latitude: -33.45, longitude: -70.66 });
    expect(sanitized[1]).toEqual({ latitude: -33.4501, longitude: -70.6601 });
  });

  it('deduplicates consecutive identical coordinates', () => {
    const raw: RouteCoordinate[] = [
      { latitude: -33.45, longitude: -70.66 },
      { latitude: -33.45, longitude: -70.66 },
      { latitude: -33.46, longitude: -70.67 },
      { latitude: -33.46, longitude: -70.67 },
    ];
    const sanitized = validateAndSanitizeCoordinates(raw);
    expect(sanitized.length).toBe(2);
  });
});

describe('mapGeometry - floating element non-occlusion constants', () => {
  it('keeps route fits clear of provider card body and floating controls', () => {
    expect(PROVIDER_PIN_CARD_WIDTH).toBe(180);
    expect(PROVIDER_PIN_CARD_HEIGHT).toBe(58);
    expect(ROUTE_FIT_TOP_CLEARANCE).toBeGreaterThanOrEqual(50);
    expect(ROUTE_FIT_HORIZONTAL_CLEARANCE).toBeGreaterThanOrEqual(28);
    expect(ROUTE_FIT_BOTTOM_CLEARANCE).toBeGreaterThanOrEqual(28);
    expect(ROUTE_FIT_ZOOM_SCALE).toBe(1.15);
  });
});

describe('mapGeometry - calculateBoundingBox', () => {
  it('calculates accurate bounding box encompassing all points including lateral curves', () => {
    const origin = { latitude: -33.40, longitude: -70.60 };
    const destination = { latitude: -33.50, longitude: -70.60 };
    // Curve heading significantly west
    const curvePoint = { latitude: -33.45, longitude: -70.75 };

    const points = [origin, curvePoint, destination];
    const bbox = calculateBoundingBox(points);

    expect(bbox).not.toBeNull();
    expect(bbox!.minLatitude).toBe(-33.50);
    expect(bbox!.maxLatitude).toBe(-33.40);
    expect(bbox!.minLongitude).toBe(-70.75);
    expect(bbox!.maxLongitude).toBe(-70.60);
    expect(bbox!.latitudeDelta).toBeCloseTo(0.10, 4);
    expect(bbox!.longitudeDelta).toBeCloseTo(0.15, 4);
  });

  it('applies minimum delta clamping for very short routes (anti-excessive zoom)', () => {
    const origin = { latitude: -33.44890, longitude: -70.66930 };
    const dest = { latitude: -33.44895, longitude: -70.66935 }; // 5 meters away

    const bbox = calculateBoundingBox([origin, dest]);
    expect(bbox).not.toBeNull();
    expect(bbox!.latitudeDelta).toBeGreaterThanOrEqual(MIN_LATITUDE_DELTA);
    expect(bbox!.longitudeDelta).toBeGreaterThanOrEqual(MIN_LONGITUDE_DELTA);
  });

  it('returns null for empty or invalid input', () => {
    expect(calculateBoundingBox([])).toBeNull();
    expect(calculateBoundingBox(null as any)).toBeNull();
  });
});

describe('mapGeometry - isMaterialRouteChange', () => {
  it('detects identical routes even if recreated with new array instances', () => {
    const routeA: RouteCoordinate[] = [
      { latitude: -33.40, longitude: -70.60 },
      { latitude: -33.50, longitude: -70.60 },
    ];
    const routeB: RouteCoordinate[] = [
      { latitude: -33.40, longitude: -70.60 },
      { latitude: -33.50, longitude: -70.60 },
    ];

    expect(isMaterialRouteChange(routeA, routeB)).toBe(false);
  });

  it('detects material route change when endpoints drift', () => {
    const routeA: RouteCoordinate[] = [
      { latitude: -33.40, longitude: -70.60 },
      { latitude: -33.50, longitude: -70.60 },
    ];
    const routeB: RouteCoordinate[] = [
      { latitude: -33.405, longitude: -70.605 }, // shifted significantly
      { latitude: -33.50, longitude: -70.60 },
    ];

    expect(isMaterialRouteChange(routeA, routeB)).toBe(true);
  });

  it('detects route change between empty and non-empty', () => {
    const routeA: RouteCoordinate[] = [];
    const routeB: RouteCoordinate[] = [
      { latitude: -33.40, longitude: -70.60 },
      { latitude: -33.50, longitude: -70.60 },
    ];
    expect(isMaterialRouteChange(routeA, routeB)).toBe(true);
    expect(isMaterialRouteChange(routeB, routeA)).toBe(true);
  });
});

describe('mapGeometry - calculateUsableMapRect & calculateDynamicEdgePadding', () => {
  const windowDimensions = { width: 390, height: 844 };
  const insets = { top: 47, bottom: 34, left: 0, right: 0 };
  const headerBottom = 60 + insets.top; // 107px (header height already includes safeTop)
  const bottomNavHeight = 75 + insets.bottom; // 109px

  it('calculates usableMapRect with BottomSheet open at sheetTop without double counting', () => {
    const sheetTop = 500; // Bottom sheet visible from y=500 down to bottom
    const usable = calculateUsableMapRect({
      windowWidth: windowDimensions.width,
      windowHeight: windowDimensions.height,
      headerBottom,
      sheetTop,
      horizontalSafety: 16,
      verticalSafety: 12,
    });

    expect(usable.top).toBe(headerBottom + 12);
    expect(usable.bottom).toBe(sheetTop - 12);
    expect(usable.left).toBe(16);
    expect(usable.right).toBe(windowDimensions.width - 16);
    expect(usable.height).toBe((sheetTop - 12) - (headerBottom + 12));
  });

  it('calculates usableMapRect when NO BottomSheet exists (using bottomNavTop)', () => {
    const usable = calculateUsableMapRect({
      windowWidth: windowDimensions.width,
      windowHeight: windowDimensions.height,
      headerBottom,
      sheetTop: null,
      bottomNavHeight,
      horizontalSafety: 16,
      verticalSafety: 12,
    });

    const expectedBottomNavTop = windowDimensions.height - bottomNavHeight; // 844 - 109 = 735
    expect(usable.bottom).toBe(expectedBottomNavTop - 12);
  });

  it('calculates dynamicEdgePadding accurately for MapView.fitToCoordinates', () => {
    const sheetTop = 520;
    const padding = calculateDynamicEdgePadding({
      windowWidth: windowDimensions.width,
      windowHeight: windowDimensions.height,
      headerBottom,
      sheetTop,
      topSafety: 16,
      bottomSafety: 16,
      horizontalPadding: 24,
    });

    expect(padding.top).toBe(headerBottom + 16);
    expect(padding.bottom).toBe((windowDimensions.height - sheetTop) + 16);
    expect(padding.left).toBe(24);
    expect(padding.right).toBe(24);
  });
});

describe('mapGeometry - navigation anchor camera placement', () => {
  const windowDimensions = { width: 390, height: 844 };

  it('places the navigation anchor at the center of the usable viewport above the sheet', () => {
    const anchor = calculateNavigationAnchorPoint({
      windowWidth: windowDimensions.width,
      windowHeight: windowDimensions.height,
      headerBottom: 100,
      sheetTop: 500,
      horizontalSafety: 16,
      verticalSafety: 12,
    });

    expect(anchor.x).toBeCloseTo(195, 1);
    expect(anchor.y).toBeCloseTo((112 + 488) / 2, 1);
    expect(anchor.y).toBeLessThan(500);
  });

  it('calculates a camera center that projects the subject onto the desired navigation anchor', () => {
    const subject = { latitude: -38.75, longitude: -72.6 };
    const desiredScreenPoint = { x: 195, y: 300 };
    const cameraCenter = calculateCameraCenterForSubjectAnchor({
      subjectCoord: subject,
      latitudeDelta: 0.0035,
      longitudeDelta: 0.0035,
      desiredScreenPoint,
      windowDimensions,
    });

    const projected = projectCoordinateToScreen(
      subject,
      {
        latitude: cameraCenter.latitude,
        longitude: cameraCenter.longitude,
        latitudeDelta: 0.0035,
        longitudeDelta: 0.0035,
      },
      windowDimensions,
    );

    expect(projected.x).toBeCloseTo(desiredScreenPoint.x, 1);
    expect(projected.y).toBeCloseTo(desiredScreenPoint.y, 1);
  });
});

describe('mapGeometry - calculateSafeMapRect & isPointInSafeRect', () => {
  const usableRect = {
    left: 20,
    top: 120,
    right: 370,
    bottom: 500,
    width: 350,
    height: 380,
  };

  it('creates safeMapRect as an inner dead-zone and checks point containment', () => {
    const safeRect = calculateSafeMapRect(usableRect, 0.15, 0.15); // 15% inner margin

    expect(safeRect.left).toBeGreaterThan(usableRect.left);
    expect(safeRect.right).toBeLessThan(usableRect.right);
    expect(safeRect.top).toBeGreaterThan(usableRect.top);
    expect(safeRect.bottom).toBeLessThan(usableRect.bottom);

    // Center point is safely inside
    const centerPoint = { x: (usableRect.left + usableRect.right) / 2, y: (usableRect.top + usableRect.bottom) / 2 };
    expect(isPointInSafeRect(centerPoint, safeRect)).toBe(true);

    // Point near sheetTop (outside safeRect) returns false
    const nearSheetPoint = { x: centerPoint.x, y: usableRect.bottom - 5 };
    expect(isPointInSafeRect(nearSheetPoint, safeRect)).toBe(false);

    // Point near header (outside safeRect) returns false
    const nearHeaderPoint = { x: centerPoint.x, y: usableRect.top + 5 };
    expect(isPointInSafeRect(nearHeaderPoint, safeRect)).toBe(false);
  });
});

describe('mapGeometry - projectCoordinateToScreen', () => {
  const windowDimensions = { width: 400, height: 800 };
  const region = {
    latitude: -33.45,
    longitude: -70.65,
    latitudeDelta: 0.10,
    longitudeDelta: 0.10,
  };

  it('projects center coordinate to exact center of screen', () => {
    const centerCoord = { latitude: -33.45, longitude: -70.65 };
    const pt = projectCoordinateToScreen(centerCoord, region, windowDimensions);
    expect(pt.x).toBeCloseTo(200, 1);
    expect(pt.y).toBeCloseTo(400, 1);
  });

  it('projects coordinates outside the top or bottom accurately', () => {
    const topCoord = { latitude: -33.40, longitude: -70.65 }; // At the top edge of delta
    const pt = projectCoordinateToScreen(topCoord, region, windowDimensions);
    expect(pt.y).toBeCloseTo(0, 1);

    const bottomCoord = { latitude: -33.50, longitude: -70.65 }; // At the bottom edge of delta
    const ptBottom = projectCoordinateToScreen(bottomCoord, region, windowDimensions);
    expect(ptBottom.y).toBeCloseTo(800, 1);
  });
});

describe('mapGeometry - getAdaptivePolylineWidth', () => {
  it('returns full street corridor strokeWidth and glowWidth for navigation / street close zoom (latitudeDelta <= 0.0015)', () => {
    const width = getAdaptivePolylineWidth(0.001);
    expect(width.strokeWidth).toBe(19);
    expect(width.glowWidth).toBe(27);
  });

  it('returns solid street strokeWidth for close neighborhood zoom (0.0015 < delta <= 0.004)', () => {
    const widthNeighborhood = getAdaptivePolylineWidth(0.003);
    expect(widthNeighborhood.strokeWidth).toBe(14);
    expect(widthNeighborhood.glowWidth).toBe(20);
  });

  it('returns balanced arterial strokeWidth for sector zoom (0.004 < delta <= 0.012)', () => {
    const widthSector = getAdaptivePolylineWidth(0.01);
    expect(widthSector.strokeWidth).toBe(10);
    expect(widthSector.glowWidth).toBe(15);
  });

  it('returns compact strokeWidth for city overview (0.012 < delta <= 0.04)', () => {
    const widthCity = getAdaptivePolylineWidth(0.03);
    expect(widthCity.strokeWidth).toBe(6);
    expect(widthCity.glowWidth).toBe(10);
  });

  it('returns crisp minimal strokeWidth for far zoom (> 0.04)', () => {
    const widthFar = getAdaptivePolylineWidth(0.08);
    expect(widthFar.strokeWidth).toBe(4);
    expect(widthFar.glowWidth).toBe(7);
  });

  it('returns safe fallback when latitudeDelta is undefined or invalid', () => {
    const fallback = getAdaptivePolylineWidth(null);
    expect(fallback.strokeWidth).toBe(8);
    expect(fallback.glowWidth).toBe(14);
  });
});
