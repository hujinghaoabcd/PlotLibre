import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStraightArrowRing,
  metersBetween,
} from "@plotlibre/geometry";

test("straight arrow generates a finite closed polygon ring", () => {
  const start = [118.78, 32.04];
  const end = [118.84, 32.09];
  const ring = buildStraightArrowRing(start, end);

  assert.equal(ring.length, 8);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.deepEqual(ring[3], end);
  for (const coordinate of ring) {
    assert.equal(Number.isFinite(coordinate[0]), true);
    assert.equal(Number.isFinite(coordinate[1]), true);
  }
});

test("straight arrow rejects identical control points", () => {
  assert.throws(
    () => buildStraightArrowRing([118, 32], [118, 32]),
    /distinct control points/,
  );
});

test("local projection returns a plausible ground distance", () => {
  const distance = metersBetween([0, 0], [0, 0.001]);
  assert.ok(distance > 110 && distance < 112);
});
