import type { Position } from "@plotlibre/core";
import {
  buildPincerArrowFrame,
  type PincerArmFrame,
  unprojectPincerArrowRing,
} from "./pincer-arrow-frame.js";
import { closeRing, ensureRingWinding, isSimpleRing } from "./ring.js";
import { distance, type Vec2 } from "./vector.js";

export interface PincerArrowParameters {
  readonly headLengthRatio?: number;
  readonly maximumHeadLengthTailRatio?: number;
  readonly headHalfWidthTailRatio?: number;
  readonly neckHalfWidthTailRatio?: number;
  readonly armBulgeRatio?: number;
  readonly outerTension?: number;
  readonly innerTension?: number;
  readonly junctionShoulderRatio?: number;
  readonly segmentsPerSpan?: number;
  readonly miterLimit?: number;
  readonly minimumTailSpanMeters?: number;
  readonly maximumTailSpanMeters?: number;
}

export interface ResolvedPincerArrowParameters {
  readonly headLengthRatio: number;
  readonly maximumHeadLengthTailRatio: number;
  readonly headHalfWidthTailRatio: number;
  readonly neckHalfWidthTailRatio: number;
  readonly armBulgeRatio: number;
  readonly outerTension: number;
  readonly innerTension: number;
  readonly junctionShoulderRatio: number;
  readonly segmentsPerSpan: number;
  readonly miterLimit: number;
  readonly minimumTailSpanMeters: number;
  readonly maximumTailSpanMeters: number;
}

export const DEFAULT_PINCER_ARROW_PARAMETERS: ResolvedPincerArrowParameters = {
  headLengthRatio: 0.2,
  maximumHeadLengthTailRatio: 2.1,
  headHalfWidthTailRatio: 0.52,
  neckHalfWidthTailRatio: 0.16,
  armBulgeRatio: 1.05,
  outerTension: 0.18,
  innerTension: 0.36,
  junctionShoulderRatio: 0.38,
  segmentsPerSpan: 16,
  miterLimit: 3,
  minimumTailSpanMeters: 1,
  maximumTailSpanMeters: 100_000,
};

export function resolvePincerArrowParameters(
  parameters: PincerArrowParameters = {},
): ResolvedPincerArrowParameters {
  const resolved = { ...DEFAULT_PINCER_ARROW_PARAMETERS, ...parameters };
  assertRange("headLengthRatio", resolved.headLengthRatio, 0.05, 0.42);
  assertRange(
    "maximumHeadLengthTailRatio",
    resolved.maximumHeadLengthTailRatio,
    0.5,
    6,
  );
  assertRange(
    "headHalfWidthTailRatio",
    resolved.headHalfWidthTailRatio,
    0.2,
    1.25,
  );
  assertRange(
    "neckHalfWidthTailRatio",
    resolved.neckHalfWidthTailRatio,
    0.05,
    0.6,
  );
  if (resolved.neckHalfWidthTailRatio >= resolved.headHalfWidthTailRatio) {
    throw new RangeError(
      "neckHalfWidthTailRatio must be smaller than headHalfWidthTailRatio.",
    );
  }
  assertRange("armBulgeRatio", resolved.armBulgeRatio, 0.6, 1.8);
  assertRange("outerTension", resolved.outerTension, 0, 1);
  assertRange("innerTension", resolved.innerTension, 0, 1);
  assertRange(
    "junctionShoulderRatio",
    resolved.junctionShoulderRatio,
    0.12,
    0.65,
  );
  assertIntegerRange("segmentsPerSpan", resolved.segmentsPerSpan, 4, 128);
  assertRange("miterLimit", resolved.miterLimit, 1, 10);
  if (
    !Number.isFinite(resolved.minimumTailSpanMeters) ||
    resolved.minimumTailSpanMeters <= 0
  ) {
    throw new RangeError(
      "minimumTailSpanMeters must be a positive finite number.",
    );
  }
  if (
    !Number.isFinite(resolved.maximumTailSpanMeters) ||
    resolved.maximumTailSpanMeters < resolved.minimumTailSpanMeters
  ) {
    throw new RangeError(
      "maximumTailSpanMeters must be finite and >= minimumTailSpanMeters.",
    );
  }
  return resolved;
}

export function buildPincerArrowRing(
  controlPoints: readonly Position[],
  parameters: PincerArrowParameters = {},
): readonly Position[] {
  const resolved = resolvePincerArrowParameters(parameters);
  const frame = buildPincerArrowFrame(controlPoints, resolved);
  const armAPath = buildArmBoundaryPath(frame.armA);
  const armBPath = buildArmBoundaryPath(frame.armB);
  const localRing = ensureRingWinding(
    closeRing([...armAPath, ...armBPath.slice(0, -1).reverse()]),
    "counterclockwise",
  );

  const junctionCount = localRing
    .slice(0, -1)
    .filter((point) => distance(point, frame.junction) <= 1e-6).length;
  if (junctionCount !== 1) {
    throw new RangeError(
      "Pincer arrow ring must contain the authored inner junction exactly once.",
    );
  }
  if (!isSimpleRing(localRing, 1e-6)) {
    throw new RangeError(
      "Pincer arrow produced a self-intersecting ring; adjust the junction, objective pairing or arm parameters.",
    );
  }
  return unprojectPincerArrowRing(frame, localRing);
}

function buildArmBoundaryPath(arm: PincerArmFrame): readonly Vec2[] {
  return [
    arm.outerTail,
    ...arm.outerBoundary.slice(1, -1),
    arm.outerNeck,
    arm.outerHeadShoulder,
    arm.head.tip,
    arm.innerHeadShoulder,
    arm.innerNeck,
    ...arm.innerBoundary.slice(1, -1).reverse(),
    arm.junction,
  ];
}

function assertRange(
  name: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
  }
}

function assertIntegerRange(
  name: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${name} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
}
