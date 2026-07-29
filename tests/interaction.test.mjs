import assert from "node:assert/strict";
import test from "node:test";
import {
  MultiPointDrawSession,
  TwoPointDrawSession,
} from "@plotlibre/interaction";

test("two-point draw session previews and completes a semantic feature", () => {
  const session = new TwoPointDrawSession({
    id: "arrow-1",
    plotType: "arrow.straight",
    parameters: { width: 0.1 },
  });

  assert.equal(session.status, "ready");
  assert.deepEqual(session.click([118.78, 32.04]), { status: "drawing" });

  const preview = session.pointerMove([118.84, 32.09]);
  assert.equal(preview.status, "drawing");
  assert.deepEqual(preview.draft?.controlPoints, [
    [118.78, 32.04],
    [118.84, 32.09],
  ]);

  const completed = session.click([118.84, 32.09]);
  assert.equal(completed.status, "completed");
  assert.equal(completed.completed?.id, "arrow-1");
  assert.deepEqual(completed.completed?.parameters, { width: 0.1 });
});

test("two-point draw session supports keyboard reset, completion and cancel", () => {
  const session = new TwoPointDrawSession({
    id: "arrow-2",
    plotType: "arrow.straight",
  });

  session.click([0, 0]);
  session.pointerMove([1, 1]);
  assert.deepEqual(session.keyDown("Backspace"), { status: "ready" });

  session.click([2, 2]);
  session.pointerMove([3, 3]);
  const completed = session.keyDown("Enter");
  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints, [
    [2, 2],
    [3, 3],
  ]);

  const cancelled = new TwoPointDrawSession({
    id: "arrow-3",
    plotType: "arrow.straight",
  });
  cancelled.click([0, 0]);
  assert.deepEqual(cancelled.keyDown("Escape"), { status: "cancelled" });
});

test("two-point double-click obeys the shared DrawSession contract", () => {
  const session = new TwoPointDrawSession({
    id: "arrow-double-click",
    plotType: "arrow.fine",
  });

  session.click([0, 0]);
  const completed = session.doubleClick([1, 1]);
  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints, [
    [0, 0],
    [1, 1],
  ]);
});

test("multipoint session appends points and emits a valid preview only at minimum size", () => {
  const session = new MultiPointDrawSession({
    id: "curve-1",
    plotType: "arrow.curved",
    minimumPoints: 3,
    parameters: { tension: 0.5 },
  });

  assert.deepEqual(session.click([0, 0]), { status: "drawing" });
  assert.deepEqual(session.pointerMove([1, 1]), { status: "drawing" });

  session.click([1, 1]);
  const preview = session.pointerMove([2, 0]);
  assert.equal(preview.status, "drawing");
  assert.deepEqual(preview.draft?.controlPoints, [
    [0, 0],
    [1, 1],
    [2, 0],
  ]);
  assert.deepEqual(preview.draft?.parameters, { tension: 0.5 });
});

test("multipoint session completes with Enter using the pointer preview", () => {
  const session = new MultiPointDrawSession({
    id: "curve-2",
    plotType: "arrow.curved",
    minimumPoints: 3,
  });

  session.click([0, 0]);
  session.click([1, 1]);
  session.pointerMove([2, 0]);
  const completed = session.keyDown("Enter");

  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints, [
    [0, 0],
    [1, 1],
    [2, 0],
  ]);
});

test("multipoint session completes on double-click without duplicating the last point", () => {
  const session = new MultiPointDrawSession({
    id: "curve-3",
    plotType: "arrow.curved",
    minimumPoints: 3,
  });

  session.click([0, 0]);
  session.click([1, 1]);
  session.click([2, 0]);
  const completed = session.doubleClick([2, 0]);

  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints, [
    [0, 0],
    [1, 1],
    [2, 0],
  ]);
});

test("multipoint session removes one point at a time and can be cancelled", () => {
  const session = new MultiPointDrawSession({
    id: "curve-4",
    plotType: "arrow.curved",
    minimumPoints: 3,
  });

  session.click([0, 0]);
  session.click([1, 1]);
  session.click([2, 0]);
  assert.equal(session.keyDown("Backspace").status, "drawing");
  assert.equal(session.keyDown("Delete").status, "drawing");
  assert.deepEqual(session.keyDown("Backspace"), { status: "ready" });

  session.click([3, 3]);
  assert.deepEqual(session.keyDown("Escape"), { status: "cancelled" });
});

test("multipoint session validates limits and can derive a non-persistent fixed-four draft", () => {
  assert.throws(
    () =>
      new MultiPointDrawSession({
        id: "invalid-min",
        plotType: "arrow.curved",
        minimumPoints: 2,
      }),
    /minimumPoints must be an integer >= 3/,
  );
  assert.throws(
    () =>
      new MultiPointDrawSession({
        id: "invalid-max",
        plotType: "arrow.curved",
        minimumPoints: 4,
        maximumPoints: 3,
      }),
    /maximumPoints must be an integer >= minimumPoints/,
  );

  const session = new MultiPointDrawSession({
    id: "curve-fixed",
    plotType: "arrow.double",
    minimumPoints: 4,
    maximumPoints: 4,
    deriveDraftControlPoints(points) {
      return points.length === 3 ? [...points, [3, -1]] : undefined;
    },
  });
  session.click([0, 0]);
  session.click([1, 0]);
  const immediate = session.click([2, 1]);
  assert.equal(immediate.status, "drawing");
  assert.deepEqual(immediate.draft?.controlPoints, [
    [0, 0],
    [1, 0],
    [2, 1],
    [3, -1],
  ]);

  const enter = session.keyDown("Enter");
  assert.equal(enter.status, "drawing");
  assert.equal(enter.completed, undefined);
  assert.deepEqual(enter.draft?.controlPoints, immediate.draft?.controlPoints);

  const pointer = session.pointerMove([3, 1]);
  assert.deepEqual(pointer.draft?.controlPoints, [
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 1],
  ]);

  const completed = session.click([3, 1]);
  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints, [
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 1],
  ]);
});

test("multipoint terminal sessions ignore later input", () => {
  const session = new MultiPointDrawSession({
    id: "curve-terminal",
    plotType: "arrow.curved",
    minimumPoints: 3,
  });
  session.click([0, 0]);
  session.click([1, 1]);
  session.doubleClick([2, 0]);

  const completed = session.snapshot();
  assert.deepEqual(session.click([9, 9]), completed);
  assert.deepEqual(session.pointerMove([8, 8]), completed);
  assert.deepEqual(session.keyDown("Escape"), completed);
});
