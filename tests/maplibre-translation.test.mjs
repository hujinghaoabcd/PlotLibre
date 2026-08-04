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

  fire(type, event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
      if (event.immediateStopped === true) break;
    }
  }

  focus() {}
}

class FakeMap {
  sources = new Map();
  layers = new Map();
  listeners = new Map();
  canvas = new FakeCanvas();
  targetId = undefined;
  dragPanEnabled = true;
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
    disable() {},
    enable() {},
    isEnabled: () => true,
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

  queryRenderedFeatures(_point, options) {
    if (options?.layers?.includes("plotlibre-handle")) return [];
    if (this.targetId !== undefined) {
      return [{ properties: { plotId: this.targetId } }];
    }
    return [];
  }
}

function mouse(lng, lat, modifiers = {}) {
  return {
    lngLat: { lng, lat },
    point: { x: lng, y: lat },
    originalEvent: {
      ...modifiers,
      preventDefault() {},
      stopPropagation() {},
    },
  };
}

function escapeEvent() {
  return {
    key: "Escape",
    immediateStopped: false,
    preventDefault() {},
    stopImmediatePropagation() {
      this.immediateStopped = true;
    },
  };
}

function addArrow(plot, id, offset) {
  plot.create({
    id,
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [
      [118.78 + offset, 32.04],
      [118.84 + offset, 32.09],
    ],
  });
}

function controls(plot, id) {
  return plot.store.get(id).controlPoints;
}

function selectionGeometry(map) {
  return JSON.stringify(map.getSource("plotlibre-selection").data.features);
}

test("body drag previews the complete selection and commits one batch history entry", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });
  addArrow(plot, "a", 0);
  addArrow(plot, "b", 0.1);
  plot.selection.replace(["a", "b"], "b");

  const beforeA = controls(plot, "a");
  const beforeB = controls(plot, "b");
  const beforePreview = selectionGeometry(map);
  assert.equal(plot.history.undoDepth, 2);

  map.targetId = "a";
  map.fire("mousedown", mouse(118.8, 32));
  assert.equal(plot.translation.isTranslating, true);
  assert.equal(map.dragPanEnabled, false);
  assert.deepEqual(plot.selectedIds, ["b", "a"]);

  map.fire("mousemove", mouse(118.801, 32.0005));
  assert.notEqual(selectionGeometry(map), beforePreview);
  assert.deepEqual(controls(plot, "a"), beforeA);
  assert.deepEqual(controls(plot, "b"), beforeB);
  assert.equal(plot.history.undoDepth, 2);

  map.fire("mouseup", mouse(118.801, 32.0005));
  assert.equal(plot.translation.isTranslating, false);
  assert.equal(map.dragPanEnabled, true);
  assert.equal(plot.history.undoDepth, 3);
  assert.equal(plot.store.get("a").revision, 1);
  assert.equal(plot.store.get("b").revision, 1);
  assert.notDeepEqual(controls(plot, "a"), beforeA);
  assert.notDeepEqual(controls(plot, "b"), beforeB);
  assert.deepEqual(plot.selectedIds, ["b", "a"]);

  assert.equal(plot.undo(), true);
  assert.deepEqual(controls(plot, "a"), beforeA);
  assert.deepEqual(controls(plot, "b"), beforeB);
  assert.deepEqual(plot.selectedIds, ["b", "a"]);

  assert.equal(plot.redo(), true);
  assert.equal(plot.store.get("a").revision, 1);
  assert.equal(plot.store.get("b").revision, 1);
  assert.notDeepEqual(controls(plot, "a"), beforeA);
  assert.notDeepEqual(controls(plot, "b"), beforeB);

  plot.destroy();
});

test("Escape cancels a selection translation without history or selection loss", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });
  addArrow(plot, "a", 0);
  addArrow(plot, "b", 0.1);
  plot.selection.replace(["a", "b"], "b");
  const beforeA = controls(plot, "a");
  const beforeB = controls(plot, "b");

  map.targetId = "a";
  map.fire("mousedown", mouse(118.8, 32));
  map.fire("mousemove", mouse(118.802, 32.001));
  map.canvas.fire("keydown", escapeEvent());

  assert.equal(plot.translation.isTranslating, false);
  assert.equal(map.dragPanEnabled, true);
  assert.equal(plot.history.undoDepth, 2);
  assert.deepEqual(controls(plot, "a"), beforeA);
  assert.deepEqual(controls(plot, "b"), beforeB);
  assert.deepEqual(plot.selectedIds, ["b", "a"]);
  assert.equal(plot.transformRejection, undefined);

  plot.destroy();
});

test("one invalid translated feature rejects the complete batch", () => {
  const pointDefinition = {
    type: "test.point",
    version: "1.0.0",
    controlSchema: { minPoints: 1, maxPoints: 1 },
    defaultParameters: {},
    defaultStyle: {},
    validate() {
      return { valid: true, issues: [] };
    },
    generate({ feature }) {
      const id = `${feature.id}:point`;
      return {
        fills: [],
        lines: [],
        labels: [],
        points: [{
          type: "Feature",
          id,
          geometry: {
            type: "Point",
            coordinates: feature.controlPoints[0],
          },
          properties: {
            plotId: feature.id,
            plotType: feature.plotType,
            role: "point",
            plotRenderId: id,
          },
        }],
      };
    },
  };
  const map = new FakeMap();
  const plot = new PlotLibre(map, { definitions: [pointDefinition] });
  plot.create({
    id: "polar",
    plotType: "test.point",
    controlPoints: [[0, 89.9999]],
  });
  plot.select("polar");
  const before = controls(plot, "polar");

  map.targetId = "polar";
  map.fire("mousedown", mouse(0, 0));
  map.fire("mousemove", mouse(0, 0.01));

  assert.equal(
    plot.transformRejection?.code,
    "SELECTION_TRANSLATION_REJECTED",
  );
  assert.deepEqual(controls(plot, "polar"), before);
  map.fire("mouseup", mouse(0, 0.01));
  assert.equal(plot.history.undoDepth, 1);
  assert.deepEqual(controls(plot, "polar"), before);
  assert.deepEqual(plot.selectedIds, ["polar"]);

  plot.destroy();
});
