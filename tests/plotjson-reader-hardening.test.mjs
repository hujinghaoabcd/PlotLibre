import assert from "node:assert/strict";
import test from "node:test";
import {
  PlotJsonMigrationRegistry,
  readPlotDocument,
} from "@plotlibre/core";

function feature(overrides = {}) {
  return {
    id: "feature-1",
    plotType: "arrow.straight",
    definitionVersion: "1.0.0",
    controlPoints: [
      [118.7, 32.0],
      [118.9, 32.2],
    ],
    parameters: {},
    style: {},
    metadata: {},
    revision: 0,
    ...overrides,
  };
}

function currentDocument(overrides = {}) {
  return {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: "document-1",
    name: "Example",
    features: [feature()],
    metadata: {},
    ...overrides,
  };
}

function legacyDocument(version = "0.9.0") {
  return {
    type: "PlotLibreDocument",
    schemaVersion: version,
    id: "document-1",
    name: "Legacy",
    features: [feature()],
    metadata: {},
  };
}

function definitionOptions(migrations) {
  return {
    migrations,
    definitionTargets: {
      "arrow.straight": {
        plotType: "arrow.current",
        definitionVersion: "2.0.0",
      },
    },
  };
}

test("document migration output accessors reject without invoking getters", () => {
  let getterCalls = 0;
  const migrations = new PlotJsonMigrationRegistry().registerDocument({
    fromVersion: "0.9.0",
    toVersion: "1.0.0",
    migrate(input) {
      const output = { ...input, schemaVersion: "1.0.0" };
      Object.defineProperty(output, "metadata", {
        enumerable: true,
        get() {
          getterCalls += 1;
          return {};
        },
      });
      return output;
    },
  });

  assert.throws(
    () => readPlotDocument(legacyDocument(), { migrations }),
    (error) => {
      assert.equal(error.code, "PLOTJSON_MIGRATION_OUTPUT_INVALID");
      assert.equal(error.cause.code, "PLOTJSON_VALUE_NOT_JSON");
      assert.equal(error.cause.path, "$.metadata");
      return true;
    },
  );
  assert.equal(getterCalls, 0);
});

test("async migration results fail the synchronous JSON-object contract", () => {
  const migrations = new PlotJsonMigrationRegistry().registerDocument({
    fromVersion: "0.9.0",
    toVersion: "1.0.0",
    async migrate(input) {
      return { ...input, schemaVersion: "1.0.0" };
    },
  });

  assert.throws(
    () => readPlotDocument(legacyDocument(), { migrations }),
    (error) => {
      assert.equal(error.code, "PLOTJSON_MIGRATION_OUTPUT_INVALID");
      assert.equal(error.sourceVersion, "0.9.0");
      assert.equal(error.targetVersion, "1.0.0");
      return true;
    },
  );
});

test("migration outputs are rescanned against caller resource limits", () => {
  const migrations = new PlotJsonMigrationRegistry().registerDocument({
    fromVersion: "0.9.0",
    toVersion: "1.0.0",
    migrate(input) {
      return {
        ...input,
        schemaVersion: "1.0.0",
        metadata: { oversized: "x".repeat(101) },
      };
    },
  });

  assert.throws(
    () =>
      readPlotDocument(legacyDocument(), {
        migrations,
        limits: { maxStringLength: 100 },
      }),
    (error) => {
      assert.equal(error.code, "PLOTJSON_MIGRATION_OUTPUT_INVALID");
      assert.equal(error.cause.code, "PLOTJSON_RESOURCE_LIMIT_EXCEEDED");
      assert.equal(error.cause.limitName, "maxStringLength");
      assert.equal(error.cause.path, "$.metadata.oversized");
      return true;
    },
  );
});

