import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPincerArrowFrame,
  buildPincerArrowRing,
  createLocalProjection,
  isSimpleRing,
  resolvePincerArrowParameters,
  ringWinding,
} from "@plotlibre/geometry";

const controls = [
  [-0.004, 0],
  [0.004, 0],
  [-0.009, 0.014],
  [0.009, 0.014],
  [0, 0.002],
];

function canonicalRing(ring) {
  const open = ring.slice(0, -1);
  const start = open.reduce(
    (best, point, index) =>
      point[0] < open[best][0] ||
      (point[0] === open[best][0] && point[1] < open[best][1])
        ? index
        : best,
    0,
  );
  const rotated = [...open.slice(start), ...open.slice(0, start)];
  return [...rotated, rotated[0]];
}

function assertPositionClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual[0] - expected[0]) <= tolerance);
  assert.ok(Math.abs(actual[1] - expected[1]) <= tolerance);
}

function assertRingsClose(actual, expected, tolerance = 1e-10) {
  assert.equal(actual.length, expected.length);
  for (const [index, point] of actual.entries()) {
    assertPositionClose(point, expected[index], tolerance);
  }
}

test("pincer arrow is deterministic and preserves all five authored controls", () => {
  const first = buildPincerArrowRing(controls);
  const second = buildPincerArrowRing(controls);
  assertRingsClose(first, second);
  for (const control of controls) {
    assert.ok(
      first.some(
        (point) => point[0] === control[0] && point[1] === control[1],
      ),
    );
  }
  assert.equal(
    first
      .slice(0, -1)
      .filter((point) => point[0] === controls[4][0] && point[1] === controls[4][1])
      .length,
    1,
  );
});

test("pincer arrow is invariant to simultaneous whole-arm exchange", () => {
  const expected = canonicalRing(buildPincerArrowRing(controls));
  const exchanged = canonicalRing(
    buildPincerArrowRing([
      controls[1],
      controls[0],
      controls[3],
      controls[2],
      controls[4],
    ]),
  );
  assertRingsClose(exchanged, expected);
});

test("pincer arrow preserves authored pairing rather than treating objectives as unordered", () => {
  const expected = canonicalRing(buildPincerArrowRing(controls));
  let changed = false;
  try {
    const swapped = canonicalRing(
      buildPincerArrowRing([
        controls[0],
        controls[1],
        controls[3],
        controls[2],
        controls[4],
      ]),
    );
    changed = JSON.stringify(swapped) !== JSON.stringify(expected);
  } catch {
    changed = true;
  }
  assert.equal(changed, true);
});

test("pincer arrow produces one finite closed counterclockwise simple ring", () => {
  const ring = buildPincerArrowRing(controls);
  const projection = createLocalProjection(controls[4]);
  const localRing = ring.map((position) => projection.project(position));
  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(localRing), "counterclockwise");
  assert.equal(isSimpleRing(localRing, 1e-6), true);
  assert.ok(ring.length > 40);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("pincer frame keeps the exact junction and independent arm identities", () => {
  const frame = buildPincerArrowFrame(
    controls,
    resolvePincerArrowParameters(),
  );
  assert.deepEqual(frame.semanticTailA, controls[0]);
  assert.deepEqual(frame.semanticTailB, controls[1]);
  assert.deepEqual(frame.semanticObjectiveA, controls[2]);
  assert.deepEqual(frame.semanticObjectiveB, controls[3]);
  assert.deepEqual(frame.semanticJunction, controls[4]);
  assert.notEqual(frame.armA.visualSide, frame.armB.visualSide);
});

test("moving the authored junction changes both arms while preserving both tips", () => {
  const movedControls = [
    controls[0],
    controls[1],
    controls[2],
    controls[3],
    [0.00045, 0.0024],
  ];
  const original = buildPincerArrowRing(controls);
  const moved = buildPincerArrowRing(movedControls);
  assert.notDeepEqual(moved, original);
  for (const tip of controls.slice(2, 4)) {
    assert.ok(
      moved.some((point) => point[0] === tip[0] && point[1] === tip[1]),
    );
  }
  assert.ok(
    moved.some(
      (point) =>
        point[0] === movedControls[4][0] && point[1] === movedControls[4][1],
    ),
  );
});

test("outer, inner and head parameters affect independent geometry families", () => {
  const original = buildPincerArrowRing(controls);
  const outer = buildPincerArrowRing(controls, { outerTension: 0.7 });
  const inner = buildPincerArrowRing(controls, { innerTension: 0.75 });
  const head = buildPincerArrowRing(controls, {
    headHalfWidthTailRatio: 0.44,
  });
  assert.notDeepEqual(outer, original);
  assert.notDeepEqual(inner, original);
  assert.notDeepEqual(head, original);
});

test("pincer arrow rejects invalid semantics and parameters", () => {
  assert.throws(
    () => buildPincerArrowRing(controls.slice(0, 4)),
    /exactly five control points/,
  );
  assert.throws(
    () =>
      buildPincerArrowRing([
        controls[0],
        controls[1],
        controls[2],
        controls[3],
        controls[0],
      ]),
    /must be distinct/,
  );
  assert.throws(
    () =>
      buildPincerArrowRing([
        controls[0],
        controls[1],
        controls[2],
        controls[3],
        [0, 0.012],
      ]),
    /admissible tail-to-junction zone/,
  );
  assert.throws(
    () => resolvePincerArrowParameters({ outerTension: 1.2 }),
    /outerTension must be between/,
  );
  assert.throws(
    () =>
      resolvePincerArrowParameters({
        headHalfWidthTailRatio: 0.3,
        neckHalfWidthTailRatio: 0.3,
      }),
    /must be smaller/,
  );
});
