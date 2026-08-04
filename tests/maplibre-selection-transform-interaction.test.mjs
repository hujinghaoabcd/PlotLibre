import assert from "node:assert/strict";
import test from "node:test";
import {
  CommandHistory,
  emptyRenderBundle,
  PlotRegistry,
  PlotStore,
} from "@plotlibre/core";
import {
  createSelectionTransformCommand,
  SelectionController,
} from "@plotlibre/interaction";
import {
  MapLibreSelectionTransformInteraction,
} from "@plotlibre/maplibre";

const TYPE = "test.maplibre-selection-transform";

function createCanvas() {
  const listeners = new Map();
  return {
    tabIndex: 0,
    style: { cursor: "" },
    focused: false,
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter((candidate) => candidate !== listener));
    },
    emit(type, event = {}) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
    },
    focus() {
      this.focused = true;
    },
    listeners,
  };
}

function createHandler(enabled = true) {
  return {
    enabled,
    disableCount: 0,
    enableCount: 0,
    isEnabled() {
      return this.enabled;
    },
    disable() {
      this.enabled = false;
      this.disableCount += 1;
    },
    enable() {
      this.enabled = true;
      this.enableCount += 1;
    },
  };
}

function createMap() {
  const canvas = createCanvas();
  const listeners = new Map();
  const dragPan = createHandler(true);
  return {
    canvas,
    dragPan,
    getCanvas() {
      return canvas;
    },
    getContainer() {
      return undefined;
    },
    on(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    off(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter((candidate) => candidate !== listener));
    },
    emit(type, event = {}) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
    },
    project(position) {
      return {
        x: (position[0] - 118.7) * 100_000,
        y: (32.2 - position[1]) * 100_000,
      };
    },
    unproject(point) {
      const x = Array.isArray(point) ? point[0] : point.x;
      const y = Array.isArray(point) ? point[1] : point.y;
      return {
        lng: 118.7 + x / 100_000,
        lat: 32.2 - y / 100_000,
      };
    },
    getSource() {},
    addSource() {},
    removeSource() {},
    getLayer() {},
    addLayer() {},
    removeLayer() {},
    listeners,
  };
}

function createRenderer() {
  return {
    clearHandlesCount: 0,
    clearDraftCount: 0,
    renderedSelections: [],
    renderedHandles: [],
    clearHandles() {
      this.clearHandlesCount += 1;
    },
    clearDraft() {
      this.clearDraftCount += 1;
    },
    renderSelection(features, primaryId) {
      this.renderedSelections.push({
        ids: features.map((feature) => feature.id),
        revisions: features.map((feature) => feature.revision),
        primaryId,
      });
    },
    renderHandles(feature) {
      this.renderedHandles.push(feature?.id);
    },
  };
}

function createOverlay() {
  return {
    handlers: undefined,
    frames: [],
    clearCount: 0,
    destroyCount: 0,
    setHandlers(handlers) {
      this.handlers = handlers;
    },
    render(frame) {
      this.frames.push(frame);
    },
    clear() {
      this.clearCount += 1;
    },
    destroy() {
      this.destroyCount += 1;
    },
    emit(type, kind, point, pointerId = 1) {
      this.handlers[type]({
        kind,
        point,
        pointerId,
        preventDefault() {},
        stopPropagation() {},
        stopImmediatePropagation() {},
      });
    },
  };
}

function createRegistry() {
  return new PlotRegistry().register({
    type: TYPE,
    version: "1.0.0",
    controlSchema: { minPoints: 1, maxPoints: 8 },
    defaultParameters: {},
    defaultStyle: {},
    validate() {
      return { valid: true, issues: [] };
    },
    generate() {
      return emptyRenderBundle();
    },
  });
}

function addFeature(store, id, controlPoints, revision = 0) {
  store.add({
    id,
    plotType: TYPE,
    definitionVersion: "1.0.0",
    controlPoints,
    parameters: { minimumWidthMeters: 10 },
    style: { lineColor: "#123456", lineWidth: 2 },
    metadata: { id },
    revision,
  });
}

