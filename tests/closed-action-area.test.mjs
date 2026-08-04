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
  buildClosedCurveRing,
  buildGatheringPlaceRing,
  canonicalizeGatheringPlaceControls,
  createLocalProjection,
  isSimpleRing,
  resolveClosedAreaParameters,
  resolveGatheringPlaceParameters,
  ringWinding,
  sampleClosedCatmullRom,
  signedRingArea,
} from "@plotlibre/geometry";
import {
  areaSymbols,
  builtInSymbols,
  CLOSED_CURVE_TYPE,
  closedCurveDefinition,
  GATHERING_PLACE_TYPE,
  gatheringPlaceDefinition,
} from "@plotlibre/symbols";

const closedControls = [
  [118.72, 32.02],
  [118.765, 32.015],
  [118.795, 32.05],
  [118.755, 32.085],
  [118.715, 32.055],
];

const gatheringControls = [
  [118.72, 32.02],
  [118.755, 32.075],
  [118.79, 32.02],
];

function localRing(ring, origin) {
  const projection = createLocalProjection(origin);
  return ring.map((position) => projection.project(position));
}

function includesPosition(ring, expected, tolerance = 1e-10) {
  return ring.some(
    (position) =>
      Math.abs(position[0] - expected[0]) <= tolerance &&
      Math.abs(position[1] - expected[1]) <= tolerance,
  );
}

test("closed Catmull-Rom is periodic and interpolates every authored control", () => {
  const controls = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const segmentsPerSpan = 8;
  const sampled = sampleClosedCatmullRom(controls, {
    tension: 0.2,
    segmentsPerSpan,
  });
  assert.equal(sampled.length, controls.length * segmentsPerSpan);
  controls.forEach((control, index) => {
    assert.deepEqual(sampled[index * segmentsPerSpan], control);
  });
});

test("closed curve produces a finite closed counterclockwise simple ring", () => {
  const ring = buildClosedCurveRing(closedControls);
  const local = localRing(ring, closedControls[0]);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(local), "counterclockwise");
  assert.equal(isSimpleRing(local, 1e-6), true);
  assert.ok(Math.abs(signedRingArea(local)) > 1);
  for (const control of closedControls) {
    assert.equal(includesPosition(ring, control), true);
  }
});

test("closed curve preserves footprint area under reversed traversal", () => {
  const forward = localRing(
    buildClosedCurveRing(closedControls),
    closedControls[0],
  );
  const reversedControls = [...closedControls].reverse();
  const reversed = localRing(
    buildClosedCurveRing(reversedControls),
    reversedControls[0],
  );
  const forwardArea = Math.abs(signedRingArea(forward));
  const reversedArea = Math.abs(signedRingArea(reversed));
  assert.ok(Math.abs(forwardArea - reversedArea) / forwardArea < 1e-9);
});

test("gathering place canonicalizes only the unordered flank pair", () => {
  const [flankA, crown, flankB] = gatheringControls;
  const forward = canonicalizeGatheringPlaceControls([flankA, crown, flankB]);
  const swapped = canonicalizeGatheringPlaceControls([flankB, crown, flankA]);
  assert.deepEqual(forward, swapped);
  assert.deepEqual(forward[1], crown);
});

test("gathering place creates an independent three-control area", () => {
  const canonical = canonicalizeGatheringPlaceControls(gatheringControls);
  const ring = buildGatheringPlaceRing(canonical);
  const local = localRing(ring, canonical[1]);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(local), "counterclockwise");
  assert.equal(isSimpleRing(local, 1e-6), true);
  canonical.forEach((control) => {
    assert.equal(includesPosition(ring, control), true);
  });
});

test("gathering place rear depth changes only derived geometry", () => {
  const canonical = canonicalizeGatheringPlaceControls(gatheringControls);
  const shallow = buildGatheringPlaceRing(canonical, { rearDepthRatio: 0.2 });
  const deep = buildGatheringPlaceRing(canonical, { rearDepthRatio: 0.9 });
  assert.notDeepEqual(shallow, deep);
  canonical.forEach((control) => {
    assert.equal(includesPosition(shallow, control), true);
    assert.equal(includesPosition(deep, control), true);
  });
});

test("closed action areas are independently registered and render all area roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(areaSymbols.length, 2);
  assert.equal(registry.has(CLOSED_CURVE_TYPE), true);
  assert.equal(registry.has(GATHERING_PLACE_TYPE), true);

  for (const [plotType, definition, controls] of [
    [CLOSED_CURVE_TYPE, closedCurveDefinition, closedControls],
    [GATHERING_PLACE_TYPE, gatheringPlaceDefinition, gatheringControls],
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

test("closed action areas reject degenerate controls and invalid parameters", () => {
  assert.throws(
    () => buildClosedCurveRing([[0, 0], [0.01, 0], [0, 0]]),
    /pairwise distinct/,
  );
  assert.throws(
    () => buildGatheringPlaceRing([[0, 0], [0, 0.01], [0, 0]]),
    /pairwise distinct/,
  );
  assert.throws(
    () => resolveClosedAreaParameters({ segmentsPerSpan: 2 }),
    /segmentsPerSpan must be an integer between/,
  );
  assert.throws(
    () => resolveGatheringPlaceParameters({ rearDepthRatio: 2 }),
    /rearDepthRatio must be between/,
  );
});

test("PlotJSON preserves only authored closed-area controls", () => {
  const closed = createPlotFeature({
    id: "closed-json",
    plotType: CLOSED_CURVE_TYPE,
    definitionVersion: closedCurveDefinition.version,
    controlPoints: closedControls,
    parameters: closedCurveDefinition.defaultParameters,
  });
  const gathering = createPlotFeature({
    id: "gathering-json",
    plotType: GATHERING_PLACE_TYPE,
    definitionVersion: gatheringPlaceDefinition.version,
    controlPoints: gatheringControls,
    parameters: gatheringPlaceDefinition.defaultParameters,
  });
  const document = createPlotDocument({
    id: "closed-area-document",
    name: "Closed Action Areas",
    features: [closed, gathering],
  });
  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.deepEqual(parsed.features[0]?.controlPoints, closedControls);
  assert.deepEqual(parsed.features[1]?.controlPoints, gatheringControls);
});
