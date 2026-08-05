import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveRegistryDefinitionTargets,
  emptyRenderBundle,
  PlotJsonMigrationRegistry,
  PlotRegistry,
  preparePlotDocumentImport,
} from "@plotlibre/core";

function definition(type, version, options = {}) {
  return {
    type,
    title: type,
    category: "test",
    version,
    controlSchema: { minPoints: 2, maxPoints: 3 },
    defaultParameters: {},
    defaultStyle: {},
    canonicalizeControlPoints: options.canonicalizeControlPoints,
    validate: options.validate,
    generate: options.generate ?? (() => emptyRenderBundle()),
  };
}

function feature(overrides = {}) {
  return {
    id: "feature-1",
    plotType: "arrow.current",
    definitionVersion: "2.0.0",
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

function document(overrides = {}) {
  return {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: "document-1",
    name: "Import",
    features: [feature()],
    metadata: {},
    ...overrides,
  };
}

test("exact live Definitions require no migration and are Registry-preflighted", () => {
  let generated = 0;
  const registry = new PlotRegistry().register(
    definition("arrow.current", "2.0.0", {
      canonicalizeControlPoints: ({ feature }) =>
        [...feature.controlPoints].reverse(),
      generate() {
        generated += 1;
        return emptyRenderBundle();
      },
    }),
  );

  const result = preparePlotDocumentImport(document(), registry);
  assert.equal(generated, 1);
  assert.deepEqual(result.document.features[0].controlPoints, [
    [118.9, 32.2],
    [118.7, 32.0],
  ]);
  assert.deepEqual(result.report.documentSteps, []);
  assert.deepEqual(result.report.featureSteps, []);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.document), true);
  assert.equal(Object.isFrozen(result.document.features[0]), true);
  assert.equal(Object.isFrozen(result.report), true);
});

test("document and Definition migrations each execute exactly once and merge reports", () => {
  let documentCalls = 0;
  let definitionCalls = 0;
  const migrations = new PlotJsonMigrationRegistry()
    .registerDocument({
      fromVersion: "0.9.0",
      toVersion: "1.0.0",
      migrate(input) {
        documentCalls += 1;
        return {
          type: input.type,
          schemaVersion: "1.0.0",
          id: input.id,
          name: input.name,
          features: input.items,
          metadata: input.metadata,
        };
      },
    })
    .registerDefinition({
      from: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
      to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
      migrate(input) {
        definitionCalls += 1;
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
  const input = {
    type: "PlotLibreDocument",
    schemaVersion: "0.9.0",
    id: "legacy-document",
    name: "Legacy",
    items: [
      feature({
        plotType: "arrow.legacy",
        definitionVersion: "1.0.0",
      }),
    ],
    metadata: {},
  };

  const result = preparePlotDocumentImport(input, registry, { migrations });
  assert.equal(documentCalls, 1);
  assert.equal(definitionCalls, 1);
  assert.equal(result.document.features[0].plotType, "arrow.current");
  assert.deepEqual(result.report.documentSteps, [
    {
      scope: "document",
      sourceVersion: "0.9.0",
      targetVersion: "1.0.0",
    },
  ]);
  assert.equal(result.report.featureSteps.length, 1);
  assert.equal(result.report.featureSteps[0].source.plotType, "arrow.legacy");
  assert.equal(result.report.featureSteps[0].target.plotType, "arrow.current");
});

test("target derivation follows a unique rename chain to the first exact live Definition", () => {
  const migrations = new PlotJsonMigrationRegistry()
    .registerDefinition({
      from: { plotType: "arrow.old", definitionVersion: "1.0.0" },
      to: { plotType: "arrow.bridge", definitionVersion: "1.5.0" },
      migrate(input) {
        return {
          ...input,
          plotType: "arrow.bridge",
          definitionVersion: "1.5.0",
        };
      },
    })
    .registerDefinition({
      from: { plotType: "arrow.bridge", definitionVersion: "1.5.0" },
      to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
      migrate(input) {
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
  const targets = deriveRegistryDefinitionTargets(
    [feature({ plotType: "arrow.old", definitionVersion: "1.0.0" })],
    registry,
    migrations,
  );

  assert.deepEqual(targets["arrow.old"], {
    plotType: "arrow.current",
    definitionVersion: "2.0.0",
  });
  assert.equal(Object.getPrototypeOf(targets), null);
  assert.equal(Object.isFrozen(targets), true);
});

test("an exact live source wins even when migration history has a newer outgoing edge", () => {
  const migrations = new PlotJsonMigrationRegistry().registerDefinition({
    from: { plotType: "arrow.live", definitionVersion: "1.0.0" },
    to: { plotType: "arrow.new", definitionVersion: "2.0.0" },
    migrate(input) {
      return {
        ...input,
        plotType: "arrow.new",
        definitionVersion: "2.0.0",
      };
    },
  });
  const registry = new PlotRegistry()
    .register(definition("arrow.live", "1.0.0"))
    .register(definition("arrow.new", "2.0.0"));

  const targets = deriveRegistryDefinitionTargets(
    [feature({ plotType: "arrow.live", definitionVersion: "1.0.0" })],
    registry,
    migrations,
  );
  assert.deepEqual(targets["arrow.live"], {
    plotType: "arrow.live",
    definitionVersion: "1.0.0",
  });
});

test("unknown, incomplete and future Definition histories fail closed", () => {
  const registry = new PlotRegistry().register(
    definition("arrow.current", "2.0.0"),
  );

  assert.throws(
    () =>
      preparePlotDocumentImport(
        document({
          features: [
            feature({ plotType: "arrow.unknown", definitionVersion: "1.0.0" }),
          ],
        }),
        registry,
      ),
    { code: "PLOTJSON_DEFINITION_NOT_FOUND" },
  );

  assert.throws(
    () =>
      preparePlotDocumentImport(
        document({
          features: [
            feature({ plotType: "arrow.current", definitionVersion: "1.0.0" }),
          ],
        }),
        registry,
      ),
    { code: "PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING" },
  );

  assert.throws(
    () =>
      preparePlotDocumentImport(
        document({
          features: [
            feature({ plotType: "arrow.current", definitionVersion: "3.0.0" }),
          ],
        }),
        registry,
      ),
    { code: "PLOTJSON_DEFINITION_VERSION_UNSUPPORTED" },
  );
});

test("non-canonical live Definition versions reject before generation", () => {
  const registry = new PlotRegistry().register(
    definition("arrow.current", "v2"),
  );
  assert.throws(
    () => preparePlotDocumentImport(document(), registry),
    { code: "PLOTJSON_DEFINITION_VERSION_INVALID" },
  );
});

test("Registry validation and generation failures expose no prepared result", () => {
  const registry = new PlotRegistry().register(
    definition("arrow.current", "2.0.0", {
      validate: () => ({
        valid: false,
        issues: [
          { code: "REJECTED", message: "Rejected import.", severity: "error" },
        ],
      }),
    }),
  );
  assert.throws(
    () => preparePlotDocumentImport(document(), registry),
    /Rejected import/,
  );
});
