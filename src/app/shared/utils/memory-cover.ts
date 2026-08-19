import type { MemoryCoverMedia } from '../../core/models/media.model';
import type { Memory } from '../../core/models/memory.model';

export function resolveMemoryCover(
  memory: Pick<Memory, 'id' | 'coverMediaId'>,
  media: readonly MemoryCoverMedia[],
): MemoryCoverMedia | null {
  const candidates = media
    .filter((item) => item.memoryId === memory.id && item.type === 'image')
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));

  return candidates.find((item) => item.id === memory.coverMediaId) ?? candidates[0] ?? null;
}

export function memoryCoverThumbnailPath(cover: MemoryCoverMedia | null): string | null {
  return cover ? (cover.thumbnailPath ?? cover.storagePath) : null;
}
