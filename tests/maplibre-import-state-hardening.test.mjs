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
  dragPanEnabled = true;
  doubleClickZoomEnabled = true;
  boxZoomEnabled = true;
  dragPan = {
    disable: () => {
      this.dragPanEnabled = false;
    },
    enable: () => {
      this.dragPanEnabled = true;
    },
    isEnabled: () => this.dragPanEnabled,
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
  boxZoom = {
    disable: () => {
      this.boxZoomEnabled = false;
    },
    enable: () => {
      this.boxZoomEnabled = true;
    },
    isEnabled: () => this.boxZoomEnabled,
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
  getCanvas() {
    return this.canvas;
  }
  queryRenderedFeatures() {
    return [];
  }
  project(value) {
    const lng = Array.isArray(value) ? value[0] : value.lng;
    const lat = Array.isArray(value) ? value[1] : value.lat;
    return { x: lng * 100, y: lat * -100 };
  }
  unproject(point) {
    return { lng: point.x / 100, lat: point.y / -100 };
  }
}

function createPlot() {
  return new PlotLibre(new FakeMap(), {
    definitions: [straightArrowDefinition],
  });
}

function unknownDocument() {
  return {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: "invalid-import",
    name: "Invalid",
    features: [
      {
        id: "unknown",
        plotType: "arrow.unknown",
        definitionVersion: "1.0.0",
        controlPoints: [[118.7, 32.0], [118.8, 32.1]],
        parameters: {},
        style: {},
        metadata: {},
        revision: 0,
      },
    ],
    metadata: {},
  };
}

function createSelectedFeature(plot) {
  plot.create({
    id: "selected",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [[118.7, 32.0], [118.8, 32.1]],
  });
  plot.select("selected");
}

test("failed import preserves an armed explicit region mode", () => {
  const plot = createPlot();
  createSelectedFeature(plot);
  const before = plot.startBoxSelection({ intent: "add" });
  assert.equal(before.status, "armed");

  assert.throws(
    () => plot.importDocument(unknownDocument()),
    { code: "PLOTJSON_DEFINITION_NOT_FOUND" },
  );

  assert.deepEqual(plot.regionSelectionSnapshot, before);
  assert.deepEqual(plot.selectedIds, ["selected"]);
  assert.equal(plot.history.undoDepth, 1);
});

test("failed import preserves an armed selection transform", () => {
  const plot = createPlot();
  createSelectedFeature(plot);
  const before = plot.startSelectionRotation();
  assert.equal(before.status, "armed");
  assert.equal(before.kind, "rotate");

  assert.throws(
    () => plot.importDocument(unknownDocument()),
    { code: "PLOTJSON_DEFINITION_NOT_FOUND" },
  );

  assert.deepEqual(plot.selectionTransformSnapshot, before);
  assert.deepEqual(plot.selectedIds, ["selected"]);
  assert.equal(plot.history.undoDepth, 1);
});
