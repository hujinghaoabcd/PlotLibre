import assert from "node:assert/strict";
import test from "node:test";
import {
  parsePlotDocument,
  PlotJsonError,
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
    parameters: { widthRatio: 0.1 },
    style: { lineColor: "#123456" },
    metadata: { source: "test" },
    revision: 2,
    ...overrides,
  };
}

function document(overrides = {}) {
  return {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: "document-1",
    name: "Example",
    features: [feature()],
    metadata: { owner: "tests" },
    ...overrides,
  };
}

test("readPlotDocument reads current JSON text and returns a frozen empty report", () => {
  const result = readPlotDocument(JSON.stringify(document()));

  assert.deepEqual(result.document, document());
  assert.deepEqual(result.report, {
    sourceSchemaVersion: "1.0.0",
    targetSchemaVersion: "1.0.0",
    documentSteps: [],
    featureSteps: [],
    normalizations: [],
    warnings: [],
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.document), true);
  assert.equal(Object.isFrozen(result.document.features), true);
  assert.equal(Object.isFrozen(result.document.features[0]), true);
  assert.equal(Object.isFrozen(result.document.features[0].controlPoints), true);
  assert.equal(Object.isFrozen(result.document.features[0].controlPoints[0]), true);
  assert.equal(Object.isFrozen(result.document.features[0].parameters), true);
  assert.equal(Object.isFrozen(result.document.metadata), true);
  assert.equal(Object.isFrozen(result.report), true);
});

test("parsePlotDocument remains a compatibility wrapper over the safe reader", () => {
  const input = JSON.stringify(document());
  assert.deepEqual(parsePlotDocument(input), readPlotDocument(input).document);
});

test("invalid JSON text becomes one structured syntax error", () => {
  assert.throws(
    () => readPlotDocument('{"type":'),
    (error) => {
      assert.ok(error instanceof PlotJsonError);
      assert.equal(error.code, "PLOTJSON_SYNTAX_INVALID");
      assert.equal(error.path, "$");
      assert.ok(error.cause instanceof SyntaxError);
      return true;
    },
  );
});

test("UTF-8 input size is checked before JSON.parse", () => {
  const input = JSON.stringify(document({ name: "南京" }));
  assert.throws(
    () => readPlotDocument(input, { limits: { inputBytes: 10 } }),
    (error) => {
      assert.equal(error.code, "PLOTJSON_RESOURCE_LIMIT_EXCEEDED");
      assert.equal(error.limitName, "inputBytes");
      assert.equal(error.path, "$");
      return true;
    },
  );
});

test("direct-object accessors are rejected without invoking getters", () => {
  let getterCalls = 0;
  const input = document();
  Object.defineProperty(input, "id", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "danger";
    },
  });

  assert.throws(
    () => readPlotDocument(input),
    { code: "PLOTJSON_VALUE_NOT_JSON", path: "$.id" },
  );
  assert.equal(getterCalls, 0);
});

test("historical 1.0 defaults and dropped fields are visible in the report", () => {
  const input = document({
    legacyRoot: true,
    features: [
      {
        id: "legacy-1",
        plotType: "arrow.straight",
        controlPoints: [
          [118.7, 32.0],
          [118.9, 32.2],
        ],
        parameters: [],
        metadata: "invalid",
        revision: -1,
        legacyFeature: 1,
      },
    ],
  });

  const result = readPlotDocument(input);
  assert.deepEqual(result.document.features[0], {
    id: "legacy-1",
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
  });
  assert.deepEqual(
    result.report.normalizations.map(({ code, path }) => ({ code, path })),
    [
      { code: "PLOTJSON_UNKNOWN_FIELD_DROPPED", path: "$.legacyRoot" },
      {
        code: "PLOTJSON_UNKNOWN_FIELD_DROPPED",
        path: "$.features[0].legacyFeature",
      },
      {
        code: "PLOTJSON_DEFINITION_VERSION_DEFAULTED",
        path: "$.features[0].definitionVersion",
      },
      {
        code: "PLOTJSON_PARAMETERS_DEFAULTED",
        path: "$.features[0].parameters",
      },
      { code: "PLOTJSON_STYLE_DEFAULTED", path: "$.features[0].style" },
      {
        code: "PLOTJSON_FEATURE_METADATA_DEFAULTED",
        path: "$.features[0].metadata",
      },
      {
        code: "PLOTJSON_REVISION_DEFAULTED",
        path: "$.features[0].revision",
      },
    ],
  );
  assert.deepEqual(
    result.report.warnings.map(({ code, path }) => ({ code, path })),
    [
      { code: "PLOTJSON_UNKNOWN_FIELD_DROPPED", path: "$.legacyRoot" },
      {
        code: "PLOTJSON_UNKNOWN_FIELD_DROPPED",
        path: "$.features[0].legacyFeature",
      },
      {
        code: "PLOTJSON_INVALID_RECORD_DEFAULTED",
        path: "$.features[0].parameters",
      },
      {
        code: "PLOTJSON_INVALID_RECORD_DEFAULTED",
        path: "$.features[0].metadata",
      },
      {
        code: "PLOTJSON_INVALID_REVISION_DEFAULTED",
        path: "$.features[0].revision",
      },
    ],
  );
  assert.equal("legacyRoot" in result.document, false);
  assert.equal("legacyFeature" in result.document.features[0], false);
});

