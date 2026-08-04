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
  targetId = undefined;
  queryPoint = undefined;
  boxZoomEnabled = true;
  boxZoom = {
    disable: () => {
      this.boxZoomEnabled = false;
    },
    enable: () => {
      this.boxZoomEnabled = true;
    },
    isEnabled: () => this.boxZoomEnabled,
  };
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

  queryRenderedFeatures(point) {
    this.queryPoint = point;
    return this.targetId === undefined
      ? []
      : [{ properties: { plotId: this.targetId } }];
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

function mouseEvent(modifiers) {
  return {
    lngLat: { lng: 118.8, lat: 32 },
    point: { x: 10, y: 20 },
    originalEvent: {
      ...modifiers,
      prevented: false,
      stopped: false,
      preventDefault() {
        this.prevented = true;
      },
      stopPropagation() {
        this.stopped = true;
      },
    },
  };
}

test("MapLibre mousedown reserves Shift and restores box zoom on destroy", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });
  assert.equal(map.boxZoomEnabled, false);

  addArrow(plot, "a", 0);
  addArrow(plot, "b", 0.1);
  plot.select("a");
  map.targetId = "b";

  const event = mouseEvent({ shiftKey: true });
  map.fire("mousedown", event);

  assert.deepEqual(map.queryPoint, { x: 10, y: 20 });
  assert.deepEqual(plot.selectedIds, ["a", "b"]);
  assert.equal(plot.selectedId, "b");
  assert.equal(event.originalEvent.prevented, true);
  assert.equal(event.originalEvent.stopped, true);

  // A later Shift click remains idempotent.
  map.fire("click", mouseEvent({ shiftKey: true }));
  assert.deepEqual(plot.selectedIds, ["a", "b"]);

  plot.destroy();
  assert.equal(map.boxZoomEnabled, true);
  assert.equal(map.listeners.get("mousedown")?.size ?? 0, 0);
});

test("Ctrl remains click-driven and is not double-toggled on mousedown", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });
  addArrow(plot, "a", 0);
  addArrow(plot, "b", 0.1);
  plot.select("a");
  map.targetId = "b";

  map.fire("mousedown", mouseEvent({ ctrlKey: true }));
  assert.deepEqual(plot.selectedIds, ["a"]);
  map.fire("click", mouseEvent({ ctrlKey: true }));
  assert.deepEqual(plot.selectedIds, ["a", "b"]);

  plot.destroy();
});
