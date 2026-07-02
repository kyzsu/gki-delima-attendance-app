/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Mapbox public token (pk.…) for the static geofence map; optional —
   *  the check-in screens fall back to a stylized map when it is absent. */
  readonly VITE_MAPBOX_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
