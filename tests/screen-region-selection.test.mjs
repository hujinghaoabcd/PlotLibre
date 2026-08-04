import assert from "node:assert/strict";
import test from "node:test";
import {
  appendLassoSample,
  isPointOnScreenSegment,
  isScreenDragActive,
  isSimpleScreenRing,
  normalizeScreenBounds,
  pointInScreenPolygonFill,
  pointInScreenRing,
  screenBoundsHasPositiveArea,
  screenBoundsToRing,
  screenGeometryIntersectsRegion,
  screenLineIntersectsRegion,
  screenPointsBounds,
  screenPolygonIntersectsRegion,
  screenSegmentsIntersect,
  signedScreenRingArea,
  simplifyScreenPath,
  validateAndSimplifyScreenLasso,
} from "@plotlibre/interaction";

const BOX = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
  { x: 0, y: 0 },
];

test("box bounds normalize every drag direction and use a four-pixel threshold", () => {
  const bounds = normalizeScreenBounds({ x: 12, y: 9 }, { x: 2, y: 3 });
  assert.deepEqual(bounds, { minX: 2, minY: 3, maxX: 12, maxY: 9 });
  assert.equal(screenBoundsHasPositiveArea(bounds), true);
  assert.deepEqual(screenBoundsToRing(bounds), [
    { x: 2, y: 3 },
    { x: 12, y: 3 },
    { x: 12, y: 9 },
    { x: 2, y: 9 },
    { x: 2, y: 3 },
  ]);
  assert.equal(isScreenDragActive({ x: 0, y: 0 }, { x: 3, y: 0 }), false);
  assert.equal(isScreenDragActive({ x: 0, y: 0 }, { x: 4, y: 0 }), true);
  assert.equal(
    screenBoundsHasPositiveArea(
      normalizeScreenBounds({ x: 1, y: 1 }, { x: 1, y: 5 }),
    ),
    false,
  );
});

test("lasso sampling accepts the first point and enforces spacing", () => {
  let points = appendLassoSample([], { x: 0, y: 0 });
  points = appendLassoSample(points, { x: 1.9, y: 0 });
  assert.deepEqual(points, [{ x: 0, y: 0 }]);
  points = appendLassoSample(points, { x: 2, y: 0 });
  assert.deepEqual(points, [{ x: 0, y: 0 }, { x: 2, y: 0 }]);
});

test("valid lasso removes closing duplication, simplifies and derives bounds", () => {
  const result = validateAndSimplifyScreenLasso([
    { x: 0, y: 0 },
    { x: 5, y: 0.2 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
    { x: 0, y: 0 },
  ]);
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.points.length, 4);
  assert.deepEqual(result.bounds, { minX: 0, minY: 0, maxX: 10, maxY: 10 });
  assert.equal(result.area, 100);
  assert.deepEqual(result.ring[0], result.ring.at(-1));
});

test("lasso rejects too few points and too-small area", () => {
  const few = validateAndSimplifyScreenLasso([
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ]);
  assert.equal(few.valid, false);
  if (!few.valid) {
    assert.equal(few.rejection.code, "SELECTION_REGION_LASSO_TOO_FEW_POINTS");
  }

  const small = validateAndSimplifyScreenLasso([
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
  ]);
  assert.equal(small.valid, false);
  if (!small.valid) {
    assert.equal(small.rejection.code, "SELECTION_REGION_TOO_SMALL");
  }
});

test("simple-ring validation rejects bow-ties, repeated vertices and overlaps", () => {
  assert.equal(
    isSimpleScreenRing([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ]),
    false,
  );
  assert.equal(
    isSimpleScreenRing([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]),
    false,
  );
  assert.equal(
    isSimpleScreenRing([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 10 },
      { x: 0, y: 10 },
    ]),
    false,
  );
});

test("concave lasso remains valid and signed area is deterministic", () => {
  const concave = [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 12 },
    { x: 7, y: 12 },
    { x: 7, y: 4 },
    { x: 5, y: 4 },
    { x: 5, y: 12 },
    { x: 0, y: 12 },
  ];
  assert.equal(isSimpleScreenRing(concave), true);
  assert.ok(Math.abs(signedScreenRingArea(concave)) >= 16);
  assert.equal(validateAndSimplifyScreenLasso(concave).valid, true);
});

test("RDP preserves endpoints and removes near-collinear samples", () => {
  assert.deepEqual(
    simplifyScreenPath([
      { x: 0, y: 0 },
      { x: 2, y: 0.2 },
      { x: 4, y: -0.1 },
      { x: 6, y: 0 },
    ], 0.5),
    [{ x: 0, y: 0 }, { x: 6, y: 0 }],
  );
});

