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
import { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl';

import { environment } from '../../../../../environments/environment';
import {
  JOURNEY_MAP_FIT_PADDING,
  JOURNEY_MAP_INITIAL_CENTER,
  JOURNEY_MAP_INITIAL_ZOOM,
  MEMORIES_LAYER_ID,
  MEMORY_FOCUS_DURATION_MS,
  MEMORY_FOCUS_ZOOM,
} from '../../../../core/constants/map.constants';
import type { Memory } from '../../../../core/models/memory.model';
import {
  type MemoryFeatureCollection,
  memoriesToFeatureCollection,
} from '../../../../shared/utils/memory-geojson';
import {
  setMemoryFeatureState,
  syncMemoryLayers,
} from '../../../../shared/utils/memory-map-layers';
import {
  type MapViewport,
  getJourneyInitialViewport,
  getJourneyOverviewViewport,
  getMemoryFocusViewport,
  getTripViewport,
} from '../../../../shared/utils/map-viewport';
import {
  addStandardMapControls,
  configureMapLibreWorker,
  observeMapResize,
  reportMapLibreError,
} from '../../../../shared/utils/maplibre-runtime';

const EMPTY_COLLECTION: MemoryFeatureCollection = { type: 'FeatureCollection', features: [] };

@Component({
  selector: 'app-journey-map',
  templateUrl: './journey-map.component.html',
  styleUrl: './journey-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  readonly featureCollection = input<MemoryFeatureCollection>(EMPTY_COLLECTION);
  readonly selectedMemoryId = input<string | null>(null);
  readonly memorySelected = output<string>();

  protected readonly hasMapStyle = this.isConfigured(environment.mapStyleUrl);
  protected readonly mapFailed = signal(false);

  private map: MapLibreMap | null = null;
  private latestCollection = EMPTY_COLLECTION;
  private requestedSelectedId: string | null = null;
  private selectedFeatureId: string | null = null;
  private hoveredFeatureId: string | null = null;
  private pendingFocus: Memory | null = null;
  private stopObservingResize: (() => void) | null = null;

  constructor() {
    effect(() => {
      this.latestCollection = this.featureCollection();
      this.syncSource();
    });
    effect(() => {
      this.requestedSelectedId = this.selectedMemoryId();
      this.syncSelectedState();
    });
  }

  ngAfterViewInit(): void {
    if (!this.hasMapStyle) {
      console.warn('Our Journey: configura mapStyleUrl en src/environments para mostrar MapLibre.');
      return;
    }

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
      this.syncSource();
      this.bindMemoryInteractions();
      this.applyViewport(getJourneyInitialViewport(), 0);
      if (this.pendingFocus) this.focusMemory(this.pendingFocus);
    });

    this.map.on('error', (event) => {
      reportMapLibreError('Journey', event, environment.production);
      if (!this.map?.isStyleLoaded()) this.mapFailed.set(true);
    });
  }

  ngOnDestroy(): void {
    this.stopObservingResize?.();
    this.stopObservingResize = null;
    this.map?.remove();
    this.map = null;
  }

  addMemories(memories: readonly Memory[]): void {
    this.latestCollection = memoriesToFeatureCollection(memories);
    this.syncSource();
  }

  focusMemory(memory: Memory): void {
    if (!this.map?.isStyleLoaded()) {
      this.pendingFocus = memory;
      return;
    }

    this.pendingFocus = null;
    this.applyViewport(
      getMemoryFocusViewport(memory, this.map.getZoom()),
      MEMORY_FOCUS_DURATION_MS,
    );
  }

  fitTrip(memories: readonly Memory[]): void {
    this.applyViewport(getTripViewport(memoriesToFeatureCollection(memories)), 600);
  }

  showAllMemories(): void {
    this.applyViewport(getJourneyOverviewViewport(this.latestCollection), 650);
  }

  clearMemories(): void {
    this.latestCollection = EMPTY_COLLECTION;
    this.syncSource();
  }

  private syncSource(): void {
    if (!this.map?.isStyleLoaded()) return;
    syncMemoryLayers(this.map, this.latestCollection);
    this.syncSelectedState();
    if (this.hoveredFeatureId) {
      setMemoryFeatureState(this.map, this.hoveredFeatureId, { hover: true });
    }
  }

  private bindMemoryInteractions(): void {
    if (!this.map) return;

    this.map.on('mouseenter', MEMORIES_LAYER_ID, (event) => {
      if (!this.map) return;
      this.map.getCanvas().style.cursor = 'pointer';
      const memoryId = this.featureId(event.features?.[0]);
      if (memoryId && memoryId !== this.hoveredFeatureId) {
        if (this.hoveredFeatureId) {
          setMemoryFeatureState(this.map, this.hoveredFeatureId, { hover: false });
        }
        this.hoveredFeatureId = memoryId;
        setMemoryFeatureState(this.map, memoryId, { hover: true });
      }
    });

    this.map.on('mouseleave', MEMORIES_LAYER_ID, () => {
      if (!this.map) return;
      this.map.getCanvas().style.cursor = '';
      if (this.hoveredFeatureId) {
        setMemoryFeatureState(this.map, this.hoveredFeatureId, { hover: false });
        this.hoveredFeatureId = null;
      }
    });

    this.map.on('click', MEMORIES_LAYER_ID, (event) => {
      if (!this.map) return;
      const memoryId = this.featureId(event.features?.[0]);
      if (!memoryId) return;
      const feature = this.latestCollection.features.find((item) => item.id === memoryId);
      if (feature) {
        this.applyViewport(
          {
            kind: 'focus',
            center: feature.geometry.coordinates,
            zoom: Math.max(this.map.getZoom(), MEMORY_FOCUS_ZOOM),
          },
          MEMORY_FOCUS_DURATION_MS,
        );
      }
      this.memorySelected.emit(memoryId);
    });
  }

  private syncSelectedState(): void {
    if (!this.map?.isStyleLoaded()) return;
    if (this.selectedFeatureId && this.selectedFeatureId !== this.requestedSelectedId) {
      setMemoryFeatureState(this.map, this.selectedFeatureId, { selected: false });
    }
    if (this.requestedSelectedId) {
      setMemoryFeatureState(this.map, this.requestedSelectedId, { selected: true });
    }
    this.selectedFeatureId = this.requestedSelectedId;
  }

  private applyViewport(viewport: MapViewport, duration: number): void {
    if (!this.map || viewport.kind === 'unchanged') return;
    if (viewport.kind === 'overview') {
      this.map.fitBounds(viewport.bounds, { padding: this.viewportPadding(), duration });
      return;
    }
    if (viewport.kind === 'focus') {
      this.map.easeTo({ center: viewport.center, zoom: viewport.zoom, duration, essential: true });
      return;
    }
    if (viewport.coordinates.length === 1) {
      this.map.easeTo({
        center: viewport.coordinates[0],
        zoom: viewport.maxZoom,
        duration,
        essential: true,
      });
      return;
    }

    const bounds = new LngLatBounds(viewport.coordinates[0], viewport.coordinates[0]);
    for (const coordinate of viewport.coordinates.slice(1)) bounds.extend(coordinate);
    this.map.fitBounds(bounds, {
      padding: this.viewportPadding(),
      maxZoom: viewport.maxZoom,
      duration,
    });
  }

  private viewportPadding(): number {
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
