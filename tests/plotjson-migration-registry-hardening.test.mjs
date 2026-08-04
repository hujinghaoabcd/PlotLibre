import assert from "node:assert/strict";
import test from "node:test";
import { PlotJsonMigrationRegistry } from "@plotlibre/core";

const identity = (input) => input;

function version(index) {
  return `1.${index}.0`;
}

test("a long document chain plans iteratively in exact order", () => {
  const registry = new PlotJsonMigrationRegistry();
  const stepCount = 256;
  for (let index = stepCount - 1; index >= 0; index -= 1) {
    registry.registerDocument({
      fromVersion: version(index),
      toVersion: version(index + 1),
      migrate: identity,
    });
  }

  const plan = registry.planDocument(version(0), version(stepCount));
  assert.equal(plan.length, stepCount);
  assert.equal(plan[0].fromVersion, version(0));
  assert.equal(plan[0].toVersion, version(1));
  assert.equal(plan.at(-1).fromVersion, version(stepCount - 1));
  assert.equal(plan.at(-1).toVersion, version(stepCount));
  for (let index = 0; index < stepCount; index += 1) {
    assert.equal(plan[index].fromVersion, version(index));
    assert.equal(plan[index].toVersion, version(index + 1));
  }
});

test("an exact Definition reference returns one shared frozen empty plan", () => {
  const registry = new PlotJsonMigrationRegistry();
  const reference = {
    plotType: "arrow.straight",
    definitionVersion: "1.0.0",
  };
  const first = registry.planDefinition(reference, reference);
  const second = registry.planDefinition(
    { ...reference },
    { ...reference },
  );

  assert.deepEqual(first, []);
  assert.equal(first, second);
  assert.equal(Object.isFrozen(first), true);
});

test("document registration copies descriptor fields before caller mutation", () => {
  const registration = {
    fromVersion: "1.0.0",
    toVersion: "2.0.0",
    migrate: identity,
  };
  const registry = new PlotJsonMigrationRegistry().registerDocument(
    registration,
  );

  registration.fromVersion = "9.0.0";
  registration.toVersion = "10.0.0";
  registration.migrate = () => {
    throw new Error("mutated function");
  };

  const [stored] = registry.documentMigrations;
  assert.equal(stored.fromVersion, "1.0.0");
  assert.equal(stored.toVersion, "2.0.0");
  assert.equal(stored.migrate, identity);
  assert.equal(Object.isFrozen(stored), true);
});

test("snapshot arrays are fresh, frozen views over stable frozen steps", () => {
  const registry = new PlotJsonMigrationRegistry()
    .registerDocument({
      fromVersion: "1.0.0",
      toVersion: "2.0.0",
      migrate: identity,
    })
    .registerDefinition({
      from: { plotType: "old", definitionVersion: "1.0.0" },
      to: { plotType: "new", definitionVersion: "2.0.0" },
      migrate: identity,
    });

  const documentsA = registry.documentMigrations;
  const documentsB = registry.documentMigrations;
  const definitionsA = registry.definitionMigrations;
  const definitionsB = registry.definitionMigrations;

  assert.notEqual(documentsA, documentsB);
  assert.notEqual(definitionsA, definitionsB);
  assert.equal(documentsA[0], documentsB[0]);
  assert.equal(definitionsA[0], definitionsB[0]);
  assert.equal(Object.isFrozen(documentsA), true);
  assert.equal(Object.isFrozen(definitionsA), true);
});

test("invalid target versions fail before consulting registered chains", () => {
  const registry = new PlotJsonMigrationRegistry().registerDocument({
    fromVersion: "1.0.0",
    toVersion: "2.0.0",
    migrate: identity,
  });

  assert.throws(
    () => registry.planDocument("1.0.0", "v2"),
    { code: "PLOTJSON_SCHEMA_VERSION_INVALID" },
  );
  assert.throws(
    () =>
      registry.planDefinition(
        { plotType: "old", definitionVersion: "1.0.0" },
        { plotType: "new", definitionVersion: "v2" },
      ),
    { code: "PLOTJSON_DEFINITION_VERSION_INVALID" },
  );
});
