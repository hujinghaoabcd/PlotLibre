import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlotFeature,
  emptyRenderBundle,
  PlotRegistry,
} from "@plotlibre/core";
import { buildPincerArrowRing } from "@plotlibre/geometry";
import {
  builtInSymbols,
  PINCER_ARROW_TYPE,
  pincerArrowDefinition,
} from "@plotlibre/symbols";

const naturalPerimeterOrder = [
  [-0.004, 0],
  [0.004, 0],
  [0.009, 0.014],
  [-0.009, 0.014],
  [0, 0.002],
];

function createNaturalOrderFeature() {
  return createPlotFeature({
    id: "pincer-natural-order",
    plotType: PINCER_ARROW_TYPE,
    definitionVersion: pincerArrowDefinition.version,
    controlPoints: naturalPerimeterOrder,
    parameters: pincerArrowDefinition.defaultParameters,
  });
}

test("pincer Definition canonicalizes clockwise objective clicks into paired roles", () => {
  assert.throws(
    () => buildPincerArrowRing(naturalPerimeterOrder),
    /cross|pairing|self-intersecting|tail baseline|direction/,
  );

  const registry = new PlotRegistry().registerMany(builtInSymbols);
  const raw = createNaturalOrderFeature();
  const canonical = registry.canonicalize(raw);

  assert.deepEqual(canonical.controlPoints, [
    naturalPerimeterOrder[0],
    naturalPerimeterOrder[1],
    naturalPerimeterOrder[3],
    naturalPerimeterOrder[2],
    naturalPerimeterOrder[4],
  ]);
  assert.deepEqual(registry.canonicalize(canonical), canonical);
  assert.equal(registry.generate(raw).fills.length, 1);
});

test("canonicalization remains a permutation and cannot invent semantic controls", () => {
  const registry = new PlotRegistry().register({
    type: "test.invalid-canonicalizer",
    title: "Invalid canonicalizer",
    category: "test",
    version: "1.0.0",
    controlSchema: { minPoints: 2, maxPoints: 2 },
    defaultParameters: {},
    defaultStyle: {},
    canonicalizeControlPoints() {
      return [
        [0, 0],
        [99, 99],
      ];
    },
    generate() {
      return emptyRenderBundle();
    },
  });
  const feature = createPlotFeature({
    id: "invalid-canonicalizer",
    plotType: "test.invalid-canonicalizer",
    controlPoints: [
      [0, 0],
      [1, 1],
    ],
  });

  const validation = registry.validate(feature);
  assert.equal(validation.valid, false);
  assert.equal(
    validation.issues[0]?.code,
    "INVALID_CONTROL_POINT_CANONICALIZATION",
  );
  assert.throws(
    () => registry.generate(feature),
    /only reorder existing coordinates/,
  );
});
