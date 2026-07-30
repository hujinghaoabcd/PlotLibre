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
  type MeasuredPolyline,
} from "./polyline.js";
import { ensureRingWinding, isSimpleRing } from "./ring.js";
import { buildRouteArrowRing } from "./route-arrow.js";
import { distance, scale, type Vec2 } from "./vector.js";

export interface RouteMultiHeadParameters extends PathRibbonParameters {
  readonly headLengthPathRatio?: number;
  readonly headHalfWidthRibbonRatio?: number;
  readonly neckHalfWidthRibbonRatio?: number;
  readonly secondaryHeadLengthPathRatio?: number;
  readonly secondaryHeadGapPathRatio?: number;
  readonly secondaryHeadHalfWidthRibbonRatio?: number;
}

export interface ResolvedRouteMultiHeadParameters
  extends ResolvedPathRibbonParameters {
  readonly headLengthPathRatio: number;
  readonly headHalfWidthRibbonRatio: number;
  readonly neckHalfWidthRibbonRatio: number;
  readonly secondaryHeadLengthPathRatio: number;
  readonly secondaryHeadGapPathRatio: number;
  readonly secondaryHeadHalfWidthRibbonRatio: number;
}

export interface DoubleHeadRouteRings {
  readonly primary: readonly Position[];
  readonly secondary: readonly Position[];
}

export const DEFAULT_ROUTE_MULTIHEAD_PARAMETERS: ResolvedRouteMultiHeadParameters = {
  widthPathRatio: 0.026,
  minimumWidthMeters: 1,
  maximumWidthMeters: 100_000,
  tension: 0.15,
  segmentsPerSpan: 16,
  miterLimit: 3,
  headLengthPathRatio: 0.11,
  headHalfWidthRibbonRatio: 2.2,
  neckHalfWidthRibbonRatio: 1,
  secondaryHeadLengthPathRatio: 0.065,
  secondaryHeadGapPathRatio: 0.035,
  secondaryHeadHalfWidthRibbonRatio: 1.9,
};

export function resolveRouteMultiHeadParameters(
  parameters: RouteMultiHeadParameters = {},
): ResolvedRouteMultiHeadParameters {
  const merged = {
    ...DEFAULT_ROUTE_MULTIHEAD_PARAMETERS,
    ...parameters,
  };
  const ribbon = resolvePathRibbonParameters(merged);
  assertRange("headLengthPathRatio", merged.headLengthPathRatio, 0.04, 0.3);
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
  assertRange(
    "secondaryHeadLengthPathRatio",
    merged.secondaryHeadLengthPathRatio,
    0.02,
    0.2,
  );
  assertRange(
    "secondaryHeadGapPathRatio",
    merged.secondaryHeadGapPathRatio,
    0.01,
    0.2,
  );
  assertRange(
    "secondaryHeadHalfWidthRibbonRatio",
    merged.secondaryHeadHalfWidthRibbonRatio,
    1.1,
    4,
  );
  return {
    ...ribbon,
    headLengthPathRatio: merged.headLengthPathRatio,
    headHalfWidthRibbonRatio: merged.headHalfWidthRibbonRatio,
    neckHalfWidthRibbonRatio: merged.neckHalfWidthRibbonRatio,
    secondaryHeadLengthPathRatio: merged.secondaryHeadLengthPathRatio,
    secondaryHeadGapPathRatio: merged.secondaryHeadGapPathRatio,
    secondaryHeadHalfWidthRibbonRatio:
      merged.secondaryHeadHalfWidthRibbonRatio,
  };
}

