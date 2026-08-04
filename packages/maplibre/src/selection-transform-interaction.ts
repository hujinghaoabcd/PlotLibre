import type {
  PlotFeature,
  PlotRegistry,
  PlotStore,
  Position,
} from "@plotlibre/core";
import { createLocalProjection } from "@plotlibre/geometry";
import {
  SelectionTransformError,
  SelectionTransformSession,
  type CompletedSelectionTransform,
  type SelectionController,
  type SelectionSnapshot,
  type SelectionTransformKind,
  type SelectionTransformRejection,
} from "@plotlibre/interaction";
import { MapLibrePlotRenderer } from "./renderer.js";
import {
  MapLibreSelectionTransformOverlay,
  type SelectionTransformOverlayFrame,
  type SelectionTransformOverlayLike,
  type SelectionTransformOverlayPointerEvent,
  type SelectionTransformScreenPoint,
} from "./selection-transform-overlay.js";
import type {
  KeyboardEventLike,
  MapCanvasPointerEventLike,
  MapLibreMapLike,
} from "./types.js";

export type MapLibreSelectionTransformStatus =
  | "idle"
  | "armed"
  | "active"
  | "rejected";

export interface MapLibreSelectionTransformSnapshot {
  readonly status: MapLibreSelectionTransformStatus;
  readonly kind?: SelectionTransformKind;
  readonly selectedIds: readonly string[];
  readonly pivot?: Position;
  readonly clockwiseDegrees?: number;
  readonly scaleFactor?: number;
  readonly rejection?: SelectionTransformRejection;
  readonly revision: number;
}

export type MapLibreSelectionTransformListener = (
  snapshot: MapLibreSelectionTransformSnapshot,
) => void;

export interface MapLibreSelectionTransformCallbacks {
  commit(
    completion: CompletedSelectionTransform,
    selectionSnapshot: SelectionSnapshot,
  ): readonly PlotFeature[];
  cancelRegion?(): void;
  cancelTranslation?(): void;
  cancelDrawing?(): void;
  isDrawing?(): boolean;
  isRegionActive?(): boolean;
  isTranslating?(): boolean;
}

export interface MapLibreSelectionTransformOptions {
  readonly overlay?: SelectionTransformOverlayLike;
  readonly callbacks: MapLibreSelectionTransformCallbacks;
}

const CAMERA_START_EVENTS = [
  "movestart",
  "zoomstart",
  "rotatestart",
  "pitchstart",
] as const;
const HARD_CANCEL_EVENTS = ["style.load", "resize"] as const;

/**
 * Explicit one-shot MapLibre adapter for complete-selection rotation/scale.
 *
 * Canonical math and Registry preflight live in @plotlibre/interaction. This
 * controller owns only map projection, DOM handle input, transient rendering,
 * lifecycle cancellation and one delegated atomic command commit.
 */
export class MapLibreSelectionTransformInteraction {
  readonly #map: MapLibreMapLike;
  readonly #registry: PlotRegistry;
  readonly #store: PlotStore;
  readonly #selection: SelectionController;
  readonly #renderer: MapLibrePlotRenderer;
  readonly #overlay: SelectionTransformOverlayLike;
  readonly #callbacks: MapLibreSelectionTransformCallbacks;
  readonly #listeners = new Set<MapLibreSelectionTransformListener>();
  readonly #unsubscribeStore: () => void;
  readonly #unsubscribeSelection: () => void;
  #kind: SelectionTransformKind | undefined;
  #session: SelectionTransformSession | undefined;
  #selectionSnapshot: SelectionSnapshot | undefined;
  #externalRejection: SelectionTransformRejection | undefined;
  #dragPanWasEnabled: boolean | undefined;
  #revision = 0;
  #applying = false;
  #destroyed = false;

