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
  buildAttackArrowRing,
  createLocalProjection,
  isSimpleRing,
  resolveAttackArrowParameters,
  ringWinding,
  signedRingArea,
} from "@plotlibre/geometry";
import {
  ATTACK_ARROW_TYPE,
  attackArrowDefinition,
  builtInSymbols,
} from "@plotlibre/symbols";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/attack-arrow.json", import.meta.url),
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

test("attack arrow matches the deterministic golden fixture", () => {
  const ring = buildAttackArrowRing(
    fixture.controlPoints,
    fixture.parameters,
  );

  assert.equal(ring.length, fixture.expectedRing.length);
  for (const [index, coordinate] of ring.entries()) {
    assertPositionClose(coordinate, fixture.expectedRing[index]);
  }
});

test("attack arrow preserves exact tail edges and exact semantic tip", () => {
  const controls = [
    [118.75, 32.03],
    [118.752, 32.029],
    [118.78, 32.07],
    [118.84, 32.12],
  ];
  const ring = buildAttackArrowRing(controls);

  assert.ok(ring.some((point) => point[0] === controls[0][0] && point[1] === controls[0][1]));
  assert.ok(ring.some((point) => point[0] === controls[1][0] && point[1] === controls[1][1]));
  assert.ok(ring.some((point) => point[0] === controls.at(-1)[0] && point[1] === controls.at(-1)[1]));
});

test("attack arrow tail input order does not change geometry", () => {
  const controls = fixture.controlPoints;
  const normal = buildAttackArrowRing(controls, fixture.parameters);
  const swapped = buildAttackArrowRing(
    [controls[1], controls[0], ...controls.slice(2)],
    fixture.parameters,
  );

  const normalCanonical = canonicalRing(normal);
  const swappedCanonical = canonicalRing(swapped);
  assert.equal(normalCanonical.length, swappedCanonical.length);
  for (const [index, coordinate] of normalCanonical.entries()) {
    assertPositionClose(coordinate, swappedCanonical[index]);
  }
});

test("attack arrow produces a finite closed counterclockwise simple ring", () => {
  const controls = [
    [118.75, 32.03],
    [118.752, 32.029],
    [118.78, 32.07],
    [118.82, 32.1],
    [118.87, 32.13],
  ];
  const ring = buildAttackArrowRing(controls);
  const projection = createLocalProjection(controls[0]);
  const localRing = ring.map((position) => projection.project(position));

  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(ring.length > 20);
  assert.equal(ringWinding(localRing), "counterclockwise");
  assert.equal(isSimpleRing(localRing, 1e-6), true);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("wider semantic tail controls produce a larger attack body", () => {
  const narrowControls = [
    [-0.0005, 0],
    [0.0005, 0],
    [0.0015, 0.005],
    [0.004, 0.01],
  ];
  const wideControls = [
    [-0.001, 0],
    [0.001, 0],
    [0.0015, 0.005],
    [0.004, 0.01],
  ];
  const projection = createLocalProjection([0, 0]);
  const narrow = buildAttackArrowRing(narrowControls).map((point) => projection.project(point));
  const wide = buildAttackArrowRing(wideControls).map((point) => projection.project(point));

  assert.ok(Math.abs(signedRingArea(wide)) > Math.abs(signedRingArea(narrow)) * 1.5);
});

test("attack arrow responds to an interior spine control", () => {
  const commonTail = [
    [-0.001, 0],
    [0.001, 0],
  ];
  const leftCurve = buildAttackArrowRing([
    ...commonTail,
    [-0.001, 0.005],
    [0.003, 0.01],
  ]);
  const rightCurve = buildAttackArrowRing([
    ...commonTail,
    [0.002, 0.005],
    [0.003, 0.01],
  ]);

  assert.notDeepEqual(leftCurve, rightCurve);
});

test("attack arrow supports the minimum three-control straight case", () => {
  const controls = [
    [-0.001, 0],
    [0.001, 0],
    [0, 0.01],
  ];
  const ring = buildAttackArrowRing(controls);

  assert.ok(ring.length > 10);
  assert.ok(ring.some((point) => point[0] === 0 && point[1] === 0.01));
  assert.deepEqual(ring[0], ring.at(-1));
});

test("attack arrow cleans consecutive duplicate spine controls", () => {
  const clean = buildAttackArrowRing(fixture.controlPoints, fixture.parameters);
  const duplicated = buildAttackArrowRing(
    [
      fixture.controlPoints[0],
      fixture.controlPoints[1],
      fixture.controlPoints[2],
      fixture.controlPoints[2],
      fixture.controlPoints[3],
    ],
    fixture.parameters,
  );

  assert.equal(duplicated.length, clean.length);
  for (const [index, coordinate] of duplicated.entries()) {
    assertPositionClose(coordinate, clean[index]);
  }
});

test("attack arrow rejects invalid tail semantics and parameters", () => {
  assert.throws(
    () => buildAttackArrowRing([[0, 0], [0.001, 0]]),
    /at least three control points/,
  );
  assert.throws(
    () => buildAttackArrowRing([[0, 0], [0, 0], [0, 0.01]]),
    /tail width must be at least/,
  );
  assert.throws(
    () => buildAttackArrowRing([[-0.001, 0], [0.001, 0], [0.01, 0]]),
    /tail controls must span across/,
  );
  assert.throws(
    () => resolveAttackArrowParameters({ bodyBulgePosition: 0.9 }),
    /bodyBulgePosition must be between/,
  );
  assert.throws(
    () => resolveAttackArrowParameters({ neckHalfWidthTailRatio: 0.9 }),
    /neckHalfWidthTailRatio must be between/,
  );
  assert.throws(
    () => resolveAttackArrowParameters({ minimumTailWidthMeters: 0 }),
    /positive finite number/,
  );
});

test("attack arrow rejects a tight self-intersecting spine", () => {
  assert.throws(
    () =>
      buildAttackArrowRing([
        [-0.001, 0],
        [0.001, 0],
        [0.004, 0.004],
        [-0.003, 0.006],
        [0.004, 0.01],
      ]),
    /self-intersecting ring/,
  );
});

test("attack arrow is registered and generates all render roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(ATTACK_ARROW_TYPE), true);

  const feature = createPlotFeature({
    id: "attack-arrow-1",
    plotType: ATTACK_ARROW_TYPE,
    controlPoints: fixture.controlPoints,
    parameters: attackArrowDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);

  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, ATTACK_ARROW_TYPE);
  assert.equal(bundle.lines[0]?.properties.role, "outline");
  assert.equal(bundle.hitAreas[0]?.properties.role, "hit-area");
});

test("PlotJSON round-trips attack tail edges and the complete spine", () => {
  const feature = createPlotFeature({
    id: "attack-arrow-json",
    plotType: ATTACK_ARROW_TYPE,
    definitionVersion: attackArrowDefinition.version,
    controlPoints: [
      [118.75, 32.03],
      [118.752, 32.029],
      [118.78, 32.07],
      [118.82, 32.1],
      [118.87, 32.13],
    ],
    parameters: attackArrowDefinition.defaultParameters,
    metadata: { purpose: "attack-arrow-round-trip" },
  });
  const document = createPlotDocument({
    id: "attack-arrow-document",
    name: "Attack Arrow",
    features: [feature],
  });

  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.equal(parsed.features[0]?.plotType, ATTACK_ARROW_TYPE);
  assert.equal(parsed.features[0]?.controlPoints.length, 5);
  assert.equal(parsed.features[0]?.parameters.bodyBulgeRatio, 1.08);
});
