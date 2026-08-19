import { moveMediaItem, normalizeMediaOrder, selectPrimaryMedia } from './media-order';

describe('media order utilities', () => {
  const photos = [
    { id: 'a', sortOrder: 0 },
    { id: 'b', sortOrder: 1 },
    { id: 'c', sortOrder: 2 },
    { id: 'd', sortOrder: 3 },
  ];

  it('moves the first photo forward', () => {
    expect(moveMediaItem(photos, 0, 1).map((photo) => photo.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('moves an intermediate photo in either direction', () => {
    expect(moveMediaItem(photos, 2, -1).map((photo) => photo.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(moveMediaItem(photos, 1, 1).map((photo) => photo.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moves the last photo backward and protects both boundaries', () => {
    expect(moveMediaItem(photos, 3, -1).map((photo) => photo.id)).toEqual(['a', 'b', 'd', 'c']);
    expect(moveMediaItem(photos, 0, -1)).toEqual(photos);
    expect(moveMediaItem(photos, 3, 1)).toEqual(photos);
  });

  it('normalizes every sort order to a continuous zero-based sequence', () => {
    const irregular = [
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 8 },
      { id: 'c', sortOrder: 27 },
    ];
    expect(normalizeMediaOrder(irregular).map((photo) => photo.sortOrder)).toEqual([0, 1, 2]);
  });

  it('selects the explicit cover and falls back to the first photo after it is deleted', () => {
    expect(selectPrimaryMedia(photos, 'c')?.id).toBe('c');
    expect(
      selectPrimaryMedia(
        photos.filter((photo) => photo.id !== 'c'),
        'c',
      )?.id,
    ).toBe('a');
    expect(selectPrimaryMedia([], 'c')).toBeNull();
  });
});
