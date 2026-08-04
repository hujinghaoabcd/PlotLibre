import assert from "node:assert/strict";
import test from "node:test";
import { PlotStore } from "@plotlibre/core";
import { SelectionController } from "@plotlibre/interaction";
import { MapLibreSelectionRegionInteraction } from "@plotlibre/maplibre";

function createCanvas() {
  const listeners = new Map();
  const captured = new Set();
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
    getBoundingClientRect() {
      return { left: 100, top: 50, width: 800, height: 600 };
    },
    setPointerCapture(pointerId) {
      captured.add(pointerId);
    },
    releasePointerCapture(pointerId) {
      captured.delete(pointerId);
    },
    hasPointerCapture(pointerId) {
      return captured.has(pointerId);
    },
    focus() {
      this.focused = true;
    },
    captured,
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

function createMap({ hit = false } = {}) {
  const canvas = createCanvas();
  const mapListeners = new Map();
  const dragPan = createHandler(true);
  const boxZoom = createHandler(true);
  return {
    canvas,
    dragPan,
    boxZoom,
    queryCalls: [],
    getCanvas() {
      return canvas;
    },
    getContainer() {
      return undefined;
    },
    on(type, listener) {
      const entries = mapListeners.get(type) ?? [];
      entries.push(listener);
      mapListeners.set(type, entries);
    },
    off(type, listener) {
      const entries = mapListeners.get(type) ?? [];
      mapListeners.set(type, entries.filter((candidate) => candidate !== listener));
    },
    emit(type, event = {}) {
      for (const listener of [...(mapListeners.get(type) ?? [])]) listener(event);
    },
    queryRenderedFeatures(point, options) {
      this.queryCalls.push({ point, options });
      return hit ? [{ properties: { plotId: "a" } }] : [];
    },
    getSource() {},
    addSource() {},
    removeSource() {},
    getLayer() {},
    addLayer() {},
    removeLayer() {},
  };
}

function createRenderer() {
  return {
    layerIds: {
      fill: "fill",
      line: "line",
      point: "point",
      selectionLine: "selection-line",
      selectionPoint: "selection-point",
      draftFill: "draft-fill",
      draftLine: "draft-line",
      draftPoint: "draft-point",
      handleGuide: "handle-guide",
      handle: "handle",
    },
    clearHandlesCount: 0,
    renderedSelections: [],
    renderedHandles: [],
    clearHandles() {
      this.clearHandlesCount += 1;
    },
    renderSelection(features, primaryId) {
      this.renderedSelections.push({ ids: features.map((feature) => feature.id), primaryId });
    },
    renderHandles(feature) {
      this.renderedHandles.push(feature?.id);
    },
  };
}

function createOverlay() {
  return {
    frames: [],
    clearCount: 0,
    destroyCount: 0,
    render(frame) {
      this.frames.push(frame);
    },
    clear() {
      this.clearCount += 1;
    },
    destroy() {
      this.destroyCount += 1;
    },
  };
}

function createHarness({ hit = false, resolutionIds = ["a", "b"] } = {}) {
  const store = new PlotStore();
  for (const [index, id] of ["a", "b", "c"].entries()) {
    store.add({
      id,
      plotType: "test.region-interaction",
      controlPoints: [[index, index]],
    });
  }
  const selection = new SelectionController(store);
  const map = createMap({ hit });
  const renderer = createRenderer();
  const overlay = createOverlay();
  const suppressions = [];
  const resolver = {
    calls: [],
    resolve(ring, bounds) {
      this.calls.push({ ring, bounds });
      return {
        ids: resolutionIds,
        metrics: {
          queriedFeatureCount: resolutionIds.length,
          uniqueRenderedPlotIdCount: resolutionIds.length,
          candidateCount: resolutionIds.length,
          generatedCandidateCount: resolutionIds.length,
          projectedGeometryCount: resolutionIds.length,
        },
      };
    },
  };
  const interaction = new MapLibreSelectionRegionInteraction(
    map,
    {},
    store,
    selection,
    renderer,
    {
      overlay,
      resolver,
      callbacks: {
        suppressNextClick: () => suppressions.push(true),
      },
    },
  );
  return { store, selection, map, renderer, overlay, resolver, suppressions, interaction };
}

function pointer(overrides = {}) {
  return {
    offsetX: 0,
    offsetY: 0,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
    ...overrides,
  };
}

test("constructor reserves Shift box zoom and destroy restores prior state", () => {
  const harness = createHarness();
  assert.equal(harness.map.boxZoom.enabled, false);
  assert.equal(harness.map.boxZoom.disableCount, 1);
  harness.interaction.destroy();
  assert.equal(harness.map.boxZoom.enabled, true);
  assert.equal(harness.map.boxZoom.enableCount, 1);
  assert.equal(harness.overlay.destroyCount, 1);
});

test("Shift pointerdown on a selectable feature remains a normal click path", () => {
  const harness = createHarness({ hit: true });
  harness.map.canvas.emit("pointerdown", pointer({ shiftKey: true, offsetX: 5, offsetY: 5 }));
  assert.equal(harness.interaction.snapshot.status, "idle");
  assert.deepEqual(harness.selection.selectedIds, []);
  assert.equal(harness.map.dragPan.disableCount, 0);
  harness.interaction.destroy();
});

test("Shift-empty drag performs one additive box selection", () => {
  const harness = createHarness();
  harness.selection.replace(["c"]);
  const changes = [];
  harness.selection.subscribe((change) => changes.push(change));

  harness.map.canvas.emit("pointerdown", pointer({ shiftKey: true, offsetX: 2, offsetY: 3 }));
  assert.equal(harness.interaction.snapshot.status, "armed");
  assert.deepEqual(harness.selection.selectedIds, ["c"]);

  harness.map.canvas.emit("pointermove", pointer({ shiftKey: true, offsetX: 12, offsetY: 13 }));
  assert.equal(harness.interaction.snapshot.status, "active");
  assert.equal(harness.map.dragPan.enabled, false);
  assert.equal(harness.overlay.frames.length, 1);

  harness.map.canvas.emit("pointerup", pointer({ shiftKey: true, offsetX: 12, offsetY: 13 }));
  assert.deepEqual(harness.selection.selectedIds, ["c", "a", "b"]);
  assert.equal(harness.selection.primaryId, "b");
  assert.equal(changes.length, 1);
  assert.equal(changes[0].reason, "box");
  assert.equal(harness.resolver.calls.length, 1);
  assert.equal(harness.suppressions.length, 1);
  assert.equal(harness.map.dragPan.enabled, true);
  assert.equal(harness.map.canvas.captured.size, 0);
  assert.equal(harness.interaction.snapshot.status, "idle");
  harness.interaction.destroy();
});

test("sub-threshold neutral Shift gesture is a no-op", () => {
  const harness = createHarness();
  harness.selection.replace(["a"]);
  harness.map.canvas.emit("pointerdown", pointer({ shiftKey: true, offsetX: 1, offsetY: 1 }));
  harness.map.canvas.emit("pointerup", pointer({ shiftKey: true, offsetX: 3, offsetY: 1 }));
  assert.deepEqual(harness.selection.selectedIds, ["a"]);
  assert.equal(harness.resolver.calls.length, 0);
  assert.equal(harness.suppressions.length, 1);
  assert.equal(harness.interaction.snapshot.status, "idle");
  harness.interaction.destroy();
});

test("explicit box mode hides handles and applies replace intent", () => {
  const harness = createHarness({ resolutionIds: ["b", "a"] });
  harness.selection.replace(["c"]);
  const start = harness.interaction.start("box");
  assert.equal(start.status, "armed");
  assert.equal(start.intent, "replace");
  assert.equal(harness.renderer.clearHandlesCount, 1);

  harness.map.canvas.emit("pointerdown", pointer({ offsetX: 0, offsetY: 0 }));
  harness.map.canvas.emit("pointermove", pointer({ offsetX: 10, offsetY: 10 }));
  harness.map.canvas.emit("pointerup", pointer({ offsetX: 10, offsetY: 10 }));
  assert.deepEqual(harness.selection.selectedIds, ["b", "a"]);
  assert.equal(harness.selection.primaryId, "a");
  assert.equal(harness.interaction.snapshot.status, "idle");
  assert.equal(harness.renderer.renderedHandles.at(-1), "a");
  harness.interaction.destroy();
});

test("explicit modifier override captures toggle and subtract intents", () => {
  const toggle = createHarness({ resolutionIds: ["a", "c"] });
  toggle.selection.replace(["a", "b"]);
  toggle.interaction.start("box", { intent: "replace" });
  toggle.map.canvas.emit("pointerdown", pointer({ ctrlKey: true, offsetX: 0, offsetY: 0 }));
  toggle.map.canvas.emit("pointermove", pointer({ ctrlKey: true, offsetX: 10, offsetY: 10 }));
  toggle.map.canvas.emit("pointerup", pointer({ ctrlKey: true, offsetX: 10, offsetY: 10 }));
  assert.deepEqual(toggle.selection.selectedIds, ["b", "c"]);
  toggle.interaction.destroy();

  const subtract = createHarness({ resolutionIds: ["b"] });
  subtract.selection.replace(["a", "b", "c"]);
  subtract.interaction.start("box");
  subtract.map.canvas.emit("pointerdown", pointer({ altKey: true, offsetX: 0, offsetY: 0 }));
  subtract.map.canvas.emit("pointermove", pointer({ altKey: true, offsetX: 10, offsetY: 10 }));
  subtract.map.canvas.emit("pointerup", pointer({ altKey: true, offsetX: 10, offsetY: 10 }));
  assert.deepEqual(subtract.selection.selectedIds, ["a", "c"]);
  subtract.interaction.destroy();
});

test("invalid lasso preserves selection and remains armed for retry", () => {
  const harness = createHarness();
  harness.selection.replace(["c"]);
  harness.interaction.start("lasso");
  harness.map.canvas.emit("pointerdown", pointer({ offsetX: 0, offsetY: 0 }));
  harness.map.canvas.emit("pointermove", pointer({ offsetX: 10, offsetY: 10 }));
  harness.map.canvas.emit("pointermove", pointer({ offsetX: 0, offsetY: 10 }));
  harness.map.canvas.emit("pointerup", pointer({ offsetX: 10, offsetY: 0 }));

  assert.deepEqual(harness.selection.selectedIds, ["c"]);
  assert.equal(harness.interaction.snapshot.status, "rejected");
  assert.equal(
    harness.interaction.rejection.code,
    "SELECTION_REGION_LASSO_SELF_INTERSECTS",
  );
  assert.equal(harness.overlay.frames.at(-1).rejected, true);
  assert.equal(harness.resolver.calls.length, 0);

  harness.map.canvas.emit("pointerdown", pointer({ offsetX: 0, offsetY: 0 }));
  assert.equal(harness.interaction.snapshot.status, "active");
  assert.equal(harness.interaction.rejection, undefined);
  harness.interaction.destroy();
});

test("Escape and camera lifecycle cancel region state and restore map interaction", () => {
  const harness = createHarness();
  harness.interaction.start("lasso");
  harness.map.canvas.emit("pointerdown", pointer({ pointerId: 7, offsetX: 0, offsetY: 0 }));
  assert.equal(harness.map.dragPan.enabled, false);
  let prevented = false;
  harness.map.canvas.emit("keydown", {
    key: "Escape",
    preventDefault() { prevented = true; },
    stopImmediatePropagation() {},
  });
  assert.equal(prevented, true);
  assert.equal(harness.interaction.snapshot.status, "idle");
  assert.equal(harness.map.dragPan.enabled, true);
  assert.equal(harness.map.canvas.captured.size, 0);

  harness.interaction.start("box");
  harness.map.canvas.emit("pointerdown", pointer({ offsetX: 0, offsetY: 0 }));
  harness.map.canvas.emit("pointermove", pointer({ offsetX: 10, offsetY: 10 }));
  harness.map.emit("movestart");
  assert.equal(harness.interaction.snapshot.status, "idle");
  assert.equal(harness.map.dragPan.enabled, true);
  harness.interaction.destroy();
});

test("external Store or selection changes cancel explicit region mode", () => {
  const storeHarness = createHarness();
  storeHarness.interaction.start("box");
  storeHarness.store.add({
    id: "d",
    plotType: "test.region-interaction",
    controlPoints: [[4, 4]],
  });
  assert.equal(storeHarness.interaction.snapshot.status, "idle");
  storeHarness.interaction.destroy();

  const selectionHarness = createHarness();
  selectionHarness.interaction.start("lasso");
  selectionHarness.selection.replace(["a"]);
  assert.equal(selectionHarness.interaction.snapshot.status, "idle");
  selectionHarness.interaction.destroy();
});

test("resolver failure rejects without partial selection", () => {
  const harness = createHarness();
  harness.selection.replace(["c"]);
  harness.resolver.resolve = () => {
    throw Object.assign(new Error("projection failed"), {
      code: "SELECTION_REGION_PROJECTION_FAILED",
    });
  };
  harness.interaction.start("box");
  harness.map.canvas.emit("pointerdown", pointer({ offsetX: 0, offsetY: 0 }));
  harness.map.canvas.emit("pointermove", pointer({ offsetX: 10, offsetY: 10 }));
  harness.map.canvas.emit("pointerup", pointer({ offsetX: 10, offsetY: 10 }));
  assert.deepEqual(harness.selection.selectedIds, ["c"]);
  assert.equal(harness.interaction.snapshot.status, "rejected");
  assert.equal(harness.interaction.rejection.code, "SELECTION_REGION_QUERY_FAILED");
  harness.interaction.destroy();
});
