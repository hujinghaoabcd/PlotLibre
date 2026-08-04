import type {
  PlotFeature,
  PlotRegistry,
  PlotStore,
  Position,
} from "@plotlibre/core";
import {
  createLocalTranslation,
  SelectionController,
  translatePlotFeaturesLocal,
} from "@plotlibre/interaction";
import { MapLibrePlotRenderer } from "./renderer.js";
import type {
  KeyboardEventLike,
  MapLibreMapLike,
  MapLibreMouseEventLike,
} from "./types.js";

export interface SelectionTransformRejection {
  readonly code: "SELECTION_TRANSLATION_REJECTED";
  readonly message: string;
}

export interface MapLibreSelectionTranslationCallbacks {
  replaceSelection(features: readonly PlotFeature[]): readonly PlotFeature[];
}

interface SelectionTranslationDrag {
  readonly start: Position;
  readonly originals: readonly PlotFeature[];
  readonly dragPanWasEnabled: boolean;
  preview: readonly PlotFeature[];
  moved: boolean;
}

/**
 * MapLibre pointer adapter for one local-metre translation of the complete
 * selection. Store state is never mutated during preview; mouseup delegates one
 * preflighted BatchEditCommand to PlotLibre.
 */
export class MapLibreSelectionTranslation {
  readonly #map: MapLibreMapLike;
  readonly #registry: PlotRegistry;
  readonly #store: PlotStore;
  readonly #selection: SelectionController;
  readonly #renderer: MapLibrePlotRenderer;
  readonly #callbacks: MapLibreSelectionTranslationCallbacks;
  #drag: SelectionTranslationDrag | undefined;
  #rejection: SelectionTransformRejection | undefined;

