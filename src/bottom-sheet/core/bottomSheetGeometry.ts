import { getBottomNavHeight } from '../../components/layout/bottomNavMetrics';

const APP_HEADER_BAR_HEIGHT = 60; // Header.tsx base height
const FLOATING_CONTROLS_TOP_OFFSET = 8; // top offset in HomePage.tsx
const FLOATING_SEARCH_HEIGHT_WITH_MARGIN = 60; // 56px height + 4px margin
const MAP_CONTROL_STACK_HEIGHT = 96; // 44px nav + 8px gap + 44px encuadre
const MAP_CLEARANCE_GAP = 24; // 24px clean map gap between encuadre and sheet

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
  categoriesSearchTopClearance: number;
  categoriesSearchMaxHeight: number;
  bottomNavTop: number;
  availableHeight: number;
}

const CATEGORIES_SEARCH_GAP = 4; // 4px margin below the App Header

export function getBottomSheetGeometry({
  windowHeight,
  safeTopInset,
  safeBottomInset,
}: BottomSheetGeometryInput): BottomSheetGeometry {
  const navbarHeight = getBottomNavHeight(safeBottomInset);
  // Coordenadas globales de ventana (Portal de BottomSheetModal):
  // 1. App Header = safeTopInset + APP_HEADER_BAR_HEIGHT (60px)
  // 2. HomePage topFloatingControls = safeTopInset + FLOATING_CONTROLS_TOP_OFFSET (8px)
  // 3. Search Bar = 60px
  // 4. Map Action Buttons (Nav 3D + Gap + Encuadre) = 96px
  const encuadreBottomOffset =
    (safeTopInset + APP_HEADER_BAR_HEIGHT) +
    (safeTopInset + FLOATING_CONTROLS_TOP_OFFSET) +
    FLOATING_SEARCH_HEIGHT_WITH_MARGIN +
    MAP_CONTROL_STACK_HEIGHT;

  const topClearance = encuadreBottomOffset + MAP_CLEARANCE_GAP;
  const availableHeight = windowHeight - topClearance - navbarHeight;
  const maxDynamicContentSize = Math.max(160, availableHeight);

  // Exclusive geometry for Categories Panel search mode (just below Header):
  const categoriesSearchTopClearance = safeTopInset + APP_HEADER_BAR_HEIGHT + CATEGORIES_SEARCH_GAP;
  const categoriesSearchAvailableHeight = windowHeight - categoriesSearchTopClearance - navbarHeight;
  const categoriesSearchMaxHeight = Math.max(160, categoriesSearchAvailableHeight);

  return {
    navbarHeight,
    encuadreBottomOffset,
    topClearance,
    maxDynamicContentSize,
    categoriesSearchTopClearance,
    categoriesSearchMaxHeight,
    bottomNavTop: windowHeight - navbarHeight,
    availableHeight,
  };
}