test("duplicate feature ids reject the complete read", () => {
  const input = document({
    features: [feature(), feature({ plotType: "arrow.fine" })],
  });
  assert.throws(
    () => readPlotDocument(input),
    (error) => {
      assert.equal(error.code, "PLOTJSON_FEATURE_ID_DUPLICATE");
      assert.equal(error.featureId, "feature-1");
      assert.equal(error.path, "$.features[1].id");
      return true;
    },
  );
});

test("current schema rejects out-of-range latitude and malformed Definition versions", () => {
  assert.throws(
    () =>
      readPlotDocument(
        document({
          features: [
            feature({
              controlPoints: [
                [118.7, 91],
                [118.9, 32.2],
              ],
            }),
          ],
        }),
      ),
    { code: "PLOTJSON_CURRENT_SCHEMA_INVALID" },
  );
  assert.throws(
    () =>
      readPlotDocument(
        document({ features: [feature({ definitionVersion: "v1" })] }),
      ),
    { code: "PLOTJSON_DEFINITION_VERSION_INVALID" },
  );
});

test("a document migration runs on frozen cloned input and records one step", () => {
  const original = {
    type: "PlotLibreDocument",
    schemaVersion: "0.9.0",
    id: "document-1",
    name: "Legacy",
    items: [feature()],
    metadata: {},
  };
  let calls = 0;
  const migrations = new PlotJsonMigrationRegistry().registerDocument({
    fromVersion: "0.9.0",
    toVersion: "1.0.0",
    migrate(input, context) {
      calls += 1;
      assert.equal(Object.isFrozen(input), true);
      assert.equal(Object.isFrozen(input.items), true);
      assert.deepEqual(context, {
        scope: "document",
        sourceVersion: "0.9.0",
        targetVersion: "1.0.0",
      });
      assert.throws(() => {
        input.schemaVersion = "mutated";
      }, TypeError);
      return {
        type: input.type,
        schemaVersion: "1.0.0",
        id: input.id,
        name: input.name,
        features: input.items,
        metadata: input.metadata,
      };
    },
  });

  const result = readPlotDocument(original, { migrations });
  assert.equal(calls, 1);
  assert.equal(original.schemaVersion, "0.9.0");
  assert.ok("items" in original);
  assert.equal(result.document.schemaVersion, "1.0.0");
  assert.deepEqual(result.report.documentSteps, [
    {
      scope: "document",
      sourceVersion: "0.9.0",
      targetVersion: "1.0.0",
    },
  ]);
});

test("document migration failures and same-object outputs are wrapped", () => {
  const input = {
    type: "PlotLibreDocument",
    schemaVersion: "0.9.0",
    id: "document-1",
    name: "Legacy",
    features: [],
    metadata: {},
  };
  const thrown = new PlotJsonMigrationRegistry().registerDocument({
    fromVersion: "0.9.0",
    toVersion: "1.0.0",
    migrate() {
      throw new Error("boom");
    },
  });
  assert.throws(
    () => readPlotDocument(input, { migrations: thrown }),
    (error) => {
      assert.equal(error.code, "PLOTJSON_MIGRATION_OUTPUT_INVALID");
      assert.equal(error.sourceVersion, "0.9.0");
      assert.equal(error.targetVersion, "1.0.0");
      assert.equal(error.cause.message, "boom");
      return true;
    },
  );

  const same = new PlotJsonMigrationRegistry().registerDocument({
    fromVersion: "0.9.0",
    toVersion: "1.0.0",
    migrate(value) {
      return value;
    },
  });
  assert.throws(
    () => readPlotDocument(input, { migrations: same }),
    { code: "PLOTJSON_MIGRATION_OUTPUT_INVALID" },
  );
});

