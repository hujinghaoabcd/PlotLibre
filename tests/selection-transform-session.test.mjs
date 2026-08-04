import assert from "node:assert/strict";
import test from "node:test";
import {
  CommandHistory,
  createPlotFeature,
  emptyRenderBundle,
  PlotStore,
} from "@plotlibre/core";
import { createLocalProjection } from "@plotlibre/geometry";
import {
  createSelectionTransformCommand,
  SelectionController,
  SelectionTransformCommandError,
  SelectionTransformSession,
} from "@plotlibre/interaction";

const ORIGIN = [118.8, 32];

function feature(id, controlPoints, options = {}) {
  return createPlotFeature({
    id,
    plotType: "test.selection-transform-session",
    definitionVersion: "1.0.0",
    controlPoints,
    parameters: options.parameters ?? { minimumWidthMeters: 12 },
    style: options.style ?? { lineColor: "#334455", lineWidth: 2 },
    metadata: options.metadata ?? { fixture: true },
    revision: options.revision ?? 0,
  });
}

function localPosition(x, y, origin = ORIGIN) {
  return createLocalProjection(origin).unproject({ x, y });
}

function passRegistry(options = {}) {
  return {
    canonicalize(candidate) {
      return candidate;
    },
    generate(candidate) {
      if (options.reject?.(candidate)) {
        throw new Error(`rejected ${candidate.id}`);
      }
      return emptyRenderBundle();
    },
  };
}

function pointAt(frame, x, y) {
  return {
    x: frame.pivotMeters.x + x,
    y: frame.pivotMeters.y + y,
  };
}

