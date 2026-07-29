import type { Position } from "@plotlibre/core";

export interface PincerArrowParameters {
  readonly headLengthRatio?: number;
}

export function buildPincerArrowRing(
  _controlPoints: readonly Position[],
  _parameters: PincerArrowParameters = {},
): readonly Position[] {
  throw new Error("Pincer geometry implementation is incomplete.");
}
