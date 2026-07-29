import type { Position } from "@plotlibre/core";
import { sampleCatmullRom } from "./curves.js";
import { createLocalProjection, type LocalProjection } from "./local-projection.js";
import { offsetPolyline } from "./offset.js";
import { cleanPolyline, measurePolyline } from "./polyline.js";
import type { Vec2 } from "./vector.js";

/**
 * Shared center-path ribbon semantics used by route and corridor symbols.
 * Authored controls remain centerline positions; all sampled and offset
 * vertices are derived render geometry.
 */
export interface PathRibbonParameters {
  readonly widthPathRatio?: number;
  readonly minimumWidthMeters?: number;
  readonly maximumWidthMeters?: number;
  readonly tension?: number;
  readonly segmentsPerSpan?: number;
  readonly miterLimit?: number;
}

export interface ResolvedPathRibbonParameters {
  readonly widthPathRatio: number;
  readonly minimumWidthMeters: number;
  readonly maximumWidthMeters: number;
  readonly tension: number;
  readonly segmentsPerSpan: number;
  readonly miterLimit: number;
}

export interface PathRibbonFrame {
  readonly projection: LocalProjection;
  readonly controls: readonly Vec2[];
  readonly centerline: readonly Vec2[];
  readonly left: readonly Vec2[];
  readonly right: readonly Vec2[];
  readonly widthMeters: number;
  readonly halfWidthMeters: number;
  readonly totalLengthMeters: number;
  readonly parameters: ResolvedPathRibbonParameters;
}

export const DEFAULT_PATH_RIBBON_PARAMETERS: ResolvedPathRibbonParameters = {
  widthPathRatio: 0.04,
  minimumWidthMeters: 1,
  maximumWidthMeters: 100_000,
  tension: 0.15,
  segmentsPerSpan: 16,
  miterLimit: 3,
};

export function resolvePathRibbonParameters(
  parameters: PathRibbonParameters = {},
): ResolvedPathRibbonParameters {
  const resolved = {
    ...DEFAULT_PATH_RIBBON_PARAMETERS,
    ...parameters,
  };

  assertRange("widthPathRatio", resolved.widthPathRatio, 0.005, 0.25);
  assertPositive("minimumWidthMeters", resolved.minimumWidthMeters);
  assertPositive("maximumWidthMeters", resolved.maximumWidthMeters);
  if (resolved.maximumWidthMeters < resolved.minimumWidthMeters) {
    throw new RangeError(
      "maximumWidthMeters must be greater than or equal to minimumWidthMeters.",
    );
  }
  assertRange("tension", resolved.tension, 0, 1);
  if (
    !Number.isInteger(resolved.segmentsPerSpan) ||
    resolved.segmentsPerSpan < 1 ||
    resolved.segmentsPerSpan > 10_000
  ) {
    throw new RangeError(
      "segmentsPerSpan must be an integer between 1 and 10000.",
    );
  }
  if (!Number.isFinite(resolved.miterLimit) || resolved.miterLimit < 1) {
    throw new RangeError("miterLimit must be a finite number greater than or equal to 1.");
  }

  return resolved;
}

export function buildPathRibbonFrame(
  controlPoints: readonly Position[],
  parameters: PathRibbonParameters = {},
): PathRibbonFrame {
  if (controlPoints.length < 2) {
    throw new RangeError("Path ribbon requires at least two control points.");
  }

  const resolved = resolvePathRibbonParameters(parameters);
  const projection = createLocalProjection(controlPoints[0]!);
  const controls = cleanPolyline(
    controlPoints.map((position) => projection.project(position)),
    1e-6,
  );
  if (controls.length < 2) {
    throw new RangeError("Path ribbon requires at least two distinct control points.");
  }

  const centerline = sampleCatmullRom(controls, {
    tension: resolved.tension,
    segmentsPerSpan: resolved.segmentsPerSpan,
  });
  const measured = measurePolyline(centerline, 1e-6);
  const widthMeters = measured.totalLength * resolved.widthPathRatio;
  if (widthMeters < resolved.minimumWidthMeters) {
    throw new RangeError(
      `Derived path width must be at least ${resolved.minimumWidthMeters} meters.`,
    );
  }
  if (widthMeters > resolved.maximumWidthMeters) {
    throw new RangeError(
      `Derived path width must not exceed ${resolved.maximumWidthMeters} meters.`,
    );
  }

  const halfWidthMeters = widthMeters / 2;
  const offset = offsetPolyline(measured.points, halfWidthMeters, {
    miterLimit: resolved.miterLimit,
    tolerance: 1e-6,
  });

  return {
    projection,
    controls,
    centerline: measured.points,
    left: offset.left,
    right: offset.right,
    widthMeters,
    halfWidthMeters,
    totalLengthMeters: measured.totalLength,
    parameters: resolved,
  };
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

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
}
