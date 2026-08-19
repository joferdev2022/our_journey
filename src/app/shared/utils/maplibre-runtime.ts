import { Map as MapLibreMap, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl';

let isWorkerConfigured = false;

export function configureMapLibreWorker(): void {
  if (isWorkerConfigured) {
    return;
  }

  setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href);
  isWorkerConfigured = true;
}

export type MapLibreResourceKind = 'style' | 'source' | 'tile' | 'glyph' | 'sprite' | 'map';

export function addStandardMapControls(map: MapLibreMap): void {
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
}

export function observeMapResize(map: MapLibreMap, container: HTMLElement): () => void {
  if (typeof ResizeObserver === 'undefined') {
    return () => undefined;
  }

  let resizeFrame: number | null = null;
  const observer = new ResizeObserver(() => {
    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      map.resize();
    });
  });

  observer.observe(container);

  return () => {
    observer.disconnect();

    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
    }
  };
}

export function reportMapLibreError(context: string, event: unknown, production: boolean): void {
  if (production) {
    return;
  }

  const details = getErrorDetails(event);

  console.error(
    `[Our Journey][MapLibre][${context}] Error de ${details.resource}: ${details.message}`,
    details.metadata,
  );
}

function getErrorDetails(event: unknown): {
  resource: MapLibreResourceKind;
  message: string;
  metadata: { error?: unknown; sourceId?: string; tile?: unknown };
} {
  const eventRecord = isRecord(event) ? event : {};
  const error = eventRecord['error'];
  const errorRecord = isRecord(error) ? error : {};
  const message =
    (typeof errorRecord['message'] === 'string' && errorRecord['message']) ||
    (typeof eventRecord['message'] === 'string' && eventRecord['message']) ||
    'Error sin detalle proporcionado por MapLibre.';
  const normalizedMessage = message.toLowerCase();
  const sourceId =
    typeof eventRecord['sourceId'] === 'string' ? eventRecord['sourceId'] : undefined;
  const tile = eventRecord['tile'];

  let resource: MapLibreResourceKind = 'map';

  if (normalizedMessage.includes('glyph') || normalizedMessage.includes('font')) {
    resource = 'glyph';
  } else if (normalizedMessage.includes('sprite') || normalizedMessage.includes('image')) {
    resource = 'sprite';
  } else if (tile !== undefined || normalizedMessage.includes('tile')) {
    resource = 'tile';
  } else if (sourceId || normalizedMessage.includes('source')) {
    resource = 'source';
  } else if (normalizedMessage.includes('style')) {
    resource = 'style';
  }

  return {
    resource,
    message,
    metadata: { error, sourceId, tile },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function findFirstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
}
