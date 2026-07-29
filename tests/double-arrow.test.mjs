import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createPlotDocument,
  createPlotFeature,
  parsePlotDocument,
  PlotRegistry,
  serializePlotDocument,
} from "@plotlibre/core";
import {
  buildDoubleArrowFrame,
  buildDoubleArrowRing,
  createLocalProjection,
  isSimpleRing,
  resolveDoubleArrowParameters,
  ringWinding,
} from "@plotlibre/geometry";
import {
  builtInSymbols,
  DOUBLE_ARROW_TYPE,
  doubleArrowDefinition,
} from "@plotlibre/symbols";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/double-arrow.json", import.meta.url),
    "utf8",
  ),
);

function assertPositionClose(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual[0] - expected[0]) <= tolerance,
    `longitude ${actual[0]} differs from ${expected[0]}`,
  );
  assert.ok(
    Math.abs(actual[1] - expected[1]) <= tolerance,
    `latitude ${actual[1]} differs from ${expected[1]}`,
  );
}

function canonicalRing(ring) {
  const open = ring.slice(0, -1);
  const start = open.reduce(
    (best, point, index) =>
      point[0] < open[best][0] ||
      (point[0] === open[best][0] && point[1] < open[best][1])
        ? index
        : best,
    0,
  );
  const rotated = [...open.slice(start), ...open.slice(0, start)];
  return [...rotated, rotated[0]];
}

function assertRingsClose(actual, expected, tolerance = 1e-10) {
  assert.equal(actual.length, expected.length);
  for (const [index, coordinate] of actual.entries()) {
    assertPositionClose(coordinate, expected[index], tolerance);
  }
}

test("double arrow matches the deterministic golden fixture", () => {
  const ring = buildDoubleArrowRing(
    fixture.controlPoints,
    fixture.parameters,
  );
  assertRingsClose(ring, fixture.expectedRing);
});

test("double arrow preserves both exact tail edges and objective tips", () => {
  const ring = buildDoubleArrowRing(fixture.controlPoints, fixture.parameters);
  for (const control of fixture.controlPoints) {
    assert.ok(
      ring.some(
        (point) => point[0] === control[0] && point[1] === control[1],
      ),
    );
  }
});

test("double arrow geometry is invariant to either unordered pair", () => {
  const controls = fixture.controlPoints;
  const expected = canonicalRing(
    buildDoubleArrowRing(controls, fixture.parameters),
  );
  const variants = [
    [controls[1], controls[0], controls[2], controls[3]],
    [controls[0], controls[1], controls[3], controls[2]],
    [controls[1], controls[0], controls[3], controls[2]],
  ];

  for (const variant of variants) {
    const actual = canonicalRing(
      buildDoubleArrowRing(variant, fixture.parameters),
    );
    assertRingsClose(actual, expected);
  }
});

