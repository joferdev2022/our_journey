export const JOURNEY_MAP_INITIAL_CENTER = [-76, -9.3] as const;
export const JOURNEY_MAP_INITIAL_ZOOM = 5;

// Límites de viewport aproximados; no representan fronteras políticas exactas.
export const PERU_OVERVIEW_BOUNDS = [
  [-82, -19],
  [-68, 1],
] as const;
export const PERU_OVERVIEW_PADDING = 40;
export const MEMORY_FOCUS_ZOOM = 13.5;
export const MEMORY_FOCUS_DURATION_MS = 650;
export const JOURNEY_MAP_FIT_MAX_ZOOM = 13.5;
export const JOURNEY_MAP_FIT_PADDING = 72;

export const MEMORIES_SOURCE_ID = 'memories-source';
export const MEMORIES_LAYER_ID = 'memories-layer';
export const MEMORIES_HALO_LAYER_ID = 'memories-halo-layer';
export const TRIP_PATH_SOURCE_ID = 'trip-path-source';
export const TRIP_PATH_LAYER_ID = 'trip-path-layer';
