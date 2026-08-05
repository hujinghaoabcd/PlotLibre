import assert from "node:assert/strict";
import test from "node:test";
import { PlotJsonMigrationRegistry } from "@plotlibre/core";
import { PlotLibre } from "@plotlibre/maplibre";
import {
  curvedArrowDefinition,
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

function feature(id, overrides = {}) {
  return {
    id,
    plotType: STRAIGHT_ARROW_TYPE,
    definitionVersion: straightArrowDefinition.version,
    controlPoints: [
      [118.78, 32.04],
      [118.84, 32.09],
    ],
    parameters: {},
    style: {},
    metadata: {},
    revision: 0,
    ...overrides,
  };
}

function document(features) {
  return {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: "import-document",
    name: "Import",
    features,
    metadata: {},
  };
}

function createPlot(options = {}) {
  const map = new FakeMap();
  const plot = new PlotLibre(map, {
    definitions: [straightArrowDefinition, curvedArrowDefinition],
    idFactory: () => "draft-id",
    ...options,
  });
  return { map, plot };
}

test("successful import replaces the exact document in one Store batch", () => {
  const { map, plot } = createPlot();
  plot.create({
    id: "old-a",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [[118.7, 32.0], [118.8, 32.1]],
  });
  plot.create({
    id: "reuse-b",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [[118.71, 32.01], [118.81, 32.11]],
  });
  plot.select("old-a");
  assert.equal(plot.history.undoDepth, 2);

  const changes = [];
  plot.store.subscribe((change) => changes.push(change));
  const result = plot.importDocumentWithReport(
    document([
      feature("reuse-b", {
        controlPoints: [[118.75, 32.05], [118.86, 32.16]],
        revision: 9,
      }),
      feature("new-c", {
        controlPoints: [[118.76, 32.06], [118.88, 32.18]],
        revision: 3,
      }),
    ]),
  );

  assert.deepEqual(plot.store.list().map(({ id }) => id), ["reuse-b", "new-c"]);
  assert.equal(plot.store.get("reuse-b").revision, 9);
  assert.equal(plot.store.get("new-c").revision, 3);
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0], {
    type: "batch",
    ids: ["old-a", "reuse-b", "new-c"],
    addedIds: ["new-c"],
    updatedIds: ["reuse-b"],
    removedIds: ["old-a"],
  });
  assert.deepEqual(plot.selectedIds, []);
  assert.equal(plot.history.undoDepth, 0);
  assert.equal(plot.history.redoDepth, 0);
  assert.equal(map.getSource("plotlibre-committed").data.features.length, 4);
  assert.equal(Object.isFrozen(result.document), true);
  assert.equal(Object.isFrozen(result.report), true);
});

test("compatibility importDocument returns only the prepared current document", () => {
  const { plot } = createPlot();
  const imported = plot.importDocument(document([feature("new-a")]));
  assert.equal(imported.id, "import-document");
  assert.deepEqual(imported.features.map(({ id }) => id), ["new-a"]);
  assert.deepEqual(plot.store.list(), imported.features);
});

test("Definition rename migrations are configured once on PlotLibre", () => {
  const migrations = new PlotJsonMigrationRegistry().registerDefinition({
    from: { plotType: "arrow.legacy", definitionVersion: "0.5.0" },
    to: {
      plotType: STRAIGHT_ARROW_TYPE,
      definitionVersion: straightArrowDefinition.version,
    },
    migrate(input) {
      return {
        ...input,
        plotType: STRAIGHT_ARROW_TYPE,
        definitionVersion: straightArrowDefinition.version,
      };
    },
  });
  const { plot } = createPlot({ migrations });

  const result = plot.importDocumentWithReport(
    document([
      feature("legacy-a", {
        plotType: "arrow.legacy",
        definitionVersion: "0.5.0",
      }),
    ]),
  );

  assert.equal(plot.migrations, migrations);
  assert.equal(plot.store.get("legacy-a").plotType, STRAIGHT_ARROW_TYPE);
  assert.equal(result.report.featureSteps.length, 1);
  assert.equal(result.report.featureSteps[0].source.plotType, "arrow.legacy");
  assert.equal(result.report.featureSteps[0].target.plotType, STRAIGHT_ARROW_TYPE);
});

