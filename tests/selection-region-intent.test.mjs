import assert from "node:assert/strict";
import test from "node:test";
import { PlotStore } from "@plotlibre/core";
import { SelectionController } from "@plotlibre/interaction";

function createController(ids = ["a", "b", "c", "d", "e"]) {
  const store = new PlotStore();
  for (const [index, id] of ids.entries()) {
    store.add({
      id,
      plotType: "test.selection-region",
      controlPoints: [[118.7 + index * 0.01, 32]],
    });
  }
  return new SelectionController(store);
}

test("applyMany replace deduplicates once and empty replace clears", () => {
  const controller = createController();
  controller.replace(["d"]);
  assert.deepEqual(controller.applyMany(["b", "a", "b", "c"], "replace", "box"), {
    selectedIds: ["b", "a", "c"],
    primaryId: "c",
    revision: 2,
  });
  assert.deepEqual(controller.applyMany([], "replace", "box"), {
    selectedIds: [],
    revision: 3,
  });
});

test("applyMany add appends only new ids and preserves primary for no-op", () => {
  const controller = createController();
  controller.replace(["b", "a"]);
  assert.deepEqual(controller.applyMany(["a", "c", "d"], "add", "box"), {
    selectedIds: ["b", "a", "c", "d"],
    primaryId: "d",
    revision: 2,
  });
  const before = controller.snapshot();
  const after = controller.applyMany(["a", "c"], "add", "box");
  assert.deepEqual(after, before);
  assert.equal(controller.primaryId, "d");
});

test("applyMany subtract preserves survivor order and primary fallback", () => {
  const controller = createController();
  controller.replace(["a", "b", "c", "d"]);
  assert.deepEqual(controller.applyMany(["b", "d"], "subtract", "lasso"), {
    selectedIds: ["a", "c"],
    primaryId: "c",
    revision: 2,
  });
  const before = controller.snapshot();
  assert.deepEqual(controller.applyMany([], "subtract", "lasso"), before);
});

test("applyMany toggle removes selected candidates then appends new ids in input order", () => {
  const controller = createController();
  controller.replace(["a", "b", "c"]);
  assert.deepEqual(controller.applyMany(["b", "d", "a", "e"], "toggle", "box"), {
    selectedIds: ["c", "d", "e"],
    primaryId: "e",
    revision: 2,
  });
  assert.deepEqual(controller.applyMany(["c", "d", "e"], "toggle", "box"), {
    selectedIds: [],
    revision: 3,
  });
});

test("applyMany validates every id before one mutation", () => {
  const controller = createController();
  controller.replace(["a", "b"]);
  assert.throws(
    () => controller.applyMany(["c", "missing", "d"], "add", "lasso"),
    /No plot feature exists with id "missing"/,
  );
  assert.deepEqual(controller.snapshot(), {
    selectedIds: ["a", "b"],
    primaryId: "b",
    revision: 1,
  });
});

test("applyMany emits one immutable region event and none for no-ops", () => {
  const controller = createController();
  const changes = [];
  controller.subscribe((change) => changes.push(change));

  controller.applyMany(["a", "b", "c"], "replace", "box");
  controller.applyMany(["a", "b", "c"], "replace", "box");
  controller.applyMany([], "add", "lasso");
  controller.applyMany(["b", "d"], "toggle", "lasso");

  assert.equal(changes.length, 2);
  assert.deepEqual(changes.map((change) => change.reason), ["box", "lasso"]);
  assert.equal(Object.isFrozen(changes[0]), true);
  assert.deepEqual(changes[1].before.selectedIds, ["a", "b", "c"]);
  assert.deepEqual(changes[1].after.selectedIds, ["a", "c", "d"]);
});