test("double arrow produces one finite closed counterclockwise simple ring", () => {
  const ring = buildDoubleArrowRing(fixture.controlPoints, fixture.parameters);
  const projection = createLocalProjection(fixture.controlPoints[0]);
  const localRing = ring.map((position) => projection.project(position));

  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(localRing), "counterclockwise");
  assert.equal(isSimpleRing(localRing, 1e-6), true);
  assert.ok(ring.length > 40);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("double arrow frame keeps the branch derived and parameters isolated", () => {
  const resolved = resolveDoubleArrowParameters(fixture.parameters);
  const frame = buildDoubleArrowFrame(fixture.controlPoints, resolved);
  const movedBranch = buildDoubleArrowFrame(
    fixture.controlPoints,
    resolveDoubleArrowParameters({
      ...fixture.parameters,
      branchPositionRatio: 0.55,
    }),
  );

  assert.notDeepEqual(frame.branchCenter, movedBranch.branchCenter);
  assert.deepEqual(frame.semanticTailLeft, movedBranch.semanticTailLeft);
  assert.deepEqual(frame.semanticObjectiveLeft, movedBranch.semanticObjectiveLeft);
  assert.notDeepEqual(
    buildDoubleArrowRing(fixture.controlPoints, fixture.parameters),
    buildDoubleArrowRing(fixture.controlPoints, {
      ...fixture.parameters,
      innerBridgeRatio: 0.35,
    }),
  );
  assert.notDeepEqual(
    buildDoubleArrowRing(fixture.controlPoints, fixture.parameters),
    buildDoubleArrowRing(fixture.controlPoints, {
      ...fixture.parameters,
      headHalfWidthTailRatio: 0.5,
    }),
  );
});

test("double arrow rejects invalid semantics and parameters", () => {
  assert.throws(
    () => buildDoubleArrowRing(fixture.controlPoints.slice(0, 3)),
    /exactly four control points/,
  );
  assert.throws(
    () =>
      buildDoubleArrowRing([
        [0, 0],
        [0, 0],
        [-0.004, 0.012],
        [0.004, 0.012],
      ]),
    /tail width must be at least/,
  );
  assert.throws(
    () =>
      buildDoubleArrowRing([
        [-0.001, 0],
        [0.001, 0],
        [0, 0.012],
        [0, 0.012],
      ]),
    /objectives must be distinct/,
  );
  assert.throws(
    () =>
      buildDoubleArrowRing([
        [-0.001, 0],
        [0.001, 0],
        [-0.004, -0.003],
        [0.004, 0.013],
      ]),
    /ahead of the tail frame/,
  );
  assert.throws(
    () => resolveDoubleArrowParameters({ branchPositionRatio: 0.8 }),
    /branchPositionRatio must be between/,
  );
  assert.throws(
    () =>
      resolveDoubleArrowParameters({
        headHalfWidthTailRatio: 0.4,
        neckHalfWidthTailRatio: 0.4,
      }),
    /must be smaller/,
  );
});

test("double arrow is registered and generates all render roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(DOUBLE_ARROW_TYPE), true);
  assert.deepEqual(doubleArrowDefinition.controlSchema, {
    minPoints: 4,
    maxPoints: 4,
    completeOnDoubleClick: false,
    allowPointInsertion: false,
    allowPointRemoval: false,
  });

  const feature = createPlotFeature({
    id: "double-arrow-1",
    plotType: DOUBLE_ARROW_TYPE,
    definitionVersion: doubleArrowDefinition.version,
    controlPoints: fixture.controlPoints,
    parameters: doubleArrowDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);
  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, DOUBLE_ARROW_TYPE);
  assert.equal(bundle.lines[0]?.properties.role, "outline");
  assert.equal(bundle.hitAreas[0]?.properties.role, "hit-area");
});

test("double arrow validation rejects unrenderable candidates before mutation", () => {
  const invalid = createPlotFeature({
    id: "double-arrow-invalid",
    plotType: DOUBLE_ARROW_TYPE,
    controlPoints: [
      [-0.001, 0],
      [0.001, 0],
      [0, 0.012],
      [0, 0.012],
    ],
    parameters: doubleArrowDefinition.defaultParameters,
  });
  const validation = doubleArrowDefinition.validate({ feature: invalid });
  assert.equal(validation.valid, false);
  assert.equal(validation.issues[0]?.code, "INVALID_DOUBLE_ARROW_GEOMETRY");
});

test("PlotJSON round-trips exactly four authored controls without a branch control", () => {
  const feature = createPlotFeature({
    id: "double-arrow-json",
    plotType: DOUBLE_ARROW_TYPE,
    definitionVersion: doubleArrowDefinition.version,
    controlPoints: fixture.controlPoints,
    parameters: doubleArrowDefinition.defaultParameters,
    metadata: { purpose: "double-arrow-round-trip" },
  });
  const document = createPlotDocument({
    id: "double-arrow-document",
    name: "Double Arrow",
    features: [feature],
  });

  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.equal(parsed.features[0]?.plotType, DOUBLE_ARROW_TYPE);
  assert.equal(parsed.features[0]?.controlPoints.length, 4);
  assert.equal(parsed.features[0]?.parameters.branchPositionRatio, 0.42);
  assert.equal("branchCenter" in parsed.features[0]?.parameters, false);
});
