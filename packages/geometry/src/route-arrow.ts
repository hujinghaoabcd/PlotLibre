import type { Position } from "@plotlibre/core";
import { buildArrowHead } from "./arrow-components.js";
import { offsetPolyline } from "./offset.js";
import {
  buildPathRibbonFrame,
  resolvePathRibbonParameters,
  type PathRibbonParameters,
  type ResolvedPathRibbonParameters,
} from "./path-ribbon.js";
import {
  measurePolyline,
  sampleMeasuredPolyline,
} from "./polyline.js";
import { ensureRingWinding, isSimpleRing } from "./ring.js";
import { distance, type Vec2 } from "./vector.js";

/**
 * Semantic controls are an authored route center path. The terminal authored
 * point is the exact objective/tip; shaft offsets and arrow-head vertices are
 * derived render geometry.
 */
export interface RouteArrowParameters extends PathRibbonParameters {
  readonly headLengthPathRatio?: number;
  readonly headHalfWidthRibbonRatio?: number;
  readonly neckHalfWidthRibbonRatio?: number;
}

export interface ResolvedRouteArrowParameters
  extends ResolvedPathRibbonParameters {
  readonly headLengthPathRatio: number;
  readonly headHalfWidthRibbonRatio: number;
  readonly neckHalfWidthRibbonRatio: number;
}

export const DEFAULT_ROUTE_ARROW_PARAMETERS: ResolvedRouteArrowParameters = {
  widthPathRatio: 0.028,
  minimumWidthMeters: 1,
  maximumWidthMeters: 100_000,
  tension: 0.15,
  segmentsPerSpan: 16,
  miterLimit: 3,
  headLengthPathRatio: 0.12,
  headHalfWidthRibbonRatio: 2.2,
  neckHalfWidthRibbonRatio: 1,
};

export function resolveRouteArrowParameters(
  parameters: RouteArrowParameters = {},
): ResolvedRouteArrowParameters {
  const merged = {
    ...DEFAULT_ROUTE_ARROW_PARAMETERS,
    ...parameters,
  };
  const ribbon = resolvePathRibbonParameters(merged);
  assertRange("headLengthPathRatio", merged.headLengthPathRatio, 0.04, 0.4);
  assertRange(
    "headHalfWidthRibbonRatio",
    merged.headHalfWidthRibbonRatio,
    1.1,
    5,
  );
  assertRange(
    "neckHalfWidthRibbonRatio",
    merged.neckHalfWidthRibbonRatio,
    0.5,
    1.5,
  );
  return {
    ...ribbon,
    headLengthPathRatio: merged.headLengthPathRatio,
    headHalfWidthRibbonRatio: merged.headHalfWidthRibbonRatio,
    neckHalfWidthRibbonRatio: merged.neckHalfWidthRibbonRatio,
  };
}

export function buildRouteArrowRing(
  controlPoints: readonly Position[],
  parameters: RouteArrowParameters = {},
): readonly Position[] {
  const resolved = resolveRouteArrowParameters(parameters);
  const frame = buildPathRibbonFrame(controlPoints, resolved);
  const measured = measurePolyline(frame.centerline, 1e-6);
  const headLength = measured.totalLength * resolved.headLengthPathRatio;
  if (headLength <= frame.widthMeters) {
    throw new RangeError(
      "Route arrow head length must be greater than the derived ribbon width.",
    );
  }

  const neckDistance = measured.totalLength - headLength;
  if (neckDistance <= frame.widthMeters) {
    throw new RangeError(
      "Route arrow path is too short for its ribbon width and head length.",
    );
  }

  const shaftCenterline = truncatePolyline(measured, neckDistance);
  const shaft = offsetPolyline(shaftCenterline, frame.halfWidthMeters, {
    miterLimit: resolved.miterLimit,
    tolerance: 1e-6,
  });
  const terminal = sampleMeasuredPolyline(measured, measured.totalLength);
  const head = buildArrowHead(terminal.point, terminal.tangent, {
    length: headLength,
    headHalfWidth:
      frame.halfWidthMeters * resolved.headHalfWidthRibbonRatio,
    neckHalfWidth:
      frame.halfWidthMeters * resolved.neckHalfWidthRibbonRatio,
  });

  const openRing: Vec2[] = [
    ...shaft.left.slice(0, -1),
    head.neckLeft,
    head.headLeft,
    head.tip,
    head.headRight,
    head.neckRight,
    ...shaft.right.slice(0, -1).reverse(),
  ];
  const ring = ensureRingWinding(openRing, "counterclockwise");
  if (!isSimpleRing(ring, 1e-6)) {
    throw new RangeError(
      "Route arrow produced a self-intersecting ring; narrow the route or simplify the path.",
    );
  }

  return ring.map((point) => frame.projection.unproject(point));
}

function truncatePolyline(
  measured: ReturnType<typeof measurePolyline>,
  endDistance: number,
): readonly Vec2[] {
  const sample = sampleMeasuredPolyline(measured, endDistance);
  const points = measured.points
    .slice(0, sample.segmentIndex + 1)
    .map((point) => ({ ...point }));
  const previous = points.at(-1);
  if (!previous || distance(previous, sample.point) > 1e-6) {
    points.push(sample.point);
  }
  if (points.length < 2) {
    throw new RangeError("Route arrow shaft requires a positive-length path.");
  }
  return points;
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
