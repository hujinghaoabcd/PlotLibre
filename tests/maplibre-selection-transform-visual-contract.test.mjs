import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyRenderBundle,
  PlotRegistry,
  PlotStore,
} from "@plotlibre/core";
import { SelectionController } from "@plotlibre/interaction";
import { MapLibreSelectionTransformInteraction } from "@plotlibre/maplibre";

const TYPE = "test.selection-transform-visual-contract";

function createEventTarget() {
  const listeners = new Map();
  return {
    tabIndex: 0,
    style: { cursor: "" },
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter((candidate) => candidate !== listener));
    },
    focus() {},
  };
}

function createMap() {
  const canvas = createEventTarget();
  const listeners = new Map();
  const dragPan = {
    enabled: true,
    isEnabled() {
      return this.enabled;
    },
    disable() {
      this.enabled = false;
    },
    enable() {
      this.enabled = true;
    },
  };
  return {
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
  };
}

function createOverlay() {
  return {
    handlers: undefined,
    frames: [],
    setHandlers(handlers) {
      this.handlers = handlers;
    },
    render(frame) {
      this.frames.push(frame);
    },
    clear() {},
    destroy() {},
    emit(type, kind, point) {
      this.handlers[type]({
        kind,
        point,
        pointerId: 1,
        preventDefault() {},
        stopPropagation() {},
        stopImmediatePropagation() {},
      });
    },
  };
}

function createHarness(controlPoints) {
  const registry = new PlotRegistry().register({
    type: TYPE,
    version: "1.0.0",
    controlSchema: { minPoints: 2, maxPoints: 8 },
    defaultParameters: {},
    defaultStyle: {},
    validate() {
      return { valid: true, issues: [] };
    },
    generate() {
      return emptyRenderBundle();
    },
  });
  const store = new PlotStore();
  store.add({
    id: "tiny",
    plotType: TYPE,
    definitionVersion: "1.0.0",
    controlPoints,
    parameters: {},
    style: {},
    metadata: {},
    revision: 0,
  });
  const selection = new SelectionController(store);
  selection.replace(["tiny"]);
  const map = createMap();
  const overlay = createOverlay();
  const renderer = {
    renderSelection() {},
    renderHandles() {},
    clearHandles() {},
    clearDraft() {},
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
        commit() {
          throw new Error("Visual contract tests do not commit transforms.");
        },
      },
    },
  );
  return { interaction, map, overlay };
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

test("tiny canonical selections receive a minimum 24 CSS pixel visual frame", () => {
  const harness = createHarness([
    [118.8, 32],
    [118.800001, 32.000001],
  ]);
  harness.interaction.start("scale");
  const frame = harness.overlay.frames.at(-1);

  assert.ok(distance(frame.corners[0], frame.corners[1]) >= 24 - 1e-9);
  assert.ok(distance(frame.corners[0], frame.corners[3]) >= 24 - 1e-9);
  assert.notDeepEqual(frame.scaleHandle, frame.pivot);
  harness.interaction.destroy();
});

test("adapter rejects a transform start inside four CSS pixels of the pivot", () => {
  const harness = createHarness([
    [118.79, 31.99],
    [118.81, 32.01],
  ]);
  harness.interaction.start("rotate");
  const frame = harness.overlay.frames.at(-1);
  harness.overlay.emit("pointerDown", "rotate", {
    x: frame.pivot.x + 3,
    y: frame.pivot.y,
  });

  assert.equal(harness.interaction.snapshot.status, "rejected");
  assert.equal(
    harness.interaction.rejection.code,
    "SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL",
  );
  assert.equal(harness.map.dragPan.enabled, true);
  harness.interaction.destroy();
});
