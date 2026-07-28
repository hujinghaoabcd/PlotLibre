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

class FakeMap {
  sources = new Map();
  layers = new Map();

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
}

test("MapLibre adapter renders and removes a parametric arrow", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, { definitions: [straightArrowDefinition] });

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