test("reader or Registry preflight failure preserves Store, order, selection and History", () => {
  const { plot } = createPlot();
  plot.create({
    id: "old-a",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [[118.7, 32.0], [118.8, 32.1]],
  });
  plot.create({
    id: "old-b",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [[118.71, 32.01], [118.81, 32.11]],
  });
  plot.select("old-b");
  const beforeStore = plot.store.list();
  const beforeSelection = plot.selection.snapshot();
  const beforeUndo = plot.history.undoDepth;
  const changes = [];
  plot.store.subscribe((change) => changes.push(change));

  assert.throws(
    () =>
      plot.importDocument(
        document([
          feature("bad", {
            plotType: "arrow.unknown",
            definitionVersion: "1.0.0",
          }),
        ]),
      ),
    { code: "PLOTJSON_DEFINITION_NOT_FOUND" },
  );
  assert.deepEqual(plot.store.list(), beforeStore);
  assert.deepEqual(plot.selection.snapshot(), beforeSelection);
  assert.equal(plot.history.undoDepth, beforeUndo);
  assert.deepEqual(changes, []);

  assert.throws(
    () =>
      plot.importDocument(
        document([
          feature("bad-geometry", {
            controlPoints: [[118.7, 32.0], [118.7, 32.0]],
          }),
        ]),
      ),
  );
  assert.deepEqual(plot.store.list(), beforeStore);
  assert.deepEqual(plot.selection.snapshot(), beforeSelection);
  assert.equal(plot.history.undoDepth, beforeUndo);
  assert.deepEqual(changes, []);
});

test("failed import preserves an active drawing session and its draft", () => {
  const { map, plot } = createPlot();
  plot.draw(STRAIGHT_ARROW_TYPE, { id: "active-draft" });
  map.fire("click", mouse(118.7, 32.0));
  map.fire("mousemove", mouse(118.8, 32.1));
  const draftBefore = map.getSource("plotlibre-draft").data;

  assert.throws(
    () =>
      plot.importDocument(
        document([
          feature("bad", {
            plotType: "arrow.unknown",
            definitionVersion: "1.0.0",
          }),
        ]),
      ),
    { code: "PLOTJSON_DEFINITION_NOT_FOUND" },
  );

  assert.equal(plot.interaction.isDrawing, true);
  assert.deepEqual(map.getSource("plotlibre-draft").data, draftBefore);
  assert.equal(plot.store.size, 0);
  assert.equal(plot.history.undoDepth, 0);
});

test("successful import cancels active drawing only after Store commit", () => {
  const { map, plot } = createPlot();
  plot.draw(STRAIGHT_ARROW_TYPE, { id: "active-draft" });
  map.fire("click", mouse(118.7, 32.0));
  map.fire("mousemove", mouse(118.8, 32.1));
  assert.equal(plot.interaction.isDrawing, true);

  plot.importDocument(document([feature("imported")]));
  assert.equal(plot.interaction.isDrawing, false);
  assert.equal(map.getSource("plotlibre-draft").data.features.length, 0);
  assert.deepEqual(plot.store.list().map(({ id }) => id), ["imported"]);
});

test("configured PlotJSON limits fail before application-state mutation", () => {
  const { plot } = createPlot({ plotJsonLimits: { features: 1 } });
  plot.create({
    id: "old",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [[118.7, 32.0], [118.8, 32.1]],
  });
  const before = plot.store.list();

  assert.throws(
    () => plot.importDocument(document([feature("a"), feature("b")])),
    { code: "PLOTJSON_RESOURCE_LIMIT_EXCEEDED", limitName: "features" },
  );
  assert.deepEqual(plot.store.list(), before);
  assert.equal(plot.history.undoDepth, 1);
});
