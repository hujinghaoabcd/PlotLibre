export interface GeoJsonSourceLike {
  setData(data: unknown): void;
}

export interface MapLibreMapLike {
  getSource(id: string): unknown;
  addSource(id: string, source: unknown): void;
  removeSource(id: string): void;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, beforeId?: string): void;
  removeLayer(id: string): void;
}

export interface PlotLibreLayerIds {
  readonly fill: string;
  readonly line: string;
  readonly point: string;
}

export interface PlotLibreRendererOptions {
  readonly sourceId?: string;
  readonly layerIds?: Partial<PlotLibreLayerIds>;
  readonly beforeLayerId?: string;
}