function createHarness({ select = ["a", "b"], map = createMap() } = {}) {
  const registry = createRegistry();
  const store = new PlotStore();
  addFeature(store, "a", [[118.79, 31.99], [118.795, 32.005]], 2);
  addFeature(store, "middle", [[118.8, 32], [118.801, 32.001]], 7);
  addFeature(store, "b", [[118.805, 31.995], [118.81, 32.01]], 4);
  const selection = new SelectionController(store);
  if (select.length > 0) selection.replace(select);
  const renderer = createRenderer();
  const overlay = createOverlay();
  const history = new CommandHistory();
  const callbackCounts = {
    cancelRegion: 0,
    cancelTranslation: 0,
    cancelDrawing: 0,
  };
  const interaction = new MapLibreSelectionTransformInteraction(
    map,
    registry,
    store,
    selection,
    renderer,
    {
      overlay,
      callbacks: {
        cancelRegion() {
          callbackCounts.cancelRegion += 1;
        },
        cancelTranslation() {
          callbackCounts.cancelTranslation += 1;
        },
        cancelDrawing() {
          callbackCounts.cancelDrawing += 1;
        },
        commit(completion, selectionSnapshot) {
          const command = createSelectionTransformCommand(store, selection, {
            completion,
            selectionSnapshot,
          });
          if (command) history.execute(command);
          return selection.selectedIds.map((id) => store.get(id));
        },
      },
    },
  );
  return {
    map,
    registry,
    store,
    selection,
    renderer,
    overlay,
    history,
    callbackCounts,
    interaction,
  };
}

function rotateScreenVectorClockwise(point, pivot) {
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return {
    x: pivot.x - dy,
    y: pivot.y + dx,
  };
}

function scaleScreenVector(point, pivot, factor) {
  return {
    x: pivot.x + factor * (point.x - pivot.x),
    y: pivot.y + factor * (point.y - pivot.y),
  };
}

test("explicit rotation mode renders a DOM frame and commits one atomic command", () => {
  const harness = createHarness();
  const started = harness.interaction.start("rotate");
  assert.equal(started.status, "armed");
  assert.equal(started.kind, "rotate");
  assert.deepEqual(started.selectedIds, ["a", "b"]);
  assert.equal(harness.callbackCounts.cancelRegion, 1);
  assert.equal(harness.callbackCounts.cancelTranslation, 1);
  assert.equal(harness.callbackCounts.cancelDrawing, 1);
  assert.equal(harness.renderer.clearHandlesCount, 1);
  assert.equal(harness.overlay.frames.at(-1).kind, "rotate");

  const frame = harness.overlay.frames.at(-1);
  const moved = rotateScreenVectorClockwise(frame.rotationHandle, frame.pivot);
  harness.overlay.emit("pointerDown", "rotate", frame.rotationHandle);
  assert.equal(harness.interaction.snapshot.status, "active");
  assert.equal(harness.map.dragPan.enabled, false);
  harness.overlay.emit("pointerMove", "rotate", moved);
  assert.equal(harness.renderer.renderedSelections.at(-1).revisions[0], 3);
  harness.overlay.emit("pointerUp", "rotate", moved);

  assert.equal(harness.interaction.snapshot.status, "idle");
  assert.equal(harness.map.dragPan.enabled, true);
  assert.equal(harness.history.undoDepth, 1);
  assert.equal(harness.store.get("a").revision, 3);
  assert.equal(harness.store.get("b").revision, 5);
  assert.equal(harness.store.get("middle").revision, 7);
  assert.deepEqual(harness.selection.selectedIds, ["a", "b"]);
  assert.equal(harness.selection.primaryId, "b");

  assert.equal(harness.history.undo(), true);
  assert.equal(harness.store.get("a").revision, 2);
  assert.equal(harness.store.get("b").revision, 4);
  assert.equal(harness.history.redo(), true);
  assert.equal(harness.store.get("a").revision, 3);
  harness.interaction.destroy();
});

