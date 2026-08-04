import assert from "node:assert/strict";
import test from "node:test";
import { CommandHistory, PlotStore } from "@plotlibre/core";

function feature(id, revision = 0, longitude = 118.8) {
  return {
    id,
    plotType: "test.transaction",
    definitionVersion: "1.0.0",
    controlPoints: [[longitude, 32]],
    parameters: {},
    style: {},
    metadata: {},
    revision,
  };
}

function createStore(ids = ["a", "b", "c"], options = {}) {
  const store = new PlotStore(options);
  for (const [index, id] of ids.entries()) {
    store.add(feature(id, 0, 118.8 + index * 0.01));
  }
  return store;
}

test("applyTransaction commits add, replace and remove as one immutable batch", () => {
  const store = createStore();
  const changes = [];
  store.subscribe((change) => changes.push(change));

  const nextA = feature("a", 1, 119.1);
  const change = store.applyTransaction({
    remove: ["b"],
    replace: [nextA],
    add: [feature("d", 0, 119.2)],
  });

  assert.deepEqual(store.list().map((item) => item.id), ["a", "c", "d"]);
  assert.deepEqual(store.get("a"), nextA);
  assert.deepEqual(change, {
    type: "batch",
    ids: ["b", "a", "d"],
    addedIds: ["d"],
    updatedIds: ["a"],
    removedIds: ["b"],
  });
  assert.equal(changes.length, 1);
  assert.equal(changes[0], change);
  assert.equal(Object.isFrozen(change), true);
  assert.equal(Object.isFrozen(change.ids), true);
  assert.equal(Object.isFrozen(change.addedIds), true);
});

test("transaction validation failures leave state and listeners untouched", () => {
  const store = createStore();
  const before = store.list();
  let events = 0;
  store.subscribe(() => {
    events += 1;
  });

  assert.throws(
    () => store.applyTransaction({ replace: [feature("a", 1)], remove: ["a"] }),
    /cannot replace and remove feature "a"/,
  );
  assert.throws(
    () => store.applyTransaction({ add: [feature("d"), feature("d")] }),
    /add contains duplicate id "d"/,
  );
  assert.throws(
    () => store.applyTransaction({ replace: [feature("missing", 1)] }),
    /No plot feature exists with id "missing"/,
  );
  assert.throws(
    () => store.applyTransaction({ add: [feature("a")] }),
    /already exists with id "a"/,
  );

  assert.deepEqual(store.list(), before);
  assert.equal(events, 0);
});

test("orderedIds restores an added feature to its exact document position", () => {
  const store = createStore();
  const removed = store.applyTransaction({ remove: ["b"] });
  assert.deepEqual(removed.removedIds, ["b"]);
  assert.deepEqual(store.list().map((item) => item.id), ["a", "c"]);

  store.applyTransaction({
    add: [feature("b", 0, 118.81)],
    orderedIds: ["a", "b", "c"],
  });
  assert.deepEqual(store.list().map((item) => item.id), ["a", "b", "c"]);
});

test("orderedIds must exactly match the staged post-transaction document", () => {
  const store = createStore();
  const before = store.list();

  assert.throws(
    () => store.applyTransaction({ remove: ["b"], orderedIds: ["a"] }),
    /contain every post-transaction feature exactly once/,
  );
  assert.throws(
    () => store.applyTransaction({ remove: ["b"], orderedIds: ["a", "missing"] }),
    /unknown id "missing"/,
  );
  assert.deepEqual(store.list(), before);
});

test("listener failures are isolated and later listeners still observe the commit", () => {
  const reports = [];
  const store = createStore([], {
    onListenerError(errors, change) {
      reports.push({ errors, change });
    },
  });
  let observed = 0;
  store.subscribe(() => {
    throw new Error("renderer failed");
  });
  store.subscribe(() => {
    observed += 1;
  });

  const change = store.applyTransaction({ add: [feature("a")] });
  assert.equal(store.has("a"), true);
  assert.equal(observed, 1);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].errors.length, 1);
  assert.equal(reports[0].change, change);
  assert.equal(Object.isFrozen(reports[0].errors), true);
});

test("listener failures cannot prevent CommandHistory from recording a batch", () => {
  const reports = [];
  const store = createStore([], {
    onListenerError(errors) {
      reports.push(errors);
    },
  });
  store.subscribe(() => {
    throw new Error("post-commit listener failed");
  });
  const history = new CommandHistory();
  const command = {
    label: "test-batch",
    execute() {
      store.applyTransaction({ add: [feature("a")] });
    },
    undo() {
      store.applyTransaction({ remove: ["a"] });
    },
  };

  history.execute(command);
  assert.equal(history.undoDepth, 1);
  assert.equal(store.has("a"), true);
  assert.equal(history.undo(), true);
  assert.equal(store.has("a"), false);
  assert.equal(history.redo(), true);
  assert.equal(store.has("a"), true);
  assert.equal(reports.length, 3);
});

test("existing single-feature mutations also isolate listener failures", () => {
  const reports = [];
  const store = new PlotStore({
    onListenerError(errors, change) {
      reports.push({ errors, change });
    },
  });
  let observed = 0;
  store.subscribe(() => {
    throw new Error("bad listener");
  });
  store.subscribe(() => {
    observed += 1;
  });

  store.add(feature("a"));
  assert.equal(store.has("a"), true);
  assert.equal(observed, 1);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].change.type, "add");
});
