import assert from "node:assert/strict";
import test from "node:test";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  DOUBLE_ARROW_TYPE,
  doubleArrowDefinition,
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
  queryHandler = () => [];
  dragPanEnabled = true;
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

function createPlot() {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [doubleArrowDefinition],
    idFactory: () => "generated-double-arrow",
  });
  return { map, plot };
}

const controls = [
  [-0.001, 0],
  [0.001, 0],
  [-0.004, 0.012],
  [0.004, 0.012],
];

test("fixed-four double-arrow drawing previews immediately after the third click and auto-completes", () => {
  const { map, plot } = createPlot();
  plot.draw(DOUBLE_ARROW_TYPE, { id: "double-draw" });

  assert.equal(map.doubleClickZoomEnabled, false);
  map.fire("click", mouse(...controls[0]));
  map.fire("click", mouse(...controls[1]));
  map.fire("click", mouse(...controls[2]));
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 2);
  assert.equal(plot.store.size, 0);

  map.fire("mousemove", mouse(...controls[3]));
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 2);
  assert.equal(plot.store.size, 0);

  map.fire("click", mouse(...controls[3]));
  assert.equal(plot.interaction.isDrawing, false);
  assert.equal(plot.store.size, 1);
  assert.equal(plot.interaction.selectedId, "double-draw");
  assert.deepEqual(plot.store.get("double-draw").controlPoints, controls);
  assert.equal(
    plot.store.get("double-draw").plotType,
    DOUBLE_ARROW_TYPE,
  );
  assert.equal(
    map.getSource("plotlibre-committed").data.features.length,
    2,
  );
  assert.equal(map.getSource("plotlibre-handles").data.features.length, 4);
  assert.equal(map.doubleClickZoomEnabled, true);
});

test("dragging a double-arrow objective creates one replace command and undo restores it", () => {
  const { map, plot } = createPlot();
  const originalObjective = controls[3];
  const movedObjective = [0.005, 0.0125];
  plot.create({
    id: "double-edit",
    plotType: DOUBLE_ARROW_TYPE,
    controlPoints: controls,
  });
  plot.select("double-edit");

  map.queryHandler = (_point, options) =>
    options?.layers?.includes("plotlibre-handle")
      ? [
          {
            properties: {
              plotId: "double-edit",
              handleIndex: 3,
            },
          },
        ]
      : [];

  map.fire("mousedown", mouse(...originalObjective));
  map.fire("mousemove", mouse(...movedObjective));
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 2);
  assert.equal(plot.history.undoDepth, 1);
  map.fire("mouseup", mouse(...movedObjective));

  assert.equal(plot.history.undoDepth, 2);
  assert.deepEqual(
    plot.store.get("double-edit").controlPoints[3],
    movedObjective,
  );
  assert.equal(plot.store.get("double-edit").revision, 1);
  assert.equal(map.getSource("plotlibre-handles").data.features.length, 4);
  assert.equal(plot.undo(), true);
  assert.deepEqual(
    plot.store.get("double-edit").controlPoints[3],
    originalObjective,
  );
});
