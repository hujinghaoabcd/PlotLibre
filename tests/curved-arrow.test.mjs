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
  buildCurvedArrowRing,
  createLocalProjection,
  isSimpleRing,
  resolveCurvedArrowParameters,
  ringWinding,
} from "@plotlibre/geometry";
import {
  builtInSymbols,
  CURVED_ARROW_TYPE,
  curvedArrowDefinition,
} from "@plotlibre/symbols";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/curved-arrow.json", import.meta.url),
    "utf8",
  ),
);

function assertPositionClose(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual[0] - expected[0]) <= tolerance,
    `longitude ${actual[0]} differs from ${expected[0]}`,
  );
  assert.ok(
    Math.abs(actual[1] - expected[1]) <= tolerance,
    `latitude ${actual[1]} differs from ${expected[1]}`,
  );
}

test("curved arrow matches the deterministic golden fixture", () => {
  const ring = buildCurvedArrowRing(
    fixture.controlPoints,
    fixture.parameters,
  );

  assert.equal(ring.length, fixture.expectedRing.length);
  for (const [index, coordinate] of ring.entries()) {
    assertPositionClose(coordinate, fixture.expectedRing[index]);
  }
  assert.deepEqual(
    ring[fixture.expectedTipIndex],
    fixture.controlPoints.at(-1),
  );
});

test("curved arrow produces a finite closed counterclockwise simple ring", () => {
  const controls = [
    [118.75, 32.03],
    [118.79, 32.06],
    [118.84, 32.085],
    [118.88, 32.12],
  ];
  const ring = buildCurvedArrowRing(controls);
  const projection = createLocalProjection(controls[0]);
  const localRing = ring.map((position) => projection.project(position));

  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(ring.length > 20);
  assert.equal(ringWinding(localRing), "counterclockwise");
  assert.equal(isSimpleRing(localRing, 1e-6), true);
  assert.ok(
    ring.some(
      (position) =>
        position[0] === controls.at(-1)[0] &&
        position[1] === controls.at(-1)[1],
    ),
  );
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("curved arrow path responds to an interior semantic control", () => {
  const common = [
    [0, 0],
    [0.01, 0],
  ];
  const upper = buildCurvedArrowRing([common[0], [0.005, 0.004], common[1]]);
  const lower = buildCurvedArrowRing([common[0], [0.005, -0.004], common[1]]);

  assert.notDeepEqual(upper, lower);
  assert.deepEqual(upper.find((point) => point[0] === 0.01 && point[1] === 0), [
    0.01,
    0,
  ]);
  assert.deepEqual(lower.find((point) => point[0] === 0.01 && point[1] === 0), [
    0.01,
    0,
  ]);
});

test("curved arrow cleans consecutive duplicate controls", () => {
  const clean = buildCurvedArrowRing([
    [0, 0],
    [0.005, 0.004],
    [0.01, 0],
  ]);
  const duplicated = buildCurvedArrowRing([
    [0, 0],
    [0.005, 0.004],
    [0.005, 0.004],
    [0.01, 0],
  ]);

  assert.equal(duplicated.length, clean.length);
  for (const [index, coordinate] of duplicated.entries()) {
    assertPositionClose(coordinate, clean[index]);
  }
});

test("curved arrow rejects an excessively tight self-intersecting path", () => {
  assert.throws(
    () =>
      buildCurvedArrowRing([
        [118.75, 32.03],
        [118.79, 32.09],
        [118.84, 32.07],
        [118.88, 32.12],
      ]),
    /self-intersecting ring/,
  );
});

test("curved arrow rejects invalid semantic controls and parameters", () => {
  assert.throws(
    () => buildCurvedArrowRing([[0, 0], [0.01, 0]]),
    /at least three control points/,
  );
  assert.throws(
    () =>
      buildCurvedArrowRing([
        [0, 0],
        [0, 0],
        [0.01, 0],
      ]),
    /three distinct control points/,
  );
  assert.throws(
    () => resolveCurvedArrowParameters({ tension: 1.1 }),
    /tension must be between/,
  );
  assert.throws(
    () => resolveCurvedArrowParameters({ segmentsPerSpan: 3 }),
    /segmentsPerSpan must be an integer between/,
  );
  assert.throws(
    () => resolveCurvedArrowParameters({ miterLimit: 0.5 }),
    /miterLimit must be between/,
  );
  assert.throws(
    () => resolveCurvedArrowParameters({ minimumWidthMeters: 0 }),
    /positive finite number/,
  );
});

test("curved arrow is registered and generates all render roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(CURVED_ARROW_TYPE), true);

  const feature = createPlotFeature({
    id: "curved-arrow-1",
    plotType: CURVED_ARROW_TYPE,
    controlPoints: fixture.controlPoints,
    parameters: curvedArrowDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);

  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, CURVED_ARROW_TYPE);
  assert.equal(bundle.lines[0]?.properties.role, "outline");
  assert.equal(bundle.hitAreas[0]?.properties.role, "hit-area");
  assert.ok(bundle.fills[0]?.geometry.coordinates[0]?.length > 20);
});

test("PlotJSON round-trips the full curved-arrow semantic path", () => {
  const feature = createPlotFeature({
    id: "curved-arrow-json",
    plotType: CURVED_ARROW_TYPE,
    definitionVersion: curvedArrowDefinition.version,
    controlPoints: [
      [118.75, 32.03],
      [118.79, 32.06],
      [118.84, 32.085],
      [118.88, 32.12],
    ],
    parameters: curvedArrowDefinition.defaultParameters,
    metadata: { purpose: "curved-arrow-round-trip" },
  });
  const document = createPlotDocument({
    id: "curved-arrow-document",
    name: "Curved Arrow",
    features: [feature],
  });

  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.equal(parsed.features[0]?.plotType, CURVED_ARROW_TYPE);
  assert.equal(parsed.features[0]?.controlPoints.length, 4);
  assert.equal(parsed.features[0]?.parameters.tension, 0.15);
});
