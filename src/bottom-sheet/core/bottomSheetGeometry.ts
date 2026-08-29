import { getBottomNavHeight } from '../../components/layout/bottomNavMetrics';

const FLOATING_SEARCH_TOP_PADDING = 8;
const FLOATING_SEARCH_HEIGHT_WITH_MARGIN = 56;
const MAP_CONTROL_STACK_HEIGHT = 96;
const MAP_CLEARANCE_GAP = 30;

export interface BottomSheetGeometryInput {
  windowHeight: number;
  safeTopInset: number;
  safeBottomInset: number;
}

export interface BottomSheetGeometry {
  navbarHeight: number;
  encuadreBottomOffset: number;
  topClearance: number;
  maxDynamicContentSize: number;
  bottomNavTop: number;
  availableHeight: number;
}

export function getBottomSheetGeometry({
  windowHeight,
  safeTopInset,
  safeBottomInset,
}: BottomSheetGeometryInput): BottomSheetGeometry {
  const navbarHeight = getBottomNavHeight(safeBottomInset);
  const encuadreBottomOffset =
    safeTopInset +
    FLOATING_SEARCH_TOP_PADDING +
    FLOATING_SEARCH_HEIGHT_WITH_MARGIN +
    MAP_CONTROL_STACK_HEIGHT;
  const topClearance = encuadreBottomOffset + MAP_CLEARANCE_GAP;
  const availableHeight = windowHeight - topClearance - navbarHeight;
  const maxDynamicContentSize = Math.max(200, availableHeight);

  return {
    navbarHeight,
    encuadreBottomOffset,
    topClearance,
    maxDynamicContentSize,
    bottomNavTop: windowHeight - navbarHeight,
    availableHeight,
  };
}
