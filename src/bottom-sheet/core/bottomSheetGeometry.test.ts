import { getBottomNavHeight } from '../../components/layout/bottomNavMetrics';
import { getBottomSheetGeometry } from './bottomSheetGeometry';

describe('bottom sheet shared geometry', () => {
  it.each([
    { device: 'Android Emulator', windowHeight: 800, safeTopInset: 28, safeBottomInset: 0 },
    { device: 'iPhone Notch', windowHeight: 844, safeTopInset: 47, safeBottomInset: 34 },
    { device: 'iPhone Dynamic Island', windowHeight: 852, safeTopInset: 59, safeBottomInset: 34 },
  ])('keeps max sheet height strictly below encuadre controls with 24px clearance for $device', ({ windowHeight, safeTopInset, safeBottomInset }) => {
    const geometry = getBottomSheetGeometry({ windowHeight, safeTopInset, safeBottomInset });

    expect(geometry.navbarHeight).toBe(getBottomNavHeight(safeBottomInset));
    expect(geometry.encuadreBottomOffset).toBe((2 * safeTopInset) + 224);
    expect(geometry.topClearance).toBe(geometry.encuadreBottomOffset + 24);
    expect(geometry.bottomNavTop).toBe(windowHeight - geometry.navbarHeight);
    
    // Top of max expanded sheet in window coordinates
    const sheetTopInWindow = geometry.bottomNavTop - geometry.maxDynamicContentSize;
    expect(sheetTopInWindow).toBeGreaterThanOrEqual(geometry.topClearance);
    expect(sheetTopInWindow - geometry.encuadreBottomOffset).toBeGreaterThanOrEqual(24);
  });

  it.each([
    { device: 'Android Emulator', windowHeight: 800, safeTopInset: 28, safeBottomInset: 0 },
    { device: 'iPhone Notch', windowHeight: 844, safeTopInset: 47, safeBottomInset: 34 },
    { device: 'iPhone Dynamic Island', windowHeight: 852, safeTopInset: 59, safeBottomInset: 34 },
  ])('calculates categories search geometry just below the header with 4px gap for $device', ({ windowHeight, safeTopInset, safeBottomInset }) => {
    const geometry = getBottomSheetGeometry({ windowHeight, safeTopInset, safeBottomInset });

    const expectedHeaderBottom = safeTopInset + 60;
    expect(geometry.categoriesSearchTopClearance).toBe(expectedHeaderBottom + 4);

    const expectedSearchAvailableHeight = windowHeight - geometry.categoriesSearchTopClearance - geometry.navbarHeight;
    expect(geometry.categoriesSearchMaxHeight).toBe(expectedSearchAvailableHeight);

    // Categories search sheet top position in window coordinates
    const searchSheetTopInWindow = geometry.bottomNavTop - geometry.categoriesSearchMaxHeight;
    expect(searchSheetTopInWindow).toBe(geometry.categoriesSearchTopClearance);
    expect(searchSheetTopInWindow - expectedHeaderBottom).toBe(4);
    // Verifies search mode provides significantly larger height than standard sheet mode
    expect(geometry.categoriesSearchMaxHeight).toBeGreaterThan(geometry.maxDynamicContentSize);
  });
});
