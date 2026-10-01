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

  if (enableDynamicSizing) {
    const filtered = snapPoints.filter((point) => point !== 'MAX');
    if (filtered.length === 0) {
      return undefined;
    }
    return filtered.map((point) => point);
  }

  return snapPoints.map((point) => (point === 'MAX' ? maxDynamicContentSize : point));
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

  if (snapPointCount === 0) {
    if (enableDynamicSizing) {
      return requestedIndex === -1 ? -1 : 0;
    }
    return requestedIndex ?? 0;
  }

  const maxIndex = enableDynamicSizing ? snapPointCount : snapPointCount - 1;
  const fallbackIndex = maxIndex > 0 ? 1 : 0;
  const index = requestedIndex ?? fallbackIndex;

  return Math.max(-1, Math.min(index, maxIndex));
}
