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
  focus() {}
}

class FakeMap {
  sources = new Map();
  layers = new Map();
  listeners = new Map();
  canvas = new FakeCanvas();
  dragPan = { disable() {}, enable() {}, isEnabled: () => true };
  doubleClickZoom = { disable() {}, enable() {}, isEnabled: () => true };
  boxZoom = { disable() {}, enable() {}, isEnabled: () => true };
  getSource(id) { return this.sources.get(id); }
  addSource(id) { this.sources.set(id, new FakeGeoJsonSource()); }
  removeSource(id) { this.sources.delete(id); }
  getLayer(id) { return this.layers.get(id); }
  addLayer(layer) { this.layers.set(layer.id, layer); }
  removeLayer(id) { this.layers.delete(id); }
  on(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  off(type, listener) { this.listeners.get(type)?.delete(listener); }
  getCanvas() { return this.canvas; }
  queryRenderedFeatures() { return []; }
  project(value) {
    const lng = Array.isArray(value) ? value[0] : value.lng;
    const lat = Array.isArray(value) ? value[1] : value.lat;
    return { x: lng * 100, y: lat * -100 };
  }
  unproject(point) { return { lng: point.x / 100, lat: point.y / -100 }; }
}

function feature(id, overrides = {}) {
  return {
    id,
    plotType: STRAIGHT_ARROW_TYPE,
    definitionVersion: straightArrowDefinition.version,
    controlPoints: [[118.7, 32.0], [118.8, 32.1]],
    parameters: {},
    style: {},
    metadata: {},
    revision: 0,
    ...overrides,
  };
}

function document(features) {
  return {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: "document",
    name: "Import",
    features,
    metadata: {},
  };
}

test("selection listener failure after commit cannot report a successful import as failed", () => {
  const plot = new PlotLibre(new FakeMap(), {
    definitions: [straightArrowDefinition],
  });
  plot.create({
    id: "selected",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [[118.7, 32.0], [118.8, 32.1]],
  });
  plot.select("selected");
  plot.selection.subscribe((snapshot) => {
    if (snapshot.selectedIds.length === 0) {
      throw new Error("external selection listener failed");
    }
  });

  const consoleCalls = [];
  const originalConsoleError = console.error;
  console.error = (...args) => consoleCalls.push(args);
  try {
    const result = plot.importDocumentWithReport(
      document([
        feature("selected", {
          controlPoints: [[118.75, 32.05], [118.86, 32.16]],
          revision: 4,
        }),
      ]),
    );

    assert.equal(result.document.features[0].revision, 4);
    assert.equal(plot.store.get("selected").revision, 4);
    assert.deepEqual(plot.selectedIds, []);
    assert.equal(plot.history.undoDepth, 0);
    assert.equal(plot.history.redoDepth, 0);
    assert.equal(consoleCalls.length, 1);
    assert.match(String(consoleCalls[0][0]), /post-import cleanup error/);
  } finally {
    console.error = originalConsoleError;
  }
});

test("PlotLibre snapshots PlotJSON limit options at construction", () => {
  const limits = { features: 1 };
  const plot = new PlotLibre(new FakeMap(), {
    definitions: [straightArrowDefinition],
    plotJsonLimits: limits,
  });
  limits.features = 2;

  assert.throws(
    () => plot.importDocument(document([feature("a"), feature("b")])),
    { code: "PLOTJSON_RESOURCE_LIMIT_EXCEEDED", limitName: "features", limit: 1 },
  );
  assert.equal(plot.store.size, 0);
});
