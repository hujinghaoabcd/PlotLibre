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
  focused = false;

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

  focus() {
    this.focused = true;
  }
}

class FakeMap {
  sources = new Map();
  layers = new Map();
  listeners = new Map();
  canvas = new FakeCanvas();
  queryHandler = () => [];
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

  queryRenderedFeatures(point, options) {
    return this.queryHandler(point, options);
  }
}

function mouse(lng, lat) {
  return {
    lngLat: { lng, lat },
    point: { x: lng, y: lat },
    originalEvent: {
      preventDefault() {},
      stopPropagation() {},
    },
  };
}

function createPlot(map = new FakeMap()) {
  return {
    map,
    plot: new PlotLibre(map, {
      definitions: [straightArrowDefinition],
      idFactory: () => "generated-arrow",
    }),
  };
}

test("MapLibre adapter renders and removes a parametric arrow", () => {
  const { map, plot } = createPlot();

  plot.create({
    id: "arrow-1",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.84, 32.09],
    ],
  });

  const source = map.getSource("plotlibre-committed");
  assert.equal(source.data.features.length, 2);
  assert.equal(plot.store.size, 1);

  plot.remove("arrow-1");
  assert.equal(source.data.features.length, 0);
  assert.equal(plot.undo(), true);
  assert.equal(source.data.features.length, 2);

  plot.destroy();
  assert.equal(map.sources.size, 0);
  assert.equal(map.layers.size, 0);
});

test("interactive two-point drawing previews, completes and selects an arrow", () => {
  const { map, plot } = createPlot();
  const id = plot.draw(STRAIGHT_ARROW_TYPE);
  assert.equal(id, "generated-arrow");
  assert.equal(map.canvas.style.cursor, "crosshair");

  map.fire("click", mouse(118.78, 32.04));
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 0);

  map.fire("mousemove", mouse(118.84, 32.09));
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 2);

  map.fire("click", mouse(118.84, 32.09));
  assert.equal(plot.store.size, 1);
  assert.equal(plot.interaction.selectedId, "generated-arrow");
  assert.equal(map.getSource("plotlibre-committed").data.features.length, 2);
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 0);
  assert.equal(map.getSource("plotlibre-handles").data.features.length, 2);
  assert.equal(map.canvas.style.cursor, "grab");
});

test("Escape cancels an active draw session without creating a feature", () => {
  const { map, plot } = createPlot();
  plot.draw(STRAIGHT_ARROW_TYPE, { id: "cancelled-arrow" });
  map.fire("click", mouse(118.78, 32.04));
  map.fire("mousemove", mouse(118.84, 32.09));
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 2);

  map.canvas.fire("keydown", {
    key: "Escape",
    preventDefault() {},
  });

  assert.equal(plot.store.size, 0);
  assert.equal(plot.interaction.isDrawing, false);
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 0);
  assert.equal(map.canvas.style.cursor, "");
});

test("dragging a semantic handle commits one replace command and supports undo", () => {
  const { map, plot } = createPlot();
  const originalEnd = [118.84, 32.09];
  plot.create({
    id: "arrow-1",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [[118.78, 32.04], originalEnd],
  });
  plot.select("arrow-1");

  map.queryHandler = (_point, options) =>
    options?.layers?.includes("plotlibre-handle")
      ? [
          {
            properties: {
              plotId: "arrow-1",
              handleIndex: 1,
            },
          },
        ]
      : [];

  map.fire("mousedown", mouse(originalEnd[0], originalEnd[1]));
  assert.equal(map.dragPanEnabled, false);
  map.fire("mousemove", mouse(118.9, 32.12));
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 2);
  assert.equal(plot.history.undoDepth, 1);
  map.fire("mouseup", mouse(118.9, 32.12));
  assert.equal(plot.history.undoDepth, 2);

  assert.equal(map.dragPanEnabled, true);
  assert.deepEqual(plot.store.get("arrow-1").controlPoints[1], [118.9, 32.12]);
  assert.equal(plot.store.get("arrow-1").revision, 1);
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 0);

  assert.equal(plot.undo(), true);
  assert.deepEqual(plot.store.get("arrow-1").controlPoints[1], originalEnd);
});

test("clicking a committed layer selects its semantic plot", () => {
  const { map, plot } = createPlot();
  plot.create({
    id: "arrow-1",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.84, 32.09],
    ],
  });

  map.queryHandler = (_point, options) =>
    options?.layers?.includes("plotlibre-fill")
      ? [{ properties: { plotId: "arrow-1" } }]
      : [];
  map.fire("click", mouse(118.8, 32.06));

  assert.equal(plot.interaction.selectedId, "arrow-1");
  assert.equal(map.getSource("plotlibre-handles").data.features.length, 2);
});

test("style.load restores sources, layers, committed plots and handles", () => {
  const { map, plot } = createPlot();
  plot.create({
    id: "arrow-1",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.84, 32.09],
    ],
  });
  plot.select("arrow-1");

  map.sources.clear();
  map.layers.clear();
  map.fire("style.load");

  assert.equal(map.sources.size, 3);
  assert.equal(map.layers.size, 7);
  assert.equal(map.getSource("plotlibre-committed").data.features.length, 2);
  assert.equal(map.getSource("plotlibre-handles").data.features.length, 2);
});
