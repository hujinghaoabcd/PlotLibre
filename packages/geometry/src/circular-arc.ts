import type { Position } from "@plotlibre/core";
import {
  analyzeCoordinateMode,
  haversineDistance,
} from "./geodesic.js";
import { createLocalProjection } from "./local-projection.js";
import {
  closeRing,
  ensureRingWinding,
  isSimpleRing,
  signedRingArea,
} from "./ring.js";
import {
  almostEqual,
  distance,
  type Vec2,
} from "./vector.js";

const TWO_PI = 2 * Math.PI;
const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const CONTROL_TOLERANCE_METERS = 1e-6;
const ANGLE_TOLERANCE_RADIANS = 1e-10;
const DETERMINANT_RATIO_TOLERANCE = 1e-10;
const MINIMUM_RADIUS_METERS = 1e-3;
const MAXIMUM_CIRCUMRADIUS_METERS = 1_000_000;
const MAXIMUM_LOCAL_EXTENT_METERS = 250_000;
const MAXIMUM_LOCAL_LATITUDE = 80;

export type CircularSweepDirection = "clockwise" | "counterclockwise";

export interface CircularSamplingParameters {
  readonly segmentsPerCircle?: number;
}

export interface ResolvedCircularSamplingParameters {
  readonly segmentsPerCircle: number;
}

export interface SectorParameters extends CircularSamplingParameters {
  readonly sweepDirection?: CircularSweepDirection;
}

export interface ResolvedSectorParameters
  extends ResolvedCircularSamplingParameters {
  readonly sweepDirection: CircularSweepDirection;
}

export interface ThreePointCircularArcFrame {
  readonly center: Position;
  readonly radiusMeters: number;
  readonly direction: CircularSweepDirection;
  readonly startAngleRadians: number;
  readonly throughAngleRadians: number;
  readonly endAngleRadians: number;
  readonly startToThroughSweepRadians: number;
  readonly throughToEndSweepRadians: number;
  readonly totalSweepRadians: number;
  readonly throughSampleIndex: number;
  readonly samples: readonly Position[];
}

export interface SectorFrame {
  readonly center: Position;
  readonly radiusMeters: number;
  readonly direction: CircularSweepDirection;
  readonly startAngleRadians: number;
  readonly endAngleRadians: number;
  readonly sweepRadians: number;
  readonly endBoundary: Position;
  readonly arcSamples: readonly Position[];
}

export const DEFAULT_CIRCULAR_SAMPLING_PARAMETERS: ResolvedCircularSamplingParameters = {
  segmentsPerCircle: 128,
};

export const DEFAULT_SECTOR_PARAMETERS: ResolvedSectorParameters = {
  ...DEFAULT_CIRCULAR_SAMPLING_PARAMETERS,
  sweepDirection: "clockwise",
};

export function resolveCircularSamplingParameters(
  parameters: CircularSamplingParameters = {},
): ResolvedCircularSamplingParameters {
  const resolved = {
    ...DEFAULT_CIRCULAR_SAMPLING_PARAMETERS,
    ...parameters,
  };
  if (
    !Number.isInteger(resolved.segmentsPerCircle) ||
    resolved.segmentsPerCircle < 16 ||
    resolved.segmentsPerCircle > 2048
  ) {
    throw new RangeError(
      "segmentsPerCircle must be an integer between 16 and 2048.",
    );
  }
  return resolved;
}

export function resolveSectorParameters(
  parameters: SectorParameters = {},
): ResolvedSectorParameters {
  const resolved = {
    ...DEFAULT_SECTOR_PARAMETERS,
    ...parameters,
  };
  resolveCircularSamplingParameters(resolved);
  if (
    resolved.sweepDirection !== "clockwise" &&
    resolved.sweepDirection !== "counterclockwise"
  ) {
    throw new RangeError(
      'sweepDirection must be either "clockwise" or "counterclockwise".',
    );
  }
  return resolved;
}

