import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveRegistryDefinitionTargets,
  emptyRenderBundle,
  PlotJsonMigrationRegistry,
  PlotRegistry,
  preparePlotDocumentImport,
} from "@plotlibre/core";

function definition(type, version) {
  return {
    type,
    title: type,
    category: "test",
    version,
    controlSchema: { minPoints: 2, maxPoints: 2 },
    defaultParameters: {},
    defaultStyle: {},
    generate: () => emptyRenderBundle(),
  };
}

function feature(id, definitionVersion) {
  return {
    id,
    plotType: "arrow.legacy",
    definitionVersion,
    controlPoints: [[118.7, 32.0], [118.9, 32.2]],
    parameters: {},
    style: {},
    metadata: {},
    revision: 0,
  };
}

function document(features) {
  return {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: "document-1",
    name: "History convergence",
    features,
    metadata: {},
  };
}

test("multiple historical versions of one source plotType may converge to one live target", () => {
  let firstCalls = 0;
  let secondCalls = 0;
  const migrations = new PlotJsonMigrationRegistry()
    .registerDefinition({
      from: { plotType: "arrow.legacy", definitionVersion: "0.5.0" },
      to: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
      migrate(input) {
        firstCalls += 1;
        return { ...input, definitionVersion: "1.0.0" };
      },
    })
    .registerDefinition({
      from: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
      to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
      migrate(input) {
        secondCalls += 1;
        return {
          ...input,
          plotType: "arrow.current",
          definitionVersion: "2.0.0",
        };
      },
    });
  const registry = new PlotRegistry().register(
    definition("arrow.current", "2.0.0"),
  );
  const inputFeatures = [feature("older", "0.5.0"), feature("newer", "1.0.0")];

  const targets = deriveRegistryDefinitionTargets(
    inputFeatures,
    registry,
    migrations,
  );
  assert.deepEqual(targets["arrow.legacy"], {
    plotType: "arrow.current",
    definitionVersion: "2.0.0",
  });

  const result = preparePlotDocumentImport(
    document(inputFeatures),
    registry,
    { migrations },
  );
  assert.deepEqual(
    result.document.features.map(({ id, plotType, definitionVersion }) => ({
      id,
      plotType,
      definitionVersion,
    })),
    [
      { id: "older", plotType: "arrow.current", definitionVersion: "2.0.0" },
      { id: "newer", plotType: "arrow.current", definitionVersion: "2.0.0" },
    ],
  );
  assert.equal(firstCalls, 1);
  assert.equal(secondCalls, 2);
  assert.equal(result.report.featureSteps.length, 2);
  assert.equal(result.report.featureSteps[0].steps.length, 2);
  assert.equal(result.report.featureSteps[1].steps.length, 1);
});

test("one source plotType cannot resolve different historical versions to different live targets", () => {
  const migrations = new PlotJsonMigrationRegistry()
    .registerDefinition({
      from: { plotType: "arrow.legacy", definitionVersion: "0.5.0" },
      to: { plotType: "arrow.current-a", definitionVersion: "1.0.0" },
      migrate(input) {
        return {
          ...input,
          plotType: "arrow.current-a",
          definitionVersion: "1.0.0",
        };
      },
    })
    .registerDefinition({
      from: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
      to: { plotType: "arrow.current-b", definitionVersion: "2.0.0" },
      migrate(input) {
        return {
          ...input,
          plotType: "arrow.current-b",
          definitionVersion: "2.0.0",
        };
      },
    });
  const registry = new PlotRegistry()
    .register(definition("arrow.current-a", "1.0.0"))
    .register(definition("arrow.current-b", "2.0.0"));

  assert.throws(
    () =>
      deriveRegistryDefinitionTargets(
        [feature("older", "0.5.0"), feature("newer", "1.0.0")],
        registry,
        migrations,
      ),
    (error) => {
      assert.equal(error.code, "PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING");
      assert.equal(error.plotType, "arrow.legacy");
      return true;
    },
  );
});
