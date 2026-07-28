import {
  createPlotFeature,
  type JsonValue,
  type PlotFeature,
  type PlotFeatureInput,
  type PlotRegistry,
  type PlotStore,
  type PlotStyle,
  type Position,
} from "@plotlibre/core";
import {
  TwoPointDrawSession,
  type DrawSession,
  type DrawSessionSnapshot,
} from "@plotlibre/interaction";
import { MapLibrePlotRenderer } from "./renderer.js";
import type {
  KeyboardEventLike,
  MapLibreMapLike,
  MapLibreMouseEventLike,
  MapLibreRenderedFeatureLike,
} from "./types.js";

export interface StartPlotDrawOptions {
  readonly id?: string;
  readonly parameters?: Readonly<Record<string, JsonValue>>;
  readonly style?: PlotStyle;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

export interface MapLibrePlotInteractionOptions {
  readonly idFactory?: () => string;
}

export interface MapLibrePlotInteractionCallbacks {
  create(input: PlotFeatureInput): PlotFeature;
  replace(feature: PlotFeature): PlotFeature;
}

interface ControlPointDrag {
  readonly original: PlotFeature;
  readonly handleIndex: number;
  readonly dragPanWasEnabled: boolean;
  preview: PlotFeature;
  moved: boolean;
}

export class MapLibrePlotInteraction {
  readonly #map: MapLibreMapLike;
  readonly #registry: PlotRegistry;
  readonly #store: PlotStore;
  readonly #renderer: MapLibrePlotRenderer;
  readonly #callbacks: MapLibrePlotInteractionCallbacks;
  readonly #idFactory: () => string;
  readonly #unsubscribeStore: () => void;
  #session: DrawSession | undefined;
  #draftFeature: PlotFeature | undefined;
  #selectedId: string | undefined;
  #drag: ControlPointDrag | undefined;
  #suppressNextClick = false;
  #clickSuppressionTimer: ReturnType<typeof setTimeout> | undefined;

  readonly #onClick = (event: unknown): void => {
    const mouseEvent = asMouseEvent(event);
    if (!mouseEvent) return;
    this.#focusCanvas();

    if (this.#suppressNextClick) {
      this.#clearClickSuppression();
      return;
    }

    if (this.#session) {
      mouseEvent.originalEvent?.preventDefault?.();
      this.#applyDrawSnapshot(this.#session.click(toPosition(mouseEvent)));
      return;
    }

    const plotId = this.#queryPlotId(mouseEvent);
    this.select(plotId);
  };

  readonly #onMouseMove = (event: unknown): void => {
    const mouseEvent = asMouseEvent(event);
    if (!mouseEvent) return;

    if (this.#drag) {
      this.#updateDrag(toPosition(mouseEvent));
      return;
    }

