import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlotDocument,
  createPlotFeature,
  parsePlotDocument,
  PlotRegistry,
  serializePlotDocument,
} from "@plotlibre/core";
import {
  buildCorridorRing,
  buildPathRibbonFrame,
  buildRouteArrowRing,
  createLocalProjection,
  isSimpleRing,
  resolveCorridorParameters,
  resolveRouteArrowParameters,
  ringWinding,
  signedRingArea,
} from "@plotlibre/geometry";
import {
  builtInSymbols,
  CORRIDOR_ARROW_TYPE,
  corridorArrowDefinition,
  ROUTE_ARROW_TYPE,
  routeArrowDefinition,
} from "@plotlibre/symbols";

const controls = [
  [118.72, 32.02],
  [118.75, 32.055],
  [118.79, 32.085],
];

function assertPositionClose(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual[0] - expected[0]) <= tolerance);
  assert.ok(Math.abs(actual[1] - expected[1]) <= tolerance);
}

function localRing(ring, origin = controls[0]) {
  const projection = createLocalProjection(origin);
  return ring.map((position) => projection.project(position));
}

test("path ribbon derives one constant width from an authored center path", () => {
  const frame = buildPathRibbonFrame(controls, { widthPathRatio: 0.05 });
  assert.equal(frame.centerline.length, frame.left.length);
  assert.equal(frame.centerline.length, frame.right.length);
  assert.ok(frame.widthMeters > 0);
  assert.ok(Math.abs(frame.widthMeters - frame.totalLengthMeters * 0.05) < 1e-9);
});

test("route arrow supports two controls and preserves the exact terminal tip", () => {
  const minimum = [
    [118.72, 32.02],
    [118.81, 32.1],
  ];
  const ring = buildRouteArrowRing(minimum);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(ring.some((position) => {
    try {
      assertPositionClose(position, minimum[1]);
      return true;
    } catch {
      return false;
    }
  }));
  const local = localRing(ring, minimum[0]);
  assert.equal(ringWinding(local), "counterclockwise");
  assert.equal(isSimpleRing(local, 1e-6), true);
});

test("route arrow responds to an interior path control", () => {
  const straight = buildRouteArrowRing([
    [0, 0],
    [0, 0.01],
  ]);
  const curved = buildRouteArrowRing([
    [0, 0],
    [0.0015, 0.005],
    [0, 0.01],
  ]);
  assert.notDeepEqual(straight, curved);
});

test("route arrow area responds to ribbon width", () => {
  const line = [
    [0, 0],
    [0, 0.02],
  ];
  const projection = createLocalProjection(line[0]);
  const narrow = buildRouteArrowRing(line, { widthPathRatio: 0.015 }).map((point) =>
    projection.project(point),
  );
  const wide = buildRouteArrowRing(line, { widthPathRatio: 0.045 }).map((point) =>
    projection.project(point),
  );
  assert.ok(Math.abs(signedRingArea(wide)) > Math.abs(signedRingArea(narrow)));
});

test("corridor supports two controls as a finite simple flat-ended ribbon", () => {
  const minimum = [
    [118.72, 32.02],
    [118.81, 32.1],
  ];
  const ring = buildCorridorRing(minimum);
  const local = localRing(ring, minimum[0]);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(local), "counterclockwise");
  assert.equal(isSimpleRing(local, 1e-6), true);
  for (const position of ring) {
    assert.equal(Number.isFinite(position[0]), true);
    assert.equal(Number.isFinite(position[1]), true);
  }
});

test("corridor responds to an interior path control", () => {
  const straight = buildCorridorRing([
    [0, 0],
    [0, 0.01],
  ]);
  const curved = buildCorridorRing([
    [0, 0],
    [0.0015, 0.005],
    [0, 0.01],
  ]);
  assert.notDeepEqual(straight, curved);
});

test("corridor area responds to ribbon width", () => {
  const line = [
    [0, 0],
    [0, 0.02],
  ];
  const projection = createLocalProjection(line[0]);
  const narrow = buildCorridorRing(line, { widthPathRatio: 0.03 }).map((point) =>
    projection.project(point),
  );
  const wide = buildCorridorRing(line, { widthPathRatio: 0.09 }).map((point) =>
    projection.project(point),
  );
  assert.ok(Math.abs(signedRingArea(wide)) > Math.abs(signedRingArea(narrow)) * 2);
});

test("route and corridor are independently registered and generate render roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(ROUTE_ARROW_TYPE), true);
  assert.equal(registry.has(CORRIDOR_ARROW_TYPE), true);

  for (const [plotType, definition] of [
    [ROUTE_ARROW_TYPE, routeArrowDefinition],
    [CORRIDOR_ARROW_TYPE, corridorArrowDefinition],
  ]) {
    const feature = createPlotFeature({
      id: `${plotType}-1`,
      plotType,
      definitionVersion: definition.version,
      controlPoints: controls,
      parameters: definition.defaultParameters,
    });
    const bundle = registry.generate(feature);
    assert.equal(bundle.fills.length, 1);
    assert.equal(bundle.lines.length, 1);
    assert.equal(bundle.hitAreas.length, 1);
    assert.equal(bundle.fills[0]?.properties.plotType, plotType);
  }
});

test("path symbols reject degenerate controls and invalid parameters", () => {
  assert.throws(() => buildRouteArrowRing([[0, 0], [0, 0]]), /distinct control points/);
  assert.throws(
    () => resolveRouteArrowParameters({ headLengthPathRatio: 0.9 }),
    /headLengthPathRatio must be between/,
  );
  assert.throws(() => buildCorridorRing([[0, 0]]), /at least two control points/);
  assert.throws(
    () => resolveCorridorParameters({ widthPathRatio: 0.5 }),
    /widthPathRatio must be between/,
  );
});

test("PlotJSON preserves only authored route and corridor center paths", () => {
  const route = createPlotFeature({
    id: "route-json",
    plotType: ROUTE_ARROW_TYPE,
    definitionVersion: routeArrowDefinition.version,
    controlPoints: controls,
    parameters: routeArrowDefinition.defaultParameters,
  });
  const corridor = createPlotFeature({
    id: "corridor-json",
    plotType: CORRIDOR_ARROW_TYPE,
    definitionVersion: corridorArrowDefinition.version,
    controlPoints: controls,
    parameters: corridorArrowDefinition.defaultParameters,
  });
  const document = createPlotDocument({
    id: "path-symbol-document",
    name: "Route and Corridor",
    features: [route, corridor],
  });
  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.deepEqual(parsed.features[0]?.controlPoints, controls);
  assert.deepEqual(parsed.features[1]?.controlPoints, controls);
});
