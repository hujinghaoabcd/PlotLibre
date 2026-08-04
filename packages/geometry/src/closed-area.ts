import type { Position } from "@plotlibre/core";
import { createLocalProjection } from "./local-projection.js";
import {
  closeRing,
  ensureRingWinding,
  isSimpleRing,
  signedRingArea,
} from "./ring.js";
import {
  add,
  almostEqual,
  cross,
  scale,
  subtract,
  type Vec2,
} from "./vector.js";

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export interface ClosedAreaParameters {
  readonly tension?: number;
  readonly segmentsPerSpan?: number;
}

export interface ResolvedClosedAreaParameters {
  readonly tension: number;
  readonly segmentsPerSpan: number;
}

export interface GatheringPlaceParameters extends ClosedAreaParameters {
  readonly rearDepthRatio?: number;
}

export interface ResolvedGatheringPlaceParameters
  extends ResolvedClosedAreaParameters {
  readonly rearDepthRatio: number;
}

export const DEFAULT_CLOSED_AREA_PARAMETERS: ResolvedClosedAreaParameters = {
  tension: 0.2,
  segmentsPerSpan: 16,
};

export const DEFAULT_GATHERING_PLACE_PARAMETERS: ResolvedGatheringPlaceParameters = {
  tension: 0.35,
  segmentsPerSpan: 16,
  rearDepthRatio: 0.65,
};

export function resolveClosedAreaParameters(
  parameters: ClosedAreaParameters = {},
): ResolvedClosedAreaParameters {
  const resolved = {
    ...DEFAULT_CLOSED_AREA_PARAMETERS,
    ...parameters,
  };
  assertRange("tension", resolved.tension, 0, 1);
  assertIntegerRange("segmentsPerSpan", resolved.segmentsPerSpan, 4, 128);
  return resolved;
}

export function resolveGatheringPlaceParameters(
  parameters: GatheringPlaceParameters = {},
): ResolvedGatheringPlaceParameters {
  const resolved = {
    ...DEFAULT_GATHERING_PLACE_PARAMETERS,
    ...parameters,
  };
  assertRange("tension", resolved.tension, 0, 1);
  assertIntegerRange("segmentsPerSpan", resolved.segmentsPerSpan, 4, 128);
  assertRange("rearDepthRatio", resolved.rearDepthRatio, 0, 1);
  return resolved;
}

/**
 * Samples a periodic Catmull-Rom curve through every input control. The output
 * contains each authored control exactly once as a span start and is not
 * explicitly closed; callers decide the ring-closing policy.
 */
export function sampleClosedCatmullRom(
  controls: readonly Vec2[],
  parameters: ClosedAreaParameters = {},
): readonly Vec2[] {
  const resolved = resolveClosedAreaParameters(parameters);
  assertDistinctCyclicControls(controls);

  const sampled: Vec2[] = [];
  const count = controls.length;
  const tangentScale = (1 - resolved.tension) / 2;

  for (let span = 0; span < count; span += 1) {
    const previous = controls[(span - 1 + count) % count]!;
    const start = controls[span]!;
    const end = controls[(span + 1) % count]!;
    const following = controls[(span + 2) % count]!;
    const startTangent = scale(subtract(end, previous), tangentScale);
    const endTangent = scale(subtract(following, start), tangentScale);

    for (let step = 0; step < resolved.segmentsPerSpan; step += 1) {
      sampled.push(
        hermite(
          start,
          end,
          startTangent,
          endTangent,
          step / resolved.segmentsPerSpan,
        ),
      );
    }
  }

  return sampled;
}

export function buildClosedCurveRing(
  controlPoints: readonly Position[],
  parameters: ClosedAreaParameters = {},
): readonly Position[] {
  if (controlPoints.length < 3) {
    throw new RangeError("Closed curve requires at least three control points.");
  }

  const projection = createLocalProjection(closedAreaProjectionOrigin(controlPoints));
  const projectedControls = controlPoints.map((point) => projection.project(point));
  assertDistinctCyclicControls(projectedControls);

  return finalizeAreaRing(
    sampleClosedCatmullRom(projectedControls, parameters),
    projection.unproject,
    "Closed curve",
  );
}

