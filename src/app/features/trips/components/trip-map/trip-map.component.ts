import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { GeoJSONSource, LngLatBounds, Map as MapLibreMap } from 'maplibre-gl';

import { environment } from '../../../../../environments/environment';
import {
  JOURNEY_MAP_FIT_PADDING,
  JOURNEY_MAP_INITIAL_CENTER,
  JOURNEY_MAP_INITIAL_ZOOM,
  MEMORIES_LAYER_ID,
  MEMORY_FOCUS_DURATION_MS,
  MEMORY_FOCUS_ZOOM,
  TRIP_PATH_LAYER_ID,
  TRIP_PATH_SOURCE_ID,
} from '../../../../core/constants/map.constants';
import type { Memory } from '../../../../core/models/memory.model';
import type { MemoryFeatureCollection } from '../../../../shared/utils/memory-geojson';
import {
  setMemoryFeatureState,
  syncMemoryLayers,
} from '../../../../shared/utils/memory-map-layers';
import {
  type MapViewport,
  getMemoryFocusViewport,
  getTripViewport,
} from '../../../../shared/utils/map-viewport';
import {
  addStandardMapControls,
  configureMapLibreWorker,
  findFirstSymbolLayerId,
  observeMapResize,
  reportMapLibreError,
} from '../../../../shared/utils/maplibre-runtime';
import {
  type TripPathFeature,
  tripPathCollection,
} from '../../../../shared/utils/trip-path-geojson';

const EMPTY_COLLECTION: MemoryFeatureCollection = { type: 'FeatureCollection', features: [] };