test("segment primitives include crossing, tangency and collinear overlap", () => {
  assert.equal(
    screenSegmentsIntersect(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    ),
    true,
  );
  assert.equal(
    screenSegmentsIntersect(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ),
    true,
  );
  assert.equal(
    screenSegmentsIntersect(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 0 },
      { x: 15, y: 0 },
    ),
    true,
  );
  assert.equal(
    isPointOnScreenSegment({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    true,
  );
});

test("point-in-ring is boundary inclusive", () => {
  assert.equal(pointInScreenRing({ x: 5, y: 5 }, BOX), "inside");
  assert.equal(pointInScreenRing({ x: 0, y: 5 }, BOX), "boundary");
  assert.equal(pointInScreenRing({ x: 20, y: 5 }, BOX), "outside");
});

test("point and line geometry use semantic centers and segments", () => {
  assert.equal(
    screenGeometryIntersectsRegion(
      { type: "Point", coordinates: { x: 5, y: 5 } },
      BOX,
    ),
    true,
  );
  assert.equal(
    screenGeometryIntersectsRegion(
      { type: "Point", coordinates: { x: 12, y: 5 } },
      BOX,
    ),
    false,
  );
  assert.equal(
    screenLineIntersectsRegion(
      [{ x: -5, y: 5 }, { x: 15, y: 5 }],
      BOX,
    ),
    true,
  );
  assert.equal(
    screenLineIntersectsRegion(
      [{ x: -5, y: -5 }, { x: -1, y: -1 }],
      BOX,
    ),
    false,
  );
});

test("polygon intersection covers crossing and both containment directions", () => {
  const largePolygon = [[
    { x: -10, y: -10 },
    { x: 20, y: -10 },
    { x: 20, y: 20 },
    { x: -10, y: 20 },
    { x: -10, y: -10 },
  ]];
  assert.equal(screenPolygonIntersectsRegion(largePolygon, BOX), true);

  const smallPolygon = [[
    { x: 2, y: 2 },
    { x: 4, y: 2 },
    { x: 4, y: 4 },
    { x: 2, y: 4 },
    { x: 2, y: 2 },
  ]];
  assert.equal(screenPolygonIntersectsRegion(smallPolygon, BOX), true);

  const crossingPolygon = [[
    { x: 8, y: -5 },
    { x: 12, y: -5 },
    { x: 12, y: 15 },
    { x: 8, y: 15 },
    { x: 8, y: -5 },
  ]];
  assert.equal(screenPolygonIntersectsRegion(crossingPolygon, BOX), true);
});

test("polygon holes exclude a region fully inside the hole", () => {
  const polygonWithHole = [
    [
      { x: -10, y: -10 },
      { x: 30, y: -10 },
      { x: 30, y: 30 },
      { x: -10, y: 30 },
      { x: -10, y: -10 },
    ],
    [
      { x: -1, y: -1 },
      { x: 11, y: -1 },
      { x: 11, y: 11 },
      { x: -1, y: 11 },
      { x: -1, y: -1 },
    ],
  ];
  assert.equal(screenPolygonIntersectsRegion(polygonWithHole, BOX), false);
  assert.equal(pointInScreenPolygonFill({ x: 5, y: 5 }, polygonWithHole), false);
  assert.equal(pointInScreenPolygonFill({ x: 20, y: 20 }, polygonWithHole), true);
});

test("region crossing a hole boundary still intersects the polygon boundary", () => {
  const polygonWithHole = [
    [
      { x: -10, y: -10 },
      { x: 30, y: -10 },
      { x: 30, y: 30 },
      { x: -10, y: 30 },
      { x: -10, y: -10 },
    ],
    [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 15 },
      { x: 5, y: 15 },
      { x: 5, y: 5 },
    ],
  ];
  assert.equal(screenPolygonIntersectsRegion(polygonWithHole, BOX), true);
});

test("multi geometries intersect when any component intersects", () => {
  assert.equal(
    screenGeometryIntersectsRegion(
      {
        type: "MultiLineString",
        coordinates: [
          [{ x: 20, y: 20 }, { x: 30, y: 30 }],
          [{ x: -5, y: 5 }, { x: 15, y: 5 }],
        ],
      },
      BOX,
    ),
    true,
  );
  assert.equal(
    screenGeometryIntersectsRegion(
      {
        type: "MultiPolygon",
        coordinates: [
          [[
            { x: 20, y: 20 },
            { x: 30, y: 20 },
            { x: 30, y: 30 },
            { x: 20, y: 30 },
            { x: 20, y: 20 },
          ]],
          [[
            { x: 2, y: 2 },
            { x: 4, y: 2 },
            { x: 4, y: 4 },
            { x: 2, y: 4 },
            { x: 2, y: 2 },
          ]],
        ],
      },
      BOX,
    ),
    true,
  );
});

test("bounds and finite-coordinate failures are explicit", () => {
  assert.deepEqual(screenPointsBounds([{ x: -2, y: 4 }, { x: 5, y: -1 }]), {
    minX: -2,
    minY: -1,
    maxX: 5,
    maxY: 4,
  });
  assert.throws(
    () => normalizeScreenBounds({ x: Number.NaN, y: 0 }, { x: 1, y: 1 }),
    /finite x\/y/,
  );
  assert.throws(() => screenPointsBounds([]), /empty point set/);
});
