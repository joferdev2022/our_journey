import type { MemoryCoverMedia } from '../../core/models/media.model';
import type { Memory } from '../../core/models/memory.model';
import { resolveMemoryCover } from './memory-cover';

const memory = { id: 'memory-1', coverMediaId: null } as Pick<Memory, 'id' | 'coverMediaId'>;

function photo(id: string, sortOrder: number): MemoryCoverMedia {
  return {
    id,
    memoryId: 'memory-1',
    type: 'image',
    storagePath: `images/${id}.webp`,
    thumbnailPath: `thumbs/${id}.webp`,
    sortOrder,
  };
}

describe('resolveMemoryCover', () => {
  it('uses coverMediaId when that photo exists', () => {
    expect(
      resolveMemoryCover({ ...memory, coverMediaId: 'cover' }, [
        photo('first', 0),
        photo('cover', 5),
      ])?.id,
    ).toBe('cover');
  });

  it('falls back to the photo with the lowest sortOrder', () => {
    expect(resolveMemoryCover(memory, [photo('later', 4), photo('first', 0)])?.id).toBe('first');
  });

  it('returns null when the memory has no photos', () => {
    expect(resolveMemoryCover(memory, [])).toBeNull();
  });
});
