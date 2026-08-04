import assert from "node:assert/strict";
import test from "node:test";
import { createPlotJsonMigrationReport } from "@plotlibre/core";

test("migration reports are copied and deeply frozen", () => {
  const documentSteps = [
    {
      scope: "document",
      sourceVersion: "1.0.0",
      targetVersion: "1.1.0",
    },
  ];
  const definitionSteps = [
    {
      scope: "definition",
      featureId: "feature-1",
      from: { plotType: "arrow.old", definitionVersion: "1.0.0" },
      to: { plotType: "arrow.new", definitionVersion: "2.0.0" },
    },
  ];
  const featureSteps = [
    {
      featureId: "feature-1",
      source: { plotType: "arrow.old", definitionVersion: "1.0.0" },
      target: { plotType: "arrow.new", definitionVersion: "2.0.0" },
      steps: definitionSteps,
    },
  ];
  const normalizations = [
    {
      code: "PLOTJSON_DEFINITION_VERSION_DEFAULTED",
      path: "$.features[0].definitionVersion",
      featureId: "feature-1",
      plotType: "arrow.old",
    },
  ];
  const warnings = [
    {
      code: "PLOTJSON_UNKNOWN_FIELD_DROPPED",
      path: "$.features[0].legacyField",
      featureId: "feature-1",
    },
  ];

  const report = createPlotJsonMigrationReport({
    sourceSchemaVersion: "1.0.0",
    targetSchemaVersion: "1.1.0",
    documentSteps,
    featureSteps,
    normalizations,
    warnings,
  });

  documentSteps[0].targetVersion = "9.0.0";
  definitionSteps[0].to.plotType = "mutated";
  featureSteps[0].source.plotType = "mutated";
  normalizations[0].path = "$";
  warnings[0].path = "$";

  assert.deepEqual(report, {
    sourceSchemaVersion: "1.0.0",
    targetSchemaVersion: "1.1.0",
    documentSteps: [
      {
        scope: "document",
        sourceVersion: "1.0.0",
        targetVersion: "1.1.0",
      },
    ],
    featureSteps: [
      {
        featureId: "feature-1",
        source: {
          plotType: "arrow.old",
          definitionVersion: "1.0.0",
        },
        target: {
          plotType: "arrow.new",
          definitionVersion: "2.0.0",
        },
        steps: [
          {
            scope: "definition",
            featureId: "feature-1",
            from: {
              plotType: "arrow.old",
              definitionVersion: "1.0.0",
            },
            to: {
              plotType: "arrow.new",
              definitionVersion: "2.0.0",
            },
          },
        ],
      },
    ],
    normalizations: [
      {
        code: "PLOTJSON_DEFINITION_VERSION_DEFAULTED",
        path: "$.features[0].definitionVersion",
        featureId: "feature-1",
        plotType: "arrow.old",
      },
    ],
    warnings: [
      {
        code: "PLOTJSON_UNKNOWN_FIELD_DROPPED",
        path: "$.features[0].legacyField",
        featureId: "feature-1",
      },
    ],
  });

  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.documentSteps), true);
  assert.equal(Object.isFrozen(report.documentSteps[0]), true);
  assert.equal(Object.isFrozen(report.featureSteps), true);
  assert.equal(Object.isFrozen(report.featureSteps[0]), true);
  assert.equal(Object.isFrozen(report.featureSteps[0].source), true);
  assert.equal(Object.isFrozen(report.featureSteps[0].target), true);
  assert.equal(Object.isFrozen(report.featureSteps[0].steps), true);
  assert.equal(Object.isFrozen(report.featureSteps[0].steps[0]), true);
  assert.equal(Object.isFrozen(report.featureSteps[0].steps[0].from), true);
  assert.equal(Object.isFrozen(report.featureSteps[0].steps[0].to), true);
  assert.equal(Object.isFrozen(report.normalizations), true);
  assert.equal(Object.isFrozen(report.normalizations[0]), true);
  assert.equal(Object.isFrozen(report.warnings), true);
  assert.equal(Object.isFrozen(report.warnings[0]), true);
});

test("migration reports preserve absent optional scalar fields", () => {
  const report = createPlotJsonMigrationReport({
    sourceSchemaVersion: "1.0.0",
    targetSchemaVersion: "1.0.0",
    documentSteps: [],
    featureSteps: [],
    normalizations: [
      {
        code: "PLOTJSON_REVISION_DEFAULTED",
        path: "$.features[0].revision",
      },
    ],
    warnings: [
      {
        code: "PLOTJSON_INVALID_REVISION_DEFAULTED",
        path: "$.features[0].revision",
      },
    ],
  });

  assert.equal("featureId" in report.normalizations[0], false);
  assert.equal("plotType" in report.normalizations[0], false);
  assert.equal("featureId" in report.warnings[0], false);
  assert.equal("plotType" in report.warnings[0], false);
});

test("empty migration report arrays are detached and frozen", () => {
  const documentSteps = [];
  const featureSteps = [];
  const normalizations = [];
  const warnings = [];
  const report = createPlotJsonMigrationReport({
    sourceSchemaVersion: "1.0.0",
    targetSchemaVersion: "1.0.0",
    documentSteps,
    featureSteps,
    normalizations,
    warnings,
  });

  documentSteps.push({
    scope: "document",
    sourceVersion: "1.0.0",
    targetVersion: "2.0.0",
  });
  assert.deepEqual(report.documentSteps, []);
  assert.notEqual(report.documentSteps, documentSteps);
  assert.notEqual(report.featureSteps, featureSteps);
  assert.notEqual(report.normalizations, normalizations);
  assert.notEqual(report.warnings, warnings);
});
