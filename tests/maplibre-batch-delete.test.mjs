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
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  focus() {}
}

class FakeMap {
  sources = new Map();
  layers = new Map();
  listeners = new Map();
  canvas = new FakeCanvas();
  dragPan = {
    disable() {},
    enable() {},
    isEnabled: () => true,
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

  getCanvas() {
    return this.canvas;
  }

  queryRenderedFeatures() {
    return [];
  }
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

function documentIds(plot) {
  return plot.store.list().map((feature) => feature.id);
}

test("Delete performs one atomic batch and undo restores order and selection", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });
  addArrow(plot, "a", 0);
  addArrow(plot, "b", 0.1);
  addArrow(plot, "c", 0.2);

  plot.selection.replace(["c", "b"], "b");
  const selectionReasons = [];
  plot.selection.subscribe((change) => selectionReasons.push(change.reason));
  assert.equal(plot.history.undoDepth, 3);

  let prevented = false;
  map.canvas.fire("keydown", {
    key: "Delete",
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.deepEqual(documentIds(plot), ["a"]);
  assert.deepEqual(plot.selectedIds, []);
  assert.equal(plot.history.undoDepth, 4);
  assert.equal(map.getSource("plotlibre-selection").data.features.length, 0);
  assert.equal(map.getSource("plotlibre-handles").data.features.length, 0);

  assert.equal(plot.undo(), true);
  assert.deepEqual(documentIds(plot), ["a", "b", "c"]);
  assert.deepEqual(plot.selectedIds, ["c", "b"]);
  assert.equal(plot.selectedId, "b");
  assert.ok(map.getSource("plotlibre-selection").data.features.length >= 2);
  assert.equal(
    map.getSource("plotlibre-handles").data.features.every(
      (feature) => feature.properties.plotId === "b",
    ),
    true,
  );

  assert.equal(plot.redo(), true);
  assert.deepEqual(documentIds(plot), ["a"]);
  assert.deepEqual(plot.selectedIds, []);
  assert.deepEqual(selectionReasons, [
    "history-execute",
    "history-undo",
    "history-redo",
  ]);
  assert.equal(plot.removeSelected(), false);

  plot.destroy();
});
