import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCircularArcLine,
  buildCircularSegmentRing,
  buildSectorFrame,
  buildSectorRing,
  buildThreePointCircularArcFrame,
  createLocalProjection,
  isSimpleRing,
  resolveCircularSamplingParameters,
  resolveSectorParameters,
  ringWinding,
  signedRingArea,
} from "@plotlibre/geometry";

const origin = [118.8, 32.0];
const fixtureProjection = createLocalProjection(origin);
const position = (x, y) => fixtureProjection.unproject({ x, y });
const local = (coordinates) =>
  coordinates.map((coordinate) => fixtureProjection.project(coordinate));

function pointOnFixtureCircle(radius, degrees) {
  const radians = (degrees * Math.PI) / 180;
  return position(radius * Math.cos(radians), radius * Math.sin(radians));
}

function assertPositionNear(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual[0] - expected[0]) <= tolerance &&
      Math.abs(actual[1] - expected[1]) <= tolerance,
    `Expected ${JSON.stringify(actual)} to be near ${JSON.stringify(expected)}.`,
  );
}

function includesPosition(coordinates, expected, tolerance = 1e-9) {
  return coordinates.some(
    (coordinate) =>
      Math.abs(coordinate[0] - expected[0]) <= tolerance &&
      Math.abs(coordinate[1] - expected[1]) <= tolerance,
  );
}

test("three-point frame preserves an exact counterclockwise minor arc", () => {
  const controls = [
    pointOnFixtureCircle(1_000, 0),
    pointOnFixtureCircle(1_000, 45),
    pointOnFixtureCircle(1_000, 90),
  ];
  const frame = buildThreePointCircularArcFrame(controls, {
    segmentsPerCircle: 72,
  });

  assert.equal(frame.direction, "counterclockwise");
  assert.ok(Math.abs(frame.totalSweepRadians - Math.PI / 2) < 1e-5);
  assertPositionNear(frame.samples[0], controls[0]);
  assertPositionNear(frame.samples[frame.throughSampleIndex], controls[1]);
  assertPositionNear(frame.samples.at(-1), controls[2]);
  assert.ok(Math.abs(frame.radiusMeters - 1_000) < 0.1);
});

test("through-point selects a clockwise major arc", () => {
  const controls = [
    pointOnFixtureCircle(1_000, 0),
    pointOnFixtureCircle(1_000, 270),
    pointOnFixtureCircle(1_000, 90),
  ];
  const frame = buildThreePointCircularArcFrame(controls, {
    segmentsPerCircle: 72,
  });

  assert.equal(frame.direction, "clockwise");
  assert.ok(Math.abs(frame.totalSweepRadians - (3 * Math.PI) / 2) < 1e-5);
  assertPositionNear(frame.samples[frame.throughSampleIndex], controls[1]);
});

test("directed arc crosses zero degrees without swapping controls", () => {
  const controls = [
    pointOnFixtureCircle(1_500, 350),
    pointOnFixtureCircle(1_500, 0),
    pointOnFixtureCircle(1_500, 10),
  ];
  const frame = buildThreePointCircularArcFrame(controls, {
    segmentsPerCircle: 360,
  });

  assert.equal(frame.direction, "counterclockwise");
  assert.ok(
    Math.abs(frame.totalSweepRadians - (20 * Math.PI) / 180) < 1e-5,
  );
  assertPositionNear(frame.samples[0], controls[0]);
  assertPositionNear(frame.samples[frame.throughSampleIndex], controls[1]);
  assertPositionNear(frame.samples.at(-1), controls[2]);
});

test("reversing start and end reverses the same sampled footprint", () => {
  const controls = [
    pointOnFixtureCircle(2_000, 20),
    pointOnFixtureCircle(2_000, 170),
    pointOnFixtureCircle(2_000, 300),
  ];
  const forward = buildCircularArcLine(controls, { segmentsPerCircle: 144 });
  const reversed = buildCircularArcLine(
    [controls[2], controls[1], controls[0]],
    { segmentsPerCircle: 144 },
  );

  assert.equal(forward.length, reversed.length);
  for (let index = 0; index < forward.length; index += 1) {
    assertPositionNear(forward[index], reversed[reversed.length - 1 - index], 1e-8);
  }
});

test("segmentsPerCircle changes density without changing the circle controls", () => {
  const controls = [
    pointOnFixtureCircle(1_000, 0),
    pointOnFixtureCircle(1_000, 60),
    pointOnFixtureCircle(1_000, 120),
  ];
  const sparse = buildThreePointCircularArcFrame(controls, {
    segmentsPerCircle: 24,
  });
  const dense = buildThreePointCircularArcFrame(controls, {
    segmentsPerCircle: 240,
  });

  assert.ok(dense.samples.length > sparse.samples.length);
  assert.ok(Math.abs(dense.radiusMeters - sparse.radiusMeters) < 1e-6);
  assert.ok(Math.abs(dense.totalSweepRadians - sparse.totalSweepRadians) < 1e-12);
  for (const frame of [sparse, dense]) {
    assertPositionNear(frame.samples[0], controls[0]);
    assertPositionNear(frame.samples[frame.throughSampleIndex], controls[1]);
    assertPositionNear(frame.samples.at(-1), controls[2]);
  }
});

