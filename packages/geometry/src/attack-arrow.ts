import type { Position } from "@plotlibre/core";
import {
  buildAttackArrowFrame,
  unprojectAttackArrowRing,
} from "./attack-arrow-frame.js";
import {
  closeRing,
  ensureRingWinding,
  isSimpleRing,
} from "./ring.js";

export interface AttackArrowParameters {
  readonly headLengthRatio?: number;
  readonly maximumHeadLengthTailRatio?: number;
  readonly headHalfWidthTailRatio?: number;
  readonly neckHalfWidthTailRatio?: number;
  readonly bodyBulgeRatio?: number;
  readonly bodyBulgePosition?: number;
  readonly tension?: number;
  readonly segmentsPerSpan?: number;
  readonly miterLimit?: number;
  readonly minimumTailWidthMeters?: number;
  readonly maximumTailWidthMeters?: number;
}

export interface ResolvedAttackArrowParameters {
  readonly headLengthRatio: number;
  readonly maximumHeadLengthTailRatio: number;
  readonly headHalfWidthTailRatio: number;
  readonly neckHalfWidthTailRatio: number;
  readonly bodyBulgeRatio: number;
  readonly bodyBulgePosition: number;
  readonly tension: number;
  readonly segmentsPerSpan: number;
  readonly miterLimit: number;
  readonly minimumTailWidthMeters: number;
  readonly maximumTailWidthMeters: number;
}

export const DEFAULT_ATTACK_ARROW_PARAMETERS: ResolvedAttackArrowParameters = {
  headLengthRatio: 0.22,
  maximumHeadLengthTailRatio: 2.4,
  headHalfWidthTailRatio: 0.95,
  neckHalfWidthTailRatio: 0.32,
  bodyBulgeRatio: 1.08,
  bodyBulgePosition: 0.35,
  tension: 0.12,
  segmentsPerSpan: 16,
  miterLimit: 3,
  minimumTailWidthMeters: 1,
  maximumTailWidthMeters: 100_000,
};

export function resolveAttackArrowParameters(
  parameters: AttackArrowParameters = {},
): ResolvedAttackArrowParameters {
  const resolved = {
    ...DEFAULT_ATTACK_ARROW_PARAMETERS,
    ...parameters,
  };

  assertRange("headLengthRatio", resolved.headLengthRatio, 0.05, 0.45);
  assertRange(
    "maximumHeadLengthTailRatio",
    resolved.maximumHeadLengthTailRatio,
    0.5,
    6,
  );
  assertRange(
    "headHalfWidthTailRatio",
    resolved.headHalfWidthTailRatio,
    0.35,
    2,
  );
  assertRange(
    "neckHalfWidthTailRatio",
    resolved.neckHalfWidthTailRatio,
    0.1,
    0.75,
  );
  assertRange("bodyBulgeRatio", resolved.bodyBulgeRatio, 0.75, 1.75);
  assertRange(
    "bodyBulgePosition",
    resolved.bodyBulgePosition,
    0.05,
    0.85,
  );
  assertRange("tension", resolved.tension, 0, 1);
  assertIntegerRange("segmentsPerSpan", resolved.segmentsPerSpan, 4, 128);
  assertRange("miterLimit", resolved.miterLimit, 1, 10);

  if (
    !Number.isFinite(resolved.minimumTailWidthMeters) ||
    resolved.minimumTailWidthMeters <= 0
  ) {
    throw new RangeError(
      "minimumTailWidthMeters must be a positive finite number.",
    );
  }
  if (
    !Number.isFinite(resolved.maximumTailWidthMeters) ||
    resolved.maximumTailWidthMeters < resolved.minimumTailWidthMeters
  ) {
    throw new RangeError(
      "maximumTailWidthMeters must be finite and >= minimumTailWidthMeters.",
    );
  }

  return resolved;
}

export function buildAttackArrowRing(
  controlPoints: readonly Position[],
  parameters: AttackArrowParameters = {},
): readonly Position[] {
  const resolved = resolveAttackArrowParameters(parameters);
  const frame = buildAttackArrowFrame(controlPoints, resolved);
  const localRing = ensureRingWinding(
    closeRing([
      frame.tailLeft,
      ...frame.leftBodyInterior,
      frame.head.neckLeft,
      frame.head.headLeft,
      frame.head.tip,
      frame.head.headRight,
      frame.head.neckRight,
      ...frame.rightBodyInterior.slice().reverse(),
      frame.tailRight,
    ]),
    "counterclockwise",
  );

  if (!isSimpleRing(localRing, 1e-6)) {
    throw new RangeError(
      "Attack arrow produced a self-intersecting ring; narrow the tail or simplify spine controls.",
    );
  }

  return unprojectAttackArrowRing(frame, localRing);
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
