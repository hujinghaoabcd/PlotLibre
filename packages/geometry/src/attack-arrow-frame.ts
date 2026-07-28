import type { Position } from "@plotlibre/core";
import { buildArrowHead, type ArrowHeadGeometry } from "./arrow-components.js";
import type { ResolvedAttackArrowParameters } from "./attack-arrow.js";
import { sampleCatmullRom } from "./curves.js";
import {
  normalizeLongitude,
  shortestLongitudeDelta,
} from "./geodesic.js";
import { createLocalProjection, type LocalProjection } from "./local-projection.js";
import { offsetPolyline } from "./offset.js";
import {
  cleanPolyline,
  measurePolyline,
  sampleMeasuredPolyline,
} from "./polyline.js";
import {
  add,
  cross,
  distance,
  normalize,
  scale,
  subtract,
  type Vec2,
} from "./vector.js";

export interface AttackArrowFrame {
  readonly projection: LocalProjection;
  readonly semanticTailLeft: Position;
  readonly semanticTailRight: Position;
  readonly semanticTip: Position;
  readonly tailLeft: Vec2;
  readonly tailRight: Vec2;
  readonly tailCenter: Vec2;
  readonly tailWidth: number;
  readonly sampledSpine: readonly Vec2[];
  readonly leftBodyInterior: readonly Vec2[];
  readonly rightBodyInterior: readonly Vec2[];
  readonly head: ArrowHeadGeometry;
}

export function buildAttackArrowFrame(
  controlPoints: readonly Position[],
  resolved: ResolvedAttackArrowParameters,
): AttackArrowFrame {
  if (controlPoints.length < 3) {
    throw new RangeError("Attack arrow requires at least three control points.");
  }

  const firstTail = controlPoints[0]!;
  const secondTail = controlPoints[1]!;
  const semanticTip = controlPoints.at(-1)!;
  const projection = createLocalProjection(midpointPosition(firstTail, secondTail));
  const firstTailLocal = projection.project(firstTail);
  const secondTailLocal = projection.project(secondTail);
  const tailCenter = scale(add(firstTailLocal, secondTailLocal), 0.5);
  const tailWidth = distance(firstTailLocal, secondTailLocal);

  if (tailWidth < resolved.minimumTailWidthMeters) {
    throw new RangeError(
      `Attack arrow tail width must be at least ${resolved.minimumTailWidthMeters} meters.`,
    );
  }
  if (tailWidth > resolved.maximumTailWidthMeters) {
    throw new RangeError(
      `Attack arrow tail width must not exceed ${resolved.maximumTailWidthMeters} meters.`,
    );
  }

  const projectedSpineControls = cleanPolyline(
    [
      tailCenter,
      ...controlPoints.slice(2).map((position) => projection.project(position)),
    ],
    1e-6,
  );
  if (projectedSpineControls.length < 2) {
    throw new RangeError(
      "Attack arrow requires a distinct spine direction after the tail controls.",
    );
  }

  const initialDirection = normalize(
    subtract(projectedSpineControls[1]!, tailCenter),
  );
  const tailBaseline = subtract(secondTailLocal, firstTailLocal);
  const perpendicularTailWidth = Math.abs(cross(initialDirection, tailBaseline));
  if (perpendicularTailWidth < tailWidth * 0.1) {
    throw new RangeError(
      "Attack arrow tail controls must span across the initial spine direction.",
    );
  }

  const firstSide = cross(
    initialDirection,
    subtract(firstTailLocal, tailCenter),
  );
  const [tailLeft, tailRight, semanticTailLeft, semanticTailRight] =
    firstSide > 0
      ? [firstTailLocal, secondTailLocal, firstTail, secondTail]
      : [secondTailLocal, firstTailLocal, secondTail, firstTail];

  const sampledSpine = sampleCatmullRom(projectedSpineControls, {
    tension: resolved.tension,
    segmentsPerSpan: resolved.segmentsPerSpan,
  });
  const measuredSpine = measurePolyline(sampledSpine, 1e-6);
  const spineLength = measuredSpine.totalLength;
  const endSample = sampleMeasuredPolyline(measuredSpine, spineLength);

  const headLength = Math.min(
    spineLength * resolved.headLengthRatio,
    tailWidth * resolved.maximumHeadLengthTailRatio,
    spineLength * 0.4,
  );
  if (headLength <= 1e-6) {
    throw new RangeError("Attack arrow head length must be positive.");
  }

  const tip = measuredSpine.points.at(-1)!;
  const neckHalfWidth = tailWidth * resolved.neckHalfWidthTailRatio;
  const head = buildArrowHead(tip, endSample.tangent, {
    length: headLength,
    headHalfWidth: tailWidth * resolved.headHalfWidthTailRatio,
    neckHalfWidth,
  });

  const trimSample = sampleMeasuredPolyline(
    measuredSpine,
    Math.max(0, spineLength - headLength),
  );
  const shaftCenterline = cleanPolyline(
    [
      ...measuredSpine.points.slice(0, trimSample.segmentIndex + 1),
      head.neckCenter,
    ],
    1e-6,
  );
  if (shaftCenterline.length < 2) {
    throw new RangeError("Attack arrow shaft is too short after head trimming.");
  }

  const measuredShaft = measurePolyline(shaftCenterline, 1e-6);
  const tailHalfWidth = tailWidth / 2;
  const bulgeHalfWidth = tailHalfWidth * resolved.bodyBulgeRatio;
  const halfWidths = measuredShaft.cumulativeLengths.map((currentLength) => {
    const ratio = currentLength / measuredShaft.totalLength;
    if (ratio <= resolved.bodyBulgePosition) {
      return lerpScalar(
        tailHalfWidth,
        bulgeHalfWidth,
        ratio / resolved.bodyBulgePosition,
      );
    }
    return lerpScalar(
      bulgeHalfWidth,
      neckHalfWidth,
      (ratio - resolved.bodyBulgePosition) /
        (1 - resolved.bodyBulgePosition),
    );
  });

  const offset = offsetPolyline(shaftCenterline, halfWidths, {
    miterLimit: resolved.miterLimit,
    tolerance: 1e-6,
  });
  const leftBodyInterior = offset.left.slice(1, -1);
  const rightBodyInterior = offset.right.slice(1, -1);

  return {
    projection,
    semanticTailLeft: clonePosition(semanticTailLeft),
    semanticTailRight: clonePosition(semanticTailRight),
    semanticTip: clonePosition(semanticTip),
    tailLeft,
    tailRight,
    tailCenter,
    tailWidth,
    sampledSpine,
    leftBodyInterior,
    rightBodyInterior,
    head,
  };
}

export function unprojectAttackArrowRing(
  frame: AttackArrowFrame,
  ring: readonly Vec2[],
): readonly Position[] {
  return ring.map((point) => {
    if (distance(point, frame.tailLeft) <= 1e-6) {
      return clonePosition(frame.semanticTailLeft);
    }
    if (distance(point, frame.tailRight) <= 1e-6) {
      return clonePosition(frame.semanticTailRight);
    }
    if (distance(point, frame.head.tip) <= 1e-6) {
      return clonePosition(frame.semanticTip);
    }
    return frame.projection.unproject(point);
  });
}

function midpointPosition(first: Position, second: Position): Position {
  return [
    normalizeLongitude(
      first[0] + shortestLongitudeDelta(first[0], second[0]) / 2,
    ),
    (first[1] + second[1]) / 2,
  ];
}

function lerpScalar(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function clonePosition(position: Position): Position {
  return [position[0], position[1]];
}
