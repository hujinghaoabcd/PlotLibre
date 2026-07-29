import assert from "node:assert/strict";
import test from "node:test";
import { PlotLibre } from "@plotlibre/maplibre";

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
  dragPan = {
    disable() {},
    enable() {},
    isEnabled() {
      return true;
    },
  };
  doubleClickZoom = {
    enabled: true,
    disable() {
      this.enabled = false;
    },
    enable() {
      this.enabled = true;
    },
    isEnabled() {
      return this.enabled;
    },
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

  queryRenderedFeatures() {
    return [];
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

const reliabilityDefinition = {
  type: "test.render-reliability",
  title: "Render reliability test",
  category: "test",
  version: "1.0.0",
  controlSchema: {
    minPoints: 2,
    maxPoints: 2,
    completeOnDoubleClick: false,
    allowPointInsertion: false,
    allowPointRemoval: false,
  },
  defaultParameters: {},
  defaultStyle: {},
  generate({ feature }) {
    const end = feature.controlPoints[1];
    if (!end || end[0] === 1) {
      throw new RangeError("Synthetic non-renderable candidate.");
    }
    return {
      fills: [],
      lines: [
        {
          type: "Feature",
          id: `${feature.id}:line`,
          geometry: {
            type: "LineString",
            coordinates: feature.controlPoints,
          },
          properties: {
            plotId: feature.id,
            plotType: feature.plotType,
            role: "line",
          },
        },
      ],
      points: [],
      labels: [],
      hitAreas: [],
    };
  },
};

test("programmatic create and replace reject non-renderable geometry before Store mutation", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, { definitions: [reliabilityDefinition] });

  assert.throws(
    () =>
      plot.create({
        id: "invalid-create",
        plotType: reliabilityDefinition.type,
        controlPoints: [
          [0, 0],
          [1, 0],
        ],
      }),
    /Synthetic non-renderable candidate/,
  );
  assert.equal(plot.store.size, 0);
  assert.equal(plot.history.undoDepth, 0);

  const valid = plot.create({
    id: "valid",
    plotType: reliabilityDefinition.type,
    controlPoints: [
      [0, 0],
      [2, 0],
    ],
  });
  assert.equal(plot.store.size, 1);
  assert.equal(plot.history.undoDepth, 1);

  assert.throws(
    () =>
      plot.replace({
        ...valid,
        controlPoints: [
          [0, 0],
          [1, 0],
        ],
      }),
    /Synthetic non-renderable candidate/,
  );
  assert.deepEqual(plot.store.get("valid").controlPoints, [
    [0, 0],
    [2, 0],
  ]);
  assert.equal(plot.history.undoDepth, 1);
});

test("interactive drawing preserves the last valid draft and retries rejected completion", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [reliabilityDefinition],
    idFactory: () => "interactive",
  });

  plot.draw(reliabilityDefinition.type);
  map.fire("click", mouse(0, 0));
  map.fire("mousemove", mouse(2, 0));

  const draftSource = map.getSource("plotlibre-draft");
  assert.equal(draftSource.data.features.length, 1);
  assert.deepEqual(draftSource.data.features[0].geometry.coordinates, [
    [0, 0],
    [2, 0],
  ]);

  map.fire("mousemove", mouse(1, 0));
  assert.equal(draftSource.data.features.length, 1);
  assert.deepEqual(draftSource.data.features[0].geometry.coordinates, [
    [0, 0],
    [2, 0],
  ]);

  map.fire("click", mouse(1, 0));
  assert.equal(plot.store.size, 0);
  assert.equal(plot.interaction.isDrawing, true);
  assert.equal(draftSource.data.features.length, 1);

  map.fire("mousemove", mouse(3, 0));
  map.fire("click", mouse(3, 0));
  assert.equal(plot.store.size, 1);
  assert.equal(plot.interaction.isDrawing, false);
  assert.deepEqual(plot.store.get("interactive").controlPoints, [
    [0, 0],
    [3, 0],
  ]);
});
