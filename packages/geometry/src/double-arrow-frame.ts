import type { Position } from "@plotlibre/core";
import { buildArrowHead, type ArrowHeadGeometry } from "./arrow-components.js";
import { sampleCatmullRom } from "./curves.js";
import type { ResolvedDoubleArrowParameters } from "./double-arrow.js";
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
  dot,
  leftNormal,
  lerp,
  normalize,
  scale,
  subtract,
  type Vec2,
} from "./vector.js";

export interface DoubleArrowWingFrame {
  readonly sampledCenterline: readonly Vec2[];
  readonly outerBoundary: readonly Vec2[];
  readonly innerBoundary: readonly Vec2[];
  readonly head: ArrowHeadGeometry;
}

export interface DoubleArrowFrame {
  readonly projection: LocalProjection;
  readonly semanticTailLeft: Position;
  readonly semanticTailRight: Position;
  readonly semanticObjectiveLeft: Position;
  readonly semanticObjectiveRight: Position;
  readonly tailLeft: Vec2;
  readonly tailRight: Vec2;
  readonly objectiveLeft: Vec2;
  readonly objectiveRight: Vec2;
  readonly tailCenter: Vec2;
  readonly tailWidth: number;
  readonly objectiveMidpoint: Vec2;
  readonly objectiveSeparation: number;
  readonly direction: Vec2;
  readonly normal: Vec2;
  readonly branchCenter: Vec2;
  readonly leftBodyBulge: Vec2;
  readonly rightBodyBulge: Vec2;
  readonly innerBridgePoint: Vec2;
  readonly leftWing: DoubleArrowWingFrame;
  readonly rightWing: DoubleArrowWingFrame;
}

