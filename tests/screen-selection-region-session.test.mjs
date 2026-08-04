import assert from "node:assert/strict";
import test from "node:test";
import { ScreenSelectionRegionSession } from "@plotlibre/interaction";

test("box session arms below threshold and completes one normalized rectangle", () => {
  const session = new ScreenSelectionRegionSession("box", "add");
  assert.equal(session.snapshot().status, "armed");
  session.pointerDown({ x: 12, y: 9 });
  assert.equal(session.pointerMove({ x: 10, y: 9 }).status, "armed");
  assert.equal(session.pointerMove({ x: 2, y: 3 }).status, "active");

  const completion = session.pointerUp({ x: 2, y: 3 });
  assert.equal(completion.completed, true);
  if (!completion.completed) return;
  assert.equal(completion.kind, "box");
  assert.equal(completion.intent, "add");
  assert.deepEqual(completion.bounds, {
    minX: 2,
    minY: 3,
    maxX: 12,
    maxY: 9,
  });
  assert.deepEqual(completion.ring[0], { x: 2, y: 3 });
  assert.equal(session.snapshot().status, "armed");
  assert.deepEqual(session.snapshot().points, []);
});

test("sub-threshold and degenerate boxes complete as no-op", () => {
  const short = new ScreenSelectionRegionSession("box", "replace");
  short.pointerDown({ x: 0, y: 0 });
  assert.deepEqual(short.pointerUp({ x: 3, y: 0 }), {
    completed: false,
    noop: true,
  });

  const vertical = new ScreenSelectionRegionSession("box", "replace", {
    boxActivationThreshold: 0,
  });
  vertical.pointerDown({ x: 1, y: 1 });
  assert.deepEqual(vertical.pointerUp({ x: 1, y: 10 }), {
    completed: false,
    noop: true,
  });
});

test("lasso session samples movement and returns a simplified valid region", () => {
  const session = new ScreenSelectionRegionSession("lasso", "toggle");
  session.pointerDown({ x: 0, y: 0 });
  session.pointerMove({ x: 1, y: 0 });
  session.pointerMove({ x: 5, y: 0.1 });
  session.pointerMove({ x: 10, y: 0 });
  session.pointerMove({ x: 10, y: 10 });
  session.pointerMove({ x: 0, y: 10 });

  const completion = session.pointerUp({ x: 0, y: 0 });
  assert.equal(completion.completed, true);
  if (!completion.completed) return;
  assert.equal(completion.kind, "lasso");
  assert.equal(completion.intent, "toggle");
  assert.equal(completion.points.length, 4);
  assert.deepEqual(completion.ring[0], completion.ring.at(-1));
});

test("invalid lasso keeps rejection state for retry", () => {
  const session = new ScreenSelectionRegionSession("lasso", "replace");
  session.pointerDown({ x: 0, y: 0 });
  session.pointerMove({ x: 20, y: 20 });
  session.pointerMove({ x: 0, y: 12 });
  const completion = session.pointerUp({ x: 12, y: 0 });

  assert.equal(completion.completed, false);
  if (completion.completed || completion.noop) return;
  assert.equal(
    completion.rejection.code,
    "SELECTION_REGION_LASSO_SELF_INTERSECTS",
  );
  const snapshot = session.snapshot();
  assert.equal(snapshot.status, "rejected");
  assert.equal(
    snapshot.rejection?.code,
    "SELECTION_REGION_LASSO_SELF_INTERSECTS",
  );

  const retry = session.pointerDown({ x: 0, y: 0 });
  assert.equal(retry.status, "active");
  assert.equal(retry.rejection, undefined);
});

test("session snapshots are immutable copies with monotonic revisions", () => {
  const session = new ScreenSelectionRegionSession("box", "subtract");
  const initial = session.snapshot();
  const down = session.pointerDown({ x: 1, y: 1 });
  const move = session.pointerMove({ x: 8, y: 8 });
  const reset = session.reset();

  assert.deepEqual(
    [initial.revision, down.revision, move.revision, reset.revision],
    [0, 1, 2, 3],
  );
  assert.equal(Object.isFrozen(move), true);
  assert.equal(Object.isFrozen(move.points), true);
  assert.deepEqual(down.points, [{ x: 1, y: 1 }]);
  assert.deepEqual(reset.points, []);
});

test("session validates numeric options", () => {
  assert.throws(
    () => new ScreenSelectionRegionSession("box", "add", {
      boxActivationThreshold: -1,
    }),
    /non-negative/,
  );
  assert.throws(
    () => new ScreenSelectionRegionSession("lasso", "add", {
      lassoSampleSpacing: Number.NaN,
    }),
    /non-negative/,
  );
});
