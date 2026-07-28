import type { Position } from "@plotlibre/core";
import { buildArrowHead, type ArrowHeadGeometry } from "./arrow-components.js";
import type { ResolvedFineArrowParameters } from "./fine-arrow.js";
import { createLocalProjection, type LocalProjection } from "./local-projection.js";
import {
  clamp,
  leftNormal,
  magnitude,
  normalize,
  subtract,
  type Vec2,
} from "./vector.js";

export interface FineArrowFrame {
  readonly projection: LocalProjection;
  readonly tailCenter: Vec2;
  readonly tip: Vec2;
  readonly direction: Vec2;
  readonly normal: Vec2;
  readonly arrowLength: number;
  readonly tailHalfWidth: number;
  readonly head: ArrowHeadGeometry;
}

export function buildFineArrowFrame(
  tail: Position,
  tipPosition: Position,
  resolved: ResolvedFineArrowParameters,
): FineArrowFrame {
  const projection = createLocalProjection(tail);
  const tailCenter: Vec2 = { x: 0, y: 0 };
  const tip = projection.project(tipPosition);
  const directionVector = subtract(tip, tailCenter);
  const arrowLength = magnitude(directionVector);

  if (arrowLength < 1e-6) {
    throw new RangeError("A fine arrow requires two distinct control points.");
  }

  const direction = normalize(directionVector);
  const normal = leftNormal(direction);
  const tailHalfWidth =
    clamp(
      arrowLength * resolved.tailWidthRatio,
      resolved.minimumWidthMeters,
      resolved.maximumWidthMeters,
    ) / 2;
  const headLength = Math.min(
    arrowLength * resolved.headLengthRatio,
    arrowLength * 0.75,
  );
  const head = buildArrowHead(tip, direction, {
    length: headLength,
    headHalfWidth: tailHalfWidth * resolved.headWidthRatio,
    neckHalfWidth: tailHalfWidth * resolved.neckWidthRatio,
  });

  return {
    projection,
    tailCenter,
    tip,
    direction,
    normal,
    arrowLength,
    tailHalfWidth,
    head,
  };
}

export function unprojectFineArrowRing(
  frame: FineArrowFrame,
  ring: readonly Vec2[],
  semanticTip: Position,
  tipIndex: number,
): readonly Position[] {
  const geographicRing = ring.map((point) => frame.projection.unproject(point));
  geographicRing[tipIndex] = [semanticTip[0], semanticTip[1]];
  return geographicRing;
}
