import {
  JOURNEY_MAP_FIT_MAX_ZOOM,
  MEMORY_FOCUS_ZOOM,
  PERU_OVERVIEW_BOUNDS,
} from '../../core/constants/map.constants';
import type { Memory } from '../../core/models/memory.model';
import type { MemoryFeatureCollection } from './memory-geojson';
import { hasValidCoordinates } from './memory-geojson';

export type MapCoordinate = [longitude: number, latitude: number];
export type MapBounds = [southwest: MapCoordinate, northeast: MapCoordinate];

export type MapViewport =
  | { kind: 'overview'; bounds: MapBounds }
  | { kind: 'focus'; center: MapCoordinate; zoom: number }
  | { kind: 'bounds'; coordinates: MapCoordinate[]; maxZoom: number }
  | { kind: 'unchanged' };

export function getJourneyInitialViewport(): MapViewport {
  return { kind: 'overview', bounds: peruBounds() };
}

export function getMemoryFocusViewport(
  memory: Pick<Memory, 'latitude' | 'longitude'>,
  currentZoom: number,
): MapViewport {
  if (!hasValidCoordinates(memory)) return { kind: 'unchanged' };

  return {
    kind: 'focus',
    center: [memory.longitude, memory.latitude],
    zoom: Math.max(currentZoom, MEMORY_FOCUS_ZOOM),
  };
}

export function getClosedDetailViewport(): MapViewport {
  return { kind: 'unchanged' };
}

export function getJourneyOverviewViewport(collection: MemoryFeatureCollection): MapViewport {
  const coordinates = collection.features.map((feature) => feature.geometry.coordinates);

  if (coordinates.length === 0 || coordinates.every(isWithinPeruOverview)) {
    return getJourneyInitialViewport();
  }

  return { kind: 'bounds', coordinates, maxZoom: JOURNEY_MAP_FIT_MAX_ZOOM };
}

export function getTripViewport(collection: MemoryFeatureCollection): MapViewport {
  const coordinates = collection.features.map((feature) => feature.geometry.coordinates);

  if (coordinates.length === 0) return getJourneyInitialViewport();
  if (coordinates.length === 1) {
    return { kind: 'focus', center: coordinates[0], zoom: MEMORY_FOCUS_ZOOM };
  }

  return { kind: 'bounds', coordinates, maxZoom: JOURNEY_MAP_FIT_MAX_ZOOM };
}

export function isWithinPeruOverview(coordinate: MapCoordinate): boolean {
  const [[west, south], [east, north]] = PERU_OVERVIEW_BOUNDS;
  return (
    coordinate[0] >= west &&
    coordinate[0] <= east &&
    coordinate[1] >= south &&
    coordinate[1] <= north
  );
}

function peruBounds(): MapBounds {
  return [[...PERU_OVERVIEW_BOUNDS[0]], [...PERU_OVERVIEW_BOUNDS[1]]];
}
