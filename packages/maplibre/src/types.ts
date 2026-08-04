import type { Position } from "@plotlibre/core";

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
    readonly shiftKey?: boolean;
    readonly ctrlKey?: boolean;
    readonly metaKey?: boolean;
    readonly altKey?: boolean;
    preventDefault?(): void;
    stopPropagation?(): void;
  };
}

export interface MapLibreRenderedFeatureLike {
  readonly id?: string | number | undefined;
  readonly properties?: Readonly<Record<string, unknown>> | null | undefined;
}

export type MapLibreEventListener = (event: unknown) => void;

export interface MapCanvasPointerEventLike {
  readonly clientX?: number;
  readonly clientY?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly pointerId?: number;
  readonly pointerType?: string;
  readonly button?: number;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  preventDefault?(): void;
  stopPropagation?(): void;
  stopImmediatePropagation?(): void;
}

export interface KeyboardEventLike {
  readonly key: string;
  preventDefault?(): void;
  stopImmediatePropagation?(): void;
}

export interface MapCanvasLike {
  tabIndex: number;
  readonly style: { cursor: string };
  addEventListener(
    type: string,
    listener: (event: any) => void,
    options?: boolean | { readonly capture?: boolean },
  ): void;
  removeEventListener(
    type: string,
    listener: (event: any) => void,
    options?: boolean | { readonly capture?: boolean },
  ): void;
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top: number;
    readonly width?: number;
    readonly height?: number;
  };
  setPointerCapture?(pointerId: number): void;
  releasePointerCapture?(pointerId: number): void;
  hasPointerCapture?(pointerId: number): boolean;
  focus?(): void;
}

export interface MapContainerLike {
  appendChild?(child: unknown): unknown;
  removeChild?(child: unknown): unknown;
  contains?(child: unknown): boolean;
  readonly style?: unknown;
}

export interface MapInteractionHandlerLike {
  disable(): void;
  enable(): void;
  isEnabled?(): boolean;
}

export type MapDragPanLike = MapInteractionHandlerLike;
export type MapDoubleClickZoomLike = MapInteractionHandlerLike;
export type MapBoxZoomLike = MapInteractionHandlerLike;

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
  getContainer?(): MapContainerLike;
  project?(position: Position): MapLibrePointLike;
  /**
   * The concrete MapLibre engine uses its own Point class while tests may use a
   * lightweight point object. Keep these arguments opaque at the adapter boundary
   * so the public packages do not depend on MapLibre implementation types.
   */
  queryRenderedFeatures?(
    point: any,
    options?: any,
  ): readonly MapLibreRenderedFeatureLike[];
  readonly dragPan?: MapDragPanLike;
  readonly doubleClickZoom?: MapDoubleClickZoomLike;
  readonly boxZoom?: MapBoxZoomLike;
}

export interface PlotLibreSourceIds {
  readonly committed: string;
  readonly selection: string;
  readonly draft: string;
  readonly handles: string;
}

export interface PlotLibreLayerIds {
  readonly fill: string;
  readonly line: string;
  readonly point: string;
  readonly selectionLine: string;
  readonly selectionPoint: string;
  readonly draftFill: string;
  readonly draftLine: string;
  readonly draftPoint: string;
  readonly handleGuide: string;
  readonly handle: string;
}

export interface PlotLibreRendererOptions {
  readonly sourceId?: string;
  readonly sourceIds?: Partial<PlotLibreSourceIds>;
  readonly layerIds?: Partial<PlotLibreLayerIds>;
  readonly beforeLayerId?: string;
}
