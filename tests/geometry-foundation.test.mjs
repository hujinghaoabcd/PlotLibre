import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  analyzeCoordinateMode,
  buildArrowHead,
  cleanPolyline,
  closeRing,
  destinationPoint,
  ensureRingWinding,
  findRingSelfIntersections,
  geodesicPath,
  haversineDistance,
  initialBearingDegrees,
  isSimpleRing,
  measurePolyline,
  metersBetween,
  normalizeLongitude,
  offsetPolyline,
  ringWinding,
  sampleCatmullRom,
  sampleCubicBezier,
  sampleMeasuredPolyline,
  samplePolylineAtRatio,
  signedRingArea,
  unwrapLongitudes,
} from "@plotlibre/geometry";

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/geometry-foundation.json", import.meta.url),
    "utf8",
  ),
);

function vec2([x, y]) {
  return { x, y };
}

function asPair(point) {
  return [point.x, point.y];
}

function assertClose(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} was not within ${tolerance} of ${expected}`,
  );
}

function assertVecClose(actual, expected, tolerance = 1e-9) {
  assertClose(actual.x, expected[0], tolerance);
  assertClose(actual.y, expected[1], tolerance);
}

test("polyline metrics match the golden fixture", () => {
  const measured = measurePolyline(fixture.polyline.map(vec2));
  assert.deepEqual(measured.cumulativeLengths, fixture.cumulativeLengths);
  assert.equal(measured.totalLength, 7);

  const sample = sampleMeasuredPolyline(measured, 5);
  assertVecClose(sample.point, fixture.sampleAtDistance5.point);
  assertVecClose(sample.tangent, fixture.sampleAtDistance5.tangent);
  assert.equal(sample.segmentIndex, fixture.sampleAtDistance5.segmentIndex);
  assert.equal(sample.segmentRatio, fixture.sampleAtDistance5.segmentRatio);
});

test("polyline cleaning removes only consecutive near duplicates", () => {
  const cleaned = cleanPolyline(
    [
      { x: 0, y: 0 },
      { x: 1e-12, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 0 },
    ],
    1e-9,
  );
  assert.deepEqual(cleaned, [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 0 },
  ]);
});

test("sampling clamps to the polyline endpoints", () => {
  const points = fixture.polyline.map(vec2);
  assert.deepEqual(sampleMeasuredPolyline(measurePolyline(points), -10).point, points[0]);
  assert.deepEqual(samplePolylineAtRatio(points, 2).point, points.at(-1));
});

test("Catmull-Rom and cubic Bezier preserve endpoints", () => {
  const catmull = sampleCatmullRom(
    [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 4, y: -1 },
      { x: 6, y: 0 },
    ],
    { segmentsPerSpan: 8 },
  );
  assert.deepEqual(catmull[0], { x: 0, y: 0 });
  assert.deepEqual(catmull.at(-1), { x: 6, y: 0 });
  assert.equal(catmull.length, 25);

  const bezier = sampleCubicBezier(
    { x: 0, y: 0 },
    { x: 1, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 0 },
    10,
  );
  assert.deepEqual(bezier[0], { x: 0, y: 0 });
  assert.deepEqual(bezier.at(-1), { x: 4, y: 0 });
});

test("variable-width offset matches the golden fixture", () => {
  const result = offsetPolyline(fixture.polyline.map(vec2), 1);
  assert.deepEqual(result.left.map(asPair), fixture.offsetHalfWidth1.left);
  assert.deepEqual(result.right.map(asPair), fixture.offsetHalfWidth1.right);
});

test("offset rejects duplicate path vertices and invalid profiles", () => {
  assert.throws(
    () =>
      offsetPolyline(
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        1,
      ),
    /duplicate/,
  );
  assert.throws(
    () => offsetPolyline(fixture.polyline.map(vec2), [1, 1]),
    /must contain 3 values/,
  );
});

test("ring helpers close, orient, and detect self-intersections", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];
  const closed = closeRing(square);
  assert.deepEqual(closed[0], closed.at(-1));
  assert.equal(signedRingArea(closed), 4);
  assert.equal(ringWinding(closed), "counterclockwise");
  assert.equal(ringWinding(ensureRingWinding(closed, "clockwise")), "clockwise");
  assert.equal(isSimpleRing(closed), true);

  const bowTie = [
    { x: 0, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
    { x: 2, y: 0 },
  ];
  assert.deepEqual(findRingSelfIntersections(bowTie), [
    { firstSegment: 0, secondSegment: 2 },
  ]);
});

test("shared arrow head geometry is symmetric", () => {
  const head = buildArrowHead(
    { x: 10, y: 0 },
    { x: 1, y: 0 },
    { length: 3, headHalfWidth: 2, neckHalfWidth: 1 },
  );
  assert.deepEqual(head.neckCenter, { x: 7, y: 0 });
  assert.deepEqual(head.headLeft, { x: 7, y: 2 });
  assert.deepEqual(head.headRight, { x: 7, y: -2 });
  assert.deepEqual(head.neckLeft, { x: 7, y: 1 });
  assert.deepEqual(head.neckRight, { x: 7, y: -1 });
});

test("geodesic helpers handle antimeridian paths", () => {
  assert.equal(normalizeLongitude(181), -179);
  assert.deepEqual(unwrapLongitudes([[179, 0], [-179, 0], [-178, 0]]), [
    [179, 0],
    [181, 0],
    [182, 0],
  ]);

  const distance = haversineDistance([0, 0], [0.001, 0]);
  assert.ok(distance > 111 && distance < 112);
  const bearing = initialBearingDegrees([0, 0], [0.001, 0]);
  assertClose(bearing, 90, 1e-10);
  const destination = destinationPoint([0, 0], bearing, distance);
  assertClose(destination[0], 0.001, 1e-10);
  assertClose(destination[1], 0, 1e-10);

  const path = geodesicPath([179.9, 10], [-179.9, 10], 8);
  assert.deepEqual(path[0], [179.9, 10]);
  assert.deepEqual(path.at(-1), [-179.9, 10]);
  assert.equal(path.every(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude)), true);
});

test("coordinate policy chooses local or geodesic mode explicitly", () => {
  const local = analyzeCoordinateMode([
    [118.78, 32.04],
    [118.84, 32.09],
  ]);
  assert.equal(local.mode, "local");
  assert.deepEqual(local.reasons, []);

  const antimeridian = analyzeCoordinateMode([
    [179.9, 0],
    [-179.9, 0],
  ]);
  assert.equal(antimeridian.mode, "geodesic");
  assert.equal(antimeridian.crossesAntimeridian, true);

  const polar = analyzeCoordinateMode([
    [0, 82],
    [0.1, 82],
  ]);
  assert.equal(polar.mode, "geodesic");
});

test("local projection uses the shortest antimeridian delta", () => {
  const distance = metersBetween([179.999, 0], [-179.999, 0]);
  assert.ok(distance > 222 && distance < 223);
});

test("property-style random polylines remain finite and monotonic", () => {
  let state = 0x5f3759df;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };

  for (let caseIndex = 0; caseIndex < 100; caseIndex += 1) {
    const points = [{ x: 0, y: 0 }];
    for (let index = 1; index < 8; index += 1) {
      points.push({
        x: points.at(-1).x + 1 + random() * 20,
        y: (random() - 0.5) * 50,
      });
    }

    const measured = measurePolyline(points);
    assert.ok(measured.totalLength > 0);
    for (let index = 1; index < measured.cumulativeLengths.length; index += 1) {
      assert.ok(
        measured.cumulativeLengths[index] > measured.cumulativeLengths[index - 1],
      );
    }

    for (const ratio of [0, 0.1, 0.5, 0.9, 1]) {
      const sample = sampleMeasuredPolyline(measured, measured.totalLength * ratio);
      assert.equal(Number.isFinite(sample.point.x), true);
      assert.equal(Number.isFinite(sample.point.y), true);
      assertClose(Math.hypot(sample.tangent.x, sample.tangent.y), 1, 1e-10);
    }

    const widths = points.map(() => 0.5 + random() * 5);
    const offset = offsetPolyline(points, widths);
    for (const point of [...offset.left, ...offset.right]) {
      assert.equal(Number.isFinite(point.x), true);
      assert.equal(Number.isFinite(point.y), true);
    }
  }
});
