import {
  SelectionController,
  type SelectionIntent,
} from "@plotlibre/interaction";
import { MapLibrePlotRenderer } from "./renderer.js";
import type {
  MapLibreMapLike,
  MapLibreMouseEventLike,
} from "./types.js";

/**
 * Reserves MapLibre modifier-mousedown gestures for PlotLibre selection.
 *
 * Box zoom is disabled while installed so MapLibre emits the regular mousedown
 * event for Shift gestures. The adapter is registered before body translation
 * and handle editing, and later modifier-click events are ignored by the general
 * interaction controller to avoid applying toggle/subtract twice.
 */
export class MapLibreSelectionModifierCapture {
  readonly #map: MapLibreMapLike;
  readonly #selection: SelectionController;
  readonly #renderer: MapLibrePlotRenderer;
  readonly #boxZoomWasEnabled: boolean;

  readonly #onMouseDown = (event: unknown): void => {
    const mouseEvent = asMouseEvent(event);
    if (!mouseEvent?.point) return;
    const intent = readModifierIntent(mouseEvent);
    if (!intent) return;

    const plotId = this.#queryPlotId(mouseEvent.point.x, mouseEvent.point.y);
    this.#selection.applyIntent(plotId, intent);
    mouseEvent.originalEvent?.preventDefault?.();
    mouseEvent.originalEvent?.stopPropagation?.();
    this.#map.getCanvas().focus?.();
  };

  public constructor(
    map: MapLibreMapLike,
    selection: SelectionController,
    renderer: MapLibrePlotRenderer,
  ) {
    this.#map = map;
    this.#selection = selection;
    this.#renderer = renderer;
    this.#boxZoomWasEnabled = this.#map.boxZoom?.isEnabled?.() ?? false;
    if (this.#boxZoomWasEnabled) this.#map.boxZoom?.disable();
    this.#map.on("mousedown", this.#onMouseDown);
  }

  public destroy(): void {
    this.#map.off("mousedown", this.#onMouseDown);
    if (this.#boxZoomWasEnabled) this.#map.boxZoom?.enable();
  }

  #queryPlotId(x: number, y: number): string | undefined {
    if (!this.#map.queryRenderedFeatures) return undefined;
    const features = this.#map.queryRenderedFeatures(
      { x, y },
      {
        layers: [
          this.#renderer.layerIds.selectionPoint,
          this.#renderer.layerIds.selectionLine,
          this.#renderer.layerIds.point,
          this.#renderer.layerIds.line,
          this.#renderer.layerIds.fill,
        ],
      },
    );
    for (const feature of features) {
      const plotId = feature.properties?.plotId;
      if (typeof plotId === "string") return plotId;
    }
    return undefined;
  }
}

function asMouseEvent(event: unknown): MapLibreMouseEventLike | undefined {
  if (typeof event !== "object" || event === null) return undefined;
  const point = (event as { point?: unknown }).point;
  if (typeof point !== "object" || point === null) return undefined;
  const x = (point as { x?: unknown }).x;
  const y = (point as { y?: unknown }).y;
  if (typeof x !== "number" || typeof y !== "number") return undefined;
  return event as MapLibreMouseEventLike;
}

function readModifierIntent(
  event: MapLibreMouseEventLike,
): SelectionIntent | undefined {
  const original = event.originalEvent;
  if (original?.altKey === true) return "subtract";
  if (original?.ctrlKey === true || original?.metaKey === true) return "toggle";
  if (original?.shiftKey === true) return "add";
  return undefined;
}
