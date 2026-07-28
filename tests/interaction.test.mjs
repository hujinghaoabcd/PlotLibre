import assert from "node:assert/strict";
import test from "node:test";
import { TwoPointDrawSession } from "@plotlibre/interaction";

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