export function buildDoubleArrowFrame(
  controlPoints: readonly Position[],
  resolved: ResolvedDoubleArrowParameters,
): DoubleArrowFrame {
  if (controlPoints.length !== 4) {
    throw new RangeError("Double arrow requires exactly four control points.");
  }

  const firstTail = controlPoints[0]!;
  const secondTail = controlPoints[1]!;
  const firstObjective = controlPoints[2]!;
  const secondObjective = controlPoints[3]!;
  const projection = createLocalProjection(midpointPosition(firstTail, secondTail));
  const firstTailLocal = projection.project(firstTail);
  const secondTailLocal = projection.project(secondTail);
  const firstObjectiveLocal = projection.project(firstObjective);
  const secondObjectiveLocal = projection.project(secondObjective);
  const tailCenter = scale(add(firstTailLocal, secondTailLocal), 0.5);
  const objectiveMidpoint = scale(
    add(firstObjectiveLocal, secondObjectiveLocal),
    0.5,
  );
  const tailWidth = distance(firstTailLocal, secondTailLocal);
  const objectiveSeparation = distance(
    firstObjectiveLocal,
    secondObjectiveLocal,
  );

  if (tailWidth < resolved.minimumTailWidthMeters) {
    throw new RangeError(
      `Double arrow tail width must be at least ${resolved.minimumTailWidthMeters} meters.`,
    );
  }
  if (tailWidth > resolved.maximumTailWidthMeters) {
    throw new RangeError(
      `Double arrow tail width must not exceed ${resolved.maximumTailWidthMeters} meters.`,
    );
  }
  if (objectiveSeparation <= 1e-6) {
    throw new RangeError("Double arrow objectives must be distinct.");
  }

  const direction = normalize(subtract(objectiveMidpoint, tailCenter));
  const normal = leftNormal(direction);
  const [tailLeft, tailRight, semanticTailLeft, semanticTailRight] =
    resolvePair(
      firstTailLocal,
      secondTailLocal,
      firstTail,
      secondTail,
      tailCenter,
      normal,
    );
  const [objectiveLeft, objectiveRight, semanticObjectiveLeft, semanticObjectiveRight] =
    resolvePair(
      firstObjectiveLocal,
      secondObjectiveLocal,
      firstObjective,
      secondObjective,
      objectiveMidpoint,
      normal,
    );

  const perpendicularTailWidth = Math.abs(
    cross(direction, subtract(tailRight, tailLeft)),
  );
  if (perpendicularTailWidth < tailWidth * 0.1) {
    throw new RangeError(
      "Double arrow tail controls must span across the primary direction.",
    );
  }

  const perpendicularObjectiveSeparation = Math.abs(
    cross(direction, subtract(objectiveRight, objectiveLeft)),
  );
  if (perpendicularObjectiveSeparation < objectiveSeparation * 0.25) {
    throw new RangeError(
      "Double arrow objective controls must span across the primary direction.",
    );
  }
  if (objectiveSeparation < tailWidth * 0.55) {
    throw new RangeError(
      "Double arrow objectives are too close for two distinct arrow heads.",
    );
  }

  const minimumForwardDistance = tailWidth * 0.75;
  for (const objective of [objectiveLeft, objectiveRight]) {
    if (dot(subtract(objective, tailCenter), direction) <= minimumForwardDistance) {
      throw new RangeError(
        "Both double-arrow objectives must remain ahead of the tail frame.",
      );
    }
  }

  const branchCenter = lerp(
    tailCenter,
    objectiveMidpoint,
    resolved.branchPositionRatio,
  );
  const branchSpread = clampScalar(
    objectiveSeparation * 0.18,
    tailWidth * 0.2,
    tailWidth * 0.8,
  );
  const leftWingStart = add(branchCenter, scale(normal, branchSpread));
  const rightWingStart = add(branchCenter, scale(normal, -branchSpread));
  const outwardCurve = Math.min(
    tailWidth * 0.75,
    objectiveSeparation * 0.04 + tailWidth * 0.08,
  );
  const leftWingControl = add(
    lerp(leftWingStart, objectiveLeft, 0.55),
    scale(normal, outwardCurve),
  );
  const rightWingControl = add(
    lerp(rightWingStart, objectiveRight, 0.55),
    scale(normal, -outwardCurve),
  );
  const startHalfWidth = Math.min(
    tailWidth * 0.22,
    branchSpread * 0.55,
  );

  const leftWing = buildWingFrame(
    [leftWingStart, leftWingControl, objectiveLeft],
    tailWidth,
    startHalfWidth,
    resolved,
    "left",
  );
  const rightWing = buildWingFrame(
    [rightWingStart, rightWingControl, objectiveRight],
    tailWidth,
    startHalfWidth,
    resolved,
    "right",
  );

  const bodyBulgeCenter = lerp(tailCenter, branchCenter, 0.55);
  const bodyBulgeHalfWidth =
    (tailWidth / 2) * resolved.bodyBulgeRatio;
  const leftBodyBulge = add(
    bodyBulgeCenter,
    scale(normal, bodyBulgeHalfWidth),
  );
  const rightBodyBulge = add(
    bodyBulgeCenter,
    scale(normal, -bodyBulgeHalfWidth),
  );
  const innerBridgePoint = add(
    branchCenter,
    scale(direction, -tailWidth * resolved.innerBridgeRatio),
  );
  if (
    dot(subtract(innerBridgePoint, tailCenter), direction) <=
    tailWidth * 0.15
  ) {
    throw new RangeError(
      "innerBridgeRatio places the shared bridge too close to or behind the tail.",
    );
  }

  return {
    projection,
    semanticTailLeft: clonePosition(semanticTailLeft),
    semanticTailRight: clonePosition(semanticTailRight),
    semanticObjectiveLeft: clonePosition(semanticObjectiveLeft),
    semanticObjectiveRight: clonePosition(semanticObjectiveRight),
    tailLeft,
    tailRight,
    objectiveLeft,
    objectiveRight,
    tailCenter,
    tailWidth,
    objectiveMidpoint,
    objectiveSeparation,
    direction,
    normal,
    branchCenter,
    leftBodyBulge,
    rightBodyBulge,
    innerBridgePoint,
    leftWing,
    rightWing,
  };
}

export function unprojectDoubleArrowRing(
  frame: DoubleArrowFrame,
  ring: readonly Vec2[],
): readonly Position[] {
  return ring.map((point) => {
    if (distance(point, frame.tailLeft) <= 1e-6) {
      return clonePosition(frame.semanticTailLeft);
    }
    if (distance(point, frame.tailRight) <= 1e-6) {
      return clonePosition(frame.semanticTailRight);
    }
    if (distance(point, frame.leftWing.head.tip) <= 1e-6) {
      return clonePosition(frame.semanticObjectiveLeft);
    }
    if (distance(point, frame.rightWing.head.tip) <= 1e-6) {
      return clonePosition(frame.semanticObjectiveRight);
    }
    return frame.projection.unproject(point);
  });
}

