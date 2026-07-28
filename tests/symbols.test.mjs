import assert from "node:assert/strict";
import test from "node:test";
import { createPlotFeature, PlotRegistry } from "@plotlibre/core";
import {
  straightArrowDefinition,
  STRAIGHT_ARROW_TYPE,
} from "@plotlibre/symbols";

test("straight arrow definition produces fill, outline and hit area", () => {
  const registry = new PlotRegistry().register(straightArrowDefinition);
  const feature = createPlotFeature({
    id: "arrow-1",
    plotType: STRAIGHT_ARROW_TYPE,
    controlPoints: [
      [118.78, 32.04],
      [118.84, 32.09],
    ],
    parameters: straightArrowDefinition.defaultParameters,
  });

  const bundle = registry.generate(feature);
  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.geometry.type, "Polygon");
});