@Component({
  selector: 'app-trip-map',
  templateUrl: './trip-map.component.html',
  styleUrl: '../../../journey/components/journey-map/journey-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  readonly featureCollection = input<MemoryFeatureCollection>(EMPTY_COLLECTION);
  readonly tripPath = input<TripPathFeature | null>(null);
  readonly selectedMemoryId = input<string | null>(null);
  readonly memorySelected = output<string>();

  protected readonly hasMapStyle = this.isConfigured(environment.mapStyleUrl);
  protected readonly mapFailed = signal(false);

  private map: MapLibreMap | null = null;
  private latestCollection = EMPTY_COLLECTION;
  private latestPath: TripPathFeature | null = null;
  private requestedSelectedId: string | null = null;
  private selectedFeatureId: string | null = null;
  private hoveredFeatureId: string | null = null;
  private fittedDataset: string | null = null;
  private stopObservingResize: (() => void) | null = null;

  constructor() {
    effect(() => {
      this.latestCollection = this.featureCollection();
      this.syncMapData();
    });
    effect(() => {
      this.latestPath = this.tripPath();
      this.syncPath();
    });
    effect(() => {
      this.requestedSelectedId = this.selectedMemoryId();
      this.syncSelectedState();
    });
  }

  ngAfterViewInit(): void {
    if (!this.hasMapStyle) return;

    configureMapLibreWorker();
    this.map = new MapLibreMap({
      container: this.mapContainer.nativeElement,
      style: environment.mapStyleUrl,
      center: [...JOURNEY_MAP_INITIAL_CENTER],
      zoom: JOURNEY_MAP_INITIAL_ZOOM,
      attributionControl: { compact: true },
    });
    addStandardMapControls(this.map);
    this.stopObservingResize = observeMapResize(this.map, this.mapContainer.nativeElement);

    this.map.on('load', () => {
      this.mapFailed.set(false);
      this.syncPath();
      this.syncMapData();
      this.bindInteractions();
    });
    this.map.on('error', (event) => {
      reportMapLibreError('Viaje', event, environment.production);
      if (!this.map?.isStyleLoaded()) this.mapFailed.set(true);
    });
  }

  ngOnDestroy(): void {
    this.stopObservingResize?.();
    this.map?.remove();
    this.map = null;
  }

  focusMemory(memory: Memory): void {
    if (!this.map) return;
    this.applyViewport(
      getMemoryFocusViewport(memory, this.map.getZoom()),
      MEMORY_FOCUS_DURATION_MS,
    );
  }

  private syncMapData(): void {
    if (!this.map?.isStyleLoaded()) return;
    syncMemoryLayers(this.map, this.latestCollection);
    this.syncSelectedState();
    this.fitDatasetWhenNeeded();
  }

  private syncPath(): void {
    if (!this.map?.isStyleLoaded()) return;
    const data = tripPathCollection(this.latestPath);
    const source = this.map.getSource(TRIP_PATH_SOURCE_ID) as GeoJSONSource | undefined;

    if (source) {
      source.setData(data);
      return;
    }

    this.map.addSource(TRIP_PATH_SOURCE_ID, { type: 'geojson', data });
    this.map.addLayer(
      {
        id: TRIP_PATH_LAYER_ID,
        type: 'line',
        source: TRIP_PATH_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#a67755', 'line-width': 3, 'line-opacity': 0.62 },
      },
      findFirstSymbolLayerId(this.map),
    );
  }

  private bindInteractions(): void {
    if (!this.map) return;

    this.map.on('mouseenter', MEMORIES_LAYER_ID, (event) => {
      if (!this.map) return;
      this.map.getCanvas().style.cursor = 'pointer';
      const id = this.featureId(event.features?.[0]);
      if (id && id !== this.hoveredFeatureId) {
        if (this.hoveredFeatureId)
          setMemoryFeatureState(this.map, this.hoveredFeatureId, { hover: false });
        this.hoveredFeatureId = id;
        setMemoryFeatureState(this.map, id, { hover: true });
      }
    });
    this.map.on('mouseleave', MEMORIES_LAYER_ID, () => {
      if (!this.map) return;
      this.map.getCanvas().style.cursor = '';
      if (this.hoveredFeatureId)
        setMemoryFeatureState(this.map, this.hoveredFeatureId, { hover: false });
      this.hoveredFeatureId = null;
    });
    this.map.on('click', MEMORIES_LAYER_ID, (event) => {
      const id = this.featureId(event.features?.[0]);
      if (!id) return;
      const feature = this.latestCollection.features.find((item) => item.id === id);
      if (feature && this.map) {
        this.applyViewport(
          {
            kind: 'focus',
            center: feature.geometry.coordinates,
            zoom: Math.max(this.map.getZoom(), MEMORY_FOCUS_ZOOM),
          },
          MEMORY_FOCUS_DURATION_MS,
        );
      }
      this.memorySelected.emit(id);
    });
  }

  private syncSelectedState(): void {
    if (!this.map?.isStyleLoaded()) return;
    if (this.selectedFeatureId && this.selectedFeatureId !== this.requestedSelectedId) {
      setMemoryFeatureState(this.map, this.selectedFeatureId, { selected: false });
    }
    if (this.requestedSelectedId)
      setMemoryFeatureState(this.map, this.requestedSelectedId, { selected: true });
    this.selectedFeatureId = this.requestedSelectedId;
  }

  private fitDatasetWhenNeeded(): void {
    const fingerprint = JSON.stringify(
      this.latestCollection.features.map((feature) => [feature.id, feature.geometry.coordinates]),
    );
    if (fingerprint === this.fittedDataset) return;
    this.fittedDataset = fingerprint;
    this.applyViewport(getTripViewport(this.latestCollection), 0);
  }

  private applyViewport(viewport: MapViewport, duration: number): void {
    if (!this.map || viewport.kind === 'unchanged') return;
    if (viewport.kind === 'overview') {
      this.map.fitBounds(viewport.bounds, { padding: this.padding(), duration });
      return;
    }
    if (viewport.kind === 'focus') {
      this.map.easeTo({ center: viewport.center, zoom: viewport.zoom, duration, essential: true });
      return;
    }
    const bounds = new LngLatBounds(viewport.coordinates[0], viewport.coordinates[0]);
    for (const coordinate of viewport.coordinates.slice(1)) bounds.extend(coordinate);
    this.map.fitBounds(bounds, { padding: this.padding(), maxZoom: viewport.maxZoom, duration });
  }

  private padding(): number {
    return Math.min(
      JOURNEY_MAP_FIT_PADDING,
      Math.max(28, this.mapContainer.nativeElement.clientWidth * 0.08),
    );
  }

  private featureId(
    feature: { id?: string | number; properties?: unknown } | undefined,
  ): string | null {
    if (typeof feature?.id === 'string') return feature.id;
    const properties = feature?.properties;
    if (properties && typeof properties === 'object' && 'id' in properties) {
      const id = (properties as { id?: unknown }).id;
      return typeof id === 'string' ? id : null;
    }
    return null;
  }

  private isConfigured(value: string): boolean {
    return value.trim().length > 0 && !value.startsWith('YOUR_');
  }
}
