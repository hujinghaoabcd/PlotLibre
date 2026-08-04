import assert from "node:assert/strict";
import test from "node:test";
import {
  PlotJsonError,
  PlotJsonMigrationRegistry,
  PlotJsonMigrationRegistryError,
  PlotLibreError,
} from "@plotlibre/core";

const identity = (input) => input;

function documentStep(fromVersion, toVersion, migrate = identity) {
  return { fromVersion, toVersion, migrate };
}

function definitionStep(
  fromPlotType,
  fromVersion,
  toPlotType,
  toVersion,
  migrate = identity,
) {
  return {
    from: {
      plotType: fromPlotType,
      definitionVersion: fromVersion,
    },
    to: {
      plotType: toPlotType,
      definitionVersion: toVersion,
    },
    migrate,
  };
}

test("document planning follows one deterministic chain", () => {
  const registry = new PlotJsonMigrationRegistry()
    .registerDocument(documentStep("1.1.0", "2.0.0"))
    .registerDocument(documentStep("1.0.0", "1.1.0"));

  const plan = registry.planDocument("1.0.0", "2.0.0");
  assert.deepEqual(
    plan.map(({ scope, fromVersion, toVersion }) => ({
      scope,
      fromVersion,
      toVersion,
    })),
    [
      { scope: "document", fromVersion: "1.0.0", toVersion: "1.1.0" },
      { scope: "document", fromVersion: "1.1.0", toVersion: "2.0.0" },
    ],
  );
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(plan.every(Object.isFrozen), true);
});

test("document registration order does not change snapshots or plans", () => {
  const forward = new PlotJsonMigrationRegistry()
    .registerDocument(documentStep("1.0.0", "1.1.0"))
    .registerDocument(documentStep("1.1.0", "2.0.0"));
  const reverse = new PlotJsonMigrationRegistry()
    .registerDocument(documentStep("1.1.0", "2.0.0"))
    .registerDocument(documentStep("1.0.0", "1.1.0"));

  const summarize = (steps) =>
    steps.map(({ fromVersion, toVersion }) => [fromVersion, toVersion]);
  assert.deepEqual(
    summarize(forward.documentMigrations),
    summarize(reverse.documentMigrations),
  );
  assert.deepEqual(
    summarize(forward.planDocument("1.0.0", "2.0.0")),
    summarize(reverse.planDocument("1.0.0", "2.0.0")),
  );
  assert.equal(Object.isFrozen(forward.documentMigrations), true);
});

test("planning an exact document version returns one shared frozen empty plan", () => {
  const registry = new PlotJsonMigrationRegistry();
  const first = registry.planDocument("1.0.0", "1.0.0");
  const second = registry.planDocument("1.0.0", "1.0.0");
  assert.deepEqual(first, []);
  assert.equal(first, second);
  assert.equal(Object.isFrozen(first), true);
});

test("document planning rejects missing and overshooting chains", () => {
  const missing = new PlotJsonMigrationRegistry().registerDocument(
    documentStep("1.0.0", "1.1.0"),
  );
  assert.throws(
    () => missing.planDocument("1.0.0", "2.0.0"),
    (error) => {
      assert.ok(error instanceof PlotJsonError);
      assert.equal(error.code, "PLOTJSON_MIGRATION_PATH_MISSING");
      assert.equal(error.sourceVersion, "1.0.0");
      assert.equal(error.targetVersion, "2.0.0");
      return true;
    },
  );

  const overshoot = new PlotJsonMigrationRegistry().registerDocument(
    documentStep("1.0.0", "3.0.0"),
  );
  assert.throws(
    () => overshoot.planDocument("1.0.0", "2.0.0"),
    { code: "PLOTJSON_MIGRATION_PATH_MISSING" },
  );
});

test("document planning rejects a source newer than its target", () => {
  assert.throws(
    () => new PlotJsonMigrationRegistry().planDocument("2.0.0", "1.0.0"),
    (error) => {
      assert.equal(error.code, "PLOTJSON_SCHEMA_VERSION_UNSUPPORTED");
      assert.equal(error.sourceVersion, "2.0.0");
      assert.equal(error.targetVersion, "1.0.0");
      return true;
    },
  );
});

