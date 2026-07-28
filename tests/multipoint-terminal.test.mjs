import assert from "node:assert/strict";
import test from "node:test";
import { MultiPointDrawSession } from "@plotlibre/interaction";

test("multipoint double-click directly completes with an uncommitted final point", () => {
  const session = new MultiPointDrawSession({
    id: "curve-direct-double-click",
    plotType: "arrow.curved",
    minimumPoints: 3,
  });

  session.click([0, 0]);
  session.click([1, 1]);
  const completed = session.doubleClick([2, 0]);

  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints, [
    [0, 0],
    [1, 1],
    [2, 0],
  ]);
  assert.deepEqual(session.snapshot(), completed);
});
