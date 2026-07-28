import {
  add,
  assertFiniteVec2,
  leftNormal,
  normalize,
  scale,
  subtract,
  type Vec2,
} from "./vector.js";

export interface ArrowHeadParameters {
  readonly length: number;
  readonly headHalfWidth: number;
  readonly neckHalfWidth: number;
}

export interface ArrowHeadGeometry {
  readonly neckCenter: Vec2;
  readonly neckLeft: Vec2;
  readonly headLeft: Vec2;
  readonly tip: Vec2;
  readonly headRight: Vec2;
  readonly neckRight: Vec2;
  readonly outline: readonly Vec2[];
}

export function buildArrowHead(
  tip: Vec2,
  direction: Vec2,
  parameters: ArrowHeadParameters,
): ArrowHeadGeometry {
  assertFiniteVec2(tip, "tip");
  assertFiniteVec2(direction, "direction");
  assertPositive("length", parameters.length);
  assertNonNegative("headHalfWidth", parameters.headHalfWidth);
  assertNonNegative("neckHalfWidth", parameters.neckHalfWidth);

  const unitDirection = normalize(direction);
  const normal = leftNormal(unitDirection);
  const neckCenter = subtract(tip, scale(unitDirection, parameters.length));
  const neckLeft = add(neckCenter, scale(normal, parameters.neckHalfWidth));
  const headLeft = add(neckCenter, scale(normal, parameters.headHalfWidth));
  const headRight = add(neckCenter, scale(normal, -parameters.headHalfWidth));
  const neckRight = add(neckCenter, scale(normal, -parameters.neckHalfWidth));
  const outline = [neckLeft, headLeft, { ...tip }, headRight, neckRight];

  return {
    neckCenter,
    neckLeft,
    headLeft,
    tip: { ...tip },
    headRight,
    neckRight,
    outline,
  };
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
}

function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number.`);
  }
}
