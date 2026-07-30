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
  buildBidirectionalRouteRing,
  buildDoubleHeadRouteRings,
  createLocalProjection,
  isSimpleRing,
  resolveRouteMultiHeadParameters,
  ringWinding,
} from "@plotlibre/geometry";
import {
  BIDIRECTIONAL_ROUTE_ARROW_TYPE,
  bidirectionalRouteArrowDefinition,
  builtInSymbols,
  DOUBLE_HEAD_ROUTE_ARROW_TYPE,
  doubleHeadRouteArrowDefinition,
} from "@plotlibre/symbols";

const controls = [
  [118.69, 32.02],
  [118.735, 32.06],
  [118.79, 32.095],
];

function localRing(ring, origin = controls[0]) {
  const projection = createLocalProjection(origin);
  return ring.map((position) => projection.project(position));
}

function containsPosition(ring, expected, tolerance = 1e-12) {
  return ring.some(
    (position) =>
      Math.abs(position[0] - expected[0]) <= tolerance &&
      Math.abs(position[1] - expected[1]) <= tolerance,
  );
}

test("bidirectional route preserves both authored endpoints as exact tips", () => {
  const ring = buildBidirectionalRouteRing(controls);
  const local = localRing(ring);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(containsPosition(ring, controls[0]), true);
  assert.equal(containsPosition(ring, controls.at(-1)), true);
  assert.equal(ringWinding(local), "counterclockwise");
  assert.equal(isSimpleRing(local, 1e-6), true);
});

test("bidirectional route supports a two-control straight form", () => {
  const minimum = [
    [118.70, 32.01],
    [118.82, 32.11],
  ];
  const ring = buildBidirectionalRouteRing(minimum);
  assert.equal(containsPosition(ring, minimum[0]), true);
  assert.equal(containsPosition(ring, minimum[1]), true);
  assert.equal(isSimpleRing(localRing(ring, minimum[0]), 1e-6), true);
});

test("bidirectional route responds to an interior path control", () => {
  const straight = buildBidirectionalRouteRing([
    [0, 0],
    [0, 0.02],
  ]);
  const curved = buildBidirectionalRouteRing([
    [0, 0],
    [0.002, 0.01],
    [0, 0.02],
  ]);
  assert.notDeepEqual(straight, curved);
});

test("reversing a bidirectional route preserves two-tip topology", () => {
  const forward = buildBidirectionalRouteRing(controls);
  const reversedControls = [...controls].reverse();
  const reverse = buildBidirectionalRouteRing(reversedControls);
  assert.equal(forward.length, reverse.length);
  for (const ring of [forward, reverse]) {
    assert.equal(containsPosition(ring, controls[0]), true);
    assert.equal(containsPosition(ring, controls.at(-1)), true);
    assert.equal(isSimpleRing(localRing(ring), 1e-6), true);
  }
});

test("double-head route returns a primary exact-tip body and a derived secondary head", () => {
  const rings = buildDoubleHeadRouteRings(controls);
  assert.equal(containsPosition(rings.primary, controls.at(-1)), true);
  assert.equal(containsPosition(rings.secondary, controls.at(-1)), false);
  for (const ring of [rings.primary, rings.secondary]) {
    const local = localRing(ring);
    assert.deepEqual(ring[0], ring.at(-1));
    assert.equal(ringWinding(local), "counterclockwise");
    assert.equal(isSimpleRing(local, 1e-6), true);
  }
});

test("secondary-head parameters do not change the primary route body", () => {
  const compact = buildDoubleHeadRouteRings(controls, {
    secondaryHeadLengthPathRatio: 0.04,
  });
  const emphasized = buildDoubleHeadRouteRings(controls, {
    secondaryHeadLengthPathRatio: 0.09,
  });
  assert.deepEqual(compact.primary, emphasized.primary);
  assert.notDeepEqual(compact.secondary, emphasized.secondary);
});

test("route multi-head definitions are independently registered", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(BIDIRECTIONAL_ROUTE_ARROW_TYPE), true);
  assert.equal(registry.has(DOUBLE_HEAD_ROUTE_ARROW_TYPE), true);

  const bidirectional = createPlotFeature({
    id: "bidirectional-route",
    plotType: BIDIRECTIONAL_ROUTE_ARROW_TYPE,
    definitionVersion: bidirectionalRouteArrowDefinition.version,
    controlPoints: controls,
    parameters: bidirectionalRouteArrowDefinition.defaultParameters,
  });
  const doubleHead = createPlotFeature({
    id: "double-head-route",
    plotType: DOUBLE_HEAD_ROUTE_ARROW_TYPE,
    definitionVersion: doubleHeadRouteArrowDefinition.version,
    controlPoints: controls,
    parameters: doubleHeadRouteArrowDefinition.defaultParameters,
  });
  const bidirectionalBundle = registry.generate(bidirectional);
  const doubleHeadBundle = registry.generate(doubleHead);
  assert.equal(bidirectionalBundle.fills.length, 1);
  assert.equal(doubleHeadBundle.fills.length, 2);
  assert.equal(
    bidirectionalBundle.fills[0]?.properties.plotType,
    BIDIRECTIONAL_ROUTE_ARROW_TYPE,
  );
  assert.equal(
    doubleHeadBundle.fills[1]?.properties.plotType,
    DOUBLE_HEAD_ROUTE_ARROW_TYPE,
  );
});

test("route multi-head parameters and degenerate controls fail closed", () => {
  assert.throws(
    () => buildBidirectionalRouteRing([[0, 0], [0, 0]]),
    /distinct control points/,
  );
  assert.throws(
    () => buildDoubleHeadRouteRings([[0, 0], [0, 0]]),
    /distinct control points/,
  );
  assert.throws(
    () => resolveRouteMultiHeadParameters({ secondaryHeadGapPathRatio: 0 }),
    /secondaryHeadGapPathRatio must be between/,
  );
  assert.throws(
    () =>
      resolveRouteMultiHeadParameters({
        secondaryHeadHalfWidthRibbonRatio: 6,
      }),
    /secondaryHeadHalfWidthRibbonRatio must be between/,
  );
});

test("PlotJSON preserves only authored route multi-head center paths", () => {
  const features = [
    createPlotFeature({
      id: "bidirectional-json",
      plotType: BIDIRECTIONAL_ROUTE_ARROW_TYPE,
      definitionVersion: bidirectionalRouteArrowDefinition.version,
      controlPoints: controls,
      parameters: bidirectionalRouteArrowDefinition.defaultParameters,
    }),
    createPlotFeature({
      id: "double-head-json",
      plotType: DOUBLE_HEAD_ROUTE_ARROW_TYPE,
      definitionVersion: doubleHeadRouteArrowDefinition.version,
      controlPoints: controls,
      parameters: doubleHeadRouteArrowDefinition.defaultParameters,
    }),
  ];
  const document = createPlotDocument({
    id: "route-multihead-document",
    name: "Route Multi-Head Group",
    features,
  });
  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.deepEqual(parsed.features[0]?.controlPoints, controls);
  assert.deepEqual(parsed.features[1]?.controlPoints, controls);
});
