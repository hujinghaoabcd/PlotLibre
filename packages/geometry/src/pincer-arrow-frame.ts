import type { Position } from "@plotlibre/core";
import { buildArrowHead, type ArrowHeadGeometry } from "./arrow-components.js";
import type { ResolvedPincerArrowParameters } from "./pincer-arrow.js";
import { sampleCubicBezier } from "./curves.js";
import {
  normalizeLongitude,
  shortestLongitudeDelta,
} from "./geodesic.js";
import {
  createLocalProjection,
  type LocalProjection,
} from "./local-projection.js";
import { offsetPolyline } from "./offset.js";
import {
  cleanPolyline,
  measurePolyline,
  sampleMeasuredPolyline,
} from "./polyline.js";
import { segmentsIntersect } from "./ring.js";
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

export type PincerArmVisualSide = "left" | "right";

export interface PincerArmFrame {
  readonly visualSide: PincerArmVisualSide;
  readonly semanticOuterTail: Position;
  readonly semanticObjective: Position;
  readonly outerTail: Vec2;
  readonly junction: Vec2;
  readonly objective: Vec2;
  readonly tailCenter: Vec2;
  readonly tailSpan: number;
  readonly sampledCenterline: readonly Vec2[];
  readonly outerBoundary: readonly Vec2[];
  readonly innerBoundary: readonly Vec2[];
  readonly outerNeck: Vec2;
  readonly outerHeadShoulder: Vec2;
  readonly innerHeadShoulder: Vec2;
  readonly innerNeck: Vec2;
  readonly head: ArrowHeadGeometry;
}

export interface PincerArrowFrame {
  readonly projection: LocalProjection;
  readonly semanticTailA: Position;
  readonly semanticTailB: Position;
  readonly semanticObjectiveA: Position;
  readonly semanticObjectiveB: Position;
  readonly semanticJunction: Position;
  readonly tailA: Vec2;
  readonly tailB: Vec2;
  readonly objectiveA: Vec2;
  readonly objectiveB: Vec2;
  readonly junction: Vec2;
  readonly tailCenter: Vec2;
  readonly objectiveCenter: Vec2;
  readonly forward: Vec2;
  readonly lateral: Vec2;
  readonly globalLength: number;
  readonly armA: PincerArmFrame;
  readonly armB: PincerArmFrame;
}

