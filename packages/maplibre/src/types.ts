export interface GeoJsonSourceLike {
  setData(data: unknown): void;
}

export interface MapLibreLngLatLike {
  readonly lng: number;
  readonly lat: number;
}

export interface MapLibrePointLike {
  readonly x: number;
  readonly y: number;
}

export interface MapLibreMouseEventLike {
  readonly lngLat: MapLibreLngLatLike;
  readonly point?: MapLibrePointLike;
  readonly originalEvent?: {
    preventDefault?(): void;
    stopPropagation?(): void;
  };
}

export interface MapLibreRenderedFeatureLike {
  readonly id?: string | number;
  readonly properties?: Readonly<Record<string, unknown>>;
}

export type MapLibreEventListener = (event: unknown) => void;

export interface MapCanvasLike {
  tabIndex: number;
  readonly style: { cursor: string };
  addEventListener(type: string, listener: (event: KeyboardEventLike) => void): void;
  removeEventListener(type: string, listener: (event: KeyboardEventLike) => void): void;
  focus?(): void;
}

export interface KeyboardEventLike {
  readonly key: string;
  preventDefault?(): void;
}

export interface MapDragPanLike {
  disable(): void;
  enable(): void;
  isEnabled?(): boolean;
}

export interface MapLibreMapLike {
  getSource(id: string): unknown;
  addSource(id: string, source: unknown): void;
  removeSource(id: string): void;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, beforeId?: string): void;
  removeLayer(id: string): void;
  on(type: string, listener: MapLibreEventListener): unknown;
  off(type: string, listener: MapLibreEventListener): unknown;
  getCanvas(): MapCanvasLike;
  queryRenderedFeatures?(
    point: unknown,
    options?: { readonly layers?: readonly string[] },
  ): readonly MapLibreRenderedFeatureLike[];
  readonly dragPan?: MapDragPanLike;
}

export interface PlotLibreSourceIds {
  readonly committed: string;
  readonly draft: string;
  readonly handles: string;
}

export interface PlotLibreLayerIds {
  readonly fill: string;
  readonly line: string;
  readonly point: string;
  readonly draftFill: string;
  readonly draftLine: string;
  readonly draftPoint: string;
  readonly handle: string;
}

export interface PlotLibreRendererOptions {
  readonly sourceId?: string;
  readonly sourceIds?: Partial<PlotLibreSourceIds>;
  readonly layerIds?: Partial<PlotLibreLayerIds>;
  readonly beforeLayerId?: string;
}
