import assert from "node:assert/strict";
import test from "node:test";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  straightArrowDefinition,
  STRAIGHT_ARROW_TYPE,
} from "@plotlibre/symbols";

class FakeGeoJsonSource {
  data = undefined;

  setData(data) {
    this.data = data;
  }
}

class FakeCanvas {
  tabIndex = -1;
  style = { cursor: "" };
  listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  fire(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  focus() {}
}

class FakeMap {
  sources = new Map();
  layers = new Map();
  listeners = new Map();
  canvas = new FakeCanvas();
  dragPanEnabled = true;
  boxZoomEnabled = true;
  doubleClickZoomEnabled = true;
  dragPan = {
    disable: () => {
      this.dragPanEnabled = false;
    },
    enable: () => {
      this.dragPanEnabled = true;
    },
    isEnabled: () => this.dragPanEnabled,
  };
  boxZoom = {
    disable: () => {
      this.boxZoomEnabled = false;
    },
    enable: () => {
      this.boxZoomEnabled = true;
    },
    isEnabled: () => this.boxZoomEnabled,
  };
  doubleClickZoom = {
    disable: () => {
      this.doubleClickZoomEnabled = false;
    },
    enable: () => {
      this.doubleClickZoomEnabled = true;
    },
    isEnabled: () => this.doubleClickZoomEnabled,
  };

  getSource(id) {
    return this.sources.get(id);
  }

  addSource(id) {
    this.sources.set(id, new FakeGeoJsonSource());
  }

  removeSource(id) {
    this.sources.delete(id);
  }

  getLayer(id) {
    return this.layers.get(id);
  }

  addLayer(layer) {
    this.layers.set(layer.id, layer);
  }

  removeLayer(id) {
    this.layers.delete(id);
  }

  on(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  off(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  fire(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  getCanvas() {
    return this.canvas;
  }

  getContainer() {
    return undefined;
  }

  queryRenderedFeatures() {
    return [];
  }

  project(position) {
    return {
      x: (position[0] - 118.75) * 100_000,
      y: (32.1 - position[1]) * 100_000,
    };
  }

  unproject(point) {
    const x = Array.isArray(point) ? point[0] : point.x;
    const y = Array.isArray(point) ? point[1] : point.y;
    return {
      lng: 118.75 + x / 100_000,
      lat: 32.1 - y / 100_000,
    };
  }
}

function createPlot() {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
    idFactory: () => "drawn-arrow",
  });
  return { map, plot };
}

function addSelection(plot) {
  plot.create({
    id: "a",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.02],
      [118.82, 32.06],
    ],
  });
  plot.create({
    id: "b",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [
      [118.83, 32.03],
      [118.87, 32.08],
    ],
  });
  plot.selection.replace(["a", "b"]);
}

test("PlotLibre exposes explicit selection rotation and scale snapshots", () => {
  const { plot } = createPlot();
  addSelection(plot);

  const rotation = plot.startSelectionRotation();
  assert.equal(rotation.status, "armed");
  assert.equal(rotation.kind, "rotate");
  assert.deepEqual(rotation.selectedIds, ["a", "b"]);
  assert.equal(plot.selectionTransformSnapshot.status, "armed");
  assert.equal(plot.selectionTransformRejection, undefined);

  assert.equal(plot.cancelSelectionTransform(), true);
  assert.equal(plot.selectionTransformSnapshot.status, "idle");

  const scale = plot.startSelectionScale();
  assert.equal(scale.status, "armed");
  assert.equal(scale.kind, "scale");
  assert.deepEqual(scale.selectedIds, ["a", "b"]);

  plot.destroy();
});

test("public region and draw entry points cancel an armed transform", () => {
  const { plot } = createPlot();
  addSelection(plot);

  plot.startSelectionRotation();
  const region = plot.startBoxSelection({ intent: "add" });
  assert.equal(plot.selectionTransformSnapshot.status, "idle");
  assert.equal(region.status, "armed");
  assert.equal(region.kind, "box");
  assert.equal(region.intent, "add");

  const scale = plot.startSelectionScale();
  assert.equal(plot.regionSelectionSnapshot.status, "idle");
  assert.equal(scale.status, "armed");

  plot.draw(STRAIGHT_ARROW_TYPE);
  assert.equal(plot.selectionTransformSnapshot.status, "idle");
  assert.equal(plot.interaction.isDrawing, true);

  plot.destroy();
});

test("empty selection exposes the frozen transform rejection and lifecycle methods clear it", () => {
  const { plot } = createPlot();

  const rejected = plot.startSelectionRotation();
  assert.equal(rejected.status, "rejected");
  assert.equal(
    rejected.rejection.code,
    "SELECTION_TRANSFORM_SELECTION_EMPTY",
  );
  assert.equal(
    plot.selectionTransformRejection.code,
    "SELECTION_TRANSFORM_SELECTION_EMPTY",
  );

  plot.clear();
  assert.equal(plot.selectionTransformSnapshot.status, "idle");
  assert.equal(plot.selectionTransformRejection, undefined);

  plot.destroy();
});
