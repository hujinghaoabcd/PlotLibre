import {
  almostEqual,
  assertFiniteVec2,
  cross,
  subtract,
  type Vec2,
} from "./vector.js";

export type RingWinding = "clockwise" | "counterclockwise" | "degenerate";

export interface RingIntersection {
  readonly firstSegment: number;
  readonly secondSegment: number;
}

export function closeRing(
  input: readonly Vec2[],
  tolerance = 1e-9,
): readonly Vec2[] {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError("Ring tolerance must be finite and non-negative.");
  }
  for (const [index, point] of input.entries()) {
    assertFiniteVec2(point, `ring[${index}]`);
  }

  const vertices =
    input.length > 1 && almostEqual(input[0]!, input.at(-1)!, tolerance)
      ? input.slice(0, -1)
      : [...input];

  if (vertices.length < 3) {
    throw new RangeError("A polygon ring requires at least three vertices.");
  }

  return [...vertices.map((point) => ({ ...point })), { ...vertices[0]! }];
}

export function signedRingArea(input: readonly Vec2[]): number {
  const ring = closeRing(input);
  let twiceArea = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index]!;
    const next = ring[index + 1]!;
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return twiceArea / 2;
}

export function ringWinding(
  input: readonly Vec2[],
  tolerance = 1e-12,
): RingWinding {
  const area = signedRingArea(input);
  if (Math.abs(area) <= tolerance) return "degenerate";
  return area > 0 ? "counterclockwise" : "clockwise";
}

export function ensureRingWinding(
  input: readonly Vec2[],
  desired: Exclude<RingWinding, "degenerate">,
): readonly Vec2[] {
  const closed = closeRing(input);
  const winding = ringWinding(closed);
  if (winding === "degenerate") {
    throw new RangeError("Cannot orient a degenerate polygon ring.");
  }
  if (winding === desired) return closed;

  const reversed = closed.slice(0, -1).reverse();
  return closeRing(reversed);
}

export function segmentsIntersect(
  startA: Vec2,
  endA: Vec2,
  startB: Vec2,
  endB: Vec2,
  tolerance = 1e-9,
): boolean {
  for (const [name, point] of [
    ["startA", startA],
    ["endA", endA],
    ["startB", startB],
    ["endB", endB],
  ] as const) {
    assertFiniteVec2(point, name);
  }

  const orientation1 = orientation(startA, endA, startB);
  const orientation2 = orientation(startA, endA, endB);
  const orientation3 = orientation(startB, endB, startA);
  const orientation4 = orientation(startB, endB, endA);

  if (
    oppositeSigns(orientation1, orientation2, tolerance) &&
    oppositeSigns(orientation3, orientation4, tolerance)
  ) {
    return true;
  }

  return (
    (Math.abs(orientation1) <= tolerance && onSegment(startA, endA, startB, tolerance)) ||
    (Math.abs(orientation2) <= tolerance && onSegment(startA, endA, endB, tolerance)) ||
    (Math.abs(orientation3) <= tolerance && onSegment(startB, endB, startA, tolerance)) ||
    (Math.abs(orientation4) <= tolerance && onSegment(startB, endB, endA, tolerance))
  );
}

export function findRingSelfIntersections(
  input: readonly Vec2[],
  tolerance = 1e-9,
): readonly RingIntersection[] {
  const ring = closeRing(input, tolerance);
  const segmentCount = ring.length - 1;
  const intersections: RingIntersection[] = [];

  for (let first = 0; first < segmentCount; first += 1) {
    for (let second = first + 1; second < segmentCount; second += 1) {
      if (areAdjacentSegments(first, second, segmentCount)) continue;
      if (
        segmentsIntersect(
          ring[first]!,
          ring[first + 1]!,
          ring[second]!,
          ring[second + 1]!,
          tolerance,
        )
      ) {
        intersections.push({ firstSegment: first, secondSegment: second });
      }
    }
  }

  return intersections;
}

export function isSimpleRing(input: readonly Vec2[], tolerance = 1e-9): boolean {
  return findRingSelfIntersections(input, tolerance).length === 0;
}

function orientation(start: Vec2, end: Vec2, point: Vec2): number {
  return cross(subtract(end, start), subtract(point, start));
}

function oppositeSigns(left: number, right: number, tolerance: number): boolean {
  return (
    (left > tolerance && right < -tolerance) ||
    (left < -tolerance && right > tolerance)
  );
}

function onSegment(
  start: Vec2,
  end: Vec2,
  point: Vec2,
  tolerance: number,
): boolean {
  return (
    point.x >= Math.min(start.x, end.x) - tolerance &&
    point.x <= Math.max(start.x, end.x) + tolerance &&
    point.y >= Math.min(start.y, end.y) - tolerance &&
    point.y <= Math.max(start.y, end.y) + tolerance
  );
}

function areAdjacentSegments(
  first: number,
  second: number,
  segmentCount: number,
): boolean {
  return (
    Math.abs(first - second) <= 1 ||
    (first === 0 && second === segmentCount - 1)
  );
}
