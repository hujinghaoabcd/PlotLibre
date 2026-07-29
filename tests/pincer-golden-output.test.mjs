import test from "node:test";
import { buildPincerArrowRing } from "@plotlibre/geometry";

test("capture pincer golden output", () => {
  const controlPoints = [
    [-0.004, 0],
    [0.004, 0],
    [-0.009, 0.014],
    [0.009, 0.014],
    [0, 0.002],
  ];
  const ring = buildPincerArrowRing(controlPoints);
  console.log(`PINCER_GOLDEN=${JSON.stringify(ring)}`);
});
