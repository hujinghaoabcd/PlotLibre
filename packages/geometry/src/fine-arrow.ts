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
  const projection = createLocalProjection(tail);
  const tailCenter: Vec2 = { x: 0, y: 0 };
  const tip = projection.project(tipPosition);
  const directionVector = subtract(tip, tailCenter);
  const arrowLength = magnitude(directionVector);

  if (arrowLength < 1e-6) {
    throw new RangeError("A fine arrow requires two distinct control points.");
  }

  const resolved = resolveFineArrowParameters(parameters);
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
    arrowLength * 0.75,
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

  // Preserve the exact semantic tip rather than a projection round-trip value.
  geographicRing[3] = [tipPosition[0], tipPosition[1]];
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
