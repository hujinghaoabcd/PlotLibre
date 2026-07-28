import {
  assertFiniteVec2,
  clamp,
  distance,
  lerp,
  normalize,
  subtract,
  type Vec2,
} from "./vector.js";

const DEFAULT_TOLERANCE = 1e-9;

export interface MeasuredPolyline {
  readonly points: readonly Vec2[];
  readonly segmentLengths: readonly number[];
  readonly cumulativeLengths: readonly number[];
  readonly totalLength: number;
}

export interface PolylineSample {
  readonly point: Vec2;
  readonly tangent: Vec2;
  readonly segmentIndex: number;
  readonly segmentRatio: number;
  readonly distance: number;
}

export function cleanPolyline(
  points: readonly Vec2[],
  tolerance = DEFAULT_TOLERANCE,
): readonly Vec2[] {
  assertTolerance(tolerance);
  const cleaned: Vec2[] = [];

  for (const [index, point] of points.entries()) {
    assertFiniteVec2(point, `points[${index}]`);
    const previous = cleaned.at(-1);
    if (!previous || distance(previous, point) > tolerance) {
      cleaned.push({ x: point.x, y: point.y });
    }
  }

  return cleaned;
}

export function measurePolyline(
  points: readonly Vec2[],
  tolerance = DEFAULT_TOLERANCE,
): MeasuredPolyline {
  const cleaned = cleanPolyline(points, tolerance);
  if (cleaned.length < 2) {
    throw new RangeError("A polyline requires at least two distinct points.");
  }

  const segmentLengths: number[] = [];
  const cumulativeLengths: number[] = [0];
  let totalLength = 0;

  for (let index = 1; index < cleaned.length; index += 1) {
    const previous = cleaned[index - 1]!;
    const current = cleaned[index]!;
    const segmentLength = distance(previous, current);
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
    cumulativeLengths.push(totalLength);
  }

  return {
    points: cleaned,
    segmentLengths,
    cumulativeLengths,
    totalLength,
  };
}

export function sampleMeasuredPolyline(
  polyline: MeasuredPolyline,
  requestedDistance: number,
): PolylineSample {
  if (!Number.isFinite(requestedDistance)) {
    throw new RangeError("Polyline sample distance must be finite.");
  }
  if (polyline.points.length < 2 || polyline.totalLength <= 0) {
    throw new RangeError("Measured polyline must contain a positive-length path.");
  }

  const targetDistance = clamp(requestedDistance, 0, polyline.totalLength);
  const segmentCount = polyline.segmentLengths.length;
  let segmentIndex = segmentCount - 1;

  for (let index = 0; index < segmentCount; index += 1) {
    const nextDistance = polyline.cumulativeLengths[index + 1]!;
    if (targetDistance <= nextDistance) {
      segmentIndex = index;
      break;
    }
  }

  const start = polyline.points[segmentIndex]!;
  const end = polyline.points[segmentIndex + 1]!;
  const segmentStartDistance = polyline.cumulativeLengths[segmentIndex]!;
  const segmentLength = polyline.segmentLengths[segmentIndex]!;
  const segmentRatio = clamp(
    (targetDistance - segmentStartDistance) / segmentLength,
    0,
    1,
  );

  return {
    point: lerp(start, end, segmentRatio),
    tangent: normalize(subtract(end, start)),
    segmentIndex,
    segmentRatio,
    distance: targetDistance,
  };
}

export function samplePolylineAtDistance(
  points: readonly Vec2[],
  requestedDistance: number,
  tolerance = DEFAULT_TOLERANCE,
): PolylineSample {
  return sampleMeasuredPolyline(
    measurePolyline(points, tolerance),
    requestedDistance,
  );
}

export function samplePolylineAtRatio(
  points: readonly Vec2[],
  ratio: number,
  tolerance = DEFAULT_TOLERANCE,
): PolylineSample {
  if (!Number.isFinite(ratio)) {
    throw new RangeError("Polyline sample ratio must be finite.");
  }
  const measured = measurePolyline(points, tolerance);
  return sampleMeasuredPolyline(measured, measured.totalLength * clamp(ratio, 0, 1));
}

export function resamplePolylineByCount(
  points: readonly Vec2[],
  count: number,
  tolerance = DEFAULT_TOLERANCE,
): readonly Vec2[] {
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError("Polyline resample count must be an integer >= 2.");
  }

  const measured = measurePolyline(points, tolerance);
  const sampled: Vec2[] = [];
  for (let index = 0; index < count; index += 1) {
    const ratio = index / (count - 1);
    sampled.push(
      sampleMeasuredPolyline(measured, measured.totalLength * ratio).point,
    );
  }
  return sampled;
}

function assertTolerance(tolerance: number): void {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError("Polyline tolerance must be finite and non-negative.");
  }
}
