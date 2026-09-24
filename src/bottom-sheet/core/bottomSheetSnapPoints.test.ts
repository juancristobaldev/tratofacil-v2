import { resolveSheetInitialIndex, resolveSheetSnapPoints } from './bottomSheetSnapPoints';

describe('bottom sheet snap point resolution', () => {
  it.each([
    [[88] as const, 88],
    [[156] as const, 156],
    [[104] as const, 104],
  ])('preserves compact detent for %p allowing dynamic content sizing for Detent 1', (snapPoints, collapsedHeight) => {
    const resolved = resolveSheetSnapPoints({
      snapPoints,
      enableDynamicSizing: true,
      maxDynamicContentSize: 430,
    });

    expect(resolved).toEqual([collapsedHeight, 430]);
    expect(
      resolveSheetInitialIndex({
        requestedIndex: 1,
        resolvedSnapPoints: resolved,
        enableDynamicSizing: true,
      }),
    ).toBe(1);
  });

  it('keeps single-detent preview valid with undefined snapPoints for dynamic sizing', () => {
    const resolved = resolveSheetSnapPoints({
      snapPoints: undefined,
      enableDynamicSizing: true,
      maxDynamicContentSize: 430,
    });

    expect(resolved).toBeUndefined();
    expect(
      resolveSheetInitialIndex({
        requestedIndex: 0,
        resolvedSnapPoints: resolved,
        enableDynamicSizing: true,
      }),
    ).toBe(0);
  });

  it('maps MAX to maxDynamicContentSize when dynamic sizing is enabled', () => {
    const resolved = resolveSheetSnapPoints({
      snapPoints: [88, 'MAX'],
      enableDynamicSizing: true,
      maxDynamicContentSize: 430,
    });

    expect(resolved).toEqual([88, 430]);
  });

  it('clamps impossible provided indexes instead of passing invalid values to Gorhom', () => {
    expect(resolveSheetInitialIndex({ requestedIndex: 1, resolvedSnapPoints: [430], enableDynamicSizing: false })).toBe(0);
    expect(resolveSheetInitialIndex({ requestedIndex: 3, resolvedSnapPoints: [88, 430], enableDynamicSizing: false })).toBe(1);
  });
});