function buildWingFrame(
  controls: readonly Vec2[],
  tailWidth: number,
  startHalfWidth: number,
  resolved: ResolvedDoubleArrowParameters,
  side: "left" | "right",
): DoubleArrowWingFrame {
  const sampledCenterline = sampleCatmullRom(controls, {
    tension: resolved.tension,
    segmentsPerSpan: resolved.segmentsPerSpan,
  });
  const measuredCenterline = measurePolyline(sampledCenterline, 1e-6);
  const wingLength = measuredCenterline.totalLength;
  const headLength = Math.min(
    wingLength * resolved.headLengthRatio,
    tailWidth * resolved.maximumHeadLengthTailRatio,
    wingLength * 0.38,
  );
  if (headLength <= 1e-6) {
    throw new RangeError("Double arrow wing head length must be positive.");
  }

  const endSample = sampleMeasuredPolyline(measuredCenterline, wingLength);
  const tip = measuredCenterline.points.at(-1)!;
  const neckHalfWidth = tailWidth * resolved.neckHalfWidthTailRatio;
  const head = buildArrowHead(tip, endSample.tangent, {
    length: headLength,
    headHalfWidth: tailWidth * resolved.headHalfWidthTailRatio,
    neckHalfWidth,
  });
  const trimSample = sampleMeasuredPolyline(
    measuredCenterline,
    Math.max(0, wingLength - headLength),
  );
  const shaftCenterline = cleanPolyline(
    [
      ...measuredCenterline.points.slice(0, trimSample.segmentIndex + 1),
      head.neckCenter,
    ],
    1e-6,
  );
  if (shaftCenterline.length < 2) {
    throw new RangeError("Double arrow wing is too short after head trimming.");
  }

  const measuredShaft = measurePolyline(shaftCenterline, 1e-6);
  const halfWidths = measuredShaft.cumulativeLengths.map((currentLength) => {
    const ratio = currentLength / measuredShaft.totalLength;
    return lerpScalar(startHalfWidth, neckHalfWidth, ratio);
  });
  const offset = offsetPolyline(shaftCenterline, halfWidths, {
    miterLimit: resolved.miterLimit,
    tolerance: 1e-6,
  });

  return side === "left"
    ? {
        sampledCenterline,
        outerBoundary: offset.left.slice(0, -1),
        innerBoundary: offset.right.slice(0, -1),
        head,
      }
    : {
        sampledCenterline,
        outerBoundary: offset.right.slice(0, -1),
        innerBoundary: offset.left.slice(0, -1),
        head,
      };
}

function resolvePair(
  firstLocal: Vec2,
  secondLocal: Vec2,
  firstSemantic: Position,
  secondSemantic: Position,
  center: Vec2,
  normal: Vec2,
): readonly [Vec2, Vec2, Position, Position] {
  const firstLateral = dot(subtract(firstLocal, center), normal);
  const secondLateral = dot(subtract(secondLocal, center), normal);
  if (firstLateral > secondLateral) {
    return [firstLocal, secondLocal, firstSemantic, secondSemantic];
  }
  if (secondLateral > firstLateral) {
    return [secondLocal, firstLocal, secondSemantic, firstSemantic];
  }

  const firstKey = `${firstLocal.x}:${firstLocal.y}`;
  const secondKey = `${secondLocal.x}:${secondLocal.y}`;
  return firstKey <= secondKey
    ? [firstLocal, secondLocal, firstSemantic, secondSemantic]
    : [secondLocal, firstLocal, secondSemantic, firstSemantic];
}

function midpointPosition(first: Position, second: Position): Position {
  return [
    normalizeLongitude(
      first[0] + shortestLongitudeDelta(first[0], second[0]) / 2,
    ),
    (first[1] + second[1]) / 2,
  ];
}

function clampScalar(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function lerpScalar(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function clonePosition(position: Position): Position {
  return [position[0], position[1]];
}
