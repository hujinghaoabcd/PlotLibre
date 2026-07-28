import {
  add,
  dot,
  leftNormal,
  magnitude,
  normalize,
  scale,
  subtract,
  type Vec2,
} from "./vector.js";
import { measurePolyline } from "./polyline.js";

export interface OffsetPolylineOptions {
  readonly miterLimit?: number;
  readonly tolerance?: number;
}

export interface OffsetPolylineResult {
  readonly center: readonly Vec2[];
  readonly left: readonly Vec2[];
  readonly right: readonly Vec2[];
  readonly halfWidths: readonly number[];
}

export type HalfWidthProfile = number | readonly number[];

export function offsetPolyline(
  input: readonly Vec2[],
  profile: HalfWidthProfile,
  options: OffsetPolylineOptions = {},
): OffsetPolylineResult {
  const tolerance = options.tolerance ?? 1e-9;
  const miterLimit = options.miterLimit ?? 4;
  if (!Number.isFinite(miterLimit) || miterLimit < 1) {
    throw new RangeError("Offset miterLimit must be a finite number >= 1.");
  }

  const measured = measurePolyline(input, tolerance);
  if (measured.points.length !== input.length) {
    throw new RangeError(
      "Offset input must not contain consecutive duplicate or near-duplicate points.",
    );
  }

  const halfWidths = resolveHalfWidths(measured.points.length, profile);
  const left: Vec2[] = [];
  const right: Vec2[] = [];

  for (let index = 0; index < measured.points.length; index += 1) {
    const point = measured.points[index]!;
    const halfWidth = halfWidths[index]!;
    const offset = vertexOffset(measured.points, index, halfWidth, miterLimit);
    left.push(add(point, offset));
    right.push(subtract(point, offset));
  }

  return {
    center: measured.points,
    left,
    right,
    halfWidths,
  };
}

function resolveHalfWidths(
  pointCount: number,
  profile: HalfWidthProfile,
): readonly number[] {
  const widths =
    typeof profile === "number"
      ? Array.from({ length: pointCount }, () => profile)
      : [...profile];

  if (widths.length !== pointCount) {
    throw new RangeError(
      `Offset half-width profile must contain ${pointCount} values.`,
    );
  }
  for (const [index, width] of widths.entries()) {
    if (!Number.isFinite(width) || width < 0) {
      throw new RangeError(`halfWidths[${index}] must be finite and non-negative.`);
    }
  }
  return widths;
}

function vertexOffset(
  points: readonly Vec2[],
  index: number,
  halfWidth: number,
  miterLimit: number,
): Vec2 {
  const point = points[index]!;
  if (index === 0) {
    const next = points[1]!;
    return scale(leftNormal(normalize(subtract(next, point))), halfWidth);
  }
  if (index === points.length - 1) {
    const previous = points[index - 1]!;
    return scale(leftNormal(normalize(subtract(point, previous))), halfWidth);
  }

  const previous = points[index - 1]!;
  const next = points[index + 1]!;
  const incoming = normalize(subtract(point, previous));
  const outgoing = normalize(subtract(next, point));
  const incomingNormal = leftNormal(incoming);
  const outgoingNormal = leftNormal(outgoing);
  const normalSum = add(incomingNormal, outgoingNormal);

  if (magnitude(normalSum) < 1e-12) {
    return scale(outgoingNormal, halfWidth);
  }

  const miter = normalize(normalSum);
  const denominator = dot(miter, outgoingNormal);
  if (Math.abs(denominator) < 1e-12) {
    return scale(outgoingNormal, halfWidth);
  }

  const requestedLength = halfWidth / denominator;
  const maximumLength = halfWidth * miterLimit;
  const boundedLength = Math.max(
    -maximumLength,
    Math.min(maximumLength, requestedLength),
  );
  return scale(miter, boundedLength);
}
