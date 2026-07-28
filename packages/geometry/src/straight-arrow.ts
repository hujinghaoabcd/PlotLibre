import type { Position } from "@plotlibre/core";
import { buildArrowHead } from "./arrow-components.js";
import { createLocalProjection } from "./local-projection.js";
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

export interface StraightArrowParameters {
  readonly tailWidthRatio?: number;
  readonly headLengthRatio?: number;
  readonly headWidthRatio?: number;
  readonly neckWidthRatio?: number;
  readonly minimumWidthMeters?: number;
  readonly maximumWidthMeters?: number;
}

export interface ResolvedStraightArrowParameters {
  readonly tailWidthRatio: number;
  readonly headLengthRatio: number;
  readonly headWidthRatio: number;
  readonly neckWidthRatio: number;
  readonly minimumWidthMeters: number;
  readonly maximumWidthMeters: number;
}

export const DEFAULT_STRAIGHT_ARROW_PARAMETERS: ResolvedStraightArrowParameters = {
  tailWidthRatio: 0.08,
  headLengthRatio: 0.28,
  headWidthRatio: 2.4,
  neckWidthRatio: 0.8,
  minimumWidthMeters: 1,
  maximumWidthMeters: 100_000,
};

export function resolveStraightArrowParameters(
  parameters: StraightArrowParameters = {},
): ResolvedStraightArrowParameters {
  const resolved = {
    ...DEFAULT_STRAIGHT_ARROW_PARAMETERS,
    ...parameters,
  };

  assertRatio("tailWidthRatio", resolved.tailWidthRatio, 0, 0.5);
  assertRatio("headLengthRatio", resolved.headLengthRatio, 0.05, 0.8);
  assertRatio("headWidthRatio", resolved.headWidthRatio, 1, 10);
  assertRatio("neckWidthRatio", resolved.neckWidthRatio, 0.05, 1.5);

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

export function buildStraightArrowRing(
  start: Position,
  end: Position,
  parameters: StraightArrowParameters = {},
): readonly Position[] {
  const projection = createLocalProjection(start);
  const tailCenter: Vec2 = { x: 0, y: 0 };
  const tip = projection.project(end);
  const directionVector = subtract(tip, tailCenter);
  const arrowLength = magnitude(directionVector);

  if (arrowLength < 1e-6) {
    throw new RangeError(
      "A straight arrow requires two distinct control points.",
    );
  }

  const resolved = resolveStraightArrowParameters(parameters);
  const direction = normalize(directionVector);
  const normal = leftNormal(direction);
  const tailHalfWidth =
    clamp(
      arrowLength * resolved.tailWidthRatio,
      resolved.minimumWidthMeters,
      resolved.maximumWidthMeters,
    ) / 2;
  const headLength = Math.min(
    arrowLength * resolved.headLengthRatio,
    arrowLength * 0.8,
  );
  const head = buildArrowHead(tip, direction, {
    length: headLength,
    headHalfWidth: tailHalfWidth * resolved.headWidthRatio,
    neckHalfWidth: tailHalfWidth * resolved.neckWidthRatio,
  });

  const tailLeft = add(tailCenter, scale(normal, tailHalfWidth));
  const tailRight = add(tailCenter, scale(normal, -tailHalfWidth));
  const ring = [
    tailLeft,
    head.neckLeft,
    head.headLeft,
    head.tip,
    head.headRight,
    head.neckRight,
    tailRight,
    tailLeft,
  ];
  const geographicRing = ring.map((point) => projection.unproject(point));

  // Preserve the exact semantic tip control point instead of returning a
  // projection round-trip approximation with sub-nanodegree floating error.
  geographicRing[3] = [end[0], end[1]];
  return geographicRing;
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
