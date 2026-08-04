import assert from "node:assert/strict";
import test from "node:test";
import { PlotStore, emptyRenderBundle } from "@plotlibre/core";
import {
  MapLibreSelectionRegionResolver,
  SelectionRegionResolutionError,
} from "@plotlibre/maplibre";

const TRIANGLE = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 0, y: 10 },
  { x: 0, y: 0 },
];
const BOUNDS = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

function createStore(ids = ["a", "b", "c"]) {
  const store = new PlotStore();
  for (const [index, id] of ids.entries()) {
    store.add({
      id,
      plotType: "test.region-resolver",
      controlPoints: [[index, index]],
    });
  }
  return store;
}

function pointFeature(id, x, y, role = "point") {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [x, y] },
    properties: {
      plotId: id,
      plotType: "test.region-resolver",
      role,
    },
  };
}

function lineFeature(id, coordinates) {
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates },
    properties: {
      plotId: id,
      plotType: "test.region-resolver",
      role: "line",
    },
  };
}

function polygonFeature(id, coordinates) {
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates },
    properties: {
      plotId: id,
      plotType: "test.region-resolver",
      role: "fill",
    },
  };
}

function bundle({ fills = [], lines = [], points = [], labels = [], hitAreas = [] } = {}) {
  return { fills, lines, points, labels, hitAreas };
}

function createMap(rendered, project = ([x, y]) => ({ x, y })) {
  const queries = [];
  return {
    queries,
    queryRenderedFeatures(geometry, options) {
      queries.push({ geometry, options });
      return rendered;
    },
    project,
  };
}

function createRegistry(bundles, generated = []) {
  return {
    generate(feature) {
      generated.push(feature.id);
      const result = bundles[feature.id];
      if (result instanceof Error) throw result;
      if (result === undefined) return emptyRenderBundle();
      return result;
    },
  };
}

test("resolver deduplicates broad-phase ids and returns exact hits in Store order", () => {
  const store = createStore(["a", "b", "c"]);
  const map = createMap([
    { properties: { plotId: "c" } },
    { properties: { plotId: "a" } },
    { properties: { plotId: "a" } },
    { properties: { plotId: "missing" } },
    { properties: { plotId: 42 } },
  ]);
  const generated = [];
  const registry = createRegistry({
    a: bundle({ points: [pointFeature("a", 2, 2)] }),
    c: bundle({ lines: [lineFeature("c", [[-2, 5], [4, 5]])] }),
  }, generated);

  const result = new MapLibreSelectionRegionResolver(
    map,
    store,
    registry,
  ).resolve(TRIANGLE, BOUNDS);

  assert.deepEqual(result.ids, ["a", "c"]);
  assert.deepEqual(generated, ["a", "c"]);
  assert.deepEqual(result.metrics, {
    queriedFeatureCount: 5,
    uniqueRenderedPlotIdCount: 3,
    candidateCount: 2,
    generatedCandidateCount: 2,
    projectedGeometryCount: 2,
  });
  assert.deepEqual(map.queries, [{
    geometry: [[0, 0], [10, 10]],
    options: { layers: ["plotlibre-fill", "plotlibre-line", "plotlibre-point"] },
  }]);
});

test("exact narrow phase removes bounding-box false positives", () => {
  const store = createStore(["a", "b"]);
  const map = createMap([
    { properties: { plotId: "b" } },
    { properties: { plotId: "a" } },
  ]);
  const registry = createRegistry({
    a: bundle({ points: [pointFeature("a", 2, 2)] }),
    b: bundle({ points: [pointFeature("b", 8, 8)] }),
  });

  const result = new MapLibreSelectionRegionResolver(
    map,
    store,
    registry,
  ).resolve(TRIANGLE, BOUNDS);
  assert.deepEqual(result.ids, ["a"]);
});

