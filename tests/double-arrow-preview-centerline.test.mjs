import assert from "node:assert/strict";
import test from "node:test";
import { createPlotFeature } from "@plotlibre/core";
import {
  deriveDoubleArrowDraftControlPoints,
  DOUBLE_ARROW_TYPE,
  doubleArrowDefinition,
} from "@plotlibre/symbols";

const tailA = [-0.001, 0];
const tailB = [0.001, 0];

for (const [name, objective] of [
  ["exact centerline", [0, 0.012]],
  ["near centerline", [0.00001, 0.012]],
]) {
  test(`double-arrow third-click preview supports ${name} objectives`, () => {
    const controls = [tailA, tailB, objective];
    const draft = deriveDoubleArrowDraftControlPoints(controls);

    assert.ok(draft);
    assert.equal(draft.length, 4);
    assert.deepEqual(draft.slice(0, 3), controls);
    assert.notDeepEqual(draft[3], objective);

    const feature = createPlotFeature({
      id: `preview-${name}`,
      plotType: DOUBLE_ARROW_TYPE,
      definitionVersion: doubleArrowDefinition.version,
      controlPoints: draft,
      parameters: doubleArrowDefinition.defaultParameters,
      style: doubleArrowDefinition.defaultStyle,
    });
    assert.equal(doubleArrowDefinition.validate?.({ feature }).valid, true);
  });
}
