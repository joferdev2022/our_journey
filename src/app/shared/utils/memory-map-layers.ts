import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import {
  MEMORIES_HALO_LAYER_ID,
  MEMORIES_LAYER_ID,
  MEMORIES_SOURCE_ID,
} from '../../core/constants/map.constants';
import type { MemoryFeatureCollection } from './memory-geojson';
import { findFirstSymbolLayerId } from './maplibre-runtime';

export function getMemoryPointRadius(importance: number): number {
  const normalized = Math.min(5, Math.max(1, importance));
  return 4.5 + (normalized - 1);
}

export function syncMemoryLayers(map: MapLibreMap, collection: MemoryFeatureCollection): void {
  const source = map.getSource(MEMORIES_SOURCE_ID) as GeoJSONSource | undefined;

  if (source) {
    source.setData(collection);
    return;
  }

  const beforeId = findFirstSymbolLayerId(map);
  map.addSource(MEMORIES_SOURCE_ID, { type: 'geojson', data: collection });
  map.addLayer(
    {
      id: MEMORIES_HALO_LAYER_ID,
      type: 'circle',
      source: MEMORIES_SOURCE_ID,
      paint: {
        'circle-radius': [
          '+',
          ['interpolate', ['linear'], ['get', 'importance'], 1, 9, 5, 14],
          ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0],
          ['case', ['boolean', ['feature-state', 'selected'], false], 3, 0],
        ],
        'circle-color': '#d39262',
        'circle-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          0.34,
          ['boolean', ['feature-state', 'hover'], false],
          0.25,
          0.16,
        ],
        'circle-blur': 0.45,
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: MEMORIES_LAYER_ID,
      type: 'circle',
      source: MEMORIES_SOURCE_ID,
      paint: {
        'circle-radius': [
          '+',
          ['interpolate', ['linear'], ['get', 'importance'], 1, 4.5, 5, 8.5],
          ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
          ['case', ['boolean', ['feature-state', 'selected'], false], 1.5, 0],
        ],
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#a85f3f',
          '#3d6758',
        ],
        'circle-stroke-color': '#fffdf8',
        'circle-stroke-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          2.6,
          1.6,
        ],
      },
    },
    beforeId,
  );
}

export function setMemoryFeatureState(
  map: MapLibreMap,
  memoryId: string,
  state: { hover?: boolean; selected?: boolean },
): void {
  if (!map.getSource(MEMORIES_SOURCE_ID)) return;
  map.setFeatureState({ source: MEMORIES_SOURCE_ID, id: memoryId }, state);
}
