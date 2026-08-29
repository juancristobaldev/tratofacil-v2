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
});
