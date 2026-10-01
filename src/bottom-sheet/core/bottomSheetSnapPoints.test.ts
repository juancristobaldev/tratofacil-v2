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

    expect(resolved).toEqual([collapsedHeight]);
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

  it('filters out arbitrary MAX when dynamic sizing is enabled to prevent blank space', () => {
    const resolved = resolveSheetSnapPoints({
      snapPoints: [88, 'MAX'],
      enableDynamicSizing: true,
      maxDynamicContentSize: 430,
    });

    expect(resolved).toEqual([88]);
  });

  it('clamps impossible provided indexes instead of passing invalid values to Gorhom', () => {
    expect(resolveSheetInitialIndex({ requestedIndex: 1, resolvedSnapPoints: [430], enableDynamicSizing: false })).toBe(0);
    expect(resolveSheetInitialIndex({ requestedIndex: 3, resolvedSnapPoints: [88, 430], enableDynamicSizing: false })).toBe(1);
  });

  it('clamps requestedIndex to 0 (or -1) when dynamic sizing has no explicit snap points (single detent)', () => {
    expect(
      resolveSheetInitialIndex({
        requestedIndex: 1,
        resolvedSnapPoints: undefined,
        enableDynamicSizing: true,
      }),
    ).toBe(0);

    expect(
      resolveSheetInitialIndex({
        requestedIndex: -1,
        resolvedSnapPoints: undefined,
        enableDynamicSizing: true,
      }),
    ).toBe(-1);
  });

  it('guarantees Zero Inflatable Bloat for all registered sheets with dynamic sizing', () => {
    const sheetSnapConfigs = [
      { key: 'categories', snapPoints: [88] as const, expectedSnapPoints: [88], expectedIndex: 1 },
      { key: 'provider_preview', snapPoints: undefined, expectedSnapPoints: undefined, expectedIndex: 0 },
      { key: 'focus_client', snapPoints: [156] as const, expectedSnapPoints: [156], expectedIndex: 1 },
      { key: 'focus_provider', snapPoints: [156] as const, expectedSnapPoints: [156], expectedIndex: 1 },
      { key: 'provider_dashboard', snapPoints: [104] as const, expectedSnapPoints: [104], expectedIndex: 1 },
    ];

    for (const config of sheetSnapConfigs) {
      const resolved = resolveSheetSnapPoints({
        snapPoints: config.snapPoints,
        enableDynamicSizing: true,
        maxDynamicContentSize: 520,
      });

      expect(resolved).toEqual(config.expectedSnapPoints);

      const initialIndex = resolveSheetInitialIndex({
        requestedIndex: config.expectedIndex,
        resolvedSnapPoints: resolved,
        enableDynamicSizing: true,
      });

      expect(initialIndex).toBe(config.expectedIndex);
      // Ensure maxDynamicContentSize is NEVER injected as a snap point detent
      if (resolved) {
        expect(resolved).not.toContain(520);
      }
    }
  });
});
