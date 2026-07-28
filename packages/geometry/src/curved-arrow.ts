import type { Position } from "@plotlibre/core";
import { buildArrowHead } from "./arrow-components.js";
import { sampleCatmullRom } from "./curves.js";
import { createLocalProjection } from "./local-projection.js";
import { offsetPolyline } from "./offset.js";
import {
  cleanPolyline,
  measurePolyline,
  sampleMeasuredPolyline,
} from "./polyline.js";
import {
  closeRing,
  ensureRingWinding,
  isSimpleRing,
} from "./ring.js";
import {
  almostEqual,
  clamp,
  type Vec2,
} from "./vector.js";

export interface CurvedArrowParameters {
  readonly tailWidthRatio?: number;
  readonly headLengthRatio?: number;
  readonly headWidthRatio?: number;
  readonly neckWidthRatio?: number;
  readonly tension?: number;
  readonly segmentsPerSpan?: number;
  readonly miterLimit?: number;
  readonly minimumWidthMeters?: number;
  readonly maximumWidthMeters?: number;
}

export interface ResolvedCurvedArrowParameters {
  readonly tailWidthRatio: number;
  readonly headLengthRatio: number;
  readonly headWidthRatio: number;
  readonly neckWidthRatio: number;
  readonly tension: number;
  readonly segmentsPerSpan: number;
  readonly miterLimit: number;
  readonly minimumWidthMeters: number;
  readonly maximumWidthMeters: number;
}

export const DEFAULT_CURVED_ARROW_PARAMETERS: ResolvedCurvedArrowParameters = {
  tailWidthRatio: 0.065,
  headLengthRatio: 0.22,
  headWidthRatio: 2.3,
  neckWidthRatio: 0.55,
  tension: 0.15,
  segmentsPerSpan: 16,
  miterLimit: 3,
  minimumWidthMeters: 1,
  maximumWidthMeters: 100_000,
};

export function resolveCurvedArrowParameters(
  parameters: CurvedArrowParameters = {},
): ResolvedCurvedArrowParameters {
  const resolved = {
    ...DEFAULT_CURVED_ARROW_PARAMETERS,
    ...parameters,
  };

  assertRange("tailWidthRatio", resolved.tailWidthRatio, 0.005, 0.25);
  assertRange("headLengthRatio", resolved.headLengthRatio, 0.05, 0.45);
  assertRange("headWidthRatio", resolved.headWidthRatio, 1, 6);
  assertRange("neckWidthRatio", resolved.neckWidthRatio, 0.1, 1);
  assertRange("tension", resolved.tension, 0, 1);
  assertIntegerRange("segmentsPerSpan", resolved.segmentsPerSpan, 4, 128);
  assertRange("miterLimit", resolved.miterLimit, 1, 10);

  if (
    !Number.isFinite(resolved.minimumWidthMeters) ||
    resolved.minimumWidthMeters <= 0
  ) {
    throw new RangeError("minimumWidthMeters must be a positive finite number.");
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
 * Builds a smooth variable-width arrow whose semantic controls define a path.
 * The polygon is derived in a local metre projection and the original final
 * control point is restored exactly as the arrow tip after unprojection.
 */
export function buildCurvedArrowRing(
  controlPoints: readonly Position[],
  parameters: CurvedArrowParameters = {},
): readonly Position[] {
  const resolved = resolveCurvedArrowParameters(parameters);
  const origin = controlPoints[0];
  const semanticTip = controlPoints.at(-1);
  if (!origin || !semanticTip || controlPoints.length < 3) {
    throw new RangeError("Curved arrow requires at least three control points.");
  }

  const projection = createLocalProjection(origin);
  const projectedControls = cleanPolyline(
    controlPoints.map((point) => projection.project(point)),
    1e-6,
  );
  if (projectedControls.length < 3) {
    throw new RangeError(
      "Curved arrow requires at least three distinct control points.",
    );
  }

  const sampledCenterline = sampleCatmullRom(projectedControls, {
    tension: resolved.tension,
    segmentsPerSpan: resolved.segmentsPerSpan,
  });
  const measuredCenterline = measurePolyline(sampledCenterline, 1e-6);
  const totalLength = measuredCenterline.totalLength;

  const fullTailWidth = clamp(
    totalLength * resolved.tailWidthRatio,
    resolved.minimumWidthMeters,
    resolved.maximumWidthMeters,
  );
  const tailHalfWidth = fullTailWidth / 2;
  const neckHalfWidth = tailHalfWidth * resolved.neckWidthRatio;
  const headHalfWidth = tailHalfWidth * resolved.headWidthRatio;
  const headLength = Math.min(
    totalLength * resolved.headLengthRatio,
    totalLength * 0.4,
  );

  const tip = measuredCenterline.points.at(-1)!;
  const endSample = sampleMeasuredPolyline(measuredCenterline, totalLength);
  const head = buildArrowHead(tip, endSample.tangent, {
    length: headLength,
    headHalfWidth,
    neckHalfWidth,
  });

  const trimSample = sampleMeasuredPolyline(
    measuredCenterline,
    Math.max(0, totalLength - headLength),
  );
  const shaftCenterline = cleanPolyline(
    [
      ...measuredCenterline.points.slice(0, trimSample.segmentIndex + 1),
      trimSample.point,
      head.neckCenter,
    ],
    1e-6,
  );
  if (shaftCenterline.length < 2) {
    throw new RangeError("Curved arrow shaft is too short after head trimming.");
  }

  const measuredShaft = measurePolyline(shaftCenterline, 1e-6);
  const halfWidths = measuredShaft.cumulativeLengths.map((distance) => {
    const ratio = distance / measuredShaft.totalLength;
    return tailHalfWidth + (neckHalfWidth - tailHalfWidth) * ratio;
  });
  const offset = offsetPolyline(shaftCenterline, halfWidths, {
    miterLimit: resolved.miterLimit,
    tolerance: 1e-6,
  });

  const leftShaft = offset.left.slice(0, -1);
  const rightShaft = offset.right.slice(0, -1).reverse();
  if (leftShaft.length === 0 || rightShaft.length === 0) {
    throw new RangeError("Curved arrow shaft did not produce valid side boundaries.");
  }

  const localRing = ensureRingWinding(
    closeRing([
      ...leftShaft,
      head.neckLeft,
      head.headLeft,
      head.tip,
      head.headRight,
      head.neckRight,
      ...rightShaft,
    ]),
    "counterclockwise",
  );

  if (!isSimpleRing(localRing, 1e-6)) {
    throw new RangeError(
      "Curved arrow produced a self-intersecting ring; reduce width or simplify control points.",
    );
  }

  return localRing.map((point) =>
    almostEqual(point, head.tip, 1e-6)
      ? [semanticTip[0], semanticTip[1]]
      : projection.unproject(point),
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

export function projectCurvedArrowControls(
  controlPoints: readonly Position[],
): readonly Vec2[] {
  const origin = controlPoints[0];
  if (!origin) return [];
  const projection = createLocalProjection(origin);
  return controlPoints.map((point) => projection.project(point));
}
