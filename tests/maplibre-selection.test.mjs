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
  targetId = undefined;
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

  fire(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  getCanvas() {
    return this.canvas;
  }

  queryRenderedFeatures(_point, options) {
    if (
      this.targetId !== undefined &&
      (options?.layers?.includes("plotlibre-fill") ||
        options?.layers?.includes("plotlibre-line"))
    ) {
      return [{ properties: { plotId: this.targetId } }];
    }
    return [];
  }
}

function mouse(modifiers = {}) {
  return {
    lngLat: { lng: 118.8, lat: 32 },
    point: { x: 10, y: 10 },
    originalEvent: {
      ...modifiers,
      preventDefault() {},
      stopPropagation() {},
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

test("MapLibre clicks apply normalized multi-selection intents", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });
  addArrow(plot, "a", 0);
  addArrow(plot, "b", 0.1);
  addArrow(plot, "c", 0.2);

  assert.equal(plot.selection, plot.interaction.selection);

  map.targetId = "a";
  map.fire("click", mouse());
  assert.deepEqual(plot.selectedIds, ["a"]);
  assert.equal(plot.selectedId, "a");

  map.targetId = "b";
  map.fire("click", mouse({ shiftKey: true }));
  assert.deepEqual(plot.selectedIds, ["a", "b"]);
  assert.equal(plot.selectedId, "b");

  map.targetId = "a";
  map.fire("click", mouse());
  assert.deepEqual(plot.selectedIds, ["b", "a"]);
  assert.equal(plot.selectedId, "a");

  map.targetId = "c";
  map.fire("click", mouse({ metaKey: true }));
  assert.deepEqual(plot.selectedIds, ["b", "a", "c"]);

  map.targetId = "b";
  map.fire("click", mouse({ altKey: true }));
  assert.deepEqual(plot.selectedIds, ["a", "c"]);
  assert.equal(plot.selectedId, "c");

  map.targetId = undefined;
  map.fire("click", mouse({ shiftKey: true }));
  assert.deepEqual(plot.selectedIds, ["a", "c"]);
  map.fire("click", mouse());
  assert.deepEqual(plot.selectedIds, []);

  plot.selection.replace(["a", "b"]);
  plot.select("c");
  assert.deepEqual(plot.selectedIds, ["c"]);
  assert.deepEqual(plot.interaction.selectedIds, ["c"]);
  assert.equal(map.getSource("plotlibre-handles").data.features.length, 2);

  plot.destroy();
});

test("Ctrl toggles selection and Escape clears the complete set", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });
  addArrow(plot, "a", 0);
  addArrow(plot, "b", 0.1);

  map.targetId = "a";
  map.fire("click", mouse({ ctrlKey: true }));
  map.targetId = "b";
  map.fire("click", mouse({ ctrlKey: true }));
  assert.deepEqual(plot.selectedIds, ["a", "b"]);

  map.targetId = "a";
  map.fire("click", mouse({ ctrlKey: true }));
  assert.deepEqual(plot.selectedIds, ["b"]);

  map.canvas.fire("keydown", {
    key: "Escape",
    preventDefault() {},
  });
  assert.deepEqual(plot.selectedIds, []);
  assert.equal(map.getSource("plotlibre-handles").data.features.length, 0);

  plot.destroy();
});
