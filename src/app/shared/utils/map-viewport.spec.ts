import { PERU_OVERVIEW_BOUNDS } from '../../core/constants/map.constants';
import type { Memory } from '../../core/models/memory.model';
import type { MemoryFeatureCollection } from './memory-geojson';
import {
  getClosedDetailViewport,
  getJourneyInitialViewport,
  getJourneyOverviewViewport,
  getMemoryFocusViewport,
  getTripViewport,
} from './map-viewport';

function collectionWith(coordinates: [number, number][]): MemoryFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: coordinates.map((coordinate, index) => ({
      type: 'Feature',
      id: `memory-${index}`,
      properties: {
        id: `memory-${index}`,
        title: `Recuerdo ${index}`,
        categoryId: 'category-1',
        memoryDate: '2026-01-15T12:00:00.000Z',
        importance: 3,
        placeName: null,
      },
      geometry: { type: 'Point', coordinates: coordinate },
    })),
  };
}

const memory = {
  latitude: -12.0464,
  longitude: -77.0428,
} as Pick<Memory, 'latitude' | 'longitude'>;

describe('map viewport policy', () => {
  it('starts with the Peru overview independently of memories', () => {
    expect(getJourneyInitialViewport()).toEqual({
      kind: 'overview',
      bounds: [[...PERU_OVERVIEW_BOUNDS[0]], [...PERU_OVERVIEW_BOUNDS[1]]],
    });
  });

  it('focuses a selected memory without zooming out', () => {
    expect(getMemoryFocusViewport(memory, 9)).toEqual({
      kind: 'focus',
      center: [-77.0428, -12.0464],
      zoom: 13.5,
    });
    expect(getMemoryFocusViewport(memory, 16)).toMatchObject({ zoom: 16 });
  });

  it('keeps the viewport unchanged when detail closes', () => {
    expect(getClosedDetailViewport()).toEqual({ kind: 'unchanged' });
  });

  it('returns to Peru when every memory is inside the overview', () => {
    expect(
      getJourneyOverviewViewport(
        collectionWith([
          [-77.0428, -12.0464],
          [-71.9675, -13.5319],
        ]),
      ),
    ).toEqual(getJourneyInitialViewport());
  });

  it('includes every memory when an international point exists', () => {
    const coordinates: [number, number][] = [
      [-77.0428, -12.0464],
      [-74.006, 40.7128],
    ];
    expect(getJourneyOverviewViewport(collectionWith(coordinates))).toEqual({
      kind: 'bounds',
      coordinates,
      maxZoom: 13.5,
    });
  });

  it('uses overview, focus and bounds for trips with zero, one and many memories', () => {
    expect(getTripViewport(collectionWith([]))).toEqual(getJourneyInitialViewport());
    expect(getTripViewport(collectionWith([[-77, -12]]))).toEqual({
      kind: 'focus',
      center: [-77, -12],
      zoom: 13.5,
    });
    expect(
      getTripViewport(
        collectionWith([
          [-77, -12],
          [-72, -13],
        ]),
      ).kind,
    ).toBe('bounds');
  });
});
