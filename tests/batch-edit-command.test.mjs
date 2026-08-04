import assert from "node:assert/strict";
import test from "node:test";
import { CommandHistory, PlotStore } from "@plotlibre/core";
import {
  BatchEditCommand,
  SelectionController,
} from "@plotlibre/interaction";

function feature(id, revision = 0, longitude = 118.8) {
  return {
    id,
    plotType: "test.batch-command",
    definitionVersion: "1.0.0",
    controlPoints: [[longitude, 32]],
    parameters: {},
    style: {},
    metadata: {},
    revision,
  };
}

function createStore() {
  const store = new PlotStore();
  store.add(feature("a", 0, 118.8));
  store.add(feature("b", 0, 118.9));
  store.add(feature("c", 0, 119));
  return store;
}

test("batch delete undo restores exact document order and prior primary selection", () => {
  const store = createStore();
  const selection = new SelectionController(store);
  const history = new CommandHistory();
  const beforeSelection = selection.replace(["b", "c"], "b");
  const beforeOrder = store.list().map((item) => item.id);
  const removed = [store.get("b"), store.get("c")];
  const changes = [];
  store.subscribe((change) => changes.push(change));

  const command = new BatchEditCommand(store, selection, {
    label: "delete-selection",
    execute: { remove: ["b", "c"] },
    undo: {
      add: removed,
      orderedIds: beforeOrder,
    },
    beforeSelection,
    afterSelection: { selectedIds: [], revision: 0 },
  });

  history.execute(command);
  assert.deepEqual(store.list().map((item) => item.id), ["a"]);
  assert.deepEqual(selection.selectedIds, []);
  assert.equal(history.undoDepth, 1);

  assert.equal(history.undo(), true);
  assert.deepEqual(store.list().map((item) => item.id), ["a", "b", "c"]);
  assert.deepEqual(selection.selectedIds, ["c", "b"]);
  assert.equal(selection.primaryId, "b");

  assert.equal(history.redo(), true);
  assert.deepEqual(store.list().map((item) => item.id), ["a"]);
  assert.deepEqual(selection.selectedIds, []);
  assert.deepEqual(changes.map((change) => change.type), [
    "batch",
    "batch",
    "batch",
  ]);
});

test("batch replacement undo and redo reuse exact captured revisions", () => {
  const store = createStore();
  const selection = new SelectionController(store);
  const history = new CommandHistory();
  const selected = selection.replace(["a", "b"]);
  const before = [store.get("a"), store.get("b")];
  const after = [
    feature("a", 1, 119.2),
    feature("b", 1, 119.3),
  ];

  history.execute(new BatchEditCommand(store, selection, {
    label: "translate-selection",
    execute: { replace: after },
    undo: { replace: before },
    beforeSelection: selected,
    afterSelection: selected,
  }));

  assert.deepEqual(
    [store.get("a").revision, store.get("b").revision],
    [1, 1],
  );
  assert.deepEqual(selection.selectedIds, ["a", "b"]);

  history.undo();
  assert.deepEqual(
    [store.get("a").revision, store.get("b").revision],
    [0, 0],
  );

  history.redo();
  assert.deepEqual(
    [store.get("a").revision, store.get("b").revision],
    [1, 1],
  );
  assert.deepEqual(store.get("a").controlPoints, [[119.2, 32]]);
});

test("BatchEditCommand clones caller-owned transactions and selection snapshots", () => {
  const store = createStore();
  const selection = new SelectionController(store);
  const next = feature("a", 1, 119.4);
  const replacements = [next];
  const afterIds = ["a"];
  const command = new BatchEditCommand(store, selection, {
    execute: { replace: replacements },
    undo: { replace: [store.get("a")] },
    beforeSelection: selection.snapshot(),
    afterSelection: { selectedIds: afterIds, primaryId: "a", revision: 0 },
  });

  next.controlPoints[0][0] = 0;
  replacements.length = 0;
  afterIds[0] = "missing";

  command.execute();
  assert.deepEqual(store.get("a").controlPoints, [[119.4, 32]]);
  assert.deepEqual(selection.selectedIds, ["a"]);
});

test("failed batch execution does not enter CommandHistory", () => {
  const store = createStore();
  const selection = new SelectionController(store);
  const history = new CommandHistory();
  const command = new BatchEditCommand(store, selection, {
    execute: { add: [feature("a")] },
    undo: { remove: ["a"] },
    beforeSelection: selection.snapshot(),
    afterSelection: selection.snapshot(),
  });

  assert.throws(
    () => history.execute(command),
    /already exists with id "a"/,
  );
  assert.equal(history.undoDepth, 0);
  assert.deepEqual(store.list().map((item) => item.id), ["a", "b", "c"]);
});

test("BatchEditCommand rejects undo before its first execute", () => {
  const store = createStore();
  const selection = new SelectionController(store);
  const command = new BatchEditCommand(store, selection, {
    execute: {},
    undo: {},
    beforeSelection: selection.snapshot(),
    afterSelection: selection.snapshot(),
  });

  assert.throws(() => command.undo(), /cannot undo before execute/);
});