function assertClose(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function snapshotStore(store) {
  return store.list().map((item) => JSON.parse(JSON.stringify(item)));
}

test("rotation session previews and completes one clockwise transform", () => {
  const original = feature("rotate", [
    localPosition(-100, -50),
    localPosition(100, 50),
  ], { revision: 3 });
  const session = new SelectionTransformSession(
    "rotate",
    [original],
    passRegistry(),
  );
  const frame = session.frame;

  const down = session.pointerDown(pointAt(frame, 0, 100));
  assert.equal(down.status, "active");

  const moved = session.pointerMove(pointAt(frame, 100, 0));
  assert.equal(moved.status, "active");
  assertClose(moved.clockwiseRadians, Math.PI / 2);
  assertClose(moved.clockwiseDegrees, 90);
  assert.equal(session.previewFeatures()[0].revision, 4);

  const completion = session.pointerUp(pointAt(frame, 100, 0));
  assert.equal(completion.completed, true);
  assert.equal(completion.kind, "rotate");
  assertClose(completion.clockwiseRadians, Math.PI / 2);
  assert.equal(completion.originals[0].revision, 3);
  assert.equal(completion.transformed[0].revision, 4);
  assert.equal(session.status, "armed");
});

test("rotation session accumulates smoothly across the plus/minus 180 degree cut", () => {
  const original = feature("unwrap", [
    localPosition(-50, -50),
    localPosition(50, 50),
  ]);
  const session = new SelectionTransformSession(
    "rotate",
    [original],
    passRegistry(),
  );
  const radius = 100;
  const radians = (degrees) => degrees * Math.PI / 180;
  const vector = (degrees) => pointAt(
    session.frame,
    radius * Math.cos(radians(degrees)),
    radius * Math.sin(radians(degrees)),
  );

  session.pointerDown(vector(179));
  const snapshot = session.pointerMove(vector(-179));
  assertClose(snapshot.clockwiseDegrees, -2, 1e-9);
});

test("scale session derives a positive radial factor after crossing the pivot", () => {
  const original = feature("scale", [
    localPosition(-80, -20),
    localPosition(80, 20),
  ]);
  const session = new SelectionTransformSession(
    "scale",
    [original],
    passRegistry(),
  );

  session.pointerDown(pointAt(session.frame, 100, 0));
  const moved = session.pointerMove(pointAt(session.frame, -200, 0));
  assert.equal(moved.status, "active");
  assertClose(moved.scaleFactor, 2);

  const completion = session.pointerUp(pointAt(session.frame, -200, 0));
  assert.equal(completion.completed, true);
  assertClose(completion.scaleFactor, 2);
  assert.deepEqual(
    completion.transformed[0].parameters,
    original.parameters,
  );
});

test("no-op transform exits without a completion or mutated preview", () => {
  const original = feature("noop", [
    localPosition(-50, 0),
    localPosition(50, 0),
  ]);
  const session = new SelectionTransformSession(
    "scale",
    [original],
    passRegistry(),
  );
  const point = pointAt(session.frame, 100, 0);

  session.pointerDown(point);
  const completion = session.pointerUp(point);
  assert.deepEqual(completion, { completed: false, noop: true });
  assert.equal(session.status, "armed");
  assert.deepEqual(session.previewFeatures(), [original]);
});

test("Registry failure preserves the last-valid complete preview and supports direct retry", () => {
  let rejectSecond = true;
  const originals = [
    feature("a", [localPosition(-100, -40), localPosition(-20, 40)]),
    feature("b", [localPosition(20, -40), localPosition(100, 40)]),
  ];
  const session = new SelectionTransformSession(
    "rotate",
    originals,
    passRegistry({
      reject: (candidate) => rejectSecond && candidate.id === "b",
    }),
  );

  session.pointerDown(pointAt(session.frame, 0, 100));
  const rejected = session.pointerMove(pointAt(session.frame, 100, 0));
  assert.equal(rejected.status, "rejected");
  assert.equal(
    rejected.rejection.code,
    "SELECTION_TRANSFORM_CANDIDATE_GENERATION_FAILED",
  );
  assert.deepEqual(
    session.previewFeatures().map((item) => item.revision),
    [0, 0],
  );

  const rejectedCompletion = session.pointerUp(pointAt(session.frame, 100, 0));
  assert.equal(rejectedCompletion.completed, false);
  assert.equal(rejectedCompletion.noop, false);
  assert.equal(session.status, "rejected");

  rejectSecond = false;
  session.pointerDown(pointAt(session.frame, 0, 100));
  const retry = session.pointerUp(pointAt(session.frame, 100, 0));
  assert.equal(retry.completed, true);
  assert.deepEqual(
    retry.transformed.map((item) => item.revision),
    [1, 1],
  );
});

test("out-of-range scale rejects without changing the last valid preview", () => {
  const original = feature("scale-retry", [
    localPosition(-10, 0),
    localPosition(10, 0),
  ]);
  const session = new SelectionTransformSession(
    "scale",
    [original],
    passRegistry(),
  );

  session.pointerDown(pointAt(session.frame, 1, 0));
  const rejected = session.pointerMove(pointAt(session.frame, 101, 0));
  assert.equal(rejected.status, "rejected");
  assert.equal(
    rejected.rejection.code,
    "SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE",
  );
  assert.equal(session.previewFeatures()[0].revision, 0);

  const completion = session.pointerUp(pointAt(session.frame, 101, 0));
  assert.equal(completion.completed, false);
  assert.equal(completion.noop, false);
  assert.equal(session.status, "rejected");
});

test("pointer radius rejection is structured and retryable", () => {
  const original = feature("radius", [
    localPosition(-10, 0),
    localPosition(10, 0),
  ]);
  const session = new SelectionTransformSession(
    "rotate",
    [original],
    passRegistry(),
    { minimumPointerRadiusMeters: 1 },
  );

  const rejected = session.pointerDown(pointAt(session.frame, 0.5, 0));
  assert.equal(rejected.status, "rejected");
  assert.equal(
    rejected.rejection.code,
    "SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL",
  );

  const active = session.pointerDown(pointAt(session.frame, 10, 0));
  assert.equal(active.status, "active");
  assert.equal(active.rejection, undefined);
});

test("one transform command preserves order, selection and exact undo/redo", () => {
  const store = new PlotStore();
  store.add(feature("a", [localPosition(-100, -50), localPosition(-20, 50)], { revision: 2 }));
  store.add(feature("middle", [localPosition(-5, -5), localPosition(5, 5)], { revision: 8 }));
  store.add(feature("c", [localPosition(20, -50), localPosition(100, 50)], { revision: 4 }));

  const selection = new SelectionController(store);
  selection.replace(["c", "a"]);
  const selectedSnapshot = selection.snapshot();
  const originals = [store.get("a"), store.get("c")];
  const session = new SelectionTransformSession(
    "rotate",
    originals,
    passRegistry(),
  );
  session.pointerDown(pointAt(session.frame, 0, 100));
  const completion = session.pointerUp(pointAt(session.frame, 100, 0));
  assert.equal(completion.completed, true);

  const command = createSelectionTransformCommand(store, selection, {
    completion,
    selectionSnapshot: selectedSnapshot,
  });
  assert.ok(command);
  assert.equal(command.label, "rotate-selection");

  const before = snapshotStore(store);
  const history = new CommandHistory();
  history.execute(command);
  const after = snapshotStore(store);

  assert.equal(history.undoDepth, 1);
  assert.deepEqual(store.list().map((item) => item.id), ["a", "middle", "c"]);
  assert.deepEqual(selection.selectedIds, ["c", "a"]);
  assert.equal(selection.primaryId, "a");
  assert.equal(store.get("a").revision, 3);
  assert.equal(store.get("middle").revision, 8);
  assert.equal(store.get("c").revision, 5);

  assert.equal(history.undo(), true);
  assert.deepEqual(snapshotStore(store), before);
  assert.deepEqual(selection.selectedIds, ["c", "a"]);
  assert.equal(selection.primaryId, "a");

  assert.equal(history.redo(), true);
  assert.deepEqual(snapshotStore(store), after);
  assert.deepEqual(selection.selectedIds, ["c", "a"]);
  assert.equal(selection.primaryId, "a");
});

test("a pivot-only member is not replaced and retains its original revision", () => {
  const store = new PlotStore();
  const left = feature("left", [localPosition(-100, 0), localPosition(-50, 0)], { revision: 1 });
  const pivotOnly = feature("pivot", [localPosition(0, 0)], { revision: 9 });
  const right = feature("right", [localPosition(50, 0), localPosition(100, 0)], { revision: 3 });
  store.add(left);
  store.add(pivotOnly);
  store.add(right);

  const selection = new SelectionController(store);
  selection.replace(["left", "pivot", "right"]);
  const session = new SelectionTransformSession(
    "rotate",
    store.list(),
    passRegistry(),
  );
  session.pointerDown(pointAt(session.frame, 0, 100));
  const completion = session.pointerUp(pointAt(session.frame, 100, 0));
  assert.equal(completion.completed, true);

  const command = createSelectionTransformCommand(store, selection, {
    completion,
    selectionSnapshot: selection.snapshot(),
  });
  const history = new CommandHistory();
  history.execute(command);

  assert.equal(store.get("left").revision, 2);
  assert.equal(store.get("pivot").revision, 9);
  assert.equal(store.get("right").revision, 4);
  assert.equal(history.undo(), true);
  assert.deepEqual(store.get("pivot"), pivotOnly);
  assert.equal(history.redo(), true);
  assert.equal(store.get("pivot").revision, 9);
});

test("stale Store or selection state rejects before entering history", () => {
  const createFixture = () => {
    const store = new PlotStore();
    store.add(feature("a", [localPosition(-50, 0), localPosition(0, 50)]));
    store.add(feature("b", [localPosition(0, -50), localPosition(50, 0)]));
    const selection = new SelectionController(store);
    selection.replace(["a", "b"]);
    const session = new SelectionTransformSession(
      "scale",
      store.list(),
      passRegistry(),
    );
    session.pointerDown(pointAt(session.frame, 100, 0));
    const completion = session.pointerUp(pointAt(session.frame, 200, 0));
    assert.equal(completion.completed, true);
    const command = createSelectionTransformCommand(store, selection, {
      completion,
      selectionSnapshot: selection.snapshot(),
    });
    return { store, selection, command };
  };

  {
    const { store, selection, command } = createFixture();
    store.update("a", (current) => ({ ...current, metadata: { stale: true } }));
    const history = new CommandHistory();
    assert.throws(
      () => history.execute(command),
      (error) =>
        error instanceof SelectionTransformCommandError &&
        error.code === "SELECTION_TRANSFORM_TRANSACTION_INVALID",
    );
    assert.equal(history.undoDepth, 0);
    assert.deepEqual(selection.selectedIds, ["a", "b"]);
  }

  {
    const { selection, command } = createFixture();
    selection.makePrimary("a");
    const history = new CommandHistory();
    assert.throws(
      () => history.execute(command),
      (error) =>
        error instanceof SelectionTransformCommandError &&
        error.code === "SELECTION_TRANSFORM_TRANSACTION_INVALID",
    );
    assert.equal(history.undoDepth, 0);
  }
});

test("missing selected feature receives the stable feature-missing code", () => {
  const store = new PlotStore();
  store.add(feature("a", [localPosition(-50, 0), localPosition(0, 50)]));
  store.add(feature("b", [localPosition(0, -50), localPosition(50, 0)]));
  const selection = new SelectionController(store);
  selection.replace(["a", "b"]);
  const session = new SelectionTransformSession(
    "scale",
    store.list(),
    passRegistry(),
  );
  session.pointerDown(pointAt(session.frame, 100, 0));
  const completion = session.pointerUp(pointAt(session.frame, 200, 0));
  assert.equal(completion.completed, true);
  const command = createSelectionTransformCommand(store, selection, {
    completion,
    selectionSnapshot: selection.snapshot(),
  });

  selection.runWithoutStoreReconciliation(() => {
    store.remove("b");
  });
  assert.throws(
    () => command.execute(),
    (error) =>
      error instanceof SelectionTransformCommandError &&
      error.code === "SELECTION_TRANSFORM_FEATURE_MISSING",
  );
});