  readonly #onMouseDown = (event: unknown): void => {
    if (this.#drag) return;
    const mouseEvent = asMouseEvent(event);
    if (!mouseEvent || hasSelectionModifier(mouseEvent)) return;
    if (this.#queryHandle(mouseEvent)) return;

    const plotId = this.#queryPlotId(mouseEvent);
    if (plotId === undefined) return;

    this.#selection.applyIntent(plotId, "replace");
    const originals = this.#selection.selectedIds.map((id) =>
      this.#store.get(id)
    );
    if (originals.length === 0) return;

    const dragPanWasEnabled = this.#map.dragPan?.isEnabled?.() ?? true;
    this.#map.dragPan?.disable();
    this.#rejection = undefined;
    this.#drag = {
      start: toPosition(mouseEvent),
      originals,
      dragPanWasEnabled,
      preview: originals,
      moved: false,
    };
    mouseEvent.originalEvent?.preventDefault?.();
    mouseEvent.originalEvent?.stopPropagation?.();
    this.#map.getCanvas().focus?.();
    this.#map.getCanvas().style.cursor = "grabbing";
  };

  readonly #onMouseMove = (event: unknown): void => {
    const drag = this.#drag;
    if (!drag) return;
    const mouseEvent = asMouseEvent(event);
    if (!mouseEvent) return;

    const translation = createLocalTranslation(
      drag.start,
      toPosition(mouseEvent),
    );
    const moved =
      Math.abs(translation.deltaMeters.x) > 1e-6 ||
      Math.abs(translation.deltaMeters.y) > 1e-6;
    if (!moved) {
      drag.preview = drag.originals;
      drag.moved = false;
      this.#rejection = undefined;
      this.#renderPreview(drag.originals);
      return;
    }

    try {
      const preview = translatePlotFeaturesLocal(
        drag.originals,
        translation,
      );
      for (const candidate of preview) {
        this.#registry.generate(candidate);
      }
      drag.preview = preview;
      drag.moved = true;
      this.#rejection = undefined;
      this.#renderPreview(preview);
    } catch (error) {
      this.#rejection = Object.freeze({
        code: "SELECTION_TRANSLATION_REJECTED",
        message:
          error instanceof Error
            ? error.message
            : "Selection translation candidate was rejected.",
      });
      // Preserve the last fully valid preview. Store state remains untouched.
      this.#renderPreview(drag.preview);
    }

    mouseEvent.originalEvent?.preventDefault?.();
    mouseEvent.originalEvent?.stopPropagation?.();
    this.#map.getCanvas().style.cursor = "grabbing";
  };

  readonly #onMouseUp = (): void => {
    const drag = this.#drag;
    if (!drag) return;
    this.#drag = undefined;

    try {
      if (drag.moved) {
        this.#callbacks.replaceSelection(drag.preview);
      }
    } finally {
      this.#restoreDragPan(drag);
      this.#renderCurrentSelection();
      this.#map.getCanvas().style.cursor =
        this.#selection.size > 0 ? "grab" : "";
    }
  };

  readonly #onKeyDown = (event: KeyboardEventLike): void => {
    if (!this.#drag || event.key !== "Escape") return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    this.cancel();
  };

  public constructor(
    map: MapLibreMapLike,
    registry: PlotRegistry,
    store: PlotStore,
    selection: SelectionController,
    renderer: MapLibrePlotRenderer,
    callbacks: MapLibreSelectionTranslationCallbacks,
  ) {
    this.#map = map;
    this.#registry = registry;
    this.#store = store;
    this.#selection = selection;
    this.#renderer = renderer;
    this.#callbacks = callbacks;

    this.#map.on("mousedown", this.#onMouseDown);
    this.#map.on("mousemove", this.#onMouseMove);
    this.#map.on("mouseup", this.#onMouseUp);
    this.#map.getCanvas().addEventListener("keydown", this.#onKeyDown);
  }

  public get isTranslating(): boolean {
    return this.#drag !== undefined;
  }

  public get rejection(): SelectionTransformRejection | undefined {
    return this.#rejection;
  }

  public cancel(): boolean {
    const drag = this.#drag;
    if (!drag) return false;
    this.#drag = undefined;
    this.#rejection = undefined;
    this.#restoreDragPan(drag);
    this.#renderCurrentSelection();
    this.#map.getCanvas().style.cursor =
      this.#selection.size > 0 ? "grab" : "";
    return true;
  }

  public destroy(): void {
    this.cancel();
    this.#map.off("mousedown", this.#onMouseDown);
    this.#map.off("mousemove", this.#onMouseMove);
    this.#map.off("mouseup", this.#onMouseUp);
    this.#map.getCanvas().removeEventListener("keydown", this.#onKeyDown);
  }

  #renderPreview(features: readonly PlotFeature[]): void {
    const primaryId = this.#selection.primaryId;
    this.#renderer.renderSelection(features, primaryId, this.#registry);
    const primary = features.find((feature) => feature.id === primaryId);
    this.#renderer.renderHandles(primary);
  }

  #renderCurrentSelection(): void {
    const features = this.#selection.selectedIds
      .map((id) => this.#store.find(id))
      .filter((feature): feature is PlotFeature => feature !== undefined);
    this.#renderPreview(features);
  }

  #restoreDragPan(drag: SelectionTranslationDrag): void {
    if (drag.dragPanWasEnabled) this.#map.dragPan?.enable();
  }

  #queryPlotId(event: MapLibreMouseEventLike): string | undefined {
    if (!event.point || !this.#map.queryRenderedFeatures) return undefined;
    const features = this.#map.queryRenderedFeatures(event.point, {
      layers: [
        this.#renderer.layerIds.selectionPoint,
        this.#renderer.layerIds.selectionLine,
        this.#renderer.layerIds.point,
        this.#renderer.layerIds.line,
        this.#renderer.layerIds.fill,
      ],
    });
    for (const feature of features) {
      const plotId = readString(feature.properties?.plotId);
      if (plotId !== undefined) return plotId;
    }
    return undefined;
  }

  #queryHandle(event: MapLibreMouseEventLike): boolean {
    if (!event.point || !this.#map.queryRenderedFeatures) return false;
    return this.#map.queryRenderedFeatures(event.point, {
      layers: [this.#renderer.layerIds.handle],
    }).length > 0;
  }
}

function asMouseEvent(event: unknown): MapLibreMouseEventLike | undefined {
  if (typeof event !== "object" || event === null) return undefined;
  const lngLat = (event as { lngLat?: unknown }).lngLat;
  if (typeof lngLat !== "object" || lngLat === null) return undefined;
  const lng = (lngLat as { lng?: unknown }).lng;
  const lat = (lngLat as { lat?: unknown }).lat;
  if (typeof lng !== "number" || typeof lat !== "number") return undefined;
  return event as MapLibreMouseEventLike;
}

function toPosition(event: MapLibreMouseEventLike): Position {
  return [event.lngLat.lng, event.lngLat.lat];
}

function hasSelectionModifier(event: MapLibreMouseEventLike): boolean {
  const original = event.originalEvent;
  return (
    original?.shiftKey === true ||
    original?.ctrlKey === true ||
    original?.metaKey === true ||
    original?.altKey === true
  );
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