test("resolver selects polygon containment and respects holes", () => {
  const store = createStore(["contains", "hole"]);
  const map = createMap([
    { properties: { plotId: "hole" } },
    { properties: { plotId: "contains" } },
  ]);
  const exterior = [
    [-10, -10], [20, -10], [20, 20], [-10, 20], [-10, -10],
  ];
  const hole = [
    [-1, -1], [11, -1], [11, 11], [-1, 11], [-1, -1],
  ];
  const registry = createRegistry({
    contains: bundle({ fills: [polygonFeature("contains", [exterior])] }),
    hole: bundle({ fills: [polygonFeature("hole", [exterior, hole])] }),
  });

  const result = new MapLibreSelectionRegionResolver(
    map,
    store,
    registry,
  ).resolve(TRIANGLE, BOUNDS);
  assert.deepEqual(result.ids, ["contains"]);
});

test("labels and hit areas are not selectable region geometry", () => {
  const store = createStore(["a"]);
  const map = createMap([{ properties: { plotId: "a" } }]);
  const registry = createRegistry({
    a: bundle({
      labels: [pointFeature("a", 2, 2, "label")],
      hitAreas: [polygonFeature("a", [[
        [0, 0], [4, 0], [4, 4], [0, 4], [0, 0],
      ]])],
    }),
  });

  const result = new MapLibreSelectionRegionResolver(
    map,
    store,
    registry,
  ).resolve(TRIANGLE, BOUNDS);
  assert.deepEqual(result.ids, []);
  assert.equal(result.metrics.projectedGeometryCount, 0);
});

test("custom committed layer ids are passed to MapLibre query", () => {
  const store = createStore([]);
  const map = createMap([]);
  const registry = createRegistry({});
  new MapLibreSelectionRegionResolver(map, store, registry, {
    layerIds: { fill: "f", line: "l", point: "p" },
  }).resolve(TRIANGLE, BOUNDS);
  assert.deepEqual(map.queries[0].options.layers, ["f", "l", "p"]);
});

test("missing or failing rendered query rejects with a stable code", () => {
  const store = createStore([]);
  const registry = createRegistry({});
  assert.throws(
    () => new MapLibreSelectionRegionResolver({}, store, registry).resolve(TRIANGLE, BOUNDS),
    (error) =>
      error instanceof SelectionRegionResolutionError &&
      error.code === "SELECTION_REGION_QUERY_FAILED",
  );

  const map = {
    queryRenderedFeatures() {
      throw new Error("query failed");
    },
    project([x, y]) {
      return { x, y };
    },
  };
  assert.throws(
    () => new MapLibreSelectionRegionResolver(map, store, registry).resolve(TRIANGLE, BOUNDS),
    (error) =>
      error instanceof SelectionRegionResolutionError &&
      error.code === "SELECTION_REGION_QUERY_FAILED" &&
      error.cause instanceof Error,
  );
});

test("one candidate generation failure rejects instead of returning partial ids", () => {
  const store = createStore(["a", "b"]);
  const map = createMap([
    { properties: { plotId: "a" } },
    { properties: { plotId: "b" } },
  ]);
  const registry = createRegistry({
    a: bundle({ points: [pointFeature("a", 2, 2)] }),
    b: new Error("cannot generate"),
  });

  assert.throws(
    () => new MapLibreSelectionRegionResolver(map, store, registry).resolve(TRIANGLE, BOUNDS),
    (error) =>
      error instanceof SelectionRegionResolutionError &&
      error.code === "SELECTION_REGION_CANDIDATE_GENERATION_FAILED" &&
      error.plotId === "b",
  );
});

test("missing, thrown and non-finite projection reject with plot identity", () => {
  const store = createStore(["a"]);
  const rendered = [{ properties: { plotId: "a" } }];
  const registry = createRegistry({
    a: bundle({ points: [pointFeature("a", 2, 2)] }),
  });

  for (const map of [
    { queryRenderedFeatures: () => rendered },
    {
      queryRenderedFeatures: () => rendered,
      project: () => { throw new Error("projection failed"); },
    },
    {
      queryRenderedFeatures: () => rendered,
      project: () => ({ x: Number.NaN, y: 2 }),
    },
  ]) {
    assert.throws(
      () => new MapLibreSelectionRegionResolver(map, store, registry).resolve(TRIANGLE, BOUNDS),
      (error) =>
        error instanceof SelectionRegionResolutionError &&
        error.code === "SELECTION_REGION_PROJECTION_FAILED" &&
        error.plotId === "a",
    );
  }
});
