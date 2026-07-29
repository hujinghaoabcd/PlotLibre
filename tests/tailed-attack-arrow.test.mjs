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
  buildTailedAttackArrowRing,
  createLocalProjection,
  isSimpleRing,
  resolveTailedAttackArrowParameters,
  ringWinding,
} from "@plotlibre/geometry";
import {
  builtInSymbols,
  TAILED_ATTACK_ARROW_TYPE,
  tailedAttackArrowDefinition,
} from "@plotlibre/symbols";

const flatFixture = JSON.parse(
  readFileSync(new URL("./fixtures/attack-arrow.json", import.meta.url), "utf8"),
);
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/tailed-attack-arrow.json", import.meta.url),
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

function assertRingClose(actual, expected, tolerance = 1e-12) {
  assert.equal(actual.length, expected.length);
  for (const [index, coordinate] of actual.entries()) {
    assertPositionClose(coordinate, expected[index], tolerance);
  }
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

test("tailed attack arrow preserves the flat attack body golden contract", () => {
  const flat = buildAttackArrowRing(
    flatFixture.controlPoints,
    flatFixture.parameters,
  );
  const tailed = buildTailedAttackArrowRing(
    fixture.controlPoints,
    fixture.parameters,
  );

  assert.equal(tailed.length, flat.length + 3);
  assertPositionClose(tailed[0], fixture.expectedNotch.leftRoot);
  assertPositionClose(tailed[1], fixture.expectedNotch.tip);
  assertPositionClose(tailed[2], fixture.expectedNotch.rightRoot);
  assertRingClose(tailed.slice(3, -1), flat.slice(0, -1));
  assertPositionClose(tailed.at(-1), fixture.expectedNotch.leftRoot);
});

test("tailed attack arrow preserves exact tail edges and exact semantic tip", () => {
  const ring = buildTailedAttackArrowRing(
    fixture.controlPoints,
    fixture.parameters,
  );

  for (const semantic of [
    fixture.controlPoints[0],
    fixture.controlPoints[1],
    fixture.controlPoints.at(-1),
  ]) {
    assert.ok(
      ring.some(
        (point) => point[0] === semantic[0] && point[1] === semantic[1],
      ),
    );
  }
});

test("tailed attack tail input order does not change geometry", () => {
  const controls = fixture.controlPoints;
  const normal = canonicalRing(
    buildTailedAttackArrowRing(controls, fixture.parameters),
  );
  const swapped = canonicalRing(
    buildTailedAttackArrowRing(
      [controls[1], controls[0], ...controls.slice(2)],
      fixture.parameters,
    ),
  );
  assertRingClose(normal, swapped);
});

test("tailed attack arrow produces a finite closed counterclockwise simple ring", () => {
  const ring = buildTailedAttackArrowRing(
    fixture.controlPoints,
    fixture.parameters,
  );
  const projection = createLocalProjection(fixture.controlPoints[0]);
  const localRing = ring.map((position) => projection.project(position));

  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(localRing), "counterclockwise");
  assert.equal(isSimpleRing(localRing, 1e-6), true);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("tail-notch depth changes only the inward notch tip", () => {
  const shallow = buildTailedAttackArrowRing(fixture.controlPoints, {
    ...fixture.parameters,
    tailNotchDepthRatio: 0.3,
  });
  const deep = buildTailedAttackArrowRing(fixture.controlPoints, {
    ...fixture.parameters,
    tailNotchDepthRatio: 0.9,
  });

  assertPositionClose(shallow[0], deep[0]);
  assertPositionClose(shallow[2], deep[2]);
  assert.notDeepEqual(shallow[1], deep[1]);
  assertRingClose(shallow.slice(3), deep.slice(3));
});

test("tail-notch width changes roots without changing the attack body or tip", () => {
  const narrow = buildTailedAttackArrowRing(fixture.controlPoints, {
    ...fixture.parameters,
    tailNotchWidthRatio: 0.3,
  });
  const wide = buildTailedAttackArrowRing(fixture.controlPoints, {
    ...fixture.parameters,
    tailNotchWidthRatio: 0.85,
  });

  assert.notDeepEqual(narrow[0], wide[0]);
  assertPositionClose(narrow[1], wide[1]);
  assert.notDeepEqual(narrow[2], wide[2]);
  assertRingClose(narrow.slice(3, -1), wide.slice(3, -1));
});

test("tailed attack arrow supports the minimum three-control case", () => {
  const controls = [
    [-0.001, 0],
    [0.001, 0],
    [0, 0.01],
  ];
  const ring = buildTailedAttackArrowRing(controls);

  assert.ok(ring.length > 12);
  assert.ok(
    ring.some((point) => point[0] === controls[2][0] && point[1] === controls[2][1]),
  );
  assert.deepEqual(ring[0], ring.at(-1));
});

test("tailed attack arrow rejects invalid notch parameters and excessive depth", () => {
  assert.throws(
    () => resolveTailedAttackArrowParameters({ tailNotchDepthRatio: 0 }),
    /tailNotchDepthRatio must be between/,
  );
  assert.throws(
    () => resolveTailedAttackArrowParameters({ tailNotchWidthRatio: 1 }),
    /tailNotchWidthRatio must be between/,
  );
  assert.throws(
    () =>
      buildTailedAttackArrowRing(
        [
          [-0.001, 0],
          [0.001, 0],
          [0, 0.004],
        ],
        { tailNotchDepthRatio: 2.5 },
      ),
    /extends too far into the attack body/,
  );
});

test("tailed attack arrow rejects a tight self-intersecting spine", () => {
  assert.throws(
    () =>
      buildTailedAttackArrowRing([
        [-0.001, 0],
        [0.001, 0],
        [0.004, 0.004],
        [-0.003, 0.006],
        [0.004, 0.01],
      ]),
    /self-intersecting ring/,
  );
});

test("tailed attack arrow is registered and generates all render roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(TAILED_ATTACK_ARROW_TYPE), true);

  const feature = createPlotFeature({
    id: "tailed-attack-1",
    plotType: TAILED_ATTACK_ARROW_TYPE,
    controlPoints: fixture.controlPoints,
    parameters: tailedAttackArrowDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);

  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, TAILED_ATTACK_ARROW_TYPE);
  assert.equal(bundle.lines[0]?.properties.role, "outline");
});

test("Definition validation rejects non-renderable tailed attack geometry", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  const feature = createPlotFeature({
    id: "invalid-tailed-attack",
    plotType: TAILED_ATTACK_ARROW_TYPE,
    controlPoints: [
      [-0.001, 0],
      [0.001, 0],
      [0.004, 0.004],
      [-0.003, 0.006],
      [0.004, 0.01],
    ],
    parameters: tailedAttackArrowDefinition.defaultParameters,
  });
  const validation = registry.validate(feature);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.issues.some(
      (issue) => issue.code === "INVALID_TAILED_ATTACK_ARROW_GEOMETRY",
    ),
  );
});

test("PlotJSON round-trips tailed attack controls and notch parameters", () => {
  const feature = createPlotFeature({
    id: "tailed-attack-json",
    plotType: TAILED_ATTACK_ARROW_TYPE,
    definitionVersion: tailedAttackArrowDefinition.version,
    controlPoints: fixture.controlPoints,
    parameters: tailedAttackArrowDefinition.defaultParameters,
    metadata: { purpose: "tailed-attack-round-trip" },
  });
  const document = createPlotDocument({
    id: "tailed-attack-document",
    name: "Tailed Attack Arrow",
    features: [feature],
  });

  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.equal(parsed.features[0]?.plotType, TAILED_ATTACK_ARROW_TYPE);
  assert.equal(parsed.features[0]?.controlPoints.length, 4);
  assert.equal(parsed.features[0]?.parameters.tailNotchDepthRatio, 0.75);
  assert.equal(parsed.features[0]?.parameters.tailNotchWidthRatio, 0.65);
});