export function buildBidirectionalRouteRing(
  controlPoints: readonly Position[],
  parameters: RouteMultiHeadParameters = {},
): readonly Position[] {
  const resolved = resolveRouteMultiHeadParameters(parameters);
  const frame = buildPathRibbonFrame(controlPoints, resolved);
  const measured = measurePolyline(frame.centerline, 1e-6);
  const headLength = measured.totalLength * resolved.headLengthPathRatio;
  if (headLength <= frame.widthMeters) {
    throw new RangeError(
      "Bidirectional route head length must exceed the derived ribbon width.",
    );
  }
  const shaftStart = headLength;
  const shaftEnd = measured.totalLength - headLength;
  if (shaftEnd - shaftStart <= frame.widthMeters) {
    throw new RangeError(
      "Bidirectional route is too short for two heads and a positive shaft.",
    );
  }

  const start = sampleMeasuredPolyline(measured, 0);
  const end = sampleMeasuredPolyline(measured, measured.totalLength);
  const startHead = buildArrowHead(start.point, scale(start.tangent, -1), {
    length: headLength,
    headHalfWidth:
      frame.halfWidthMeters * resolved.headHalfWidthRibbonRatio,
    neckHalfWidth:
      frame.halfWidthMeters * resolved.neckHalfWidthRibbonRatio,
  });
  const endHead = buildArrowHead(end.point, end.tangent, {
    length: headLength,
    headHalfWidth:
      frame.halfWidthMeters * resolved.headHalfWidthRibbonRatio,
    neckHalfWidth:
      frame.halfWidthMeters * resolved.neckHalfWidthRibbonRatio,
  });
  const shaft = offsetPolyline(
    sliceMeasuredPolyline(measured, shaftStart, shaftEnd),
    frame.halfWidthMeters,
    { miterLimit: resolved.miterLimit, tolerance: 1e-6 },
  );

  const openRing: Vec2[] = [
    startHead.neckRight,
    ...shaft.left.slice(1, -1),
    endHead.neckLeft,
    endHead.headLeft,
    endHead.tip,
    endHead.headRight,
    endHead.neckRight,
    ...shaft.right.slice(1, -1).reverse(),
    startHead.neckLeft,
    startHead.headLeft,
    startHead.tip,
    startHead.headRight,
  ];
  const ring = ensureRingWinding(openRing, "counterclockwise");
  assertSimple(ring, "Bidirectional route");
  return ring.map((point) => frame.projection.unproject(point));
}

export function buildDoubleHeadRouteRings(
  controlPoints: readonly Position[],
  parameters: RouteMultiHeadParameters = {},
): DoubleHeadRouteRings {
  const resolved = resolveRouteMultiHeadParameters(parameters);
  const primary = buildRouteArrowRing(controlPoints, resolved);
  const frame = buildPathRibbonFrame(controlPoints, resolved);
  const measured = measurePolyline(frame.centerline, 1e-6);
  const primaryHeadLength =
    measured.totalLength * resolved.headLengthPathRatio;
  const secondaryHeadLength =
    measured.totalLength * resolved.secondaryHeadLengthPathRatio;
  const gap = measured.totalLength * resolved.secondaryHeadGapPathRatio;
  const secondaryTipDistance =
    measured.totalLength - primaryHeadLength - gap;
  if (secondaryTipDistance - secondaryHeadLength <= frame.widthMeters) {
    throw new RangeError(
      "Double-head route is too short for the secondary head placement.",
    );
  }

  const secondaryTip = sampleMeasuredPolyline(
    measured,
    secondaryTipDistance,
  );
  const secondaryHead = buildArrowHead(
    secondaryTip.point,
    secondaryTip.tangent,
    {
      length: secondaryHeadLength,
      headHalfWidth:
        frame.halfWidthMeters *
        resolved.secondaryHeadHalfWidthRibbonRatio,
      neckHalfWidth:
        frame.halfWidthMeters * resolved.neckHalfWidthRibbonRatio,
    },
  );
  const secondaryRing = ensureRingWinding(
    secondaryHead.outline,
    "counterclockwise",
  );
  assertSimple(secondaryRing, "Double-head route secondary head");
  return {
    primary,
    secondary: secondaryRing.map((point) =>
      frame.projection.unproject(point),
    ),
  };
}

function sliceMeasuredPolyline(
  measured: MeasuredPolyline,
  startDistance: number,
  endDistance: number,
): readonly Vec2[] {
  if (!(startDistance >= 0 && endDistance > startDistance)) {
    throw new RangeError("Polyline slice requires an increasing distance range.");
  }
  const start = sampleMeasuredPolyline(measured, startDistance);
  const end = sampleMeasuredPolyline(measured, endDistance);
  const points: Vec2[] = [{ ...start.point }];
  for (let index = 1; index < measured.points.length - 1; index += 1) {
    const at = measured.cumulativeLengths[index]!;
    if (at > startDistance && at < endDistance) {
      points.push({ ...measured.points[index]! });
    }
  }
  if (distance(points.at(-1)!, end.point) > 1e-6) {
    points.push({ ...end.point });
  }
  if (points.length < 2) {
    throw new RangeError("Route shaft requires a positive-length path slice.");
  }
  return points;
}

function assertSimple(ring: readonly Vec2[], label: string): void {
  if (!isSimpleRing(ring, 1e-6)) {
    throw new RangeError(
      `${label} produced a self-intersecting ring; narrow the route or simplify the path.`,
    );
  }
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