export function buildThreePointCircularArcFrame(
  controlPoints: readonly Position[],
  parameters: CircularSamplingParameters = {},
): ThreePointCircularArcFrame {
  if (controlPoints.length !== 3) {
    throw new RangeError("A circular arc requires exactly three control points.");
  }
  const resolved = resolveCircularSamplingParameters(parameters);
  assertLocalControls(controlPoints, "Circular arc");

  const projection = createLocalProjection(orderIndependentOrigin(controlPoints));
  const [start, through, end] = controlPoints.map((point) => projection.project(point));
  assertPairwiseDistinct([start!, through!, end!], "Circular arc");

  const circle = circumcircle(start!, through!, end!);
  const startAngle = normalizeRadians(angleFromCenter(circle.center, start!));
  const throughAngle = normalizeRadians(angleFromCenter(circle.center, through!));
  const endAngle = normalizeRadians(angleFromCenter(circle.center, end!));
  const selection = selectThroughSweep(startAngle, throughAngle, endAngle);

  const firstSpan = sampleDirectedArcLocal(
    circle.center,
    circle.radius,
    startAngle,
    selection.startToThrough,
    selection.direction,
    resolved.segmentsPerCircle,
    start!,
    through!,
  );
  const secondSpan = sampleDirectedArcLocal(
    circle.center,
    circle.radius,
    throughAngle,
    selection.throughToEnd,
    selection.direction,
    resolved.segmentsPerCircle,
    through!,
    end!,
  );
  const localSamples = [...firstSpan, ...secondSpan.slice(1)];
  const samples = localSamples.map((point) => projection.unproject(point));
  const throughSampleIndex = firstSpan.length - 1;
  samples[0] = copyPosition(controlPoints[0]!);
  samples[throughSampleIndex] = copyPosition(controlPoints[1]!);
  samples[samples.length - 1] = copyPosition(controlPoints[2]!);

  return {
    center: projection.unproject(circle.center),
    radiusMeters: circle.radius,
    direction: selection.direction,
    startAngleRadians: startAngle,
    throughAngleRadians: throughAngle,
    endAngleRadians: endAngle,
    startToThroughSweepRadians: selection.startToThrough,
    throughToEndSweepRadians: selection.throughToEnd,
    totalSweepRadians: selection.startToThrough + selection.throughToEnd,
    throughSampleIndex,
    samples,
  };
}

export function buildCircularArcLine(
  controlPoints: readonly Position[],
  parameters: CircularSamplingParameters = {},
): readonly Position[] {
  return buildThreePointCircularArcFrame(controlPoints, parameters).samples;
}

export function buildCircularSegmentRing(
  controlPoints: readonly Position[],
  parameters: CircularSamplingParameters = {},
): readonly Position[] {
  const frame = buildThreePointCircularArcFrame(controlPoints, parameters);
  const projection = createLocalProjection(frame.center);
  const localArc = frame.samples.map((point) => projection.project(point));
  const ring = finalizePolygonRing(localArc, "Circular segment");
  const output = ring.map((point) => projection.unproject(point));

  // Preserve exact authored controls wherever they remain in the normalized ring.
  replaceMatchingPosition(output, controlPoints[0]!);
  replaceMatchingPosition(output, controlPoints[1]!);
  replaceMatchingPosition(output, controlPoints[2]!);
  output[output.length - 1] = copyPosition(output[0]!);
  return output;
}

export function buildSectorFrame(
  controlPoints: readonly Position[],
  parameters: SectorParameters = {},
): SectorFrame {
  if (controlPoints.length !== 3) {
    throw new RangeError("A sector requires exactly three control points.");
  }
  const resolved = resolveSectorParameters(parameters);
  assertLocalControls(controlPoints, "Sector");

  const centerPosition = controlPoints[0]!;
  const projection = createLocalProjection(centerPosition);
  const center = projection.project(centerPosition);
  const start = projection.project(controlPoints[1]!);
  const bearingHandle = projection.project(controlPoints[2]!);
  assertPairwiseDistinct([center, start, bearingHandle], "Sector");

  const radius = distance(center, start);
  if (!Number.isFinite(radius) || radius < MINIMUM_RADIUS_METERS) {
    throw new RangeError("Sector radius is too small or non-finite.");
  }

  const startAngle = normalizeRadians(angleFromCenter(center, start));
  const endAngle = normalizeRadians(angleFromCenter(center, bearingHandle));
  const sweep = directedDelta(startAngle, endAngle, resolved.sweepDirection);
  if (
    sweep <= ANGLE_TOLERANCE_RADIANS ||
    TWO_PI - sweep <= ANGLE_TOLERANCE_RADIANS
  ) {
    throw new RangeError("Sector sweep must be greater than zero and less than 360 degrees.");
  }

  const endBoundaryLocal = pointOnCircle(center, radius, endAngle);
  const localSamples = sampleDirectedArcLocal(
    center,
    radius,
    startAngle,
    sweep,
    resolved.sweepDirection,
    resolved.segmentsPerCircle,
    start,
    endBoundaryLocal,
  );
  const arcSamples = localSamples.map((point) => projection.unproject(point));
  arcSamples[0] = copyPosition(controlPoints[1]!);
  const endBoundary = projection.unproject(endBoundaryLocal);
  arcSamples[arcSamples.length - 1] = copyPosition(endBoundary);

  return {
    center: copyPosition(centerPosition),
    radiusMeters: radius,
    direction: resolved.sweepDirection,
    startAngleRadians: startAngle,
    endAngleRadians: endAngle,
    sweepRadians: sweep,
    endBoundary,
    arcSamples,
  };
}

