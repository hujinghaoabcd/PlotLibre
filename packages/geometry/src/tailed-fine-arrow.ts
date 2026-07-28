import type { Position } from "@plotlibre/core";
import {
  buildFineArrowFrame,
  unprojectFineArrowRing,
} from "./fine-arrow-frame.js";
import {
  resolveFineArrowParameters,
  type FineArrowParameters,
  type ResolvedFineArrowParameters,
} from "./fine-arrow.js";
import { add, scale, subtract } from "./vector.js";

export interface TailedFineArrowParameters extends FineArrowParameters {
  /** Swallowtail notch depth relative to the full tail width. */
  readonly tailNotchRatio?: number;
}

export interface ResolvedTailedFineArrowParameters
  extends ResolvedFineArrowParameters {
  readonly tailNotchRatio: number;
}

export const DEFAULT_TAILED_FINE_ARROW_PARAMETERS: ResolvedTailedFineArrowParameters = {
  ...resolveFineArrowParameters(),
  tailNotchRatio: 0.9,
};

export function resolveTailedFineArrowParameters(
  parameters: TailedFineArrowParameters = {},
): ResolvedTailedFineArrowParameters {
  const fine = resolveFineArrowParameters(parameters);
  const tailNotchRatio = parameters.tailNotchRatio ?? 0.9;

  if (
    !Number.isFinite(tailNotchRatio) ||
    tailNotchRatio < 0.05 ||
    tailNotchRatio > 4
  ) {
    throw new RangeError("tailNotchRatio must be between 0.05 and 4.");
  }

  return {
    ...fine,
    tailNotchRatio,
  };
}

/**
 * Builds a two-point fine arrow with a centered inward swallowtail notch.
 */
export function buildTailedFineArrowRing(
  tail: Position,
  tipPosition: Position,
  parameters: TailedFineArrowParameters = {},
): readonly Position[] {
  const resolved = resolveTailedFineArrowParameters(parameters);
  const frame = buildFineArrowFrame(tail, tipPosition, resolved);
  const fullTailWidth = frame.tailHalfWidth * 2;
  const notchDepth = fullTailWidth * resolved.tailNotchRatio;
  const shaftLength = Math.hypot(
    frame.head.neckCenter.x - frame.tailCenter.x,
    frame.head.neckCenter.y - frame.tailCenter.y,
  );

  if (notchDepth >= shaftLength * 0.8) {
    throw new RangeError(
      "tailNotchRatio creates a notch that extends too far into the arrow body.",
    );
  }

  const tailLeft = add(
    frame.tailCenter,
    scale(frame.normal, frame.tailHalfWidth),
  );
  const tailRight = add(
    frame.tailCenter,
    scale(frame.normal, -frame.tailHalfWidth),
  );
  const notch = add(frame.tailCenter, scale(frame.direction, notchDepth));
  const ring = [
    tailLeft,
    frame.head.neckLeft,
    frame.head.headLeft,
    frame.head.tip,
    frame.head.headRight,
    frame.head.neckRight,
    tailRight,
    notch,
    tailLeft,
  ];

  // The notch must remain behind the neck centre in the direction of travel.
  const notchToNeck = subtract(frame.head.neckCenter, notch);
  if (
    notchToNeck.x * frame.direction.x + notchToNeck.y * frame.direction.y <= 0
  ) {
    throw new RangeError("The swallowtail notch must remain behind the arrow neck.");
  }

  return unprojectFineArrowRing(frame, ring, tipPosition, 3);
}