test("every document migration output is JSON-scanned before the next step", () => {
  const migrations = new PlotJsonMigrationRegistry()
    .registerDocument({
      fromVersion: "0.8.0",
      toVersion: "0.9.0",
      migrate(input) {
        return { ...input, schemaVersion: "0.9.0" };
      },
    })
    .registerDocument({
      fromVersion: "0.9.0",
      toVersion: "1.0.0",
      migrate(input) {
        const output = { ...input, schemaVersion: "1.0.0" };
        output.metadata = new Date();
        return output;
      },
    });

  assert.throws(
    () =>
      readPlotDocument(
        {
          type: "PlotLibreDocument",
          schemaVersion: "0.8.0",
          id: "document-1",
          name: "Legacy",
          features: [],
          metadata: {},
        },
        { migrations },
      ),
    (error) => {
      assert.equal(error.code, "PLOTJSON_MIGRATION_OUTPUT_INVALID");
      assert.equal(error.sourceVersion, "0.9.0");
      assert.equal(error.targetVersion, "1.0.0");
      return true;
    },
  );
});

test("Definition migration supports an explicit plotType rename and report", () => {
  const migrations = new PlotJsonMigrationRegistry().registerDefinition({
    from: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
    to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
    migrate(input, context) {
      assert.equal(Object.isFrozen(input), true);
      assert.equal(Object.isFrozen(input.parameters), true);
      assert.deepEqual(context, {
        scope: "definition",
        sourceVersion: "1.0.0",
        targetVersion: "2.0.0",
        featureId: "feature-1",
        sourcePlotType: "arrow.legacy",
        targetPlotType: "arrow.current",
      });
      return {
        ...input,
        plotType: "arrow.current",
        definitionVersion: "2.0.0",
        parameters: { ...input.parameters, migrated: true },
      };
    },
  });

  const result = readPlotDocument(
    document({
      features: [
        feature({
          plotType: "arrow.legacy",
          definitionVersion: "1.0.0",
        }),
      ],
    }),
    {
      migrations,
      definitionTargets: {
        "arrow.legacy": {
          plotType: "arrow.current",
          definitionVersion: "2.0.0",
        },
      },
    },
  );

  assert.equal(result.document.features[0].plotType, "arrow.current");
  assert.equal(result.document.features[0].definitionVersion, "2.0.0");
  assert.equal(result.document.features[0].parameters.migrated, true);
  assert.deepEqual(result.report.featureSteps, [
    {
      featureId: "feature-1",
      source: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
      target: { plotType: "arrow.current", definitionVersion: "2.0.0" },
      steps: [
        {
          scope: "definition",
          featureId: "feature-1",
          from: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
          to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
        },
      ],
    },
  ]);
});

test("Definition targets fail closed when missing or without a migration path", () => {
  const input = document({
    features: [
      feature({ plotType: "arrow.legacy", definitionVersion: "1.0.0" }),
    ],
  });
  assert.throws(
    () => readPlotDocument(input, { definitionTargets: {} }),
    { code: "PLOTJSON_DEFINITION_NOT_FOUND" },
  );
  assert.throws(
    () =>
      readPlotDocument(input, {
        definitionTargets: {
          "arrow.legacy": {
            plotType: "arrow.current",
            definitionVersion: "2.0.0",
          },
        },
      }),
    { code: "PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING" },
  );
});

test("Definition migration output must preserve id and exact target reference", () => {
  const input = document({
    features: [
      feature({ plotType: "arrow.legacy", definitionVersion: "1.0.0" }),
    ],
  });
  for (const migrate of [
    (value) => ({
      ...value,
      id: "other",
      plotType: "arrow.current",
      definitionVersion: "2.0.0",
    }),
    (value) => ({
      ...value,
      plotType: "arrow.wrong",
      definitionVersion: "2.0.0",
    }),
    (value) => ({
      ...value,
      plotType: "arrow.current",
      definitionVersion: "1.9.0",
    }),
  ]) {
    const migrations = new PlotJsonMigrationRegistry().registerDefinition({
      from: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
      to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
      migrate,
    });
    assert.throws(
      () =>
        readPlotDocument(input, {
          migrations,
          definitionTargets: {
            "arrow.legacy": {
              plotType: "arrow.current",
              definitionVersion: "2.0.0",
            },
          },
        }),
      { code: "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID" },
    );
  }
});

test("future and unregistered historical document versions fail closed", () => {
  assert.throws(
    () => readPlotDocument(document({ schemaVersion: "2.0.0" })),
    { code: "PLOTJSON_SCHEMA_VERSION_UNSUPPORTED" },
  );
  assert.throws(
    () => readPlotDocument(document({ schemaVersion: "0.9.0" })),
    { code: "PLOTJSON_MIGRATION_PATH_MISSING" },
  );
});

test("repeat reads are deterministic and do not mutate direct input", () => {
  const input = document({
    features: [feature({ parameters: { nested: { value: 1 } } })],
  });
  const before = JSON.stringify(input);
  const first = readPlotDocument(input);
  const second = readPlotDocument(input);

  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(first, second);
  assert.notEqual(first.document, second.document);
  assert.notEqual(first.report, second.report);
});