test("one document source cannot branch or be registered twice", () => {
  const registry = new PlotJsonMigrationRegistry().registerDocument(
    documentStep("1.0.0", "1.1.0"),
  );
  for (const duplicate of [
    documentStep("1.0.0", "1.1.0"),
    documentStep("1.0.0", "2.0.0"),
  ]) {
    assert.throws(
      () => registry.registerDocument(duplicate),
      (error) => {
        assert.ok(error instanceof PlotJsonMigrationRegistryError);
        assert.ok(error instanceof PlotLibreError);
        assert.equal(error.code, "PLOTJSON_MIGRATION_SOURCE_DUPLICATE");
        assert.equal(error.scope, "document");
        assert.equal(error.sourceVersion, "1.0.0");
        return true;
      },
    );
  }
});

test("document registration rejects self, decreasing, malformed and missing-function edges", () => {
  for (const migration of [
    documentStep("1.0.0", "1.0.0"),
    documentStep("2.0.0", "1.0.0"),
    documentStep("01.0.0", "2.0.0"),
    { fromVersion: "1.0.0", toVersion: "2.0.0", migrate: null },
    null,
  ]) {
    assert.throws(
      () => new PlotJsonMigrationRegistry().registerDocument(migration),
      (error) => {
        assert.ok(error instanceof PlotJsonMigrationRegistryError);
        assert.equal(error.code, "PLOTJSON_MIGRATION_REGISTRATION_INVALID");
        return true;
      },
    );
  }
});

