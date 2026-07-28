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
  buildTailedFineArrowRing,
  createLocalProjection,
  isSimpleRing,
  resolveTailedFineArrowParameters,
} from "@plotlibre/geometry";
import {
  builtInSymbols,
  TAILED_FINE_ARROW_TYPE,
  tailedFineArrowDefinition,
} from "@plotlibre/symbols";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/tailed-fine-arrow.json", import.meta.url),
    "utf8",
  ),
);

function assertPositionClose(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual[0] - expected[0]) <= tolerance);
  assert.ok(Math.abs(actual[1] - expected[1]) <= tolerance);
}

test("tailed fine arrow matches the deterministic equatorial golden fixture", () => {
  const ring = buildTailedFineArrowRing(
    fixture.controlPoints[0],
    fixture.controlPoints[1],
    fixture.parameters,
  );

  assert.equal(ring.length, fixture.expectedRing.length);
  for (const [index, coordinate] of ring.entries()) {
    assertPositionClose(coordinate, fixture.expectedRing[index]);
  }
});

test("tailed fine arrow produces a finite simple ring with a centered notch", () => {
  const tail = [118.78, 32.04];
  const tip = [118.84, 32.09];
  const ring = buildTailedFineArrowRing(tail, tip);
  const projection = createLocalProjection(tail);
  const localRing = ring.map((position) => projection.project(position));
  const notch = localRing[7];

  assert.equal(ring.length, 9);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.deepEqual(ring[3], tip);
  assert.equal(isSimpleRing(localRing), true);
  assert.ok(notch.x > 0 || notch.y > 0);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("tailNotchRatio changes only the inward notch depth", () => {
  const shallow = buildTailedFineArrowRing([0, 0], [0.01, 0], {
    tailNotchRatio: 0.4,
  });
  const deep = buildTailedFineArrowRing([0, 0], [0.01, 0], {
    tailNotchRatio: 1.4,
  });

  assert.ok(deep[7][0] > shallow[7][0]);
  assert.equal(deep[7][1], 0);
  assert.equal(shallow[7][1], 0);
  for (const index of [0, 1, 2, 3, 4, 5, 6, 8]) {
    assertPositionClose(deep[index], shallow[index]);
  }
});

test("tailed fine arrow validates notch parameters and excessive depth", () => {
  assert.throws(
    () => resolveTailedFineArrowParameters({ tailNotchRatio: 0 }),
    /tailNotchRatio must be between/,
  );
  assert.throws(
    () => resolveTailedFineArrowParameters({ tailNotchRatio: 4.1 }),
    /tailNotchRatio must be between/,
  );
  assert.throws(
    () =>
      buildTailedFineArrowRing([0, 0], [0.01, 0], {
        tailWidthRatio: 0.3,
        tailNotchRatio: 4,
      }),
    /extends too far into the arrow body/,
  );
});

test("tailed fine arrow is registered and generates render roles", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(TAILED_FINE_ARROW_TYPE), true);

  const feature = createPlotFeature({
    id: "tailed-fine-arrow-1",
    plotType: TAILED_FINE_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.84, 32.09],
    ],
    parameters: tailedFineArrowDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);

  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, TAILED_FINE_ARROW_TYPE);
  assert.equal(bundle.fills[0]?.geometry.coordinates[0]?.length, 9);
});

test("PlotJSON round-trips the tailed fine arrow semantic model", () => {
  const feature = createPlotFeature({
    id: "tailed-fine-json",
    plotType: TAILED_FINE_ARROW_TYPE,
    definitionVersion: tailedFineArrowDefinition.version,
    controlPoints: fixture.controlPoints,
    parameters: tailedFineArrowDefinition.defaultParameters,
    metadata: { purpose: "tailed-golden-round-trip" },
  });
  const document = createPlotDocument({
    id: "tailed-fine-document",
    name: "Tailed Fine Arrow",
    features: [feature],
  });

  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.equal(parsed.features[0]?.plotType, TAILED_FINE_ARROW_TYPE);
  assert.equal(parsed.features[0]?.parameters.tailNotchRatio, 0.9);
});
