import assert from "node:assert/strict";
import test from "node:test";
import { PlotStore } from "@plotlibre/core";
import { SelectionController } from "@plotlibre/interaction";

function createStore(ids = ["a", "b", "c", "d"]) {
  const store = new PlotStore();
  for (const [index, id] of ids.entries()) {
    store.add({
      id,
      plotType: "test.selection",
      controlPoints: [[118.8 + index * 0.01, 32]],
    });
  }
  return store;
}

test("selection starts empty with an immutable revision-zero snapshot", () => {
  const controller = new SelectionController(createStore());
  const snapshot = controller.snapshot();
  assert.deepEqual(snapshot, { selectedIds: [], revision: 0 });
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.selectedIds), true);
  assert.equal(controller.primaryId, undefined);
  assert.equal(controller.size, 0);
});

test("replace deduplicates by first occurrence and makes primary final", () => {
  const controller = new SelectionController(createStore());
  const snapshot = controller.replace(["a", "b", "a", "c"], "b");
  assert.deepEqual(snapshot, {
    selectedIds: ["a", "c", "b"],
    primaryId: "b",
    revision: 1,
  });
  assert.deepEqual(controller.selectedIds, ["a", "c", "b"]);
  assert.equal(controller.primaryId, "b");
});

test("add preserves existing order and makes the final requested id primary", () => {
  const controller = new SelectionController(createStore());
  controller.replace(["a", "b"]);
  assert.deepEqual(controller.add(["c", "a"]), {
    selectedIds: ["b", "c", "a"],
    primaryId: "a",
    revision: 2,
  });
  assert.deepEqual(controller.add(["a"]), {
    selectedIds: ["b", "c", "a"],
    primaryId: "a",
    revision: 2,
  });
});

test("subtract and toggle maintain deterministic primary fallback", () => {
  const controller = new SelectionController(createStore());
  controller.replace(["a", "b", "c"]);
  assert.deepEqual(controller.subtract(["c"]), {
    selectedIds: ["a", "b"],
    primaryId: "b",
    revision: 2,
  });
  assert.deepEqual(controller.toggle("a"), {
    selectedIds: ["b"],
    primaryId: "b",
    revision: 3,
  });
  assert.deepEqual(controller.toggle("d"), {
    selectedIds: ["b", "d"],
    primaryId: "d",
    revision: 4,
  });
});

test("makePrimary moves an existing selected id and rejects unselected ids", () => {
  const controller = new SelectionController(createStore());
  controller.replace(["a", "b", "c"]);
  assert.deepEqual(controller.makePrimary("a"), {
    selectedIds: ["b", "c", "a"],
    primaryId: "a",
    revision: 2,
  });
  assert.throws(
    () => controller.makePrimary("d"),
    /Cannot make unselected feature "d"/,
  );
  assert.equal(controller.revision, 2);
});

test("missing Store ids reject without changing selection", () => {
  const controller = new SelectionController(createStore());
  controller.replace(["a"]);
  assert.throws(() => controller.add(["missing"]), /was not found/);
  assert.throws(() => controller.toggle("missing"), /was not found/);
  assert.throws(
    () => controller.replace(["a"], "b"),
    /must belong to selectedIds/,
  );
  assert.deepEqual(controller.snapshot(), {
    selectedIds: ["a"],
    primaryId: "a",
    revision: 1,
  });
});

test("one immutable event is emitted per effective operation and none for no-ops", () => {
  const controller = new SelectionController(createStore());
  const changes = [];
  controller.subscribe((change) => changes.push(change));

  controller.replace(["a"]);
  controller.replace(["a"]);
  controller.add(["a"]);
  controller.add(["b"]);
  controller.subtract(["d"]);
  controller.clear();
  controller.clear();

  assert.equal(changes.length, 3);
  assert.deepEqual(changes.map((change) => change.reason), [
    "replace",
    "add",
    "clear",
  ]);
  assert.equal(Object.isFrozen(changes[0]), true);
  assert.deepEqual(changes[1].before.selectedIds, ["a"]);
  assert.deepEqual(changes[1].after.selectedIds, ["a", "b"]);
});

test("Store removals and clear reconcile the selection once", () => {
  const store = createStore();
  const controller = new SelectionController(store);
  const reasons = [];
  controller.subscribe((change) => reasons.push(change.reason));
  controller.replace(["a", "b", "c"]);

  store.remove("b");
  assert.deepEqual(controller.snapshot(), {
    selectedIds: ["a", "c"],
    primaryId: "c",
    revision: 2,
  });

  store.replace(store.get("a"));
  assert.equal(controller.revision, 2);

  store.clear();
  assert.deepEqual(controller.snapshot(), {
    selectedIds: [],
    revision: 3,
  });
  assert.deepEqual(reasons, [
    "replace",
    "store-reconcile",
    "store-reconcile",
  ]);
});

test("restore preserves membership and primary with a fresh monotonic revision", () => {
  const controller = new SelectionController(createStore());
  const before = controller.replace(["a", "b"], "a");
  controller.replace(["c", "d"]);
  const restored = controller.restore(before, "history-undo");

  assert.deepEqual(restored.selectedIds, ["b", "a"]);
  assert.equal(restored.primaryId, "a");
  assert.equal(restored.revision, 3);
  assert.ok(restored.revision > before.revision);
});

test("destroy unsubscribes Store reconciliation and listeners", () => {
  const store = createStore();
  const controller = new SelectionController(store);
  let events = 0;
  controller.subscribe(() => {
    events += 1;
  });
  controller.replace(["a"]);
  controller.destroy();
  store.remove("a");

  assert.equal(events, 1);
  assert.deepEqual(controller.selectedIds, ["a"]);
});
