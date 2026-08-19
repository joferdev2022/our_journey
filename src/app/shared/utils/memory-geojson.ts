import type { Memory } from '../../core/models/memory.model';

export interface MemoryGeoJsonProperties {
  id: string;
  title: string;
  categoryId: string;
  memoryDate: string;
  importance: number;
  placeName: string | null;
}

export interface MemoryGeoJsonFeature {
  type: 'Feature';
  id: string;
  properties: MemoryGeoJsonProperties;
  geometry: {
    type: 'Point';
    coordinates: [longitude: number, latitude: number];
  };
}

export interface MemoryFeatureCollection {
  type: 'FeatureCollection';
  features: MemoryGeoJsonFeature[];
}

export function memoriesToFeatureCollection(memories: readonly Memory[]): MemoryFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: memories.filter(hasValidCoordinates).map((memory) => ({
      type: 'Feature',
      id: memory.id,
      properties: {
        id: memory.id,
        title: memory.title,
        categoryId: memory.categoryId,
        memoryDate: memory.memoryDate,
        importance: memory.importance,
        placeName: memory.placeName,
      },
      geometry: {
        type: 'Point',
        coordinates: [memory.longitude, memory.latitude],
      },
    })),
  };
}

export function hasValidCoordinates(memory: Pick<Memory, 'latitude' | 'longitude'>): boolean {
  return (
    Number.isFinite(memory.latitude) &&
    Number.isFinite(memory.longitude) &&
    memory.latitude >= -90 &&
    memory.latitude <= 90 &&
    memory.longitude >= -180 &&
    memory.longitude <= 180
  );
}
