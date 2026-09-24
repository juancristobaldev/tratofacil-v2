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

  const resolved = snapPoints.map((point) => (point === 'MAX' ? maxDynamicContentSize : point));

  if (resolved.length === 1 && typeof resolved[0] === 'number') {
    return [resolved[0], maxDynamicContentSize];
  }

  return resolved;
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

  if (snapPointCount === 0) return requestedIndex ?? 0;

  const fallbackIndex = snapPointCount > 1 ? 1 : 0;
  const index = requestedIndex ?? fallbackIndex;

  return Math.max(-1, Math.min(index, snapPointCount - 1));
}
