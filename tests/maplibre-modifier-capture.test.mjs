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

  getBoundingClientRect() {
    return { left: 100, top: 50 };
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

test("canvas pointer capture reserves Shift and restores box zoom on destroy", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition],
  });
  assert.equal(map.boxZoomEnabled, false);

  addArrow(plot, "a", 0);
  addArrow(plot, "b", 0.1);
  plot.select("a");
  map.targetId = "b";

  const event = {
    clientX: 110,
    clientY: 70,
    shiftKey: true,
    prevented: false,
    immediateStopped: false,
    preventDefault() {
      this.prevented = true;
    },
    stopPropagation() {},
    stopImmediatePropagation() {
      this.immediateStopped = true;
    },
  };
  map.canvas.fire("pointerdown", event);

  assert.deepEqual(map.queryPoint, { x: 10, y: 20 });
  assert.deepEqual(plot.selectedIds, ["a", "b"]);
  assert.equal(plot.selectedId, "b");
  assert.equal(event.prevented, true);
  assert.equal(event.immediateStopped, true);

  plot.destroy();
  assert.equal(map.boxZoomEnabled, true);
  assert.equal(map.canvas.listeners.get("pointerdown")?.size ?? 0, 0);
});
