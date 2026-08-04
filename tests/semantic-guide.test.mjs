import assert from "node:assert/strict";
import test from "node:test";
import { PlotLibre } from "@plotlibre/maplibre";
import { SECTOR_TYPE, sectorDefinition } from "@plotlibre/symbols";

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

function findGuide(collection) {
  return collection.features.find(
    (feature) => feature.properties?.handleKind === "semantic-guide",
  );
}

test("sector guide is transient in drafts and selected-handle rendering", () => {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [sectorDefinition],
    idFactory: () => "sector-guide",
  });
  const center = [118.8, 32.0];
  const start = [118.82, 32.0];
  const bearing = [118.8, 31.97];

  assert.equal(map.getLayer("plotlibre-handle-guide")?.type, "line");
  plot.draw(SECTOR_TYPE);
  map.fire("click", mouse(...center));
  map.fire("click", mouse(...start));
  map.fire("mousemove", mouse(...bearing));

  const draft = map.getSource("plotlibre-draft").data;
  const draftGuide = findGuide(draft);
  assert.equal(draftGuide?.geometry.type, "LineString");
  assert.deepEqual(draftGuide?.geometry.coordinates, [center, bearing]);
  assert.equal(plot.store.size, 0);

  map.fire("click", mouse(...bearing));
  assert.equal(plot.store.size, 1);
  const handles = map.getSource("plotlibre-handles").data;
  assert.equal(handles.features.length, 4);
  const selectedGuide = findGuide(handles);
  assert.deepEqual(selectedGuide?.geometry.coordinates, [center, bearing]);

  const serialized = plot.exportJson("guide-doc", "Guide Document");
  assert.equal(serialized.includes("semantic-guide"), false);
  assert.equal(serialized.includes("plotlibre-handle-guide"), false);
});
