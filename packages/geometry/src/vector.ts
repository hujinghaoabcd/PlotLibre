export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export function add(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function subtract(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function scale(vector: Vec2, factor: number): Vec2 {
  return { x: vector.x * factor, y: vector.y * factor };
}

export function magnitude(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

export function normalize(vector: Vec2): Vec2 {
  const length = magnitude(vector);
  if (length === 0) {
    throw new RangeError("Cannot normalize a zero-length vector.");
  }
  return scale(vector, 1 / length);
}

export function leftNormal(vector: Vec2): Vec2 {
  return { x: -vector.y, y: vector.x };
}

export function lerp(start: Vec2, end: Vec2, ratio: number): Vec2 {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
