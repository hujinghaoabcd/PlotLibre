import type {
  PlotFeature,
  PlotRegistry,
  PlotStore,
} from "@plotlibre/core";
import {
  ScreenSelectionRegionSession,
  type ScreenBounds,
  type ScreenPoint,
  type SelectionController,
  type SelectionIntent,
  type SelectionRegionKind,
} from "@plotlibre/interaction";
import { MapLibrePlotRenderer } from "./renderer.js";
import {
  MapLibreSelectionRegionOverlay,
  type SelectionRegionOverlayLike,
} from "./selection-region-overlay.js";
import {
  MapLibreSelectionRegionResolver,
  SelectionRegionResolutionError,
  type SelectionRegionResolution,
} from "./selection-region-resolver.js";
import type {
  KeyboardEventLike,
  MapCanvasPointerEventLike,
  MapLibreMapLike,
} from "./types.js";

export type MapLibreSelectionRegionStatus =
  | "idle"
  | "armed"
  | "active"
  | "rejected";

export interface MapLibreSelectionRegionRejection {
  readonly code: string;
  readonly message: string;
}

export interface MapLibreSelectionRegionSnapshot {
  readonly status: MapLibreSelectionRegionStatus;
  readonly kind?: SelectionRegionKind;
  readonly intent?: SelectionIntent;
  readonly points: readonly ScreenPoint[];
  readonly bounds?: ScreenBounds;
  readonly rejection?: MapLibreSelectionRegionRejection;
  readonly revision: number;
}

export type MapLibreSelectionRegionListener = (
  snapshot: MapLibreSelectionRegionSnapshot,
) => void;

export interface StartSelectionRegionOptions {
  readonly intent?: SelectionIntent;
}

export interface MapLibreSelectionRegionInteractionCallbacks {
  isDrawing?(): boolean;
  isTranslating?(): boolean;
  suppressNextClick?(): void;
}

export interface MapLibreSelectionRegionInteractionOptions {
  readonly overlay?: SelectionRegionOverlayLike;
  readonly resolver?: MapLibreSelectionRegionResolver;
  readonly callbacks?: MapLibreSelectionRegionInteractionCallbacks;
}

interface RegionMode {
  readonly kind: SelectionRegionKind;
  readonly intent: SelectionIntent;
  readonly explicit: boolean;
}

const LIFECYCLE_CANCEL_EVENTS = [
  "style.load",
  "resize",
  "movestart",
  "zoomstart",
  "rotatestart",
  "pitchstart",
] as const;

/**
 * Unified click-versus-region pointer adapter.
 *
 * The controller replaces the old immediate Shift-mousedown mutation. Normal
 * feature clicks remain owned by MapLibrePlotInteraction; this adapter captures
 * only explicit region modes or Shift-drag gestures beginning on empty space.
 */
export class MapLibreSelectionRegionInteraction {
  readonly #map: MapLibreMapLike;
  readonly #registry: PlotRegistry;
  readonly #store: PlotStore;
  readonly #selection: SelectionController;
  readonly #renderer: MapLibrePlotRenderer;
  readonly #resolver: MapLibreSelectionRegionResolver;
  readonly #overlay: SelectionRegionOverlayLike;
  readonly #callbacks: MapLibreSelectionRegionInteractionCallbacks;
  readonly #listeners = new Set<MapLibreSelectionRegionListener>();
  readonly #unsubscribeStore: () => void;
  readonly #unsubscribeSelection: () => void;
  readonly #boxZoomWasEnabled: boolean | undefined;
  #mode: RegionMode | undefined;
  #session: ScreenSelectionRegionSession | undefined;
  #pointerId: number | undefined;
  #dragPanWasEnabled: boolean | undefined;
  #lastKind: SelectionRegionKind | undefined;
  #lastIntent: SelectionIntent | undefined;
  #rejection: MapLibreSelectionRegionRejection | undefined;
  #lastResolution: SelectionRegionResolution | undefined;
  #revision = 0;
  #applyingSelection = false;
  #destroyed = false;