export function buildPincerArrowFrame(
  controlPoints: readonly Position[],
  resolved: ResolvedPincerArrowParameters,
): PincerArrowFrame {
  if (controlPoints.length !== 5) {
    throw new RangeError("Pincer arrow requires exactly five control points.");
  }

  const semanticTailA = clonePosition(controlPoints[0]!);
  const semanticTailB = clonePosition(controlPoints[1]!);
  const semanticObjectiveA = clonePosition(controlPoints[2]!);
  const semanticObjectiveB = clonePosition(controlPoints[3]!);
  const semanticJunction = clonePosition(controlPoints[4]!);
  const projection = createLocalProjection(
    midpointPosition(semanticTailA, semanticTailB),
  );
  const tailA = projection.project(semanticTailA);
  const tailB = projection.project(semanticTailB);
  const objectiveA = projection.project(semanticObjectiveA);
  const objectiveB = projection.project(semanticObjectiveB);
  const junction = projection.project(semanticJunction);

  assertDistinctControls([
    tailA,
    tailB,
    objectiveA,
    objectiveB,
    junction,
  ]);

  const tailCenter = scale(add(tailA, tailB), 0.5);
  const objectiveCenter = scale(add(objectiveA, objectiveB), 0.5);
  const globalVector = subtract(objectiveCenter, tailCenter);
  const globalLength = distance(tailCenter, objectiveCenter);
  if (globalLength <= 1e-6) {
    throw new RangeError(
      "Pincer arrow tail and objective centers must define a forward direction.",
    );
  }
  const forward = normalize(globalVector);
  const lateral = leftNormal(forward);
  const tailSeparation = distance(tailA, tailB);
  const sideA = dot(subtract(tailA, tailCenter), lateral);
  const sideB = dot(subtract(tailB, tailCenter), lateral);
  if (sideA * sideB >= -1e-6) {
    throw new RangeError(
      "Pincer arrow outer tails must lie on opposite sides of the forward axis.",
    );
  }

  const junctionProgress = dot(subtract(junction, tailCenter), forward) / globalLength;
  if (junctionProgress < -0.3 || junctionProgress > 0.68) {
    throw new RangeError(
      "Pincer arrow junction must remain in the admissible tail-to-junction zone.",
    );
  }
  const junctionLateral = Math.abs(dot(subtract(junction, tailCenter), lateral));
  const maximumJunctionLateral = Math.max(
    tailSeparation * 1.75,
    globalLength * 0.45,
  );
  if (junctionLateral > maximumJunctionLateral) {
    throw new RangeError(
      "Pincer arrow junction is too far laterally from the compound frame.",
    );
  }

  const armA = buildArmFrame({
    visualSide: sideA > 0 ? "left" : "right",
    semanticOuterTail: semanticTailA,
    semanticObjective: semanticObjectiveA,
    outerTail: tailA,
    objective: objectiveA,
    junction,
    lateral,
    resolved,
  });
  const armB = buildArmFrame({
    visualSide: sideB > 0 ? "left" : "right",
    semanticOuterTail: semanticTailB,
    semanticObjective: semanticObjectiveB,
    outerTail: tailB,
    objective: objectiveB,
    junction,
    lateral,
    resolved,
  });

  if (centerlinesIntersect(armA.sampledCenterline, armB.sampledCenterline)) {
    throw new RangeError(
      "Pincer arrow paired arm centerlines cross; preserve the authored tail-to-objective pairing.",
    );
  }

  return {
    projection,
    semanticTailA,
    semanticTailB,
    semanticObjectiveA,
    semanticObjectiveB,
    semanticJunction,
    tailA,
    tailB,
    objectiveA,
    objectiveB,
    junction,
    tailCenter,
    objectiveCenter,
    forward,
    lateral,
    globalLength,
    armA,
    armB,
  };
}

export function unprojectPincerArrowRing(
  frame: PincerArrowFrame,
  ring: readonly Vec2[],
): readonly Position[] {
  return ring.map((point) => {
    if (distance(point, frame.tailA) <= 1e-6) {
      return clonePosition(frame.semanticTailA);
    }
    if (distance(point, frame.tailB) <= 1e-6) {
      return clonePosition(frame.semanticTailB);
    }
    if (distance(point, frame.objectiveA) <= 1e-6) {
      return clonePosition(frame.semanticObjectiveA);
    }
    if (distance(point, frame.objectiveB) <= 1e-6) {
      return clonePosition(frame.semanticObjectiveB);
    }
    if (distance(point, frame.junction) <= 1e-6) {
      return clonePosition(frame.semanticJunction);
    }
    return frame.projection.unproject(point);
  });
}

interface BuildArmFrameOptions {
  readonly visualSide: PincerArmVisualSide;
  readonly semanticOuterTail: Position;
  readonly semanticObjective: Position;
  readonly outerTail: Vec2;
  readonly objective: Vec2;
  readonly junction: Vec2;
  readonly lateral: Vec2;
  readonly resolved: ResolvedPincerArrowParameters;
}

