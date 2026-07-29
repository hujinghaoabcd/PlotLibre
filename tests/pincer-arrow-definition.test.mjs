import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlotDocument,
  createPlotFeature,
  parsePlotDocument,
  PlotRegistry,
  serializePlotDocument,
} from "@plotlibre/core";
import {
  builtInSymbols,
  PINCER_ARROW_TYPE,
  pincerArrowDefinition,
} from "@plotlibre/symbols";

const controls = [
  [-0.004, 0],
  [0.004, 0],
  [-0.009, 0.014],
  [0.009, 0.014],
  [0, 0.002],
];

test("pincer arrow is registered with the fixed-five semantic contract", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  assert.equal(registry.has(PINCER_ARROW_TYPE), true);
  assert.deepEqual(pincerArrowDefinition.controlSchema, {
    minPoints: 5,
    maxPoints: 5,
    completeOnDoubleClick: false,
    allowPointInsertion: false,
    allowPointRemoval: false,
  });

  const feature = createPlotFeature({
    id: "pincer-1",
    plotType: PINCER_ARROW_TYPE,
    definitionVersion: pincerArrowDefinition.version,
    controlPoints: controls,
    parameters: pincerArrowDefinition.defaultParameters,
  });
  const bundle = registry.generate(feature);
  assert.equal(bundle.fills.length, 1);
  assert.equal(bundle.lines.length, 1);
  assert.equal(bundle.hitAreas.length, 1);
  assert.equal(bundle.fills[0]?.properties.plotType, PINCER_ARROW_TYPE);
  assert.equal(bundle.lines[0]?.properties.role, "outline");
  assert.equal(bundle.hitAreas[0]?.properties.role, "hit-area");
});

test("pincer definition reports a stable duplicate-control issue before mutation", () => {
  const invalid = createPlotFeature({
    id: "pincer-invalid",
    plotType: PINCER_ARROW_TYPE,
    definitionVersion: pincerArrowDefinition.version,
    controlPoints: [
      controls[0],
      controls[1],
      controls[2],
      controls[3],
      controls[0],
    ],
    parameters: pincerArrowDefinition.defaultParameters,
  });
  const validation = pincerArrowDefinition.validate({ feature: invalid });
  assert.equal(validation.valid, false);
  assert.equal(
    validation.issues[0]?.code,
    "PINCER_CONTROL_POINTS_NOT_DISTINCT",
  );
});

test("pincer definition distinguishes an out-of-zone fifth point", () => {
  const invalid = createPlotFeature({
    id: "pincer-invalid-junction",
    plotType: PINCER_ARROW_TYPE,
    definitionVersion: pincerArrowDefinition.version,
    controlPoints: [
      controls[0],
      controls[1],
      controls[2],
      controls[3],
      [0, 0.02],
    ],
    parameters: pincerArrowDefinition.defaultParameters,
  });
  const validation = pincerArrowDefinition.validate({ feature: invalid });
  assert.equal(validation.valid, false);
  assert.equal(validation.issues[0]?.code, "PINCER_JUNCTION_OUTSIDE_ZONE");
});

test("PlotJSON round-trips exactly five authored controls including the junction", () => {
  const feature = createPlotFeature({
    id: "pincer-json",
    plotType: PINCER_ARROW_TYPE,
    definitionVersion: pincerArrowDefinition.version,
    controlPoints: controls,
    parameters: pincerArrowDefinition.defaultParameters,
    metadata: { purpose: "pincer-round-trip" },
  });
  const document = createPlotDocument({
    id: "pincer-document",
    name: "Pincer Arrow",
    features: [feature],
  });
  const parsed = parsePlotDocument(serializePlotDocument(document));
  assert.deepEqual(parsed, document);
  assert.equal(parsed.features[0]?.plotType, PINCER_ARROW_TYPE);
  assert.equal(parsed.features[0]?.controlPoints.length, 5);
  assert.deepEqual(parsed.features[0]?.controlPoints[4], controls[4]);
  assert.equal("branchPositionRatio" in parsed.features[0]?.parameters, false);
  assert.equal("innerBridgeRatio" in parsed.features[0]?.parameters, false);
});

test("four-control double-arrow data cannot be relabeled as pincer data", () => {
  const registry = new PlotRegistry().registerMany(builtInSymbols);
  const invalid = createPlotFeature({
    id: "pincer-four-controls",
    plotType: PINCER_ARROW_TYPE,
    definitionVersion: pincerArrowDefinition.version,
    controlPoints: controls.slice(0, 4),
    parameters: pincerArrowDefinition.defaultParameters,
  });
  assert.throws(() => registry.generate(invalid), /exactly five control points/);
});