  readonly #onCanvasPointerDown = (
    event: MapCanvasPointerEventLike,
  ): void => {
    if (this.#destroyed || !this.isActive || this.isGestureActive) return;
    consumePointerEvent(event);
    this.cancel();
  };

  readonly #onOverlayPointerDown = (
    event: SelectionTransformOverlayPointerEvent,
  ): void => {
    if (
      this.#destroyed ||
      event.kind !== this.#kind ||
      !this.#session ||
      this.#callbacks.isDrawing?.() ||
      this.#callbacks.isRegionActive?.() ||
      this.#callbacks.isTranslating?.()
    ) {
      return;
    }

    const local = this.#toLocalPoint(event.point);
    if (!local) {
      this.#externalRejection = createAdapterRejection(
        "SELECTION_TRANSFORM_POINTER_INVALID",
        "Map adapter could not convert the transform pointer into local metres.",
        this.#selectionSnapshot?.selectedIds ?? [],
      );
      this.#render();
      this.#emit();
      consumeOverlayEvent(event);
      return;
    }

    const snapshot = this.#session.pointerDown(local);
    this.#externalRejection = undefined;
    if (snapshot.status === "active") this.#disableDragPan();
    this.#renderer.clearHandles();
    this.#render();
    this.#emit();
    consumeOverlayEvent(event);
  };

  readonly #onOverlayPointerMove = (
    event: SelectionTransformOverlayPointerEvent,
  ): void => {
    if (
      event.kind !== this.#kind ||
      !this.#session ||
      !this.isGestureActive
    ) {
      return;
    }
    const local = this.#toLocalPoint(event.point);
    if (!local) {
      this.#externalRejection = createAdapterRejection(
        "SELECTION_TRANSFORM_POINTER_INVALID",
        "Map adapter could not convert the transform pointer into local metres.",
        this.#selectionSnapshot?.selectedIds ?? [],
      );
      this.#render();
      this.#emit();
      consumeOverlayEvent(event);
      return;
    }

    this.#session.pointerMove(local);
    this.#externalRejection = undefined;
    this.#renderPreview();
    this.#render();
    this.#emit();
    consumeOverlayEvent(event);
  };

  readonly #onOverlayPointerUp = (
    event: SelectionTransformOverlayPointerEvent,
  ): void => {
    if (event.kind !== this.#kind || !this.#session) return;
    const local = this.#toLocalPoint(event.point);
    if (!local) {
      this.#externalRejection = createAdapterRejection(
        "SELECTION_TRANSFORM_POINTER_INVALID",
        "Map adapter could not convert the transform pointer into local metres.",
        this.#selectionSnapshot?.selectedIds ?? [],
      );
      this.#restoreDragPan();
      this.#render();
      this.#emit();
      consumeOverlayEvent(event);
      return;
    }

    const completion = this.#session.pointerUp(local);
    this.#restoreDragPan();
    consumeOverlayEvent(event);

    if (!completion.completed) {
      if (completion.noop) {
        this.#exitMode();
        return;
      }
      this.#externalRejection = completion.rejection;
      this.#renderPreview();
      this.#render();
      this.#emit();
      return;
    }

    const capturedSelection = this.#selectionSnapshot;
    if (!capturedSelection) {
      this.#externalRejection = createAdapterRejection(
        "SELECTION_TRANSFORM_TRANSACTION_INVALID",
        "Selection transform lost its captured selection snapshot.",
        completion.originals.map((feature) => feature.id),
      );
      this.#rearmFromCurrentSelection();
      return;
    }

    try {
      this.#applying = true;
      try {
        this.#callbacks.commit(completion, capturedSelection);
      } finally {
        this.#applying = false;
      }
      this.#exitMode();
    } catch (error) {
      this.#externalRejection = createAdapterRejection(
        "SELECTION_TRANSFORM_TRANSACTION_INVALID",
        error instanceof Error
          ? error.message
          : "Selection transform transaction failed.",
        capturedSelection.selectedIds,
        error,
      );
      this.#rearmFromCurrentSelection();
    }
  };

  readonly #onOverlayPointerCancel = (
    event: SelectionTransformOverlayPointerEvent,
  ): void => {
    if (!this.isActive) return;
    consumeOverlayEvent(event);
    this.cancel();
  };

  readonly #onKeyDown = (event: KeyboardEventLike): void => {
    if (event.key !== "Escape" || !this.isActive) return;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    this.cancel();
  };

  readonly #onCameraStart = (): void => {
    if (this.isGestureActive) this.cancel();
  };

  readonly #onHardCancel = (): void => {
    if (this.isActive) this.cancel();
  };

  readonly #onRender = (): void => {
    if (this.isActive && !this.isGestureActive) this.#render();
  };

  public constructor(
    map: MapLibreMapLike,
    registry: PlotRegistry,
    store: PlotStore,
    selection: SelectionController,
    renderer: MapLibrePlotRenderer,
    options: MapLibreSelectionTransformOptions,
  ) {
    this.#map = map;
    this.#registry = registry;
    this.#store = store;
    this.#selection = selection;
    this.#renderer = renderer;
    this.#callbacks = options.callbacks;
    this.#overlay = options.overlay ?? new MapLibreSelectionTransformOverlay(
      map.getContainer?.(),
    );
    this.#overlay.setHandlers({
      pointerDown: this.#onOverlayPointerDown,
      pointerMove: this.#onOverlayPointerMove,
      pointerUp: this.#onOverlayPointerUp,
      pointerCancel: this.#onOverlayPointerCancel,
    });

    const canvas = map.getCanvas();
    canvas.addEventListener("pointerdown", this.#onCanvasPointerDown, {
      capture: true,
    });
    canvas.addEventListener("keydown", this.#onKeyDown, { capture: true });
    for (const type of CAMERA_START_EVENTS) map.on(type, this.#onCameraStart);
    for (const type of HARD_CANCEL_EVENTS) map.on(type, this.#onHardCancel);
    map.on("render", this.#onRender);

    this.#unsubscribeStore = store.subscribe(() => {
      if (!this.#applying && this.isActive) this.cancel();
    });
    this.#unsubscribeSelection = selection.subscribe(() => {
      if (!this.#applying && this.isActive) this.cancel();
    });
  }

  public start(kind: SelectionTransformKind): MapLibreSelectionTransformSnapshot {
    this.cancel();
    this.#callbacks.cancelRegion?.();
    this.#callbacks.cancelTranslation?.();
    this.#callbacks.cancelDrawing?.();

    this.#kind = kind;
    this.#externalRejection = undefined;
    const selected = new Set(this.#selection.selectedIds);
    const originals = this.#store.list().filter((feature) => selected.has(feature.id));
    this.#selectionSnapshot = this.#selection.snapshot();

    try {
      this.#session = new SelectionTransformSession(
        kind,
        originals,
        this.#registry,
      );
      this.#renderer.clearHandles();
      this.#renderCurrentSelection();
      this.#render();
    } catch (error) {
      this.#session = undefined;
      this.#externalRejection = toAdapterRejection(
        error,
        this.#selectionSnapshot.selectedIds,
      );
      this.#overlay.clear();
      this.#syncCurrentSelection();
    }

    this.#revision += 1;
    this.#emit();
    this.#map.getCanvas().focus?.();
    return this.snapshot;
  }

  public cancel(): boolean {
    if (!this.isActive) return false;
    this.#restoreDragPan();
    this.#kind = undefined;
    this.#session = undefined;
    this.#selectionSnapshot = undefined;
    this.#externalRejection = undefined;
    this.#overlay.clear();
    this.#syncCurrentSelection();
    this.#revision += 1;
    this.#emit();
    return true;
  }

  public get snapshot(): MapLibreSelectionTransformSnapshot {
    const sessionSnapshot = this.#session?.snapshot();
    const rejection = this.#externalRejection ?? sessionSnapshot?.rejection;
    const status: MapLibreSelectionTransformStatus = this.#kind === undefined
      ? "idle"
      : rejection !== undefined || sessionSnapshot?.status === "rejected"
      ? "rejected"
      : sessionSnapshot?.status === "active"
      ? "active"
      : "armed";
    return Object.freeze({
      status,
      ...(this.#kind !== undefined ? { kind: this.#kind } : {}),
      selectedIds: Object.freeze([
        ...(this.#selectionSnapshot?.selectedIds ?? []),
      ]),
      ...(sessionSnapshot?.frame.pivot !== undefined
        ? { pivot: Object.freeze([...sessionSnapshot.frame.pivot]) as Position }
        : {}),
      ...(sessionSnapshot?.clockwiseDegrees !== undefined
        ? { clockwiseDegrees: sessionSnapshot.clockwiseDegrees }
        : {}),
      ...(sessionSnapshot?.scaleFactor !== undefined
        ? { scaleFactor: sessionSnapshot.scaleFactor }
        : {}),
      ...(rejection !== undefined ? { rejection } : {}),
      revision: this.#revision + (sessionSnapshot?.revision ?? 0),
    });
  }

  public get rejection(): SelectionTransformRejection | undefined {
    return this.#externalRejection ?? this.#session?.snapshot().rejection;
  }

  public get isActive(): boolean {
    return this.#kind !== undefined;
  }

  public get isGestureActive(): boolean {
    return this.#session?.status === "active";
  }

  public subscribe(listener: MapLibreSelectionTransformListener): () => void {
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
    canvas.removeEventListener("pointerdown", this.#onCanvasPointerDown, {
      capture: true,
    });
    canvas.removeEventListener("keydown", this.#onKeyDown, { capture: true });
    for (const type of CAMERA_START_EVENTS) this.#map.off(type, this.#onCameraStart);
    for (const type of HARD_CANCEL_EVENTS) this.#map.off(type, this.#onHardCancel);
    this.#map.off("render", this.#onRender);
    this.#overlay.setHandlers(undefined);
    this.#overlay.destroy();
    this.#listeners.clear();
  }

  #renderPreview(): void {
    const preview = this.#session?.previewFeatures();
    if (!preview) return;
    this.#renderer.renderSelection(
      preview,
      this.#selectionSnapshot?.primaryId,
      this.#registry,
    );
    this.#renderer.clearHandles();
  }

  #renderCurrentSelection(): void {
    const features = this.#selection.selectedIds
      .map((id) => this.#store.find(id))
      .filter((feature): feature is PlotFeature => feature !== undefined);
    this.#renderer.renderSelection(
      features,
      this.#selection.primaryId,
      this.#registry,
    );
  }

  #syncCurrentSelection(): void {
    this.#renderer.clearDraft();
    this.#renderCurrentSelection();
    const primaryId = this.#selection.primaryId;
    this.#renderer.renderHandles(
      primaryId === undefined ? undefined : this.#store.find(primaryId),
    );
  }

  #render(): void {
    const session = this.#session;
    const kind = this.#kind;
    if (!session || !kind) {
      this.#overlay.clear();
      return;
    }

    const frame = projectTransformFrame(
      this.#map,
      session.frame,
      kind,
      session.snapshot().clockwiseDegrees,
      session.snapshot().scaleFactor,
      this.rejection !== undefined,
    );
    if (!frame) {
      this.#externalRejection = createAdapterRejection(
        "SELECTION_TRANSFORM_POINTER_INVALID",
        "Map adapter could not project the transform frame.",
        this.#selectionSnapshot?.selectedIds ?? [],
      );
      this.#overlay.clear();
      return;
    }
    this.#overlay.render(frame);
  }

  #toLocalPoint(
    point: SelectionTransformScreenPoint,
  ): { readonly x: number; readonly y: number } | undefined {
    const session = this.#session;
    const unproject = this.#map.unproject;
    if (!session || !unproject) return undefined;
    try {
      const lngLat = unproject.call(this.#map, [point.x, point.y]);
      if (!Number.isFinite(lngLat.lng) || !Number.isFinite(lngLat.lat)) {
        return undefined;
      }
      return createLocalProjection(session.frame.origin).project([
        lngLat.lng,
        lngLat.lat,
      ]);
    } catch {
      return undefined;
    }
  }

  #disableDragPan(): void {
    if (this.#dragPanWasEnabled !== undefined) return;
    this.#dragPanWasEnabled = this.#map.dragPan?.isEnabled?.() ?? true;
    if (this.#dragPanWasEnabled) this.#map.dragPan?.disable();
  }

  #restoreDragPan(): void {
    const wasEnabled = this.#dragPanWasEnabled;
    this.#dragPanWasEnabled = undefined;
    if (wasEnabled) this.#map.dragPan?.enable();
  }

  #rearmFromCurrentSelection(): void {
    const kind = this.#kind;
    if (!kind) return;
    const selected = new Set(this.#selection.selectedIds);
    const originals = this.#store.list().filter((feature) => selected.has(feature.id));
    this.#selectionSnapshot = this.#selection.snapshot();
    try {
      this.#session = new SelectionTransformSession(
        kind,
        originals,
        this.#registry,
      );
    } catch (error) {
      this.#session = undefined;
      this.#externalRejection = toAdapterRejection(
        error,
        this.#selectionSnapshot.selectedIds,
      );
    }
    this.#renderCurrentSelection();
    this.#renderer.clearHandles();
    this.#render();
    this.#revision += 1;
    this.#emit();
  }

  #exitMode(): void {
    this.#restoreDragPan();
    this.#kind = undefined;
    this.#session = undefined;
    this.#selectionSnapshot = undefined;
    this.#externalRejection = undefined;
    this.#overlay.clear();
    this.#syncCurrentSelection();
    this.#revision += 1;
    this.#emit();
  }

  #emit(): void {
    const snapshot = this.snapshot;
    for (const listener of [...this.#listeners]) listener(snapshot);
  }
}