export function buildSectorRing(
  controlPoints: readonly Position[],
  parameters: SectorParameters = {},
): readonly Position[] {
  const frame = buildSectorFrame(controlPoints, parameters);
  const projection = createLocalProjection(frame.center);
  const center = projection.project(frame.center);
  const arc = frame.arcSamples.map((point) => projection.project(point));
  const ring = finalizePolygonRing([center, ...arc], "Sector");
  const output = ring.map((point) => projection.unproject(point));

  replaceMatchingPosition(output, controlPoints[0]!);
  replaceMatchingPosition(output, controlPoints[1]!);
  replaceMatchingPosition(output, frame.endBoundary);
  output[output.length - 1] = copyPosition(output[0]!);
  return output;
}

function circumcircle(start: Vec2, through: Vec2, end: Vec2): {
  readonly center: Vec2;
  readonly radius: number;
} {
  const determinant =
    2 *
    (start.x * (through.y - end.y) +
      through.x * (end.y - start.y) +
      end.x * (start.y - through.y));
  const maximumChord = Math.max(
    distance(start, through),
    distance(through, end),
    distance(start, end),
  );
  const scaleSquared = maximumChord * maximumChord;
  if (
    !Number.isFinite(determinant) ||
    scaleSquared <= 0 ||
    Math.abs(determinant) <= scaleSquared * DETERMINANT_RATIO_TOLERANCE
  ) {
    throw new RangeError(
      "Circular-arc controls are collinear or numerically unstable.",
    );
  }

  const startSquared = start.x * start.x + start.y * start.y;
  const throughSquared = through.x * through.x + through.y * through.y;
  const endSquared = end.x * end.x + end.y * end.y;
  const center = {
    x:
      (startSquared * (through.y - end.y) +
        throughSquared * (end.y - start.y) +
        endSquared * (start.y - through.y)) /
      determinant,
    y:
      (startSquared * (end.x - through.x) +
        throughSquared * (start.x - end.x) +
        endSquared * (through.x - start.x)) /
      determinant,
  };
  const radius = distance(center, start);
  if (
    !Number.isFinite(center.x) ||
    !Number.isFinite(center.y) ||
    !Number.isFinite(radius) ||
    radius < MINIMUM_RADIUS_METERS ||
    radius > MAXIMUM_CIRCUMRADIUS_METERS
  ) {
    throw new RangeError(
      `Circular-arc circumradius must be between ${MINIMUM_RADIUS_METERS} and ${MAXIMUM_CIRCUMRADIUS_METERS} meters.`,
    );
  }
  return { center, radius };
}

function selectThroughSweep(
  start: number,
  through: number,
  end: number,
): {
  readonly direction: CircularSweepDirection;
  readonly startToThrough: number;
  readonly throughToEnd: number;
} {
  const ccwStartToThrough = directedDelta(start, through, "counterclockwise");
  const ccwThroughToEnd = directedDelta(through, end, "counterclockwise");
  const ccwStartToEnd = directedDelta(start, end, "counterclockwise");
  const cwStartToThrough = directedDelta(start, through, "clockwise");
  const cwThroughToEnd = directedDelta(through, end, "clockwise");
  const cwStartToEnd = directedDelta(start, end, "clockwise");

  const ccwValid =
    ccwStartToThrough > ANGLE_TOLERANCE_RADIANS &&
    ccwThroughToEnd > ANGLE_TOLERANCE_RADIANS &&
    Math.abs(ccwStartToThrough + ccwThroughToEnd - ccwStartToEnd) <=
      ANGLE_TOLERANCE_RADIANS;
  const cwValid =
    cwStartToThrough > ANGLE_TOLERANCE_RADIANS &&
    cwThroughToEnd > ANGLE_TOLERANCE_RADIANS &&
    Math.abs(cwStartToThrough + cwThroughToEnd - cwStartToEnd) <=
      ANGLE_TOLERANCE_RADIANS;

  if (ccwValid === cwValid) {
    throw new RangeError(
      "Circular-arc through-point does not select one unambiguous directed sweep.",
    );
  }

  const selected = ccwValid
    ? {
        direction: "counterclockwise" as const,
        startToThrough: ccwStartToThrough,
        throughToEnd: ccwThroughToEnd,
      }
    : {
        direction: "clockwise" as const,
        startToThrough: cwStartToThrough,
        throughToEnd: cwThroughToEnd,
      };
  const total = selected.startToThrough + selected.throughToEnd;
  if (total <= ANGLE_TOLERANCE_RADIANS || TWO_PI - total <= ANGLE_TOLERANCE_RADIANS) {
    throw new RangeError(
      "Circular-arc sweep must be greater than zero and less than 360 degrees.",
    );
  }
  return selected;
}