function buildArmFrame(options: BuildArmFrameOptions): PincerArmFrame {
  const {
    visualSide,
    semanticOuterTail,
    semanticObjective,
    outerTail,
    objective,
    junction,
    lateral,
    resolved,
  } = options;
  const tailSpan = distance(outerTail, junction);
  if (tailSpan < resolved.minimumTailSpanMeters) {
    throw new RangeError(
      `Pincer arrow semantic tail span must be at least ${resolved.minimumTailSpanMeters} meters.`,
    );
  }
  if (tailSpan > resolved.maximumTailSpanMeters) {
    throw new RangeError(
      `Pincer arrow semantic tail span must not exceed ${resolved.maximumTailSpanMeters} meters.`,
    );
  }

  const tailCenter = scale(add(outerTail, junction), 0.5);
  const towardObjective = subtract(objective, tailCenter);
  const armLength = distance(tailCenter, objective);
  if (armLength <= Math.max(1, tailSpan * 1.1)) {
    throw new RangeError(
      "Pincer arrow arm is too short relative to its semantic tail span.",
    );
  }

  const tailBaseline = subtract(junction, outerTail);
  const firstNormal = leftNormal(normalize(tailBaseline));
  const initialDirection =
    dot(firstNormal, towardObjective) >= 0 ? firstNormal : scale(firstNormal, -1);
  const forwardDistance = dot(towardObjective, initialDirection);
  if (forwardDistance <= Math.max(1, tailSpan * 0.5)) {
    throw new RangeError(
      "Pincer arrow objective must remain ahead of its paired semantic tail frame.",
    );
  }

  const outward = visualSide === "left" ? lateral : scale(lateral, -1);
  const firstControlDistance = Math.min(
    armLength * 0.42,
    Math.max(tailSpan * 0.75, armLength * 0.25),
  );
  const centerControl1 = add(
    tailCenter,
    scale(initialDirection, firstControlDistance),
  );
  const bulgeDistance = Math.min(
    armLength * 0.2,
    tailSpan * resolved.armBulgeRatio,
  );
  const centerControl2 = add(
    lerp(tailCenter, objective, 0.72),
    scale(outward, bulgeDistance),
  );
  const sampledCenterline = cleanPolyline(
    sampleCubicBezier(
      tailCenter,
      centerControl1,
      centerControl2,
      objective,
      resolved.segmentsPerSpan * 2,
    ),
    1e-6,
  );
  const measuredCenterline = measurePolyline(sampledCenterline, 1e-6);
  const centerlineLength = measuredCenterline.totalLength;
  const endSample = sampleMeasuredPolyline(
    measuredCenterline,
    centerlineLength,
  );
  const headLength = Math.min(
    centerlineLength * resolved.headLengthRatio,
    tailSpan * resolved.maximumHeadLengthTailRatio,
    centerlineLength * 0.38,
  );
  if (headLength <= 1e-6) {
    throw new RangeError("Pincer arrow head length must be positive.");
  }
  const neckHalfWidth = tailSpan * resolved.neckHalfWidthTailRatio;
  const head = buildArrowHead(objective, endSample.tangent, {
    length: headLength,
    headHalfWidth: tailSpan * resolved.headHalfWidthTailRatio,
    neckHalfWidth,
  });

  const trimSample = sampleMeasuredPolyline(
    measuredCenterline,
    Math.max(0, centerlineLength - headLength),
  );
  const shaftCenterline = cleanPolyline(
    [
      ...measuredCenterline.points.slice(0, trimSample.segmentIndex + 1),
      head.neckCenter,
    ],
    1e-6,
  );
  if (shaftCenterline.length < 2) {
    throw new RangeError("Pincer arrow shaft is too short after head trimming.");
  }

  const measuredShaft = measurePolyline(shaftCenterline, 1e-6);
  const tailHalfWidth = tailSpan / 2;
  const bulgeHalfWidth = tailHalfWidth * resolved.armBulgeRatio;
  const halfWidths = measuredShaft.cumulativeLengths.map((currentLength) => {
    const ratio = currentLength / measuredShaft.totalLength;
    if (ratio <= 0.4) {
      return scalarLerp(tailHalfWidth, bulgeHalfWidth, ratio / 0.4);
    }
    return scalarLerp(
      bulgeHalfWidth,
      neckHalfWidth,
      (ratio - 0.4) / 0.6,
    );
  });
  const offset = offsetPolyline(shaftCenterline, halfWidths, {
    miterLimit: resolved.miterLimit,
    tolerance: 1e-6,
  });

  const leftStartsAtOuter =
    distance(offset.left[0]!, outerTail) <= distance(offset.right[0]!, outerTail);
  const preliminaryOuter = leftStartsAtOuter ? offset.left : offset.right;
  const preliminaryInner = leftStartsAtOuter ? offset.right : offset.left;
  const outerNeck = leftStartsAtOuter ? head.neckLeft : head.neckRight;
  const innerNeck = leftStartsAtOuter ? head.neckRight : head.neckLeft;
  const outerHeadShoulder = leftStartsAtOuter ? head.headLeft : head.headRight;
  const innerHeadShoulder = leftStartsAtOuter ? head.headRight : head.headLeft;

  const startTolerance = Math.max(1e-4, tailSpan * 0.02);
  if (
    distance(preliminaryOuter[0]!, outerTail) > startTolerance ||
    distance(preliminaryInner[0]!, junction) > startTolerance
  ) {
    throw new RangeError(
      "Pincer arrow tail baseline does not span its initial arm direction.",
    );
  }

  const outerBoundary = smoothBoundary(
    [outerTail, ...preliminaryOuter.slice(1, -1), outerNeck],
    resolved.outerTension,
    1 / 3,
    resolved.segmentsPerSpan,
  );
  const innerBoundary = smoothBoundary(
    [junction, ...preliminaryInner.slice(1, -1), innerNeck],
    resolved.innerTension,
    resolved.junctionShoulderRatio,
    resolved.segmentsPerSpan,
  );

  return {
    visualSide,
    semanticOuterTail: clonePosition(semanticOuterTail),
    semanticObjective: clonePosition(semanticObjective),
    outerTail,
    junction,
    objective,
    tailCenter,
    tailSpan,
    sampledCenterline,
    outerBoundary,
    innerBoundary,
    outerNeck,
    outerHeadShoulder,
    innerHeadShoulder,
    innerNeck,
    head,
  };
}