test("definition planning supports an explicit plotType rename chain", () => {
  const registry = new PlotJsonMigrationRegistry()
    .registerDefinition(
      definitionStep("arrow.legacy", "1.0.0", "arrow.bridge", "1.1.0"),
    )
    .registerDefinition(
      definitionStep("arrow.bridge", "1.1.0", "arrow.current", "2.0.0"),
    );

  const plan = registry.planDefinition(
    { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
    { plotType: "arrow.current", definitionVersion: "2.0.0" },
  );
  assert.deepEqual(
    plan.map(({ from, to }) => ({ from, to })),
    [
      {
        from: { plotType: "arrow.legacy", definitionVersion: "1.0.0" },
        to: { plotType: "arrow.bridge", definitionVersion: "1.1.0" },
      },
      {
        from: { plotType: "arrow.bridge", definitionVersion: "1.1.0" },
        to: { plotType: "arrow.current", definitionVersion: "2.0.0" },
      },
    ],
  );
  assert.equal(Object.isFrozen(plan), true);
  for (const step of plan) {
    assert.equal(step.scope, "definition");
    assert.equal(Object.isFrozen(step), true);
    assert.equal(Object.isFrozen(step.from), true);
    assert.equal(Object.isFrozen(step.to), true);
  }
});

test("definition planning handles same-type version chains", () => {
  const registry = new PlotJsonMigrationRegistry()
    .registerDefinition(
      definitionStep("arrow.straight", "1.0.0", "arrow.straight", "1.1.0"),
    )
    .registerDefinition(
      definitionStep("arrow.straight", "1.1.0", "arrow.straight", "1.2.0"),
    );
  assert.equal(
    registry.planDefinition(
      { plotType: "arrow.straight", definitionVersion: "1.0.0" },
      { plotType: "arrow.straight", definitionVersion: "1.2.0" },
    ).length,
    2,
  );
});

test("definition registration order produces one sorted deterministic snapshot", () => {
  const registry = new PlotJsonMigrationRegistry()
    .registerDefinition(
      definitionStep("z.plot", "1.0.0", "z.plot", "2.0.0"),
    )
    .registerDefinition(
      definitionStep("a.plot", "2.0.0", "a.plot", "3.0.0"),
    )
    .registerDefinition(
      definitionStep("a.plot", "1.0.0", "a.plot", "2.0.0"),
    );

  assert.deepEqual(
    registry.definitionMigrations.map((step) => [
      step.from.plotType,
      step.from.definitionVersion,
    ]),
    [
      ["a.plot", "1.0.0"],
      ["a.plot", "2.0.0"],
      ["z.plot", "1.0.0"],
    ],
  );
  assert.equal(Object.isFrozen(registry.definitionMigrations), true);
});

test("one Definition reference cannot branch even across plotType renames", () => {
  const registry = new PlotJsonMigrationRegistry().registerDefinition(
    definitionStep("old", "1.0.0", "new-a", "2.0.0"),
  );
  assert.throws(
    () =>
      registry.registerDefinition(
        definitionStep("old", "1.0.0", "new-b", "2.0.0"),
      ),
    (error) => {
      assert.equal(error.code, "PLOTJSON_MIGRATION_SOURCE_DUPLICATE");
      assert.equal(error.scope, "definition");
      assert.equal(error.plotType, "old");
      return true;
    },
  );
});

test("Definition registration rejects non-increasing versions and invalid references", () => {
  for (const migration of [
    definitionStep("old", "1.0.0", "new", "1.0.0"),
    definitionStep("old", "2.0.0", "new", "1.0.0"),
    definitionStep("", "1.0.0", "new", "2.0.0"),
    definitionStep("old", "1.0", "new", "2.0.0"),
    { from: null, to: null, migrate: identity },
  ]) {
    assert.throws(
      () => new PlotJsonMigrationRegistry().registerDefinition(migration),
      { code: "PLOTJSON_MIGRATION_REGISTRATION_INVALID" },
    );
  }
});

test("Definition planning rejects incomplete, overshooting and wrong-type targets", () => {
  const registry = new PlotJsonMigrationRegistry().registerDefinition(
    definitionStep("old", "1.0.0", "middle", "2.0.0"),
  );
  for (const target of [
    { plotType: "current", definitionVersion: "3.0.0" },
    { plotType: "current", definitionVersion: "1.5.0" },
    { plotType: "other", definitionVersion: "1.0.0" },
  ]) {
    assert.throws(
      () =>
        registry.planDefinition(
          { plotType: "old", definitionVersion: "1.0.0" },
          target,
        ),
      (error) => {
        assert.equal(
          error.code,
          "PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING",
        );
        assert.equal(error.plotType, "old");
        return true;
      },
    );
  }
});

test("Definition planning rejects newer and malformed source versions", () => {
  const registry = new PlotJsonMigrationRegistry();
  assert.throws(
    () =>
      registry.planDefinition(
        { plotType: "arrow", definitionVersion: "2.0.0" },
        { plotType: "arrow", definitionVersion: "1.0.0" },
      ),
    { code: "PLOTJSON_DEFINITION_VERSION_UNSUPPORTED" },
  );
  assert.throws(
    () =>
      registry.planDefinition(
        { plotType: "arrow", definitionVersion: "v1" },
        { plotType: "arrow", definitionVersion: "2.0.0" },
      ),
    { code: "PLOTJSON_DEFINITION_VERSION_INVALID" },
  );
  assert.throws(
    () =>
      registry.planDefinition(
        { plotType: "", definitionVersion: "1.0.0" },
        { plotType: "arrow", definitionVersion: "2.0.0" },
      ),
    { code: "PLOTJSON_DEFINITION_NOT_FOUND" },
  );
});

test("planning never invokes trusted migration functions", () => {
  let calls = 0;
  const migrate = (input) => {
    calls += 1;
    return input;
  };
  const registry = new PlotJsonMigrationRegistry()
    .registerDocument(documentStep("1.0.0", "2.0.0", migrate))
    .registerDefinition(
      definitionStep("old", "1.0.0", "new", "2.0.0", migrate),
    );

  registry.planDocument("1.0.0", "2.0.0");
  registry.planDefinition(
    { plotType: "old", definitionVersion: "1.0.0" },
    { plotType: "new", definitionVersion: "2.0.0" },
  );
  void registry.documentMigrations;
  void registry.definitionMigrations;
  assert.equal(calls, 0);
});

test("registration copies and freezes Definition references", () => {
  const from = { plotType: "old", definitionVersion: "1.0.0" };
  const to = { plotType: "new", definitionVersion: "2.0.0" };
  const registry = new PlotJsonMigrationRegistry().registerDefinition({
    from,
    to,
    migrate: identity,
  });
  from.plotType = "mutated";
  to.definitionVersion = "9.0.0";

  const [stored] = registry.definitionMigrations;
  assert.deepEqual(stored.from, {
    plotType: "old",
    definitionVersion: "1.0.0",
  });
  assert.deepEqual(stored.to, {
    plotType: "new",
    definitionVersion: "2.0.0",
  });
  assert.equal(Object.isFrozen(stored.from), true);
  assert.equal(Object.isFrozen(stored.to), true);
});