export function canonicalizeGatheringPlaceControls(
  controlPoints: readonly Position[],
): readonly Position[] {
  if (controlPoints.length !== 3) return controlPoints.map(copyPosition);

  const [flankA, crown, flankB] = controlPoints;
  const projection = createLocalProjection(crown!);
  const localA = projection.project(flankA!);
  const localCrown = projection.project(crown!);
  const localB = projection.project(flankB!);
  const orientation = cross(
    subtract(localA, localCrown),
    subtract(localB, localCrown),
  );

  return orientation >= 0
    ? [copyPosition(flankA!), copyPosition(crown!), copyPosition(flankB!)]
    : [copyPosition(flankB!), copyPosition(crown!), copyPosition(flankA!)];
}

export function buildGatheringPlaceRing(
  controlPoints: readonly Position[],
  parameters: GatheringPlaceParameters = {},
): readonly Position[] {
  if (controlPoints.length !== 3) {
    throw new RangeError("Gathering place requires exactly three control points.");
  }

  const resolved = resolveGatheringPlaceParameters(parameters);
  const [flankA, crown, flankB] = controlPoints;
  const projection = createLocalProjection(crown!);
  const localA = projection.project(flankA!);
  const localCrown = projection.project(crown!);
  const localB = projection.project(flankB!);
  assertDistinctCyclicControls([localA, localCrown, localB]);

  const flankMidpoint = scale(add(localA, localB), 0.5);
  const rearAnchor = add(
    flankMidpoint,
    scale(
      subtract(flankMidpoint, localCrown),
      resolved.rearDepthRatio,
    ),
  );
  assertDistinctCyclicControls([localA, localCrown, localB, rearAnchor]);

  return finalizeAreaRing(
    sampleClosedCatmullRom(
      [localA, localCrown, localB, rearAnchor],
      resolved,
    ),
    projection.unproject,
    "Gathering place",
  );
}

function finalizeAreaRing(
  sampled: readonly Vec2[],
  unproject: (point: Vec2) => Position,
  label: string,
): readonly Position[] {
  const closed = closeRing(sampled, 1e-6);
  const area = Math.abs(signedRingArea(closed));
  if (!Number.isFinite(area) || area <= 1e-6) {
    throw new RangeError(`${label} produced a degenerate ring.`);
  }
  if (!isSimpleRing(closed, 1e-6)) {
    throw new RangeError(
      `${label} produced a self-intersecting ring; simplify or reorder control points.`,
    );
  }

  const oriented = ensureRingWinding(closed, "counterclockwise");
  return oriented.map((point) => unproject(point));
}

function closedAreaProjectionOrigin(
  controlPoints: readonly Position[],
): Position {
  let longitudeSine = 0;
  let longitudeCosine = 0;
  let latitudeSum = 0;

  for (const [index, [longitude, latitude]] of controlPoints.entries()) {
    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new RangeError(
        `Closed-area control ${index} must be a finite WGS84 position.`,
      );
    }
    const radians = longitude * DEGREES_TO_RADIANS;
    longitudeSine += Math.sin(radians);
    longitudeCosine += Math.cos(radians);
    latitudeSum += latitude;
  }

  if (Math.hypot(longitudeSine, longitudeCosine) <= 1e-12) {
    throw new RangeError(
      "Closed-area longitude center is ambiguous for this global extent.",
    );
  }

  return [
    Math.atan2(longitudeSine, longitudeCosine) * RADIANS_TO_DEGREES,
    latitudeSum / controlPoints.length,
  ];
}

function assertDistinctCyclicControls(controls: readonly Vec2[]): void {
  if (controls.length < 3) {
    throw new RangeError("A closed area requires at least three distinct controls.");
  }

  for (let index = 0; index < controls.length; index += 1) {
    const current = controls[index]!;
    if (!Number.isFinite(current.x) || !Number.isFinite(current.y)) {
      throw new RangeError(`Closed-area control ${index} must be finite.`);
    }
    for (let other = index + 1; other < controls.length; other += 1) {
      if (almostEqual(current, controls[other]!, 1e-6)) {
        throw new RangeError("Closed-area controls must be pairwise distinct.");
      }
    }
  }
}

function hermite(
  start: Vec2,
  end: Vec2,
  startTangent: Vec2,
  endTangent: Vec2,
  t: number,
): Vec2 {
  const squared = t * t;
  const cubed = squared * t;
  const h00 = 2 * cubed - 3 * squared + 1;
  const h10 = cubed - 2 * squared + t;
  const h01 = -2 * cubed + 3 * squared;
  const h11 = cubed - squared;
  return add(
    add(scale(start, h00), scale(startTangent, h10)),
    add(scale(end, h01), scale(endTangent, h11)),
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

function copyPosition([longitude, latitude]: Position): Position {
  return [longitude, latitude];
}