test("two document migrations execute and report in exact chain order", () => {
  const calls = [];
  const migrations = new PlotJsonMigrationRegistry()
    .registerDocument({
      fromVersion: "0.8.0",
      toVersion: "0.9.0",
      migrate(input, context) {
        calls.push(context.sourceVersion);
        return { ...input, schemaVersion: "0.9.0" };
      },
    })
    .registerDocument({
      fromVersion: "0.9.0",
      toVersion: "1.0.0",
      migrate(input, context) {
        calls.push(context.sourceVersion);
        return { ...input, schemaVersion: "1.0.0" };
      },
    });

  const result = readPlotDocument(legacyDocument("0.8.0"), { migrations });
  assert.deepEqual(calls, ["0.8.0", "0.9.0"]);
  assert.deepEqual(result.report.documentSteps, [
    {
      scope: "document",
      sourceVersion: "0.8.0",
      targetVersion: "0.9.0",
    },
    {
      scope: "document",
      sourceVersion: "0.9.0",
      targetVersion: "1.0.0",
    },
  ]);
  assert.equal(Object.isFrozen(result.report.documentSteps), true);
  assert.equal(Object.isFrozen(result.report.documentSteps[0]), true);
});

test("an exact Definition target performs no migration and emits no feature record", () => {
  const result = readPlotDocument(currentDocument(), {
    definitionTargets: {
      "arrow.straight": {
        plotType: "arrow.straight",
        definitionVersion: "1.0.0",
      },
    },
  });

  assert.equal(result.document.features[0].plotType, "arrow.straight");
  assert.equal(result.document.features[0].definitionVersion, "1.0.0");
  assert.deepEqual(result.report.featureSteps, []);
});

test("Definition migration cannot return its frozen input object", () => {
  const migrations = new PlotJsonMigrationRegistry().registerDefinition({
    from: { plotType: "arrow.straight", definitionVersion: "1.0.0" },
    to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
    migrate(input) {
      return input;
    },
  });

  assert.throws(
    () => readPlotDocument(currentDocument(), definitionOptions(migrations)),
    (error) => {
      assert.equal(error.code, "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID");
      assert.equal(error.featureId, "feature-1");
      assert.equal(error.sourceVersion, "1.0.0");
      assert.equal(error.targetVersion, "2.0.0");
      return true;
    },
  );
});

test("Definition migration cycles reject and do not mutate caller input", () => {
  const input = currentDocument();
  const before = JSON.stringify(input);
  const migrations = new PlotJsonMigrationRegistry().registerDefinition({
    from: { plotType: "arrow.straight", definitionVersion: "1.0.0" },
    to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
    migrate(value) {
      const output = {
        ...value,
        plotType: "arrow.current",
        definitionVersion: "2.0.0",
      };
      output.metadata = output;
      return output;
    },
  });

  assert.throws(
    () => readPlotDocument(input, definitionOptions(migrations)),
    (error) => {
      assert.equal(error.code, "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID");
      assert.equal(error.cause.code, "PLOTJSON_VALUE_CYCLIC");
      assert.equal(error.cause.path, "$.features[0].metadata");
      return true;
    },
  );
  assert.equal(JSON.stringify(input), before);
});

test("Definition migration output accessors reject without getter invocation", () => {
  let getterCalls = 0;
  const migrations = new PlotJsonMigrationRegistry().registerDefinition({
    from: { plotType: "arrow.straight", definitionVersion: "1.0.0" },
    to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
    migrate(value) {
      const output = {
        ...value,
        plotType: "arrow.current",
        definitionVersion: "2.0.0",
      };
      Object.defineProperty(output, "parameters", {
        enumerable: true,
        get() {
          getterCalls += 1;
          return {};
        },
      });
      return output;
    },
  });

  assert.throws(
    () => readPlotDocument(currentDocument(), definitionOptions(migrations)),
    (error) => {
      assert.equal(error.code, "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID");
      assert.equal(error.cause.code, "PLOTJSON_VALUE_NOT_JSON");
      assert.equal(error.cause.path, "$.features[0].parameters");
      return true;
    },
  );
  assert.equal(getterCalls, 0);
});
