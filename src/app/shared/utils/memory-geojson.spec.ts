import type { Memory } from '../../core/models/memory.model';
import { memoriesToFeatureCollection } from './memory-geojson';

describe('memoriesToFeatureCollection', () => {
  const memory: Memory = {
    id: 'memory-1',
    title: 'Nuestro lugar',
    description: null,
    memoryDate: '2026-01-15T12:00:00.000Z',
    placeName: 'Lima',
    latitude: -12.0464,
    longitude: -77.0428,
    categoryId: 'category-1',
    tripId: null,
    importance: 5,
    coverMediaId: null,
    createdBy: 'user-1',
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
  };

  it('uses the stable memory UUID as feature id and longitude before latitude', () => {
    const [feature] = memoriesToFeatureCollection([memory]).features;

    expect(feature.id).toBe('memory-1');
    expect(feature.geometry.coordinates).toEqual([-77.0428, -12.0464]);
    expect(feature.properties).toEqual({
      id: 'memory-1',
      title: 'Nuestro lugar',
      categoryId: 'category-1',
      memoryDate: '2026-01-15T12:00:00.000Z',
      importance: 5,
      placeName: 'Lima',
    });
  });

  it('ignores invalid and non-finite coordinates', () => {
    const result = memoriesToFeatureCollection([
      memory,
      { ...memory, id: 'invalid-latitude', latitude: 91 },
      { ...memory, id: 'invalid-longitude', longitude: -181 },
      { ...memory, id: 'not-finite', latitude: Number.NaN },
    ]);

    expect(result.features.map((feature) => feature.id)).toEqual(['memory-1']);
  });

  it('returns a valid empty collection', () => {
    expect(memoriesToFeatureCollection([])).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
  });
});
