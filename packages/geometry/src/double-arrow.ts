import type { Position } from "@plotlibre/core";
import type { ArrowHeadGeometry } from "./arrow-components.js";
import {
  buildDoubleArrowFrame,
  unprojectDoubleArrowRing,
} from "./double-arrow-frame.js";
import { closeRing, ensureRingWinding, isSimpleRing } from "./ring.js";
import { dot, normalize, subtract, type Vec2 } from "./vector.js";

export interface DoubleArrowParameters {
  readonly branchPositionRatio?: number;
  readonly headLengthRatio?: number;
  readonly maximumHeadLengthTailRatio?: number;
  readonly headHalfWidthTailRatio?: number;
  readonly neckHalfWidthTailRatio?: number;
  readonly bodyBulgeRatio?: number;
  readonly innerBridgeRatio?: number;
  readonly tension?: number;
  readonly segmentsPerSpan?: number;
  readonly miterLimit?: number;
  readonly minimumTailWidthMeters?: number;
  readonly maximumTailWidthMeters?: number;
}

export interface ResolvedDoubleArrowParameters {
  readonly branchPositionRatio: number;
  readonly headLengthRatio: number;
  readonly maximumHeadLengthTailRatio: number;
  readonly headHalfWidthTailRatio: number;
  readonly neckHalfWidthTailRatio: number;
  readonly bodyBulgeRatio: number;
  readonly innerBridgeRatio: number;
  readonly tension: number;
  readonly segmentsPerSpan: number;
  readonly miterLimit: number;
  readonly minimumTailWidthMeters: number;
  readonly maximumTailWidthMeters: number;
}

export const DEFAULT_DOUBLE_ARROW_PARAMETERS: ResolvedDoubleArrowParameters = {
  branchPositionRatio: 0.42,
  headLengthRatio: 0.22,
  maximumHeadLengthTailRatio: 2.2,
  headHalfWidthTailRatio: 0.58,
  neckHalfWidthTailRatio: 0.18,
  bodyBulgeRatio: 1.05,
  innerBridgeRatio: 0.55,
  tension: 0.18,
  segmentsPerSpan: 12,
  miterLimit: 3,
  minimumTailWidthMeters: 1,
  maximumTailWidthMeters: 100_000,
};

export function resolveDoubleArrowParameters(
  parameters: DoubleArrowParameters = {},
): ResolvedDoubleArrowParameters {
  const resolved = { ...DEFAULT_DOUBLE_ARROW_PARAMETERS, ...parameters };
  assertRange("branchPositionRatio", resolved.branchPositionRatio, 0.15, 0.7);
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
    0.25,
    1.5,
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
  assertRange("bodyBulgeRatio", resolved.bodyBulgeRatio, 0.75, 1.75);
  assertRange("innerBridgeRatio", resolved.innerBridgeRatio, 0.15, 1.5);
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

export function buildDoubleArrowRing(
  controlPoints: readonly Position[],
  parameters: DoubleArrowParameters = {},
): readonly Position[] {
  const resolved = resolveDoubleArrowParameters(parameters);
  const frame = buildDoubleArrowFrame(controlPoints, resolved);
  const leftOuter = trimBoundaryBehindHead(
    frame.leftWing.outerBoundary,
    frame.leftWing.head,
  );
  const leftInner = trimBoundaryBehindHead(
    frame.leftWing.innerBoundary,
    frame.leftWing.head,
  );
  const rightOuter = trimBoundaryBehindHead(
    frame.rightWing.outerBoundary,
    frame.rightWing.head,
  );
  const rightInner = trimBoundaryBehindHead(
    frame.rightWing.innerBoundary,
    frame.rightWing.head,
  );
  const localRing = ensureRingWinding(
    closeRing([
      frame.tailLeft,
      frame.leftBodyBulge,
      ...leftOuter,
      frame.leftWing.head.neckLeft,
      frame.leftWing.head.headLeft,
      frame.leftWing.head.tip,
      frame.leftWing.head.headRight,
      frame.leftWing.head.neckRight,
      ...leftInner.slice().reverse(),
      frame.innerBridgePoint,
      ...rightInner,
      frame.rightWing.head.neckLeft,
      frame.rightWing.head.headLeft,
      frame.rightWing.head.tip,
      frame.rightWing.head.headRight,
      frame.rightWing.head.neckRight,
      ...rightOuter.slice().reverse(),
      frame.rightBodyBulge,
      frame.tailRight,
    ]),
    "counterclockwise",
  );
  if (!isSimpleRing(localRing, 1e-6)) {
    throw new RangeError(
      "Double arrow produced a self-intersecting ring; separate the objectives, narrow the tail or adjust branch parameters.",
    );
  }
  return unprojectDoubleArrowRing(frame, localRing);
}

function trimBoundaryBehindHead(
  points: readonly Vec2[],
  head: ArrowHeadGeometry,
): readonly Vec2[] {
  const forward = normalize(subtract(head.tip, head.neckCenter));
  return points.filter(
    (point) => dot(subtract(point, head.neckCenter), forward) < -1e-6,
  );
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
