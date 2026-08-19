export type MoveDirection = -1 | 1;

export function moveMediaItem<T>(
  items: readonly T[],
  index: number,
  direction: MoveDirection,
): T[] {
  const targetIndex = index + direction;
  const reordered = [...items];

  if (
    index < 0 ||
    index >= reordered.length ||
    targetIndex < 0 ||
    targetIndex >= reordered.length
  ) {
    return reordered;
  }

  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  return reordered;
}

export function normalizeMediaOrder<T extends { sortOrder: number }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}

export function selectPrimaryMedia<T extends { id: string }>(
  items: readonly T[],
  coverMediaId: string | null | undefined,
): T | null {
  return items.find((item) => item.id === coverMediaId) ?? items[0] ?? null;
}
