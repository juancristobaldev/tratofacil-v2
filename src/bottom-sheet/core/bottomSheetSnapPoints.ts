export type SheetSnapPoint = string | number;

export function resolveSheetSnapPoints({
  snapPoints,
  enableDynamicSizing,
  maxDynamicContentSize,
}: {
  snapPoints?: readonly SheetSnapPoint[];
  enableDynamicSizing?: boolean;
  maxDynamicContentSize: number;
}): SheetSnapPoint[] | undefined {
  if (!snapPoints || snapPoints.length === 0) {
    return enableDynamicSizing ? undefined : [88, maxDynamicContentSize];
  }

  const filtered = snapPoints.filter((point) => point !== 'MAX');
  if (filtered.length === 0) {
    return enableDynamicSizing ? undefined : [maxDynamicContentSize];
  }

  return filtered.map((point) => point);
}

export function resolveSheetInitialIndex({
  requestedIndex,
  resolvedSnapPoints,
  enableDynamicSizing = true,
}: {
  requestedIndex?: number;
  resolvedSnapPoints?: readonly SheetSnapPoint[];
  enableDynamicSizing?: boolean;
}): number {
  const snapPointCount = resolvedSnapPoints?.length ?? 0;

  if (enableDynamicSizing && snapPointCount === 1) {
    return requestedIndex ?? 1;
  }

  const fallbackIndex = snapPointCount > 1 ? 1 : 0;
  const index = requestedIndex ?? fallbackIndex;

  if (snapPointCount === 0) return index;

  return Math.max(-1, Math.min(index, snapPointCount - 1));
}
