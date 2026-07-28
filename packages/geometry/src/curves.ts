import {
  add,
  assertFiniteVec2,
  lerp,
  scale,
  subtract,
  type Vec2,
} from "./vector.js";
import { cleanPolyline } from "./polyline.js";

export interface CatmullRomOptions {
  readonly segmentsPerSpan?: number;
  readonly tension?: number;
}

export function sampleCubicBezier(
  start: Vec2,
  control1: Vec2,
  control2: Vec2,
  end: Vec2,
  segments = 16,
): readonly Vec2[] {
  assertSegments(segments);
  for (const [name, point] of [
    ["start", start],
    ["control1", control1],
    ["control2", control2],
    ["end", end],
  ] as const) {
    assertFiniteVec2(point, name);
  }

  const points: Vec2[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const inverse = 1 - t;
    const inverseSquared = inverse * inverse;
    const tSquared = t * t;
    points.push({
      x:
        inverseSquared * inverse * start.x +
        3 * inverseSquared * t * control1.x +
        3 * inverse * tSquared * control2.x +
        tSquared * t * end.x,
      y:
        inverseSquared * inverse * start.y +
        3 * inverseSquared * t * control1.y +
        3 * inverse * tSquared * control2.y +
        tSquared * t * end.y,
    });
  }
  return points;
}

export function sampleCatmullRom(
  input: readonly Vec2[],
  options: CatmullRomOptions = {},
): readonly Vec2[] {
  const points = cleanPolyline(input);
  if (points.length < 2) {
    throw new RangeError("Catmull-Rom interpolation requires two distinct points.");
  }

  const segmentsPerSpan = options.segmentsPerSpan ?? 12;
  const tension = options.tension ?? 0;
  assertSegments(segmentsPerSpan);
  if (!Number.isFinite(tension) || tension < 0 || tension > 1) {
    throw new RangeError("Catmull-Rom tension must be between 0 and 1.");
  }

  if (points.length === 2) {
    const start = points[0]!;
    const end = points[1]!;
    return Array.from({ length: segmentsPerSpan + 1 }, (_, index) =>
      lerp(start, end, index / segmentsPerSpan),
    );
  }

  const sampled: Vec2[] = [];
  for (let span = 0; span < points.length - 1; span += 1) {
    const p0 = points[Math.max(0, span - 1)]!;
    const p1 = points[span]!;
    const p2 = points[span + 1]!;
    const p3 = points[Math.min(points.length - 1, span + 2)]!;
    const tangentScale = (1 - tension) / 2;
    const m1 = scale(subtract(p2, p0), tangentScale);
    const m2 = scale(subtract(p3, p1), tangentScale);

    for (let step = 0; step < segmentsPerSpan; step += 1) {
      const t = step / segmentsPerSpan;
      sampled.push(hermite(p1, p2, m1, m2, t));
    }
  }
  sampled.push({ ...points.at(-1)! });
  return sampled;
}

function hermite(
  start: Vec2,
  end: Vec2,
  startTangent: Vec2,
  endTangent: Vec2,
  t: number,
): Vec2 {
  const tSquared = t * t;
  const tCubed = tSquared * t;
  const h00 = 2 * tCubed - 3 * tSquared + 1;
  const h10 = tCubed - 2 * tSquared + t;
  const h01 = -2 * tCubed + 3 * tSquared;
  const h11 = tCubed - tSquared;
  return add(
    add(scale(start, h00), scale(startTangent, h10)),
    add(scale(end, h01), scale(endTangent, h11)),
  );
}

function assertSegments(segments: number): void {
  if (!Number.isInteger(segments) || segments < 1 || segments > 10_000) {
    throw new RangeError("Curve segment count must be an integer between 1 and 10000.");
  }
}
