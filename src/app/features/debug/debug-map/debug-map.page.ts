import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';

const STYLE_URLS = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  positron: 'https://tiles.openfreemap.org/styles/positron',
} as const;

type StyleName = keyof typeof STYLE_URLS;

@Component({
  selector: 'app-debug-map-page',
  templateUrl: './debug-map.page.html',
  styleUrl: './debug-map.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugMapPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  protected readonly styleName = this.readStyleName();
  protected readonly initialZoom = this.readZoom();

  private map: MapLibreMap | null = null;
  private readonly inspectedZooms = new Set<number>();
  private healthTimer: number | null = null;

  ngAfterViewInit(): void {
    console.info('[Debug MapLibre] Soporte WebGL:', {
      webgl2: Boolean(document.createElement('canvas').getContext('webgl2')),
      webgl: Boolean(document.createElement('canvas').getContext('webgl')),
    });

    const workerUrl = new URL('maplibre-gl-worker.mjs', document.baseURI).href;
    console.info('[Debug MapLibre] Worker configurado:', workerUrl);
    setWorkerUrl(workerUrl);
    this.map = new MapLibreMap({
      container: this.mapContainer.nativeElement,
      style: STYLE_URLS[this.styleName],
      center: [-76, -9.3],
      zoom: this.initialZoom,
      transformRequest: (url, resourceType) => {
        console.debug('[Debug MapLibre request]', { resourceType, url });
        return { url };
      },
    });
    this.map.addControl(new NavigationControl(), 'top-right');
    this.healthTimer = window.setTimeout(() => this.inspectHealth(), 5000);

    this.map.on('load', () => this.inspectLoadedStyle());
    this.map.on('idle', () => this.inspectRenderedFeatures());
    this.map.on('sourcedata', (event) => {
      if (event.sourceId === 'openmaptiles' && event.isSourceLoaded) {
        console.info('[Debug MapLibre source]', {
          sourceId: event.sourceId,
          sourceDataType: event.sourceDataType,
          isSourceLoaded: event.isSourceLoaded,
          runtimeSourceRegistered: Boolean(this.map?.getSource(event.sourceId)),
        });
      }
    });
    this.map.on('error', (event) => {
      const technicalEvent = event as unknown as Record<string, unknown>;

      console.error('[Debug MapLibre error]', {
        error: technicalEvent['error'],
        sourceId: technicalEvent['sourceId'],
        tile: technicalEvent['tile'],
        event,
      });
    });
  }

  ngOnDestroy(): void {
    if (this.healthTimer !== null) {
      window.clearTimeout(this.healthTimer);
    }

    this.map?.remove();
    this.map = null;
  }

  private inspectHealth(): void {
    if (!this.map) {
      return;
    }

    const openMapTilesRegistered = Boolean(this.map.getSource('openmaptiles'));

    console.info('[Debug MapLibre health a 5 s]', {
      styleName: this.styleName,
      mapLoaded: this.map.loaded(),
      styleLoaded: this.map.isStyleLoaded(),
      allTilesLoaded: this.map.areTilesLoaded(),
      openMapTilesRegistered,
      openMapTilesLoaded: openMapTilesRegistered ? this.map.isSourceLoaded('openmaptiles') : false,
    });
  }
  private inspectLoadedStyle(): void {
    if (!this.map) {
      return;
    }

    const style = this.map.getStyle();
    const sourceIds = Object.keys(style.sources);
    const relevantLayers = style.layers
      .filter((layer) => /road|transportation|place|poi|building|park|water/i.test(layer.id))
      .map((layer) => ({
        id: layer.id,
        type: layer.type,
        source: 'source' in layer ? layer.source : undefined,
        visibility: this.map?.getLayoutProperty(layer.id, 'visibility') ?? 'visible',
        minzoom: layer.minzoom ?? 0,
        maxzoom: layer.maxzoom ?? 24,
      }));

    console.info('[Debug MapLibre style]', {
      styleName: this.styleName,
      styleUrl: STYLE_URLS[this.styleName],
      sourceIds,
      layerCount: style.layers.length,
      openMapTilesRegistered: Boolean(this.map.getSource('openmaptiles')),
      relevantLayers,
    });
  }

  private inspectRenderedFeatures(): void {
    if (!this.map) {
      return;
    }

    const zoom = Math.round(this.map.getZoom());

    if (this.inspectedZooms.has(zoom)) {
      return;
    }

    this.inspectedZooms.add(zoom);
    const features = this.map.queryRenderedFeatures();

    console.info('[Debug MapLibre rendered features]', {
      styleName: this.styleName,
      zoom: this.map.getZoom(),
      total: features.length,
      sourceIds: [...new Set(features.map((feature) => feature.source))].sort(),
      layerIds: [...new Set(features.map((feature) => feature.layer.id))].sort(),
      openMapTilesLoaded: this.map.isSourceLoaded('openmaptiles'),
    });
  }

  private readStyleName(): StyleName {
    const requestedStyle = new URLSearchParams(window.location.search).get('style');

    return requestedStyle && requestedStyle in STYLE_URLS
      ? (requestedStyle as StyleName)
      : 'liberty';
  }

  private readZoom(): number {
    const requestedZoom = Number(new URLSearchParams(window.location.search).get('zoom'));

    return Number.isFinite(requestedZoom) && requestedZoom >= 0 && requestedZoom <= 22
      ? requestedZoom
      : 12;
  }
}
