import assert from "node:assert/strict";
import test from "node:test";
import { createPlotFeature } from "@plotlibre/core";
import { createLocalProjection } from "@plotlibre/geometry";
import {
  createLocalTranslation,
  translatePlotFeaturesLocal,
} from "@plotlibre/interaction";

function feature(id, controlPoints, revision = 0) {
  return createPlotFeature({
    id,
    plotType: "test.local-translation",
    definitionVersion: "1.0.0",
    controlPoints,
    revision,
  });
}

test("local translation applies one exact metre vector to every authored control", () => {
  const origin = [118.8, 32];
  const projection = createLocalProjection(origin);
  const end = projection.unproject({ x: 100, y: 50 });
  const originals = [
    feature("a", [[118.8, 32], [118.81, 32.01]], 2),
    feature("b", [[118.82, 31.99]], 4),
  ];

  const translation = createLocalTranslation(origin, end);
  const translated = translatePlotFeaturesLocal(originals, translation);

  assert.equal(translated.length, 2);
  assert.equal(Object.isFrozen(translated), true);
  assert.deepEqual(translated.map((item) => item.revision), [3, 5]);
  assert.deepEqual(originals[0].controlPoints[0], [118.8, 32]);

  for (const [featureIndex, next] of translated.entries()) {
    const before = originals[featureIndex];
    for (const [pointIndex, position] of next.controlPoints.entries()) {
      const beforeLocal = projection.project(before.controlPoints[pointIndex]);
      const afterLocal = projection.project(position);
      assert.ok(Math.abs(afterLocal.x - beforeLocal.x - 100) < 1e-6);
      assert.ok(Math.abs(afterLocal.y - beforeLocal.y - 50) < 1e-6);
    }
  }
});

test("pointer-derived translation exposes an immutable local metre delta", () => {
  const origin = [0, 0];
  const projection = createLocalProjection(origin);
  const end = projection.unproject({ x: -25, y: 75 });
  const translation = createLocalTranslation(origin, end);

  assert.ok(Math.abs(translation.deltaMeters.x + 25) < 1e-9);
  assert.ok(Math.abs(translation.deltaMeters.y - 75) < 1e-9);
  assert.equal(Object.isFrozen(translation), true);
  assert.equal(Object.isFrozen(translation.origin), true);
  assert.equal(Object.isFrozen(translation.deltaMeters), true);
});

test("local translation uses the shortest antimeridian path", () => {
  const origin = [179.999, 0];
  const projection = createLocalProjection(origin);
  const end = projection.unproject({ x: 500, y: 0 });
  const translated = translatePlotFeaturesLocal(
    [feature("date-line", [[179.9995, 0]])],
    createLocalTranslation(origin, end),
  )[0];

  assert.ok(translated.controlPoints[0][0] < -179.99);
  const before = projection.project([179.9995, 0]);
  const after = projection.project(translated.controlPoints[0]);
  assert.ok(Math.abs(after.x - before.x - 500) < 1e-6);
});

test("local translation rejects non-finite deltas and invalid latitude output", () => {
  const source = [feature("a", [[0, 89.9999]])];
  assert.throws(
    () => translatePlotFeaturesLocal(source, {
      origin: [0, 0],
      deltaMeters: { x: Number.NaN, y: 0 },
    }),
    /finite metres/,
  );
  assert.throws(
    () => translatePlotFeaturesLocal(source, {
      origin: [0, 0],
      deltaMeters: { x: 0, y: 1_000 },
    }),
    /outside valid WGS84 latitude bounds/,
  );
});
