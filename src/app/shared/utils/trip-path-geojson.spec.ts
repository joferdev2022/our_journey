import type { Memory } from '../../core/models/memory.model';
import { memoriesToTripPath, sortMemoriesChronologically } from './trip-path-geojson';

function memory(
  id: string,
  memoryDate: string,
  longitude: number,
  latitude: number,
  createdAt = `${memoryDate.slice(0, 10)}T12:00:00.000Z`,
): Memory {
  return {
    id,
    title: id,
    description: null,
    memoryDate,
    placeName: null,
    latitude,
    longitude,
    categoryId: 'category-1',
    tripId: 'trip-1',
    importance: 3,
    coverMediaId: null,
    createdBy: 'user-1',
    createdAt,
    updatedAt: createdAt,
  };
}

describe('memoriesToTripPath', () => {
  it('does not create a LineString with zero or one memory', () => {
    expect(memoriesToTripPath([])).toBeNull();
    expect(memoriesToTripPath([memory('one', '2025-06-12T12:00:00Z', -77, -12)])).toBeNull();
  });

  it('creates a two-point LineString using longitude then latitude', () => {
    const path = memoriesToTripPath([
      memory('one', '2025-06-12T12:00:00Z', -77, -12),
      memory('two', '2025-06-13T12:00:00Z', -72, -13),
    ]);

    expect(path?.geometry).toEqual({
      type: 'LineString',
      coordinates: [
        [-77, -12],
        [-72, -13],
      ],
    });
  });

  it('orders several memories by date, createdAt and stable id', () => {
    const later = memory('later', '2025-06-14T12:00:00Z', -70, -10);
    const second = memory('second', '2025-06-12T12:00:00Z', -72, -12, '2025-06-12T11:00:00Z');
    const first = memory('first', '2025-06-12T12:00:00Z', -73, -13, '2025-06-12T10:00:00Z');

    expect(sortMemoriesChronologically([later, second, first]).map((item) => item.id)).toEqual([
      'first',
      'second',
      'later',
    ]);
    expect(memoriesToTripPath([later, second, first])?.geometry.coordinates).toEqual([
      [-73, -13],
      [-72, -12],
      [-70, -10],
    ]);
  });

  it('ignores invalid coordinates before deciding whether a line is valid', () => {
    const path = memoriesToTripPath([
      memory('valid-1', '2025-06-12T12:00:00Z', -77, -12),
      memory('invalid', '2025-06-13T12:00:00Z', -77, 91),
      memory('valid-2', '2025-06-14T12:00:00Z', -72, -13),
    ]);

    expect(path?.geometry.coordinates).toEqual([
      [-77, -12],
      [-72, -13],
    ]);
  });
});
