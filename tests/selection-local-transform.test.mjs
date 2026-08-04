import assert from "node:assert/strict";
import test from "node:test";
import { createPlotFeature } from "@plotlibre/core";
import { createLocalProjection } from "@plotlibre/geometry";
import {
  deriveSelectionTransformFrame,
  normalizeClockwiseRadians,
  rotatePlotFeaturesLocal,
  scalePlotFeaturesLocal,
  SelectionTransformError,
  signedClockwiseAngleDelta,
} from "@plotlibre/interaction";

const ORIGIN = [118.8, 32];

function feature(id, controlPoints, options = {}) {
  return createPlotFeature({
    id,
    plotType: "test.selection-local-transform",
    definitionVersion: "1.0.0",
    controlPoints,
    parameters: options.parameters ?? { widthRatio: 0.25 },
    style: options.style ?? { fillColor: "#123456", lineWidth: 3 },
    metadata: options.metadata ?? { source: "fixture" },
    revision: options.revision ?? 0,
  });
}

function localPosition(x, y, origin = ORIGIN) {
  return createLocalProjection(origin).unproject({ x, y });
}

function assertClose(actual, expected, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function assertPointClose(actual, expected, tolerance = 1e-6) {
  assertClose(actual.x, expected.x, tolerance);
  assertClose(actual.y, expected.y, tolerance);
}

function assertFrameClose(actual, expected) {
  assertClose(actual.origin[0], expected.origin[0], 1e-12);
  assertClose(actual.origin[1], expected.origin[1], 1e-12);
  assertPointClose(actual.pivotMeters, expected.pivotMeters);
  assertClose(actual.pivot[0], expected.pivot[0], 1e-12);
  assertClose(actual.pivot[1], expected.pivot[1], 1e-12);
  for (const key of ["minX", "minY", "maxX", "maxY"]) {
    assertClose(actual.boundsMeters[key], expected.boundsMeters[key]);
  }
}

test("selection frame is order-independent and uses the authored-control AABB centre", () => {
  const first = feature("a", [
    localPosition(-100, -50),
    localPosition(80, 40),
  ]);
  const second = feature("b", [
    localPosition(20, 100),
    localPosition(60, -20),
  ]);

  const frame = deriveSelectionTransformFrame([first, second]);
  const shuffled = deriveSelectionTransformFrame([
    feature("b", [...second.controlPoints].reverse()),
    feature("a", [...first.controlPoints].reverse()),
  ]);

  assertFrameClose(frame, shuffled);
  assert.equal(Object.isFrozen(frame), true);
  assert.equal(Object.isFrozen(frame.origin), true);
  assert.equal(Object.isFrozen(frame.pivotMeters), true);
  assert.equal(Object.isFrozen(frame.pivot), true);
  assert.equal(Object.isFrozen(frame.boundsMeters), true);

  assertClose(frame.pivotMeters.x, (frame.boundsMeters.minX + frame.boundsMeters.maxX) / 2);
  assertClose(frame.pivotMeters.y, (frame.boundsMeters.minY + frame.boundsMeters.maxY) / 2);
});

test("positive ninety-degree rotation maps north to east and preserves properties", () => {
  const original = feature(
    "cardinal",
    [
      localPosition(0, 100),
      localPosition(100, 0),
      localPosition(0, -100),
      localPosition(-100, 0),
    ],
    {
      revision: 7,
      parameters: { minimumWidthMeters: 12 },
      style: { lineColor: "#abcdef", lineWidth: 4 },
      metadata: { owner: "test" },
    },
  );
  const frame = deriveSelectionTransformFrame([original]);
  const rotated = rotatePlotFeaturesLocal([original], frame, Math.PI / 2)[0];
  const projection = createLocalProjection(frame.origin);
  const local = rotated.controlPoints.map((position) => projection.project(position));

  assertPointClose(local[0], { x: 100, y: 0 }, 1e-5);
  assertPointClose(local[1], { x: 0, y: -100 }, 1e-5);
  assertPointClose(local[2], { x: -100, y: 0 }, 1e-5);
  assertPointClose(local[3], { x: 0, y: 100 }, 1e-5);

  assert.equal(rotated.revision, 8);
  assert.equal(rotated.id, original.id);
  assert.equal(rotated.plotType, original.plotType);
  assert.deepEqual(rotated.parameters, original.parameters);
  assert.deepEqual(rotated.style, original.style);
  assert.deepEqual(rotated.metadata, original.metadata);
  assert.deepEqual(original.controlPoints[0], localPosition(0, 100));
});

test("rotation preserves every authored-control distance to the shared pivot", () => {
  const originals = [
    feature("a", [localPosition(-90, -30), localPosition(20, 70)], { revision: 2 }),
    feature("b", [localPosition(140, 10), localPosition(-40, 110)], { revision: 4 }),
  ];
  const frame = deriveSelectionTransformFrame(originals);
  const projection = createLocalProjection(frame.origin);
  const rotated = rotatePlotFeaturesLocal(originals, frame, 2.4);

  for (const [featureIndex, next] of rotated.entries()) {
    assert.equal(next.revision, originals[featureIndex].revision + 1);
    for (const [pointIndex, position] of next.controlPoints.entries()) {
      const before = projection.project(originals[featureIndex].controlPoints[pointIndex]);
      const after = projection.project(position);
      assertClose(
        Math.hypot(before.x - frame.pivotMeters.x, before.y - frame.pivotMeters.y),
        Math.hypot(after.x - frame.pivotMeters.x, after.y - frame.pivotMeters.y),
        1e-5,
      );
    }
  }
});

test("positive uniform scale applies one factor without reflection", () => {
  const original = feature("scale", [
    localPosition(-100, -40),
    localPosition(100, 40),
  ]);
  const frame = deriveSelectionTransformFrame([original]);
  const projection = createLocalProjection(frame.origin);
  const scaled = scalePlotFeaturesLocal([original], frame, 0.25)[0];

  for (const [index, position] of scaled.controlPoints.entries()) {
    const before = projection.project(original.controlPoints[index]);
    const after = projection.project(position);
    assertClose(after.x - frame.pivotMeters.x, 0.25 * (before.x - frame.pivotMeters.x));
    assertClose(after.y - frame.pivotMeters.y, 0.25 * (before.y - frame.pivotMeters.y));
    assert.equal(
      Math.sign(after.x - frame.pivotMeters.x),
      Math.sign(before.x - frame.pivotMeters.x),
    );
  }
  assert.equal(scaled.revision, 1);
  assert.deepEqual(scaled.parameters, original.parameters);
  assert.deepEqual(scaled.style, original.style);
  assert.deepEqual(scaled.metadata, original.metadata);
});

test("scale accepts exact boundaries and rejects values outside them", () => {
  const original = feature("scale-range", [localPosition(-1, 0), localPosition(1, 0)]);
  const frame = deriveSelectionTransformFrame([original]);

  assert.equal(scalePlotFeaturesLocal([original], frame, 0.01).length, 1);
  assert.equal(scalePlotFeaturesLocal([original], frame, 100).length, 1);

  for (const invalid of [0, 0.009, 100.001, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => scalePlotFeaturesLocal([original], frame, invalid),
      (error) =>
        error instanceof SelectionTransformError &&
        error.code === "SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE",
    );
  }
});

test("signed clockwise pointer deltas preserve direction across the angle branch cut", () => {
  assertClose(signedClockwiseAngleDelta({ x: 0, y: 1 }, { x: 1, y: 0 }), Math.PI / 2);

  const degrees = (value) => value * Math.PI / 180;
  const vector = (angle) => ({ x: Math.cos(angle), y: Math.sin(angle) });
  const first = signedClockwiseAngleDelta(vector(degrees(179)), vector(degrees(-179)));
  const second = signedClockwiseAngleDelta(vector(degrees(-179)), vector(degrees(179)));

  assertClose(first, degrees(-2), 1e-12);
  assertClose(second, degrees(2), 1e-12);
  assertClose(normalizeClockwiseRadians(3 * Math.PI), Math.PI, 1e-12);
  assertClose(normalizeClockwiseRadians(-3 * Math.PI), Math.PI, 1e-12);
});

test("pointer angle rejects non-finite and near-zero vectors", () => {
  assert.throws(
    () => signedClockwiseAngleDelta({ x: Number.NaN, y: 0 }, { x: 1, y: 0 }),
    (error) =>
      error instanceof SelectionTransformError &&
      error.code === "SELECTION_TRANSFORM_POINTER_INVALID",
  );
  assert.throws(
    () => signedClockwiseAngleDelta({ x: 0, y: 0 }, { x: 1, y: 0 }),
    (error) =>
      error instanceof SelectionTransformError &&
      error.code === "SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL",
  );
});

test("frame derivation rejects empty, coincident and unsupported coordinate domains", () => {
  assert.throws(
    () => deriveSelectionTransformFrame([]),
    (error) =>
      error instanceof SelectionTransformError &&
      error.code === "SELECTION_TRANSFORM_SELECTION_EMPTY",
  );

  assert.throws(
    () => deriveSelectionTransformFrame([feature("same", [[0, 0], [0, 0]])]),
    (error) =>
      error instanceof SelectionTransformError &&
      error.code === "SELECTION_TRANSFORM_FRAME_DEGENERATE",
  );

  for (const controls of [
    [[179.9, 0], [-179.9, 0]],
    [[0, 80.1], [0.01, 80.2]],
    [[0, 0], [3, 0]],
    [[0, Number.NaN], [1, 0]],
  ]) {
    assert.throws(
      () => deriveSelectionTransformFrame([feature("unsupported", controls)]),
      (error) =>
        error instanceof SelectionTransformError &&
        error.code === "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
    );
  }
});

test("frame policy options are validated and can tighten local extent", () => {
  const source = [feature("policy", [localPosition(0, 0), localPosition(20, 0)])];
  assert.throws(
    () => deriveSelectionTransformFrame(source, { maximumLocalExtentMeters: 10 }),
    /extent exceeds/,
  );
  assert.throws(
    () => deriveSelectionTransformFrame(source, { maximumLocalExtentMeters: 0 }),
    /positive and finite/,
  );
  assert.throws(
    () => deriveSelectionTransformFrame(source, { maximumLocalLatitude: 90 }),
    /between 0 and 90/,
  );
  assert.throws(
    () => deriveSelectionTransformFrame(source, { degenerateEpsilonMeters: 0 }),
    /positive and finite/,
  );
});

test("transform functions reject malformed frames and non-finite angles", () => {
  const original = feature("invalid-frame", [localPosition(-10, 0), localPosition(10, 0)]);
  const frame = deriveSelectionTransformFrame([original]);
  assert.throws(
    () => rotatePlotFeaturesLocal([original], frame, Number.NaN),
    (error) =>
      error instanceof SelectionTransformError &&
      error.code === "SELECTION_TRANSFORM_POINTER_INVALID",
  );
  assert.throws(
    () => rotatePlotFeaturesLocal([original], {
      ...frame,
      boundsMeters: { ...frame.boundsMeters, maxX: Number.NaN },
    }, 1),
    (error) =>
      error instanceof SelectionTransformError &&
      error.code === "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
  );
});
