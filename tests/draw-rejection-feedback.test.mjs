import assert from "node:assert/strict";
import test from "node:test";
import { MultiPointDrawSession, TwoPointDrawSession } from "@plotlibre/interaction";

const issue = {
  code: "TEST_INVALID_FINAL_POINT",
  message: "The final point is outside the allowed zone.",
  severity: "error",
};

test("fixed-count sessions expose validation issues and clear them on movement", () => {
  const session = new MultiPointDrawSession({
    id: "detailed-rejection",
    plotType: "test.fixed-five",
    minimumPoints: 5,
    maximumPoints: 5,
    validateCompletion(candidate) {
      return candidate.controlPoints[4]?.[1] === 99
        ? { valid: false, issues: [issue] }
        : { valid: true, issues: [] };
    },
  });

  session.click([0, 0]);
  session.click([1, 0]);
  session.click([0, 1]);
  session.click([1, 1]);
  const rejected = session.click([0.5, 99]);

  assert.equal(rejected.status, "drawing");
  assert.equal(rejected.completed, undefined);
  assert.equal(rejected.draft?.controlPoints.length, 5);
  assert.deepEqual(rejected.rejection, {
    kind: "completion-validation",
    issues: [issue],
  });

  const moved = session.pointerMove([0.5, 0.25]);
  assert.equal(moved.rejection, undefined);
  assert.equal(moved.draft?.controlPoints[4]?.[1], 0.25);

  const completed = session.click([0.5, 0.25]);
  assert.equal(completed.status, "completed");
  assert.equal(completed.rejection, undefined);
  assert.equal(completed.completed?.controlPoints[4]?.[1], 0.25);
});

test("legacy boolean validators receive a generic rejection issue", () => {
  const session = new TwoPointDrawSession({
    id: "boolean-rejection",
    plotType: "test.two-point",
    validateCompletion: () => false,
  });

  session.click([0, 0]);
  const rejected = session.click([1, 1]);
  assert.equal(rejected.status, "drawing");
  assert.equal(
    rejected.rejection?.issues[0]?.code,
    "DRAW_COMPLETION_REJECTED",
  );
});
