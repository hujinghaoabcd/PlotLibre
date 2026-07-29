import type { Position } from "@plotlibre/core";
import {
  buildAttackArrowFrame,
  unprojectAttackArrowRing,
} from "./attack-arrow-frame.js";
import {
  resolveAttackArrowParameters,
  type AttackArrowParameters,
  type ResolvedAttackArrowParameters,
} from "./attack-arrow.js";
import {
  closeRing,
  ensureRingWinding,
  isSimpleRing,
} from "./ring.js";
import {
  add,
  distance,
  dot,
  normalize,
  scale,
  subtract,
} from "./vector.js";

export interface TailedAttackArrowParameters extends AttackArrowParameters {
  /** Inward swallowtail depth relative to the full semantic tail width. */
  readonly tailNotchDepthRatio?: number;
  /** Swallowtail opening width relative to the full semantic tail width. */
  readonly tailNotchWidthRatio?: number;
}

export interface ResolvedTailedAttackArrowParameters
  extends ResolvedAttackArrowParameters {
  readonly tailNotchDepthRatio: number;
  readonly tailNotchWidthRatio: number;
}

export const DEFAULT_TAILED_ATTACK_ARROW_PARAMETERS: ResolvedTailedAttackArrowParameters = {
  ...resolveAttackArrowParameters(),
  tailNotchDepthRatio: 0.75,
  tailNotchWidthRatio: 0.65,
};

export function resolveTailedAttackArrowParameters(
  parameters: TailedAttackArrowParameters = {},
): ResolvedTailedAttackArrowParameters {
  const attack = resolveAttackArrowParameters(parameters);
  const tailNotchDepthRatio = parameters.tailNotchDepthRatio ?? 0.75;
  const tailNotchWidthRatio = parameters.tailNotchWidthRatio ?? 0.65;

  assertRange(
    "tailNotchDepthRatio",
    tailNotchDepthRatio,
    0.05,
    2.5,
  );
  assertRange(
    "tailNotchWidthRatio",
    tailNotchWidthRatio,
    0.1,
    0.95,
  );

  return {
    ...attack,
    tailNotchDepthRatio,
    tailNotchWidthRatio,
  };
}

/**
 * Builds an attack arrow that preserves the two exact semantic tail edges and
 * closes them with a centered inward swallowtail notch.
 */
export function buildTailedAttackArrowRing(
  controlPoints: readonly Position[],
  parameters: TailedAttackArrowParameters = {},
): readonly Position[] {
  const resolved = resolveTailedAttackArrowParameters(parameters);
  const frame = buildAttackArrowFrame(controlPoints, resolved);
  const firstSpinePoint = frame.sampledSpine[1];
  if (!firstSpinePoint) {
    throw new RangeError(
      "Tailed attack arrow requires a distinct initial spine direction.",
    );
  }

  const initialDirection = normalize(
    subtract(firstSpinePoint, frame.tailCenter),
  );
  const tailLeftDirection = normalize(
    subtract(frame.tailLeft, frame.tailCenter),
  );
  const tailRightDirection = normalize(
    subtract(frame.tailRight, frame.tailCenter),
  );
  const notchDepth = frame.tailWidth * resolved.tailNotchDepthRatio;
  const notchHalfWidth =
    (frame.tailWidth * resolved.tailNotchWidthRatio) / 2;
  const notchLeftRoot = add(
    frame.tailCenter,
    scale(tailLeftDirection, notchHalfWidth),
  );
  const notchRightRoot = add(
    frame.tailCenter,
    scale(tailRightDirection, notchHalfWidth),
  );
  const notchTip = add(
    frame.tailCenter,
    scale(initialDirection, notchDepth),
  );

  const neckDistance = distance(frame.tailCenter, frame.head.neckCenter);
  if (notchDepth >= neckDistance * 0.65) {
    throw new RangeError(
      "tailNotchDepthRatio creates a notch that extends too far into the attack body.",
    );
  }
  if (
    dot(subtract(frame.head.neckCenter, notchTip), initialDirection) <=
    frame.tailWidth * 0.05
  ) {
    throw new RangeError(
      "The swallowtail notch must remain behind the attack-arrow neck.",
    );
  }

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
      notchRightRoot,
      notchTip,
      notchLeftRoot,
    ]),
    "counterclockwise",
  );

  if (!isSimpleRing(localRing, 1e-6)) {
    throw new RangeError(
      "Tailed attack arrow produced a self-intersecting ring; reduce notch depth, narrow the tail or simplify spine controls.",
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
