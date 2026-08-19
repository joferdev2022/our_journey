import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnDestroy,
  ViewChild,
  output,
  signal,
} from '@angular/core';
import { Map as MapLibreMap, Marker } from 'maplibre-gl';

import { environment } from '../../../../../environments/environment';
import {
  JOURNEY_MAP_INITIAL_CENTER,
  JOURNEY_MAP_INITIAL_ZOOM,
} from '../../../../core/constants/map.constants';
import {
  addStandardMapControls,
  configureMapLibreWorker,
  observeMapResize,
  reportMapLibreError,
} from '../../../../shared/utils/maplibre-runtime';

export interface LocationSelection {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-location-picker-map',
  templateUrl: './location-picker-map.component.html',
  styleUrl: './location-picker-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPickerMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  readonly initialLocation = input<LocationSelection | null>(null);
  readonly locationSelected = output<LocationSelection>();

  protected readonly hasMapStyle = this.isConfigured(environment.mapStyleUrl);
  protected readonly mapFailed = signal(false);

  private map: MapLibreMap | null = null;
  private marker: Marker | null = null;
  private stopObservingResize: (() => void) | null = null;

  ngAfterViewInit(): void {
    if (!this.hasMapStyle) {
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
    const initialLocation = this.initialLocation();

    if (initialLocation) {
      this.placeMarker(initialLocation);
      this.map.jumpTo({
        center: [initialLocation.longitude, initialLocation.latitude],
        zoom: Math.max(this.map.getZoom(), 13),
      });
    }
    this.stopObservingResize = observeMapResize(this.map, this.mapContainer.nativeElement);

    this.map.on('click', (event) => {
      const selection = {
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      };

      this.placeMarker(selection);
      this.locationSelected.emit(selection);
    });

    this.map.on('load', () => this.mapFailed.set(false));

    this.map.on('error', (event) => {
      reportMapLibreError('Selector de ubicación', event, environment.production);

      if (!this.map?.isStyleLoaded()) {
        this.mapFailed.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopObservingResize?.();
    this.stopObservingResize = null;
    this.marker?.remove();
    this.marker = null;
    this.map?.remove();
    this.map = null;
  }

  private placeMarker(selection: LocationSelection): void {
    if (!this.map) {
      return;
    }

    if (!this.marker) {
      this.marker = new Marker({ color: '#355f51' })
        .setLngLat([selection.longitude, selection.latitude])
        .addTo(this.map);
      return;
    }

    this.marker.setLngLat([selection.longitude, selection.latitude]);
  }

  private isConfigured(value: string): boolean {
    return value.trim().length > 0 && !value.startsWith('YOUR_');
  }
}