function projectTransformFrame(
  map: MapLibreMapLike,
  frame: SelectionTransformSession["frame"],
  kind: SelectionTransformKind,
  clockwiseDegrees: number | undefined,
  scaleFactor: number | undefined,
  rejected: boolean,
): SelectionTransformOverlayFrame | undefined {
  const project = map.project;
  if (!project) return undefined;
  try {
    const projection = createLocalProjection(frame.origin);
    const localCorners = [
      { x: frame.boundsMeters.minX, y: frame.boundsMeters.minY },
      { x: frame.boundsMeters.maxX, y: frame.boundsMeters.minY },
      { x: frame.boundsMeters.maxX, y: frame.boundsMeters.maxY },
      { x: frame.boundsMeters.minX, y: frame.boundsMeters.maxY },
    ] as const;
    const corners = localCorners.map((local) => {
      const position = projection.unproject(local);
      const point = project.call(map, [position[0], position[1]]);
      return validateScreenPoint(point);
    }) as unknown as SelectionTransformOverlayFrame["corners"];
    const pivot = validateScreenPoint(project.call(map, [
      frame.pivot[0],
      frame.pivot[1],
    ]));
    if (!pivot || corners.some((point) => !point)) return undefined;

    const scaleHandle = corners[2];
    const topMidpoint = {
      x: (corners[2].x + corners[3].x) / 2,
      y: (corners[2].y + corners[3].y) / 2,
    };
    const outward = normalizeScreenVector({
      x: topMidpoint.x - pivot.x,
      y: topMidpoint.y - pivot.y,
    });
    const rotationHandle = {
      x: topMidpoint.x + outward.x * 28,
      y: topMidpoint.y + outward.y * 28,
    };
    return Object.freeze({
      kind,
      corners,
      pivot,
      scaleHandle,
      rotationHandle,
      label: kind === "rotate"
        ? `${(clockwiseDegrees ?? 0).toFixed(1)}°`
        : `×${(scaleFactor ?? 1).toFixed(3)}`,
      rejected,
    });
  } catch {
    return undefined;
  }
}

