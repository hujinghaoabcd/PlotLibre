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
  buildFineArrowRing,
  buildStraightArrowRing,
  resolveFineArrowParameters,
} from "@plotlibre/geometry";
import {
  builtInSymbols,
  fineArrowDefinition,
  FINE_ARROW_TYPE,
} from "@plotlibre/symbols";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/fine-arrow.json", import.meta.url), "utf8"),
);

function assertPositionClose(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual[0] - expected[0]) <= tolerance);
  assert.ok(Math.abs(actual[1] - expected[1]) <= tolerance);
}

test("fine arrow matches the deterministic equatorial golden fixture", () => {
  const ring = buildFineArrowRing(
    fixture.controlPoints[0],
    fixture.controlPoints[1],
    fixture.parameters,
  );

  assert.equal(ring.length, fixture.expectedRing.length);
  for (const [index, coordinate] of ring.entries()) {
    assertPositionClose(coordinate, fixture.expectedRing[index]);
  }
});

test("fine arrow generates a finite closed ring and preserves the exact tip", () => {
  const tail = [118.78, 32.04];
  const tip = [118.84, 32.09];
  const ring = buildFineArrowRing(tail, tip);

  assert.equal(ring.length, 8);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.deepEqual(ring[3], tip);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("fine arrow is narrower than the default straight arrow", () => {
  const tail = [0, 0];
  const tip = [0.01, 0];
  const fine = buildFineArrowRing(tail, tip);
  const straight = buildStraightArrowRing(tail, tip);

  const fineTailHalfWidthDegrees = Math.abs(fine[0][1]);
  const straightTailHalfWidthDegrees = Math.abs(straight[0][1]);
  assert.ok(fineTailHalfWidthDegrees < straightTailHalfWidthDegrees);
});

test("fine arrow validates parameters and rejects coincident control points", () => {
  assert.throws(
    () => buildFineArrowRing([118, 32], [118, 32]),
    /distinct control points/,
  );
  assert.throws(
    () => resolveFineArrowParameters({ neckWidthRatio: 1.1 }),
    /neckWidthRatio must be between/,
  );
  assert.throws(
    () => resolveFineArrowParameters({ minimumWidthMeters: 0 }),
    /positive number/,
  );
});

test("fine arrow is registered and generates fill, outline and hit area", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(FINE_ARROW_TYPE), true);

  const feature = createPlotFeature({
    id: "fine-arrow-1",
    plotType: FINE_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.84, 32.09],
    ],
    parameters: fineArrowDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);

  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, FINE_ARROW_TYPE);
  assert.equal(bundle.fills[0]?.geometry.type, "Polygon");
});

test("PlotJSON round-trips the fine arrow semantic model", () => {
  const feature = createPlotFeature({
    id: "fine-arrow-json",
    plotType: FINE_ARROW_TYPE,
    definitionVersion: fineArrowDefinition.version,
    controlPoints: fixture.controlPoints,
    parameters: fineArrowDefinition.defaultParameters,
    metadata: { purpose: "golden-round-trip" },
  });
  const document = createPlotDocument({
    id: "fine-arrow-document",
    name: "Fine Arrow",
    features: [feature],
  });

  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.equal(parsed.features[0]?.plotType, FINE_ARROW_TYPE);
});
