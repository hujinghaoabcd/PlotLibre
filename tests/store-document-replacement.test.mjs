import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlotFeature,
  PlotStore,
} from "@plotlibre/core";

function feature(id, overrides = {}) {
  return createPlotFeature({
    id,
    plotType: "arrow.test",
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
  });
}

test("replaceDocument commits reused, new and removed ids in one exact-order batch", () => {
  const store = new PlotStore();
  store.add(feature("a"));
  store.add(feature("b"));
  store.add(feature("c"));
  const changes = [];
  store.subscribe((change) => changes.push(change));

  const change = store.replaceDocument([
    feature("c", { revision: 7 }),
    feature("d", { revision: 2 }),
    feature("a", { revision: 5 }),
  ]);

  assert.deepEqual(store.list().map(({ id }) => id), ["c", "d", "a"]);
  assert.equal(store.get("c").revision, 7);
  assert.equal(store.get("d").revision, 2);
  assert.equal(store.get("a").revision, 5);
  assert.deepEqual(change, {
    type: "batch",
    ids: ["b", "a", "c", "d"],
    addedIds: ["d"],
    updatedIds: ["a", "c"],
    removedIds: ["b"],
  });
  assert.deepEqual(changes, [change]);
  assert.equal(Object.isFrozen(change), true);
  assert.equal(Object.isFrozen(change.ids), true);
});

test("replaceDocument clones caller features before the atomic commit", () => {
  const store = new PlotStore();
  const input = feature("a", { metadata: { nested: { value: 1 } } });
  store.replaceDocument([input]);

  input.controlPoints[0][0] = 0;
  input.metadata.nested.value = 9;
  assert.deepEqual(store.get("a").controlPoints[0], [118.7, 32.0]);
  assert.equal(store.get("a").metadata.nested.value, 1);
});

test("duplicate replacement ids reject before Store mutation or events", () => {
  const store = new PlotStore();
  store.add(feature("old"));
  const before = store.list();
  const changes = [];
  store.subscribe((change) => changes.push(change));

  assert.throws(
    () => store.replaceDocument([feature("same"), feature("same")]),
    { code: "DUPLICATE_PLOT_FEATURE" },
  );
  assert.deepEqual(store.list(), before);
  assert.deepEqual(changes, []);
});

test("empty document replacement removes everything in one batch", () => {
  const store = new PlotStore();
  store.add(feature("a"));
  store.add(feature("b"));
  const changes = [];
  store.subscribe((change) => changes.push(change));

  const change = store.replaceDocument([]);
  assert.equal(store.size, 0);
  assert.deepEqual(change, {
    type: "batch",
    ids: ["a", "b"],
    addedIds: [],
    updatedIds: [],
    removedIds: ["a", "b"],
  });
  assert.deepEqual(changes, [change]);
});

test("listener failures cannot roll back a complete document replacement", () => {
  const listenerErrors = [];
  const store = new PlotStore({
    onListenerError(errors, change) {
      listenerErrors.push({ errors, change });
    },
  });
  store.add(feature("old"));
  store.subscribe(() => {
    throw new Error("listener failed");
  });

  const change = store.replaceDocument([feature("new")]);
  assert.deepEqual(store.list().map(({ id }) => id), ["new"]);
  assert.equal(listenerErrors.length, 1);
  assert.deepEqual(listenerErrors[0].change, change);
  assert.equal(listenerErrors[0].errors[0].message, "listener failed");
});