test("circular segment creates a simple counterclockwise arc-and-chord ring", () => {
  const controls = [
    pointOnFixtureCircle(1_000, 0),
    pointOnFixtureCircle(1_000, 45),
    pointOnFixtureCircle(1_000, 90),
  ];
  const ring = buildCircularSegmentRing(controls, {
    segmentsPerCircle: 144,
  });
  const localRing = local(ring);

  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(localRing), "counterclockwise");
  assert.equal(isSimpleRing(localRing, 1e-6), true);
  assert.ok(Math.abs(signedRingArea(localRing)) > 1);
  controls.forEach((control) => {
    assert.equal(includesPosition(ring, control), true);
  });
});

test("major circular segment encloses more area than the matching minor segment", () => {
  const start = pointOnFixtureCircle(1_000, 0);
  const end = pointOnFixtureCircle(1_000, 90);
  const minor = buildCircularSegmentRing(
    [start, pointOnFixtureCircle(1_000, 45), end],
    { segmentsPerCircle: 360 },
  );
  const major = buildCircularSegmentRing(
    [start, pointOnFixtureCircle(1_000, 270), end],
    { segmentsPerCircle: 360 },
  );

  assert.ok(
    Math.abs(signedRingArea(local(major))) >
      Math.abs(signedRingArea(local(minor))),
  );
});

test("clockwise sector derives the end boundary at the authored start radius", () => {
  const center = position(0, 0);
  const start = position(1_000, 0);
  const bearingHandle = position(0, -2_000);
  const frame = buildSectorFrame([center, start, bearingHandle], {
    sweepDirection: "clockwise",
    segmentsPerCircle: 72,
  });

  assert.equal(frame.direction, "clockwise");
  assert.ok(Math.abs(frame.sweepRadians - Math.PI / 2) < 1e-5);
  assert.ok(Math.abs(frame.radiusMeters - 1_000) < 0.1);
  assertPositionNear(frame.center, center);
  assertPositionNear(frame.arcSamples[0], start);
  assertPositionNear(frame.endBoundary, position(0, -1_000), 1e-8);
  assertPositionNear(frame.arcSamples.at(-1), frame.endBoundary);
});

test("sector end-bearing distance does not change the rendered endpoint", () => {
  const center = position(0, 0);
  const start = position(1_000, 0);
  const near = buildSectorFrame(
    [center, start, position(0, -500)],
    { sweepDirection: "clockwise" },
  );
  const far = buildSectorFrame(
    [center, start, position(0, -5_000)],
    { sweepDirection: "clockwise" },
  );

  assertPositionNear(near.endBoundary, far.endBoundary, 1e-10);
  assert.ok(Math.abs(near.sweepRadians - far.sweepRadians) < 1e-12);
});

test("counterclockwise sector supports a major sweep and a simple ring", () => {
  const center = position(0, 0);
  const start = position(1_000, 0);
  const bearingHandle = position(0, -2_000);
  const frame = buildSectorFrame([center, start, bearingHandle], {
    sweepDirection: "counterclockwise",
    segmentsPerCircle: 144,
  });
  const ring = buildSectorRing([center, start, bearingHandle], {
    sweepDirection: "counterclockwise",
    segmentsPerCircle: 144,
  });
  const localRing = local(ring);

  assert.ok(Math.abs(frame.sweepRadians - (3 * Math.PI) / 2) < 1e-5);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.equal(ringWinding(localRing), "counterclockwise");
  assert.equal(isSimpleRing(localRing, 1e-6), true);
  assert.equal(includesPosition(ring, center), true);
  assert.equal(includesPosition(ring, start), true);
  assert.equal(includesPosition(ring, bearingHandle), false);
});

test("circular geometry rejects duplicate, collinear and excessive-radius input", () => {
  const duplicate = [position(0, 0), position(1_000, 0), position(0, 0)];
  assert.throws(
    () => buildCircularArcLine(duplicate),
    /pairwise distinct/,
  );

  const collinear = [position(-1_000, 0), position(0, 0), position(1_000, 0)];
  assert.throws(
    () => buildCircularArcLine(collinear),
    /collinear or numerically unstable/,
  );

  const excessiveRadius = [
    position(-1_000, 0),
    position(0, 0.1),
    position(1_000, 0),
  ];
  assert.throws(
    () => buildCircularArcLine(excessiveRadius),
    /circumradius must be between/,
  );
});

test("circular geometry rejects unsupported coordinate modes", () => {
  assert.throws(
    () =>
      buildCircularArcLine([
        [179.9, 0],
        [-179.9, 0.1],
        [179.8, 0.2],
      ]),
    /antimeridian|local controls only/,
  );
  assert.throws(
    () => buildCircularArcLine([[0, 81], [0.1, 81.1], [0.2, 81]]),
    /local controls only/,
  );
  assert.throws(
    () => buildCircularArcLine([[0, 0], [3, 0], [1.5, 1]]),
    /local controls only/,
  );
});

test("sector rejects zero sweep and invalid public parameters", () => {
  const center = position(0, 0);
  const start = position(1_000, 0);
  const sameBearing = position(2_000, 0);
  assert.throws(
    () => buildSectorRing([center, start, sameBearing]),
    /greater than zero and less than 360/,
  );
  assert.throws(
    () => resolveCircularSamplingParameters({ segmentsPerCircle: 8 }),
    /integer between 16 and 2048/,
  );
  assert.throws(
    () => resolveSectorParameters({ sweepDirection: "invalid" }),
    /clockwise.*counterclockwise/,
  );
});
