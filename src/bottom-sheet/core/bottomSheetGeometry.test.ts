import { getBottomNavHeight } from '../../components/layout/bottomNavMetrics';
import { getBottomSheetGeometry } from './bottomSheetGeometry';

describe('bottom sheet shared geometry', () => {
  it('keeps max sheet height below encuadre controls and above BottomNav', () => {
    const windowHeight = 844;
    const safeTopInset = 47;
    const safeBottomInset = 34;
    const geometry = getBottomSheetGeometry({ windowHeight, safeTopInset, safeBottomInset });

    expect(geometry.navbarHeight).toBe(getBottomNavHeight(safeBottomInset));
    expect(geometry.encuadreBottomOffset).toBe(safeTopInset + 160);
    expect(geometry.topClearance).toBe(geometry.encuadreBottomOffset + 30);
    expect(geometry.bottomNavTop).toBe(windowHeight - geometry.navbarHeight);
    expect(windowHeight - geometry.navbarHeight - geometry.maxDynamicContentSize).toBeGreaterThanOrEqual(
      geometry.topClearance,
    );
  });
});
