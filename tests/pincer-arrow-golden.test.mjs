import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildPincerArrowRing } from "@plotlibre/geometry";

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/pincer-arrow.json", import.meta.url), "utf8"),
);

test("pincer arrow matches the deterministic golden fixture", () => {
  const actual = buildPincerArrowRing(
    fixture.controlPoints,
    fixture.parameters,
  );
  assert.deepEqual(actual, fixture.expectedRing);
});
