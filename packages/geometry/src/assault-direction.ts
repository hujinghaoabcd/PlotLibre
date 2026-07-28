import type { Position } from "@plotlibre/core";
import { createLocalProjection } from "./local-projection.js";
import { isSimpleRing } from "./ring.js";
import {
  add,
  clamp,
  leftNormal,
  magnitude,
  normalize,
  scale,
  subtract,
  type Vec2,
} from "./vector.js";

export interface AssaultDirectionParameters {
  readonly bodyWidthRatio?: number;
  readonly headLengthRatio?: number;
  readonly headAngleDegrees?: number;
  readonly neckWidthRatio?: number;
  readonly minimumWidthMeters?: number;
  readonly maximumWidthMeters?: number;
}

export interface ResolvedAssaultDirectionParameters {
  readonly bodyWidthRatio: number;
  readonly headLengthRatio: number;
  readonly headAngleDegrees: number;
  readonly neckWidthRatio: number;
  readonly minimumWidthMeters: number;
  readonly maximumWidthMeters: number;
}

export const DEFAULT_ASSAULT_DIRECTION_PARAMETERS: ResolvedAssaultDirectionParameters = {
  bodyWidthRatio: 0.18,
  headLengthRatio: 0.3,
  headAngleDegrees: 42,
  neckWidthRatio: 0.72,
  minimumWidthMeters: 2,
  maximumWidthMeters: 100_000,
};

export function resolveAssaultDirectionParameters(
  parameters: AssaultDirectionParameters = {},
): ResolvedAssaultDirectionParameters {
  const resolved = {
    ...DEFAULT_ASSAULT_DIRECTION_PARAMETERS,
    ...parameters,
  };

  assertRange("bodyWidthRatio", resolved.bodyWidthRatio, 0.04, 0.4);
  assertRange("headLengthRatio", resolved.headLengthRatio, 0.12, 0.55);
  assertRange("headAngleDegrees", resolved.headAngleDegrees, 18, 68);
  assertRange("neckWidthRatio", resolved.neckWidthRatio, 0.35, 1);

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
 * Builds a broad, nearly constant-width assault-direction arrow.
 *
 * Unlike the fine-arrow family, its head flare is defined by an angle and the
 * shaft remains broad from the origin to the neck.
 */
export function buildAssaultDirectionRing(
  tail: Position,
  tipPosition: Position,
  parameters: AssaultDirectionParameters = {},
): readonly Position[] {
  const resolved = resolveAssaultDirectionParameters(parameters);
  const projection = createLocalProjection(tail);
  const tailCenter: Vec2 = { x: 0, y: 0 };
  const tip = projection.project(tipPosition);
  const directionVector = subtract(tip, tailCenter);
  const arrowLength = magnitude(directionVector);

  if (arrowLength < 1e-6) {
    throw new RangeError(
      "An assault direction requires two distinct control points.",
    );
  }

  const direction = normalize(directionVector);
  const normal = leftNormal(direction);
  const bodyHalfWidth =
    clamp(
      arrowLength * resolved.bodyWidthRatio,
      resolved.minimumWidthMeters,
      resolved.maximumWidthMeters,
    ) / 2;
  const headLength = Math.min(
    arrowLength * resolved.headLengthRatio,
    arrowLength * 0.7,
  );
  const shoulderCenter = subtract(tip, scale(direction, headLength));
  const angleRadians = (resolved.headAngleDegrees * Math.PI) / 180;
  const headHalfWidth = Math.min(
    headLength * Math.tan(angleRadians),
    arrowLength * 0.65,
  );
  const neckHalfWidth = bodyHalfWidth * resolved.neckWidthRatio;

  const tailLeft = add(tailCenter, scale(normal, bodyHalfWidth));
  const tailRight = add(tailCenter, scale(normal, -bodyHalfWidth));
  const neckLeft = add(shoulderCenter, scale(normal, neckHalfWidth));
  const neckRight = add(shoulderCenter, scale(normal, -neckHalfWidth));
  const headLeft = add(shoulderCenter, scale(normal, headHalfWidth));
  const headRight = add(shoulderCenter, scale(normal, -headHalfWidth));
  const ring = [
    tailLeft,
    neckLeft,
    headLeft,
    tip,
    headRight,
    neckRight,
    tailRight,
    tailLeft,
  ];

  if (!isSimpleRing(ring)) {
    throw new RangeError(
      "The assault-direction parameters create a self-intersecting polygon.",
    );
  }

  const geographicRing = ring.map((point) => projection.unproject(point));
  geographicRing[3] = [tipPosition[0], tipPosition[1]];
  return geographicRing;
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
