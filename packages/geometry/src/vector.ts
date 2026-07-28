export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export function assertFiniteVec2(point: Vec2, name = "point"): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`${name} must contain finite x and y values.`);
  }
}

export function add(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function subtract(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function scale(vector: Vec2, factor: number): Vec2 {
  if (!Number.isFinite(factor)) {
    throw new RangeError("Vector scale factor must be finite.");
  }
  return { x: vector.x * factor, y: vector.y * factor };
}

export function dot(left: Vec2, right: Vec2): number {
  return left.x * right.x + left.y * right.y;
}

export function cross(left: Vec2, right: Vec2): number {
  return left.x * right.y - left.y * right.x;
}

export function magnitudeSquared(vector: Vec2): number {
  return dot(vector, vector);
}

export function magnitude(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

export function distance(left: Vec2, right: Vec2): number {
  return magnitude(subtract(right, left));
}

export function normalize(vector: Vec2): Vec2 {
  const length = magnitude(vector);
  if (length === 0) {
    throw new RangeError("Cannot normalize a zero-length vector.");
  }
  return scale(vector, 1 / length);
}

export function normalizeOr(vector: Vec2, fallback: Vec2): Vec2 {
  const length = magnitude(vector);
  return length === 0 ? normalize(fallback) : scale(vector, 1 / length);
}

export function leftNormal(vector: Vec2): Vec2 {
  return { x: -vector.y, y: vector.x };
}

export function rightNormal(vector: Vec2): Vec2 {
  return { x: vector.y, y: -vector.x };
}

export function lerp(start: Vec2, end: Vec2, ratio: number): Vec2 {
  if (!Number.isFinite(ratio)) {
    throw new RangeError("Interpolation ratio must be finite.");
  }
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

export function almostEqual(
  left: Vec2,
  right: Vec2,
  tolerance = 1e-9,
): boolean {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError("Tolerance must be a finite non-negative number.");
  }
  return distance(left, right) <= tolerance;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    maximum < minimum
  ) {
    throw new RangeError("Clamp values must be finite and maximum >= minimum.");
  }
  return Math.min(Math.max(value, minimum), maximum);
}
