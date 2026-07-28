import type { Position } from "@plotlibre/core";
import {
  buildFineArrowFrame,
  unprojectFineArrowRing,
} from "./fine-arrow-frame.js";
import { add, scale } from "./vector.js";

/**
 * Parameters for the two-point fine arrow.
 *
 * Width ratios describe the full tail width relative to total arrow length.
 * Head and neck ratios are relative to the tail half-width so that the symbol
 * scales deterministically while remaining serializable and editable.
 */
export interface FineArrowParameters {
  readonly tailWidthRatio?: number;
  readonly headLengthRatio?: number;
  readonly headWidthRatio?: number;
  readonly neckWidthRatio?: number;
  readonly minimumWidthMeters?: number;
  readonly maximumWidthMeters?: number;
}

export interface ResolvedFineArrowParameters {
  readonly tailWidthRatio: number;
  readonly headLengthRatio: number;
  readonly headWidthRatio: number;
  readonly neckWidthRatio: number;
  readonly minimumWidthMeters: number;
  readonly maximumWidthMeters: number;
}

export const DEFAULT_FINE_ARROW_PARAMETERS: ResolvedFineArrowParameters = {
  tailWidthRatio: 0.055,
  headLengthRatio: 0.22,
  headWidthRatio: 1.9,
  neckWidthRatio: 0.42,
  minimumWidthMeters: 1,
  maximumWidthMeters: 100_000,
};

export function resolveFineArrowParameters(
  parameters: FineArrowParameters = {},
): ResolvedFineArrowParameters {
  const resolved = {
    ...DEFAULT_FINE_ARROW_PARAMETERS,
    ...parameters,
  };

  assertRatio("tailWidthRatio", resolved.tailWidthRatio, 0.005, 0.3);
  assertRatio("headLengthRatio", resolved.headLengthRatio, 0.05, 0.7);
  assertRatio("headWidthRatio", resolved.headWidthRatio, 1, 6);
  assertRatio("neckWidthRatio", resolved.neckWidthRatio, 0.05, 1);

  if (
    !Number.isFinite(resolved.minimumWidthMeters) ||
    resolved.minimumWidthMeters <= 0
  ) {
    throw new RangeError("minimumWidthMeters must be a positive number.");
  }
  if (
    !Number.isFinite(resolved.maximumWidthMeters) ||
    resolved.maximumWidthMeters < resolved.minimumWidthMeters
  ) {
    throw new RangeError(
      "maximumWidthMeters must be finite and >= minimumWidthMeters.",
    );
  }

  return resolved;
}

/**
 * Builds a narrow, tapered two-point arrow in a local metre projection.
 *
 * The two semantic control points remain the canonical tail centre and tip.
 * Generated polygon vertices are derived output only.
 */
export function buildFineArrowRing(
  tail: Position,
  tipPosition: Position,
  parameters: FineArrowParameters = {},
): readonly Position[] {
  const resolved = resolveFineArrowParameters(parameters);
  const frame = buildFineArrowFrame(tail, tipPosition, resolved);
  const tailLeft = add(
    frame.tailCenter,
    scale(frame.normal, frame.tailHalfWidth),
  );
  const tailRight = add(
    frame.tailCenter,
    scale(frame.normal, -frame.tailHalfWidth),
  );
  const ring = [
    tailLeft,
    frame.head.neckLeft,
    frame.head.headLeft,
    frame.head.tip,
    frame.head.headRight,
    frame.head.neckRight,
    tailRight,
    tailLeft,
  ];

  return unprojectFineArrowRing(frame, ring, tipPosition, 3);
}

function assertRatio(
  name: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
  }
}