function smoothBoundary(
  input: readonly Vec2[],
  tension: number,
  firstControlRatio: number,
  segments: number,
): readonly Vec2[] {
  const points = cleanPolyline(input, 1e-6);
  const measured = measurePolyline(points, 1e-6);
  const start = measured.points[0]!;
  const end = measured.points.at(-1)!;
  const firstCandidate = sampleMeasuredPolyline(
    measured,
    measured.totalLength * firstControlRatio,
  ).point;
  const secondCandidate = sampleMeasuredPolyline(
    measured,
    measured.totalLength * (2 / 3),
  ).point;
  const firstLinear = lerp(start, end, 1 / 3);
  const secondLinear = lerp(start, end, 2 / 3);
  const control1 = lerp(firstCandidate, firstLinear, tension);
  const control2 = lerp(secondCandidate, secondLinear, tension);
  return sampleCubicBezier(start, control1, control2, end, segments);
}

function centerlinesIntersect(
  first: readonly Vec2[],
  second: readonly Vec2[],
): boolean {
  for (let firstIndex = 0; firstIndex < first.length - 1; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < second.length - 1; secondIndex += 1) {
      if (
        segmentsIntersect(
          first[firstIndex]!,
          first[firstIndex + 1]!,
          second[secondIndex]!,
          second[secondIndex + 1]!,
          1e-6,
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function assertDistinctControls(points: readonly Vec2[]): void {
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      if (distance(points[first]!, points[second]!) <= 1e-6) {
        throw new RangeError(
          `Pincer arrow control points ${first} and ${second} must be distinct.`,
        );
      }
    }
  }
}

function midpointPosition(first: Position, second: Position): Position {
  return [
    normalizeLongitude(
      first[0] + shortestLongitudeDelta(first[0], second[0]) / 2,
    ),
    (first[1] + second[1]) / 2,
  ];
}

function scalarLerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function clonePosition(position: Position): Position {
  return [position[0], position[1]];
}