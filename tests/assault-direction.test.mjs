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
  buildAssaultDirectionRing,
  buildFineArrowRing,
  createLocalProjection,
  isSimpleRing,
  resolveAssaultDirectionParameters,
} from "@plotlibre/geometry";
import {
  ASSAULT_DIRECTION_TYPE,
  assaultDirectionDefinition,
  builtInSymbols,
} from "@plotlibre/symbols";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/assault-direction.json", import.meta.url),
    "utf8",
  ),
);

function assertPositionClose(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual[0] - expected[0]) <= tolerance);
  assert.ok(Math.abs(actual[1] - expected[1]) <= tolerance);
}

test("assault direction matches the deterministic equatorial golden fixture", () => {
  const ring = buildAssaultDirectionRing(
    fixture.controlPoints[0],
    fixture.controlPoints[1],
    fixture.parameters,
  );

  assert.equal(ring.length, fixture.expectedRing.length);
  for (const [index, coordinate] of ring.entries()) {
    assertPositionClose(coordinate, fixture.expectedRing[index]);
  }
});

test("assault direction produces a finite closed simple ring and exact tip", () => {
  const tail = [118.78, 32.04];
  const tip = [118.84, 32.09];
  const ring = buildAssaultDirectionRing(tail, tip);
  const projection = createLocalProjection(tail);
  const localRing = ring.map((position) => projection.project(position));

  assert.equal(ring.length, 8);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.deepEqual(ring[3], tip);
  assert.equal(isSimpleRing(localRing), true);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("assault direction has a broader body than the default fine arrow", () => {
  const tail = [0, 0];
  const tip = [0.01, 0];
  const assault = buildAssaultDirectionRing(tail, tip);
  const fine = buildFineArrowRing(tail, tip);

  const assaultTailHalfWidth = Math.abs(assault[0][1]);
  const fineTailHalfWidth = Math.abs(fine[0][1]);
  assert.ok(assaultTailHalfWidth > fineTailHalfWidth * 3);
  assert.ok(Math.abs(assault[1][1]) <= assaultTailHalfWidth);
});

test("head angle changes only the assault arrow wings", () => {
  const narrow = buildAssaultDirectionRing([0, 0], [0.01, 0], {
    headAngleDegrees: 28,
  });
  const wide = buildAssaultDirectionRing([0, 0], [0.01, 0], {
    headAngleDegrees: 55,
  });

  assert.ok(Math.abs(wide[2][1]) > Math.abs(narrow[2][1]));
  assert.ok(Math.abs(wide[4][1]) > Math.abs(narrow[4][1]));
  for (const index of [0, 1, 3, 5, 6, 7]) {
    assertPositionClose(wide[index], narrow[index]);
  }
});

test("assault direction rejects invalid parameters and coincident controls", () => {
  assert.throws(
    () => buildAssaultDirectionRing([118, 32], [118, 32]),
    /distinct control points/,
  );
  assert.throws(
    () => resolveAssaultDirectionParameters({ bodyWidthRatio: 0.01 }),
    /bodyWidthRatio must be between/,
  );
  assert.throws(
    () => resolveAssaultDirectionParameters({ headAngleDegrees: 70 }),
    /headAngleDegrees must be between/,
  );
  assert.throws(
    () => resolveAssaultDirectionParameters({ minimumWidthMeters: 0 }),
    /positive number/,
  );
});

test("assault direction is registered and generates render roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(ASSAULT_DIRECTION_TYPE), true);

  const feature = createPlotFeature({
    id: "assault-direction-1",
    plotType: ASSAULT_DIRECTION_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.84, 32.09],
    ],
    parameters: assaultDirectionDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);

  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, ASSAULT_DIRECTION_TYPE);
  assert.equal(bundle.fills[0]?.geometry.coordinates[0]?.length, 8);
});

test("PlotJSON round-trips the assault-direction semantic model", () => {
  const feature = createPlotFeature({
    id: "assault-direction-json",
    plotType: ASSAULT_DIRECTION_TYPE,
    definitionVersion: assaultDirectionDefinition.version,
    controlPoints: fixture.controlPoints,
    parameters: assaultDirectionDefinition.defaultParameters,
    metadata: { purpose: "assault-golden-round-trip" },
  });
  const document = createPlotDocument({
    id: "assault-direction-document",
    name: "Assault Direction",
    features: [feature],
  });

  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.equal(parsed.features[0]?.plotType, ASSAULT_DIRECTION_TYPE);
  assert.equal(parsed.features[0]?.parameters.headAngleDegrees, 42);
});