function sampleDirectedArcLocal(
  center: Vec2,
  radius: number,
  startAngle: number,
  sweep: number,
  direction: CircularSweepDirection,
  segmentsPerCircle: number,
  exactStart: Vec2,
  exactEnd: Vec2,
): readonly Vec2[] {
  const segmentCount = Math.max(
    1,
    Math.ceil((segmentsPerCircle * sweep) / TWO_PI),
  );
  const sign = direction === "counterclockwise" ? 1 : -1;
  const samples: Vec2[] = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    const ratio = index / segmentCount;
    samples.push(pointOnCircle(center, radius, startAngle + sign * sweep * ratio));
  }
  samples[0] = { ...exactStart };
  samples[samples.length - 1] = { ...exactEnd };
  return samples;
}

function directedDelta(
  start: number,
  end: number,
  direction: CircularSweepDirection,
): number {
  return direction === "counterclockwise"
    ? normalizeRadians(end - start)
    : normalizeRadians(start - end);
}

function normalizeRadians(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError("Angle must be finite.");
  }
  return ((value % TWO_PI) + TWO_PI) % TWO_PI;
}

function angleFromCenter(center: Vec2, point: Vec2): number {
  return Math.atan2(point.y - center.y, point.x - center.x);
}

function pointOnCircle(
  center: Vec2,
  radius: number,
  angle: number,
): Vec2 {
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

function finalizePolygonRing(
  vertices: readonly Vec2[],
  label: string,
): readonly Vec2[] {
  const closed = closeRing(vertices, CONTROL_TOLERANCE_METERS);
  const area = Math.abs(signedRingArea(closed));
  if (!Number.isFinite(area) || area <= 1e-6) {
    throw new RangeError(`${label} produced a degenerate ring.`);
  }
  if (!isSimpleRing(closed, CONTROL_TOLERANCE_METERS)) {
    throw new RangeError(`${label} produced a self-intersecting ring.`);
  }
  return ensureRingWinding(closed, "counterclockwise");
}

function assertLocalControls(
  controlPoints: readonly Position[],
  label: string,
): void {
  const analysis = analyzeCoordinateMode(controlPoints, {
    maximumLocalExtentMeters: MAXIMUM_LOCAL_EXTENT_METERS,
    maximumLocalLatitude: MAXIMUM_LOCAL_LATITUDE,
  });
  let maximumPairwiseExtent = 0;
  for (let first = 0; first < controlPoints.length; first += 1) {
    for (let second = first + 1; second < controlPoints.length; second += 1) {
      const left = controlPoints[first]!;
      const right = controlPoints[second]!;
      if (Math.abs(left[0] - right[0]) > 180) {
        throw new RangeError(`${label} does not support antimeridian-crossing controls.`);
      }
      maximumPairwiseExtent = Math.max(
        maximumPairwiseExtent,
        haversineDistance(left, right),
      );
    }
  }
  if (
    analysis.mode !== "local" ||
    maximumPairwiseExtent > MAXIMUM_LOCAL_EXTENT_METERS
  ) {
    const details = analysis.reasons.join(", ") ||
      `pairwise extent exceeds ${MAXIMUM_LOCAL_EXTENT_METERS} meters`;
    throw new RangeError(`${label} version 1.0 supports local controls only: ${details}.`);
  }
}

function assertPairwiseDistinct(points: readonly Vec2[], label: string): void {
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      if (almostEqual(points[first]!, points[second]!, CONTROL_TOLERANCE_METERS)) {
        throw new RangeError(`${label} controls must be pairwise distinct.`);
      }
    }
  }
}

function orderIndependentOrigin(controlPoints: readonly Position[]): Position {
  let longitudeSine = 0;
  let longitudeCosine = 0;
  let latitudeSum = 0;
  for (const [longitude, latitude] of controlPoints) {
    const radians = longitude * DEGREES_TO_RADIANS;
    longitudeSine += Math.sin(radians);
    longitudeCosine += Math.cos(radians);
    latitudeSum += latitude;
  }
  if (Math.hypot(longitudeSine, longitudeCosine) <= 1e-12) {
    throw new RangeError("Circular geometry has an ambiguous longitude centre.");
  }
  return [
    Math.atan2(longitudeSine, longitudeCosine) * RADIANS_TO_DEGREES,
    latitudeSum / controlPoints.length,
  ];
}

function replaceMatchingPosition(
  output: Position[],
  exact: Position,
  tolerance = 1e-9,
): void {
  const match = output.findIndex(
    (position) =>
      Math.abs(position[0] - exact[0]) <= tolerance &&
      Math.abs(position[1] - exact[1]) <= tolerance,
  );
  if (match >= 0) output[match] = copyPosition(exact);
}

function copyPosition([longitude, latitude]: Position): Position {
  return [longitude, latitude];
}