  readonly #onPointerDown = (event: MapCanvasPointerEventLike): void => {
    const existingSessionStatus = this.#session?.snapshot().status;
    if (
      this.#destroyed ||
      (this.#session !== undefined && existingSessionStatus !== "rejected") ||
      !isPrimaryRegionPointer(event)
    ) {
      return;
    }
    if (this.#callbacks.isDrawing?.() || this.#callbacks.isTranslating?.()) {
      return;
    }

    const point = this.#readScreenPoint(event);
    if (!point) return;

    if (existingSessionStatus === "rejected") {
      this.#session = undefined;
    }

    let mode = this.#mode?.explicit === true ? this.#mode : undefined;
    if (!mode) {
      if (event.shiftKey !== true) return;
      if (this.#querySelectableHit(point)) return;
      mode = {
        kind: "box",
        intent: readRegionIntent(event, "add"),
        explicit: false,
      };
      this.#mode = mode;
    } else {
      mode = {
        ...mode,
        intent: readRegionIntent(event, mode.intent),
      };
      this.#mode = mode;
    }

    this.#lastKind = mode.kind;
    this.#lastIntent = mode.intent;
    this.#rejection = undefined;
    this.#lastResolution = undefined;
    this.#session = new ScreenSelectionRegionSession(mode.kind, mode.intent);
    this.#session.pointerDown(point);
    this.#pointerId = event.pointerId;
    this.#capturePointer(event.pointerId);
    if (mode.kind === "lasso") this.#disableDragPan();
    this.#renderSession();
    this.#consumePointerEvent(event);
    this.#emit();
  };

  readonly #onPointerMove = (event: MapCanvasPointerEventLike): void => {
    const session = this.#session;
    if (!session || !this.#matchesPointer(event.pointerId)) return;
    const point = this.#readScreenPoint(event);
    if (!point) return;

    const snapshot = session.pointerMove(point);
    if (snapshot.status === "active") this.#disableDragPan();
    this.#renderSession();
    this.#consumePointerEvent(event);
    this.#emit();
  };

  readonly #onPointerUp = (event: MapCanvasPointerEventLike): void => {
    const session = this.#session;
    const mode = this.#mode;
    if (!session || !mode || !this.#matchesPointer(event.pointerId)) return;
    const point = this.#readScreenPoint(event);
    if (!point) {
      this.#cancelGesture(false);
      return;
    }

    const completion = session.pointerUp(point);
    this.#consumePointerEvent(event);
    this.#callbacks.suppressNextClick?.();
    this.#releasePointerAndPan();

    if (!completion.completed) {
      if (completion.noop) {
        this.#session = undefined;
        this.#rejection = undefined;
        this.#overlay.clear();
        if (!mode.explicit) this.#mode = undefined;
        this.#syncSelectionVisuals();
        this.#emit();
        return;
      }

      this.#rejection = Object.freeze({ ...completion.rejection });
      this.#renderSession(true);
      this.#emit();
      return;
    }

    try {
      const resolution = this.#resolver.resolve(
        completion.ring,
        completion.bounds,
      );
      this.#lastResolution = resolution;
      this.#applyingSelection = true;
      try {
        this.#selection.applyMany(
          resolution.ids,
          completion.intent,
          completion.kind,
        );
      } finally {
        this.#applyingSelection = false;
      }
      this.#session = undefined;
      this.#mode = undefined;
      this.#rejection = undefined;
      this.#overlay.clear();
      this.#syncSelectionVisuals();
      this.#emit();
    } catch (error) {
      this.#session = undefined;
      this.#rejection = toRegionRejection(error);
      if (!mode.explicit) this.#mode = undefined;
      this.#overlay.clear();
      this.#syncSelectionVisuals();
      this.#emit();
    }
  };

  readonly #onPointerCancel = (event: MapCanvasPointerEventLike): void => {
    if (!this.#session || !this.#matchesPointer(event.pointerId)) return;
    this.#consumePointerEvent(event);
    this.cancel();
  };

  readonly #onKeyDown = (event: KeyboardEventLike): void => {
    if (event.key !== "Escape" || !this.isActive) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    this.cancel();
  };

  readonly #onLifecycleCancel = (): void => {
    if (this.isActive) this.cancel();
  };

  public constructor(
    map: MapLibreMapLike,
    registry: PlotRegistry,
    store: PlotStore,
    selection: SelectionController,
    renderer: MapLibrePlotRenderer,
    options: MapLibreSelectionRegionInteractionOptions = {},
  ) {
    this.#map = map;
    this.#registry = registry;
    this.#store = store;
    this.#selection = selection;
    this.#renderer = renderer;
    this.#callbacks = options.callbacks ?? {};
    this.#resolver = options.resolver ?? new MapLibreSelectionRegionResolver(
      map,
      store,
      registry,
      { layerIds: renderer.layerIds },
    );
    this.#overlay = options.overlay ?? new MapLibreSelectionRegionOverlay(
      map.getContainer?.(),
    );

    const boxZoom = map.boxZoom;
    if (boxZoom) {
      const wasEnabled = boxZoom.isEnabled?.() ?? true;
      this.#boxZoomWasEnabled = wasEnabled;
      if (wasEnabled) boxZoom.disable();
    } else {
      this.#boxZoomWasEnabled = undefined;
    }

    const canvas = map.getCanvas();
    canvas.addEventListener("pointerdown", this.#onPointerDown, { capture: true });
    canvas.addEventListener("pointermove", this.#onPointerMove, { capture: true });
    canvas.addEventListener("pointerup", this.#onPointerUp, { capture: true });
    canvas.addEventListener("pointercancel", this.#onPointerCancel, {
      capture: true,
    });
    canvas.addEventListener("lostpointercapture", this.#onPointerCancel, {
      capture: true,
    });
    canvas.addEventListener("keydown", this.#onKeyDown, { capture: true });

    for (const type of LIFECYCLE_CANCEL_EVENTS) {
      map.on(type, this.#onLifecycleCancel);
    }

    this.#unsubscribeStore = store.subscribe(() => {
      if (this.isActive) this.cancel();
    });
    this.#unsubscribeSelection = selection.subscribe(() => {
      if (this.#applyingSelection) return;
      if (this.isActive) this.cancel();
    });
  }

  public start(
    kind: SelectionRegionKind,
    options: StartSelectionRegionOptions = {},
  ): MapLibreSelectionRegionSnapshot {
    this.cancel();
    const intent = options.intent ?? "replace";
    this.#mode = { kind, intent, explicit: true };
    this.#lastKind = kind;
    this.#lastIntent = intent;
    this.#rejection = undefined;
    this.#lastResolution = undefined;
    this.#renderer.clearHandles();
    this.#emit();
    this.#map.getCanvas().focus?.();
    return this.snapshot;
  }

  public cancel(): boolean {
    const hadState = this.isActive;
    if (!hadState) return false;
    this.#cancelGesture(true);
    this.#mode = undefined;
    this.#session = undefined;
    this.#rejection = undefined;
    this.#overlay.clear();
    this.#syncSelectionVisuals();
    this.#emit();
    return true;
  }

  public get snapshot(): MapLibreSelectionRegionSnapshot {
    const session = this.#session?.snapshot();
    const mode = this.#mode;
    const kind = session?.kind ?? mode?.kind ?? this.#lastKind;
    const intent = session?.intent ?? mode?.intent ?? this.#lastIntent;
    const status: MapLibreSelectionRegionStatus = session?.status ??
      (mode?.explicit === true ? "armed" : this.#rejection ? "rejected" : "idle");
    const points = Object.freeze(
      (session?.points ?? []).map((point) => ({ ...point })),
    );
    const bounds = session?.bounds;
    const rejection = session?.rejection ?? this.#rejection;
    return Object.freeze({
      status,
      ...(kind !== undefined ? { kind } : {}),
      ...(intent !== undefined ? { intent } : {}),
      points,
      ...(bounds !== undefined ? { bounds: Object.freeze({ ...bounds }) } : {}),
      ...(rejection !== undefined
        ? { rejection: Object.freeze({ ...rejection }) }
        : {}),
      revision: this.#revision,
    });
  }

  public get rejection(): MapLibreSelectionRegionRejection | undefined {
    return this.#rejection ?? this.#session?.snapshot().rejection;
  }

  public get isActive(): boolean {
    return this.#mode !== undefined || this.#session !== undefined ||
      this.#rejection !== undefined;
  }

  public get isGestureActive(): boolean {
    return this.#session?.status === "active";
  }

  public get lastResolution(): SelectionRegionResolution | undefined {
    return this.#lastResolution;
  }

  public subscribe(listener: MapLibreSelectionRegionListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  public destroy(): void {
    if (this.#destroyed) return;
    this.cancel();
    this.#destroyed = true;
    this.#unsubscribeSelection();
    this.#unsubscribeStore();
    const canvas = this.#map.getCanvas();
    canvas.removeEventListener("pointerdown", this.#onPointerDown, {
      capture: true,
    });
    canvas.removeEventListener("pointermove", this.#onPointerMove, {
      capture: true,
    });
    canvas.removeEventListener("pointerup", this.#onPointerUp, {
      capture: true,
    });
    canvas.removeEventListener("pointercancel", this.#onPointerCancel, {
      capture: true,
    });
    canvas.removeEventListener("lostpointercapture", this.#onPointerCancel, {
      capture: true,
    });
    canvas.removeEventListener("keydown", this.#onKeyDown, { capture: true });
    for (const type of LIFECYCLE_CANCEL_EVENTS) {
      this.#map.off(type, this.#onLifecycleCancel);
    }
    if (this.#boxZoomWasEnabled) this.#map.boxZoom?.enable();
    this.#overlay.destroy();
    this.#listeners.clear();
  }

  #querySelectableHit(point: ScreenPoint): boolean {
    const query = this.#map.queryRenderedFeatures;
    if (!query) return false;
    try {
      return query.call(this.#map, [point.x, point.y], {
        layers: [
          this.#renderer.layerIds.handle,
          this.#renderer.layerIds.selectionPoint,
          this.#renderer.layerIds.selectionLine,
          this.#renderer.layerIds.point,
          this.#renderer.layerIds.line,
          this.#renderer.layerIds.fill,
        ],
      }).length > 0;
    } catch (error) {
      this.#lastKind = "box";
      this.#lastIntent = "add";
      this.#rejection = toRegionRejection(
        new SelectionRegionResolutionError(
          "SELECTION_REGION_QUERY_FAILED",
          "Failed to determine whether region selection started on empty space.",
          { cause: error },
        ),
      );
      this.#emit();
      return true;
    }
  }

  #readScreenPoint(
    event: MapCanvasPointerEventLike,
  ): ScreenPoint | undefined {
    if (Number.isFinite(event.offsetX) && Number.isFinite(event.offsetY)) {
      return { x: event.offsetX!, y: event.offsetY! };
    }
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      return undefined;
    }
    const rectangle = this.#map.getCanvas().getBoundingClientRect?.();
    if (!rectangle) return undefined;
    return {
      x: event.clientX! - rectangle.left,
      y: event.clientY! - rectangle.top,
    };
  }

  #matchesPointer(pointerId: number | undefined): boolean {
    return this.#pointerId === undefined || pointerId === undefined ||
      this.#pointerId === pointerId;
  }

  #capturePointer(pointerId: number | undefined): void {
    if (pointerId === undefined) return;
    try {
      this.#map.getCanvas().setPointerCapture?.(pointerId);
    } catch {
      // Pointer capture is an optimization; document lifecycle cancellation
      // still guarantees no persistent interaction state.
    }
  }

  #disableDragPan(): void {
    if (this.#dragPanWasEnabled !== undefined) return;
    const dragPan = this.#map.dragPan;
    if (!dragPan) return;
    const wasEnabled = dragPan.isEnabled?.() ?? true;
    this.#dragPanWasEnabled = wasEnabled;
    if (wasEnabled) dragPan.disable();
  }

  #releasePointerAndPan(): void {
    const pointerId = this.#pointerId;
    this.#pointerId = undefined;
    if (pointerId !== undefined) {
      try {
        const canvas = this.#map.getCanvas();
        if (canvas.hasPointerCapture?.(pointerId) ?? true) {
          canvas.releasePointerCapture?.(pointerId);
        }
      } catch {
        // Ignore browser-specific release failures after gesture termination.
      }
    }
    if (this.#dragPanWasEnabled === true) this.#map.dragPan?.enable();
    this.#dragPanWasEnabled = undefined;
  }

  #cancelGesture(clearOverlay: boolean): void {
    this.#releasePointerAndPan();
    this.#session = undefined;
    if (clearOverlay) this.#overlay.clear();
  }

  #renderSession(rejected = false): void {
    const session = this.#session?.snapshot();
    if (!session || session.points.length < 2) {
      this.#overlay.clear();
      return;
    }
    if (session.kind === "box" && session.status !== "active") {
      this.#overlay.clear();
      return;
    }
    this.#overlay.render({
      kind: session.kind,
      points: session.points,
      ...(session.bounds !== undefined ? { bounds: session.bounds } : {}),
      ...(rejected || session.status === "rejected" ? { rejected: true } : {}),
    });
  }

  #syncSelectionVisuals(): void {
    const features = this.#selection.selectedIds
      .map((id) => this.#store.find(id))
      .filter((feature): feature is PlotFeature => feature !== undefined);
    const primaryId = this.#selection.primaryId;
    this.#renderer.renderSelection(features, primaryId, this.#registry);
    if (this.#mode?.explicit === true) {
      this.#renderer.clearHandles();
      return;
    }
    const primary = features.find((feature) => feature.id === primaryId);
    this.#renderer.renderHandles(primary);
  }

  #consumePointerEvent(event: MapCanvasPointerEventLike): void {
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
  }

  #emit(): void {
    this.#revision += 1;
    const snapshot = this.snapshot;
    for (const listener of [...this.#listeners]) listener(snapshot);
  }
}

function readRegionIntent(
  event: MapCanvasPointerEventLike,
  fallback: SelectionIntent,
): SelectionIntent {
  if (event.altKey === true) return "subtract";
  if (event.ctrlKey === true || event.metaKey === true) return "toggle";
  if (event.shiftKey === true) return "add";
  return fallback;
}

function isPrimaryRegionPointer(event: MapCanvasPointerEventLike): boolean {
  if (event.pointerType === "touch") return false;
  return event.button === undefined || event.button === 0;
}

function toRegionRejection(error: unknown): MapLibreSelectionRegionRejection {
  if (error instanceof SelectionRegionResolutionError) {
    return Object.freeze({ code: error.code, message: error.message });
  }
  return Object.freeze({
    code: "SELECTION_REGION_QUERY_FAILED",
    message:
      error instanceof Error
        ? error.message
        : "Selection region resolution failed.",
  });
}
