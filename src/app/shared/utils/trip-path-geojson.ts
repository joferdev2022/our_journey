import type { Memory } from '../../core/models/memory.model';
import { hasValidCoordinates } from './memory-geojson';

export interface TripPathFeature {
  type: 'Feature';
  properties: { kind: 'narrative-order' };
  geometry: {
    type: 'LineString';
    coordinates: Array<[longitude: number, latitude: number]>;
  };
}

export interface TripPathFeatureCollection {
  type: 'FeatureCollection';
  features: TripPathFeature[];
}

export function sortMemoriesChronologically(memories: readonly Memory[]): Memory[] {
  return [...memories].sort(
    (left, right) =>
      left.memoryDate.localeCompare(right.memoryDate) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

export function memoriesToTripPath(memories: readonly Memory[]): TripPathFeature | null {
  const coordinates = sortMemoriesChronologically(memories)
    .filter(hasValidCoordinates)
    .map((memory) => [memory.longitude, memory.latitude] as [number, number]);

  if (coordinates.length < 2) return null;

  return {
    type: 'Feature',
    properties: { kind: 'narrative-order' },
    geometry: { type: 'LineString', coordinates },
  };
}

export function tripPathCollection(path: TripPathFeature | null): TripPathFeatureCollection {
  return { type: 'FeatureCollection', features: path ? [path] : [] };
}
