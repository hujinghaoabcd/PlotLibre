import assert from "node:assert/strict";
import test from "node:test";
import { MultiPointDrawSession } from "@plotlibre/interaction";

const firstFour = [
  [-0.004, 0],
  [0.004, 0],
  [-0.009, 0.014],
  [0.009, 0.014],
];

test("fixed-five pincer drawing previews with the fifth pointer and auto-completes", () => {
  const session = new MultiPointDrawSession({
    id: "pincer-session",
    plotType: "arrow.pincer",
    minimumPoints: 5,
    maximumPoints: 5,
  });
  for (const point of firstFour) session.click(point);
  const pointer = session.pointerMove([0, 0.002]);
  assert.equal(pointer.status, "drawing");
  assert.deepEqual(pointer.draft?.controlPoints, [...firstFour, [0, 0.002]]);

  const completed = session.click([0, 0.002]);
  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints, [
    ...firstFour,
    [0, 0.002],
  ]);
});

test("rejected pincer junction remains replaceable at the fixed maximum", () => {
  const session = new MultiPointDrawSession({
    id: "pincer-retry",
    plotType: "arrow.pincer",
    minimumPoints: 5,
    maximumPoints: 5,
    validateCompletion(input) {
      return input.controlPoints[4]?.[1] < 0.01;
    },
  });
  for (const point of firstFour) session.click(point);

  const rejected = session.click([0, 0.012]);
  assert.equal(rejected.status, "drawing");
  assert.equal(rejected.completed, undefined);
  assert.deepEqual(rejected.draft?.controlPoints[4], [0, 0.012]);

  const replacement = session.pointerMove([0, 0.002]);
  assert.deepEqual(replacement.draft?.controlPoints[4], [0, 0.002]);
  const completed = session.click([0, 0.002]);
  assert.equal(completed.status, "completed");
  assert.deepEqual(completed.completed?.controlPoints[4], [0, 0.002]);
});