function validateScreenPoint(
  point: { readonly x: number; readonly y: number },
): SelectionTransformScreenPoint | undefined {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    ? { x: point.x, y: point.y }
    : undefined;
}

function normalizeScreenVector(
  vector: SelectionTransformScreenPoint,
): SelectionTransformScreenPoint {
  const length = Math.hypot(vector.x, vector.y);
  return length > 1e-9
    ? { x: vector.x / length, y: vector.y / length }
    : { x: 0, y: -1 };
}

function toAdapterRejection(
  error: unknown,
  featureIds: readonly string[],
): SelectionTransformRejection {
  if (error instanceof SelectionTransformError) {
    return createAdapterRejection(
      error.code,
      error.message,
      error.featureIds.length > 0 ? error.featureIds : featureIds,
      error.cause,
    );
  }
  return createAdapterRejection(
    "SELECTION_TRANSFORM_TRANSACTION_INVALID",
    error instanceof Error ? error.message : "Selection transform failed.",
    featureIds,
    error,
  );
}

function createAdapterRejection(
  code: SelectionTransformRejection["code"],
  message: string,
  featureIds: readonly string[],
  cause?: unknown,
): SelectionTransformRejection {
  return Object.freeze({
    code,
    message,
    featureIds: Object.freeze([...featureIds]),
    ...(cause === undefined ? {} : { cause }),
  });
}

function consumeOverlayEvent(
  event: SelectionTransformOverlayPointerEvent,
): void {
  event.preventDefault?.();
  event.stopPropagation?.();
  event.stopImmediatePropagation?.();
}

function consumePointerEvent(event: MapCanvasPointerEventLike): void {
  event.preventDefault?.();
  event.stopPropagation?.();
  event.stopImmediatePropagation?.();
}