test("out-of-range scale remains rejected and retries in the same explicit mode", () => {
  const harness = createHarness();
  harness.interaction.start("scale");
  let frame = harness.overlay.frames.at(-1);
  const invalid = scaleScreenVector(frame.scaleHandle, frame.pivot, 200);
  harness.overlay.emit("pointerDown", "scale", frame.scaleHandle);
  harness.overlay.emit("pointerMove", "scale", invalid);
  harness.overlay.emit("pointerUp", "scale", invalid);

  assert.equal(harness.interaction.snapshot.status, "rejected");
  assert.equal(
    harness.interaction.rejection.code,
    "SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE",
  );
  assert.equal(harness.history.undoDepth, 0);
  assert.equal(harness.overlay.frames.at(-1).rejected, true);
  assert.equal(harness.map.dragPan.enabled, true);

  frame = harness.overlay.frames.at(-1);
  const valid = scaleScreenVector(frame.scaleHandle, frame.pivot, 2);
  harness.overlay.emit("pointerDown", "scale", frame.scaleHandle);
  harness.overlay.emit("pointerMove", "scale", valid);
  harness.overlay.emit("pointerUp", "scale", valid);

  assert.equal(harness.interaction.snapshot.status, "idle");
  assert.equal(harness.history.undoDepth, 1);
  assert.equal(harness.store.get("a").revision, 3);
  assert.equal(harness.store.get("b").revision, 5);
  harness.interaction.destroy();
});

test("canvas pointerdown outside a handle cancels armed mode and consumes the event", () => {
  const harness = createHarness();
  harness.interaction.start("rotate");
  let prevented = 0;
  let stopped = 0;
  harness.map.canvas.emit("pointerdown", {
    pointerId: 9,
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; },
    stopImmediatePropagation() { stopped += 1; },
  });
  assert.equal(harness.interaction.snapshot.status, "idle");
  assert.equal(prevented, 1);
  assert.equal(stopped, 2);
  assert.equal(harness.overlay.clearCount > 0, true);
  harness.interaction.destroy();
});

test("camera movement cancels active drag but armed mode reprojects on render", () => {
  const harness = createHarness();
  harness.interaction.start("rotate");
  const before = harness.overlay.frames.length;
  harness.map.emit("render");
  assert.equal(harness.overlay.frames.length, before + 1);
  assert.equal(harness.interaction.snapshot.status, "armed");

  const frame = harness.overlay.frames.at(-1);
  harness.overlay.emit("pointerDown", "rotate", frame.rotationHandle);
  assert.equal(harness.map.dragPan.enabled, false);
  harness.map.emit("movestart");
  assert.equal(harness.interaction.snapshot.status, "idle");
  assert.equal(harness.map.dragPan.enabled, true);
  harness.interaction.destroy();
});

test("external Store and selection changes cancel transform mode", () => {
  const storeHarness = createHarness();
  storeHarness.interaction.start("scale");
  addFeature(storeHarness.store, "external", [[118.82, 32], [118.821, 32.001]]);
  assert.equal(storeHarness.interaction.snapshot.status, "idle");
  storeHarness.interaction.destroy();

  const selectionHarness = createHarness();
  selectionHarness.interaction.start("rotate");
  selectionHarness.selection.makePrimary("a");
  assert.equal(selectionHarness.interaction.snapshot.status, "idle");
  selectionHarness.interaction.destroy();
});

test("empty selection and missing map unproject expose stable rejected state", () => {
  const empty = createHarness({ select: [] });
  const rejected = empty.interaction.start("rotate");
  assert.equal(rejected.status, "rejected");
  assert.equal(
    rejected.rejection.code,
    "SELECTION_TRANSFORM_SELECTION_EMPTY",
  );
  assert.equal(empty.overlay.frames.length, 0);
  empty.interaction.destroy();

  const map = createMap();
  delete map.unproject;
  const missing = createHarness({ map });
  missing.interaction.start("scale");
  const frame = missing.overlay.frames.at(-1);
  missing.overlay.emit("pointerDown", "scale", frame.scaleHandle);
  assert.equal(missing.interaction.snapshot.status, "rejected");
  assert.equal(
    missing.interaction.rejection.code,
    "SELECTION_TRANSFORM_POINTER_INVALID",
  );
  assert.equal(missing.history.undoDepth, 0);
  missing.interaction.destroy();
});

test("style and resize lifecycle cancel armed mode and destroy detaches resources", () => {
  const harness = createHarness();
  harness.interaction.start("rotate");
  harness.map.emit("style.load");
  assert.equal(harness.interaction.snapshot.status, "idle");

  harness.interaction.start("scale");
  harness.map.emit("resize");
  assert.equal(harness.interaction.snapshot.status, "idle");

  harness.interaction.start("rotate");
  harness.interaction.destroy();
  assert.equal(harness.overlay.destroyCount, 1);
  assert.equal(harness.overlay.handlers, undefined);
  assert.equal(harness.map.canvas.listeners.get("pointerdown")?.length ?? 0, 0);
});