    if (this.#session) {
      this.#applyDrawSnapshot(
        this.#session.pointerMove(toPosition(mouseEvent)),
      );
      return;
    }

    if (this.#selectedId && this.#queryHandle(mouseEvent)) {
      this.#setCursor("grab");
    } else {
      this.#setCursor("");
    }
  };

  readonly #onMouseDown = (event: unknown): void => {
    if (this.#session) return;
    const mouseEvent = asMouseEvent(event);
    if (!mouseEvent) return;

    const handle = this.#queryHandle(mouseEvent);
    if (!handle) return;

    const properties = handle.properties;
    const plotId = readString(properties?.plotId);
    const handleIndex = readInteger(properties?.handleIndex);
    if (plotId === undefined || handleIndex === undefined) return;

    const original = this.#store.get(plotId);
    if (!original.controlPoints[handleIndex]) return;

    const dragPanWasEnabled = this.#map.dragPan?.isEnabled?.() ?? true;
    this.#map.dragPan?.disable();
    this.#drag = {
      original,
      handleIndex,
      dragPanWasEnabled,
      preview: original,
      moved: false,
    };
    this.#draftFeature = original;
    this.#renderer.renderDraft(original, this.#registry);
    mouseEvent.originalEvent?.preventDefault?.();
    mouseEvent.originalEvent?.stopPropagation?.();
    this.#focusCanvas();
    this.#setCursor("grabbing");
  };

  readonly #onMouseUp = (): void => {
    if (!this.#drag) return;
    const drag = this.#drag;
    this.#drag = undefined;

    try {
      if (drag.moved) {
        this.#callbacks.replace(drag.preview);
      }
    } finally {
      this.#draftFeature = undefined;
      this.#renderer.clearDraft();
      this.#restoreDragPan(drag);
      this.#syncSelection();
      this.#armClickSuppression();
      this.#setCursor(this.#selectedId ? "grab" : "");
    }
  };

  readonly #onStyleLoad = (): void => {
    this.#renderer.initialize();
    this.#renderer.render(this.#store.list(), this.#registry);
    if (this.#draftFeature) {
      this.#renderer.renderDraft(this.#draftFeature, this.#registry);
    }
    this.#syncSelection();
  };

  readonly #onKeyDown = (event: KeyboardEventLike): void => {
    if (this.#drag && event.key === "Escape") {
      event.preventDefault?.();
      this.#cancelDrag();
      return;
    }

    if (this.#session) {
      if (
        event.key === "Escape" ||
        event.key === "Backspace" ||
        event.key === "Delete" ||
        event.key === "Enter"
      ) {
        event.preventDefault?.();
      }
      this.#applyDrawSnapshot(this.#session.keyDown(event.key));
      return;
    }

    if (event.key === "Escape" && this.#selectedId) {
      event.preventDefault?.();
      this.select(undefined);
    }
  };

  public constructor(
    map: MapLibreMapLike,
    registry: PlotRegistry,
    store: PlotStore,
    renderer: MapLibrePlotRenderer,
    callbacks: MapLibrePlotInteractionCallbacks,
    options: MapLibrePlotInteractionOptions = {},
  ) {
    this.#map = map;
    this.#registry = registry;
    this.#store = store;
    this.#renderer = renderer;
    this.#callbacks = callbacks;
    this.#idFactory = options.idFactory ?? createDefaultIdFactory();

    this.#map.on("click", this.#onClick);
    this.#map.on("mousemove", this.#onMouseMove);
    this.#map.on("mousedown", this.#onMouseDown);
    this.#map.on("mouseup", this.#onMouseUp);
    this.#map.on("style.load", this.#onStyleLoad);

    const canvas = this.#map.getCanvas();
    if (canvas.tabIndex < 0) canvas.tabIndex = 0;
    canvas.addEventListener("keydown", this.#onKeyDown);

    this.#unsubscribeStore = this.#store.subscribe(() => {
      if (!this.#drag) this.#syncSelection();
    });
  }

  public startDraw(
    plotType: string,
    options: StartPlotDrawOptions = {},
  ): string {
    const definition = this.#registry.get(plotType);
    if (
      definition.controlSchema.minPoints !== 2 ||
      definition.controlSchema.maxPoints !== 2
    ) {
      throw new Error(
        `Interactive drawing currently supports only two-point definitions; "${plotType}" requires ${definition.controlSchema.minPoints}-${definition.controlSchema.maxPoints} points.`,
      );
    }

    this.cancelDraw();
    this.#cancelDrag();
    this.select(undefined);

    const id = options.id ?? this.#idFactory();
    this.#session = new TwoPointDrawSession({
      id,
      plotType,
      definitionVersion: definition.version,
      parameters: {
        ...definition.defaultParameters,
        ...(options.parameters ?? {}),
      },
      style: {
        ...definition.defaultStyle,
        ...(options.style ?? {}),
      },
      metadata: { ...(options.metadata ?? {}) },
    });
    this.#setCursor("crosshair");
    this.#focusCanvas();
    return id;
  }

  public cancelDraw(): boolean {
    if (!this.#session) return false;
    this.#session.cancel();
    this.#session = undefined;
    this.#draftFeature = undefined;
    this.#renderer.clearDraft();
    this.#setCursor("");
    return true;
  }

  public select(id: string | undefined): void {
    if (id === undefined) {
      this.#selectedId = undefined;
      this.#renderer.clearHandles();
      return;
    }

    const feature = this.#store.get(id);
    this.#selectedId = feature.id;
    this.#renderer.renderHandles(feature);
  }

  public get selectedId(): string | undefined {
    return this.#selectedId;
  }

  public get isDrawing(): boolean {
    return this.#session !== undefined;
  }

  public destroy(): void {
    this.cancelDraw();
    this.#cancelDrag();
    this.#unsubscribeStore();
    this.#map.off("click", this.#onClick);
    this.#map.off("mousemove", this.#onMouseMove);
    this.#map.off("mousedown", this.#onMouseDown);
    this.#map.off("mouseup", this.#onMouseUp);
    this.#map.off("style.load", this.#onStyleLoad);
    this.#map.getCanvas().removeEventListener("keydown", this.#onKeyDown);
    this.#clearClickSuppression();
    this.#renderer.clearHandles();
  }

  #applyDrawSnapshot(snapshot: DrawSessionSnapshot): void {
    if (snapshot.draft) {
      const draft = this.#materialize(snapshot.draft);
      this.#draftFeature = draft;
      this.#renderer.renderDraft(draft, this.#registry);
    } else if (snapshot.status === "ready" || snapshot.status === "drawing") {
      this.#draftFeature = undefined;
      this.#renderer.clearDraft();
    }

    if (snapshot.completed) {
      const created = this.#callbacks.create(snapshot.completed);
      this.#session = undefined;
      this.#draftFeature = undefined;
      this.#renderer.clearDraft();
      this.select(created.id);
      this.#setCursor("grab");
      return;
    }

    if (snapshot.status === "cancelled") {
      this.#session = undefined;
      this.#draftFeature = undefined;
      this.#renderer.clearDraft();
      this.#setCursor("");
    }
  }

  #materialize(input: PlotFeatureInput): PlotFeature {
    const definition = this.#registry.get(input.plotType);
    const feature = createPlotFeature({
      ...input,
      definitionVersion: input.definitionVersion ?? definition.version,
      parameters: {
        ...definition.defaultParameters,
        ...(input.parameters ?? {}),
      },
      style: {
        ...definition.defaultStyle,
        ...(input.style ?? {}),
      },
    });
    this.#registry.assertValid(feature);
    return feature;
  }

  #updateDrag(position: Position): void {
    const drag = this.#drag;
    if (!drag) return;

    const current = drag.preview.controlPoints[drag.handleIndex];
    if (current && samePosition(current, position)) return;

    const controlPoints = drag.preview.controlPoints.map((point, index) =>
      index === drag.handleIndex ? position : point,
    );
    const preview = createPlotFeature({
      ...drag.original,
      controlPoints,
      revision: drag.original.revision + 1,
    });

    const validation = this.#registry.validate(preview);
    if (!validation.valid) return;

    drag.preview = preview;
    drag.moved = !sameControlPoints(
      drag.original.controlPoints,
      preview.controlPoints,
    );
    this.#draftFeature = preview;
    this.#renderer.renderDraft(preview, this.#registry);
    this.#renderer.renderHandles(preview);
    this.#setCursor("grabbing");
  }

  #cancelDrag(): boolean {
    const drag = this.#drag;
    if (!drag) return false;
    this.#drag = undefined;
    this.#draftFeature = undefined;
    this.#renderer.clearDraft();
    this.#restoreDragPan(drag);
    this.#renderer.renderHandles(drag.original);
    this.#setCursor("grab");
    return true;
  }

  #restoreDragPan(drag: ControlPointDrag): void {
    if (drag.dragPanWasEnabled) this.#map.dragPan?.enable();
  }

  #syncSelection(): void {
    if (!this.#selectedId) {
      this.#renderer.clearHandles();
      return;
    }

    const selected = this.#store.find(this.#selectedId);
    if (!selected) {
      this.#selectedId = undefined;
      this.#renderer.clearHandles();
      return;
    }

    this.#renderer.renderHandles(selected);
  }

  #queryPlotId(event: MapLibreMouseEventLike): string | undefined {
    if (!event.point || !this.#map.queryRenderedFeatures) return undefined;
    const features = this.#map.queryRenderedFeatures(event.point, {
      layers: [this.#renderer.layerIds.fill, this.#renderer.layerIds.line],
    });
    for (const feature of features) {
      const plotId = readString(feature.properties?.plotId);
      if (plotId !== undefined) return plotId;
    }
    return undefined;
  }

  #queryHandle(
    event: MapLibreMouseEventLike,
  ): MapLibreRenderedFeatureLike | undefined {
    if (!event.point || !this.#map.queryRenderedFeatures) return undefined;
    return this.#map.queryRenderedFeatures(event.point, {
      layers: [this.#renderer.layerIds.handle],
    })[0];
  }

  #armClickSuppression(): void {
    this.#clearClickSuppression();
    this.#suppressNextClick = true;
    this.#clickSuppressionTimer = setTimeout(() => {
      this.#suppressNextClick = false;
      this.#clickSuppressionTimer = undefined;
    }, 0);
  }

  #clearClickSuppression(): void {
    this.#suppressNextClick = false;
    if (this.#clickSuppressionTimer !== undefined) {
      clearTimeout(this.#clickSuppressionTimer);
      this.#clickSuppressionTimer = undefined;
    }
  }

  #setCursor(cursor: string): void {
    this.#map.getCanvas().style.cursor = cursor;
  }

  #focusCanvas(): void {
    this.#map.getCanvas().focus?.();
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

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function samePosition(left: Position, right: Position): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function sameControlPoints(
  left: readonly Position[],
  right: readonly Position[],
): boolean {
  return (
    left.length === right.length &&
    left.every((point, index) => {
      const other = right[index];
      return other !== undefined && samePosition(point, other);
    })
  );
}

function createDefaultIdFactory(): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `plot-${Date.now().toString(36)}-${counter.toString(36)}`;
  };
}
