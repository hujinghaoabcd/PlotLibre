import {
  SelectionController,
  type SelectionIntent,
} from "@plotlibre/interaction";
import { MapLibrePlotRenderer } from "./renderer.js";
import type {
  MapCanvasPointerEventLike,
  MapLibreMapLike,
} from "./types.js";

type CaptureEventKind = "pointerdown" | "mousedown";

/**
 * Handles selection modifiers in the canvas capture phase before MapLibre's
 * built-in pointer handlers can consume the DOM event. PlotLibre reserves Shift
 * for additive selection while installed, so MapLibre box zoom is restored only
 * when this adapter is destroyed.
 */
export class MapLibreSelectionModifierCapture {
  readonly #map: MapLibreMapLike;
  readonly #selection: SelectionController;
  readonly #renderer: MapLibrePlotRenderer;
  readonly #boxZoomWasEnabled: boolean;
  #lastPointerSignature: string | undefined;

  readonly #onPointerDown = (event: MapCanvasPointerEventLike): void => {
    this.#handleModifierDown(event, "pointerdown");
  };

  readonly #onMouseDown = (event: MapCanvasPointerEventLike): void => {
    this.#handleModifierDown(event, "mousedown");
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
    const canvas = this.#map.getCanvas();
    canvas.addEventListener("pointerdown", this.#onPointerDown, { capture: true });
    canvas.addEventListener("mousedown", this.#onMouseDown, { capture: true });
  }

  public destroy(): void {
    const canvas = this.#map.getCanvas();
    canvas.removeEventListener("pointerdown", this.#onPointerDown, {
      capture: true,
    });
    canvas.removeEventListener("mousedown", this.#onMouseDown, {
      capture: true,
    });
    if (this.#boxZoomWasEnabled) this.#map.boxZoom?.enable();
  }

  #handleModifierDown(
    event: MapCanvasPointerEventLike,
    kind: CaptureEventKind,
  ): void {
    const intent = readModifierIntent(event);
    if (!intent) return;

    const point = this.#readCanvasPoint(event);
    const signature = point
      ? `${intent}:${point.x.toFixed(3)}:${point.y.toFixed(3)}`
      : `${intent}:unknown`;
    const duplicateCompatibilityMouseEvent =
      kind === "mousedown" && signature === this.#lastPointerSignature;

    if (!duplicateCompatibilityMouseEvent) {
      const plotId = point
        ? this.#queryPlotId(point.x, point.y)
        : undefined;
      this.#selection.applyIntent(plotId, intent);
    }

    if (kind === "pointerdown") {
      this.#lastPointerSignature = signature;
    } else {
      this.#lastPointerSignature = undefined;
    }

    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    this.#map.getCanvas().focus?.();
  }

  #readCanvasPoint(
    event: MapCanvasPointerEventLike,
  ): { readonly x: number; readonly y: number } | undefined {
    const bounds = this.#map.getCanvas().getBoundingClientRect?.();
    if (
      bounds &&
      typeof event.clientX === "number" &&
      typeof event.clientY === "number"
    ) {
      return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    }
    if (
      typeof event.offsetX === "number" &&
      typeof event.offsetY === "number"
    ) {
      return { x: event.offsetX, y: event.offsetY };
    }
    return undefined;
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

function readModifierIntent(
  event: MapCanvasPointerEventLike,
): SelectionIntent | undefined {
  if (event.altKey === true) return "subtract";
  if (event.ctrlKey === true || event.metaKey === true) return "toggle";
  if (event.shiftKey === true) return "add";
  return undefined;
}
