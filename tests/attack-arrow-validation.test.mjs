import assert from "node:assert/strict";
import test from "node:test";
import { createPlotFeature, PlotRegistry } from "@plotlibre/core";
import {
  ATTACK_ARROW_TYPE,
  attackArrowDefinition,
} from "@plotlibre/symbols";

test("attack definition rejects self-intersecting geometry before generation", () => {
  const registry = new PlotRegistry().register(attackArrowDefinition);
  const feature = createPlotFeature({
    id: "invalid-attack",
    plotType: ATTACK_ARROW_TYPE,
    controlPoints: [
      [-0.001, 0],
      [0.001, 0],
      [0.004, 0.004],
      [-0.003, 0.006],
      [0.004, 0.01],
    ],
    parameters: attackArrowDefinition.defaultParameters,
  });

  const validation = registry.validate(feature);
  assert.equal(validation.valid, false);
  assert.equal(
    validation.issues.some(
      (issue) => issue.code === "INVALID_ATTACK_ARROW_GEOMETRY",
    ),
    true,
  );
  assert.throws(() => registry.assertValid(feature), /self-intersecting ring/);
});
