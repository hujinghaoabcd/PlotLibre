export const DEFAULT_BOX_ACTIVATION_THRESHOLD = 4;
export const DEFAULT_LASSO_SAMPLE_SPACING = 2;
export const DEFAULT_LASSO_RDP_TOLERANCE = 1.5;
export const DEFAULT_LASSO_MINIMUM_AREA = 16;
export const SCREEN_REGION_EPSILON = 1e-9;

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface ScreenBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export type ScreenPointInRingResult = "outside" | "inside" | "boundary";

export type SelectionRegionRejectionCode =
  | "SELECTION_REGION_TOO_SMALL"
  | "SELECTION_REGION_LASSO_TOO_FEW_POINTS"
  | "SELECTION_REGION_LASSO_SELF_INTERSECTS";

export interface SelectionRegionRejection {
  readonly code: SelectionRegionRejectionCode;
  readonly message: string;
}

export interface ScreenLassoValidationOptions {
  readonly minimumDistinctPoints?: number;
  readonly minimumArea?: number;
  readonly simplifyTolerance?: number;
  readonly epsilon?: number;
}

export interface ValidScreenLasso {
  readonly valid: true;
  readonly points: readonly ScreenPoint[];
  readonly ring: readonly ScreenPoint[];
  readonly bounds: ScreenBounds;
  readonly area: number;
}

export interface InvalidScreenLasso {
  readonly valid: false;
  readonly points: readonly ScreenPoint[];
  readonly rejection: SelectionRegionRejection;
}

export type ScreenLassoValidationResult =
  | ValidScreenLasso
  | InvalidScreenLasso;

export type ScreenGeometry =
  | {
      readonly type: "Point";
      readonly coordinates: ScreenPoint;
    }
  | {
      readonly type: "LineString";
      readonly coordinates: readonly ScreenPoint[];
    }
  | {
      readonly type: "Polygon";
      readonly coordinates: readonly (readonly ScreenPoint[])[];
    }
  | {
      readonly type: "MultiLineString";
      readonly coordinates: readonly (readonly ScreenPoint[])[];
    }
  | {
      readonly type: "MultiPolygon";
      readonly coordinates: readonly (
        readonly (readonly ScreenPoint[])[]
      )[];
    };

export function assertFiniteScreenPoint(
  point: ScreenPoint,
  label = "Screen point",
): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`${label} must contain finite x/y coordinates.`);
  }
}

export function screenDistanceSquared(
  left: ScreenPoint,
  right: ScreenPoint,
): number {
  assertFiniteScreenPoint(left, "Left screen point");
  assertFiniteScreenPoint(right, "Right screen point");
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  return dx * dx + dy * dy;
}

export function normalizeScreenBounds(
  start: ScreenPoint,
  end: ScreenPoint,
): ScreenBounds {
  assertFiniteScreenPoint(start, "Box start");
  assertFiniteScreenPoint(end, "Box end");
  return {
    minX: Math.min(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxX: Math.max(start.x, end.x),
    maxY: Math.max(start.y, end.y),
  };
}

export function isScreenDragActive(
  start: ScreenPoint,
  current: ScreenPoint,
  threshold = DEFAULT_BOX_ACTIVATION_THRESHOLD,
): boolean {
  assertNonNegativeFinite(threshold, "Screen drag threshold");
  return screenDistanceSquared(start, current) >= threshold * threshold;
}

export function screenBoundsHasPositiveArea(bounds: ScreenBounds): boolean {
  assertFiniteScreenBounds(bounds);
  return bounds.maxX > bounds.minX && bounds.maxY > bounds.minY;
}

export function screenBoundsToRing(
  bounds: ScreenBounds,
): readonly ScreenPoint[] {
  assertFiniteScreenBounds(bounds);
  const topLeft = { x: bounds.minX, y: bounds.minY };
  const topRight = { x: bounds.maxX, y: bounds.minY };
  const bottomRight = { x: bounds.maxX, y: bounds.maxY };
  const bottomLeft = { x: bounds.minX, y: bounds.maxY };
  return [topLeft, topRight, bottomRight, bottomLeft, topLeft];
}

export function appendLassoSample(
  points: readonly ScreenPoint[],
  candidate: ScreenPoint,
  spacing = DEFAULT_LASSO_SAMPLE_SPACING,
): readonly ScreenPoint[] {
  assertNonNegativeFinite(spacing, "Lasso sample spacing");
  assertFiniteScreenPoint(candidate, "Lasso sample");
  const last = points.at(-1);
  if (last === undefined) return [{ ...candidate }];
  assertFiniteScreenPoint(last, "Existing lasso sample");
  if (screenDistanceSquared(last, candidate) < spacing * spacing) {
    return [...points];
  }
  return [...points, { ...candidate }];
}

export function removeConsecutiveDuplicateScreenPoints(
  points: readonly ScreenPoint[],
  epsilon = SCREEN_REGION_EPSILON,
): readonly ScreenPoint[] {
  assertNonNegativeFinite(epsilon, "Screen equality epsilon");
  const result: ScreenPoint[] = [];
  for (const [index, point] of points.entries()) {
    assertFiniteScreenPoint(point, `Screen point ${index}`);
    const previous = result.at(-1);
    if (previous === undefined || !sameScreenPoint(previous, point, epsilon)) {
      result.push({ ...point });
    }
  }
  return result;
}

export function signedScreenRingArea(
  points: readonly ScreenPoint[],
): number {
  const ring = normalizeOpenRing(points, SCREEN_REGION_EPSILON);
  if (ring.length < 3) return 0;
  let twiceArea = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index]!;
    const next = ring[(index + 1) % ring.length]!;
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return twiceArea / 2;
}

export function simplifyScreenPath(
  points: readonly ScreenPoint[],
  tolerance = DEFAULT_LASSO_RDP_TOLERANCE,
): readonly ScreenPoint[] {
  assertNonNegativeFinite(tolerance, "RDP tolerance");
  const normalized = removeConsecutiveDuplicateScreenPoints(points);
  if (normalized.length <= 2) return normalized;
  return simplifyScreenPathRecursive(normalized, tolerance);
}

export function validateAndSimplifyScreenLasso(
  rawPoints: readonly ScreenPoint[],
  options: ScreenLassoValidationOptions = {},
): ScreenLassoValidationResult {
  const minimumDistinctPoints = options.minimumDistinctPoints ?? 3;
  const minimumArea = options.minimumArea ?? DEFAULT_LASSO_MINIMUM_AREA;
  const simplifyTolerance =
    options.simplifyTolerance ?? DEFAULT_LASSO_RDP_TOLERANCE;
  const epsilon = options.epsilon ?? SCREEN_REGION_EPSILON;

  if (!Number.isInteger(minimumDistinctPoints) || minimumDistinctPoints < 3) {
    throw new RangeError("Lasso minimumDistinctPoints must be an integer >= 3.");
  }
  assertNonNegativeFinite(minimumArea, "Lasso minimum area");
  assertNonNegativeFinite(simplifyTolerance, "Lasso simplify tolerance");
  assertNonNegativeFinite(epsilon, "Lasso epsilon");

  const raw = normalizeOpenRing(rawPoints, epsilon);
  const rawMinimumIssue = minimumLassoIssue(
    raw,
    minimumDistinctPoints,
    minimumArea,
  );
  if (rawMinimumIssue !== undefined) {
    return invalidLasso(raw, rawMinimumIssue);
  }
  if (!isSimpleScreenRing(raw, epsilon)) {
    return invalidLasso(raw, selfIntersectionIssue());
  }

  const simplified = normalizeOpenRing(
    simplifyScreenPath(raw, simplifyTolerance),
    epsilon,
  );
  const simplifiedMinimumIssue = minimumLassoIssue(
    simplified,
    minimumDistinctPoints,
    minimumArea,
  );
  if (simplifiedMinimumIssue !== undefined) {
    return invalidLasso(simplified, simplifiedMinimumIssue);
  }
  if (!isSimpleScreenRing(simplified, epsilon)) {
    return invalidLasso(simplified, selfIntersectionIssue());
  }

  const bounds = screenPointsBounds(simplified);
  const area = Math.abs(signedScreenRingArea(simplified));
  const points = copyScreenPoints(simplified);
  const ring = [...copyScreenPoints(simplified), { ...simplified[0]! }];
  return {
    valid: true,
    points,
    ring,
    bounds,
    area,
  };
}

export function isSimpleScreenRing(
  points: readonly ScreenPoint[],
  epsilon = SCREEN_REGION_EPSILON,
): boolean {
  assertNonNegativeFinite(epsilon, "Screen ring epsilon");
  const ring = normalizeOpenRing(points, epsilon);
  if (ring.length < 3) return false;

  for (let left = 0; left < ring.length; left += 1) {
    for (let right = left + 1; right < ring.length; right += 1) {
      if (sameScreenPoint(ring[left]!, ring[right]!, epsilon)) return false;
    }
  }

  for (let left = 0; left < ring.length; left += 1) {
    const leftStart = ring[left]!;
    const leftEnd = ring[(left + 1) % ring.length]!;
    if (sameScreenPoint(leftStart, leftEnd, epsilon)) return false;

    for (let right = left + 1; right < ring.length; right += 1) {
      if (segmentsAreAdjacent(left, right, ring.length)) continue;
      const rightStart = ring[right]!;
      const rightEnd = ring[(right + 1) % ring.length]!;
      if (
        screenSegmentsIntersect(
          leftStart,
          leftEnd,
          rightStart,
          rightEnd,
          epsilon,
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

export function screenOrientation(
  first: ScreenPoint,
  second: ScreenPoint,
  third: ScreenPoint,
): number {
  assertFiniteScreenPoint(first, "Orientation first point");
  assertFiniteScreenPoint(second, "Orientation second point");
  assertFiniteScreenPoint(third, "Orientation third point");
  return (
    (second.x - first.x) * (third.y - first.y) -
    (second.y - first.y) * (third.x - first.x)
  );
}

export function isPointOnScreenSegment(
  point: ScreenPoint,
  start: ScreenPoint,
  end: ScreenPoint,
  epsilon = SCREEN_REGION_EPSILON,
): boolean {
  assertNonNegativeFinite(epsilon, "Segment epsilon");
  if (Math.abs(screenOrientation(start, end, point)) > epsilon) return false;
  return (
    point.x >= Math.min(start.x, end.x) - epsilon &&
    point.x <= Math.max(start.x, end.x) + epsilon &&
    point.y >= Math.min(start.y, end.y) - epsilon &&
    point.y <= Math.max(start.y, end.y) + epsilon
  );
}

export function screenSegmentsIntersect(
  firstStart: ScreenPoint,
  firstEnd: ScreenPoint,
  secondStart: ScreenPoint,
  secondEnd: ScreenPoint,
  epsilon = SCREEN_REGION_EPSILON,
): boolean {
  assertNonNegativeFinite(epsilon, "Segment intersection epsilon");
  const firstSecondStart = signWithEpsilon(
    screenOrientation(firstStart, firstEnd, secondStart),
    epsilon,
  );
  const firstSecondEnd = signWithEpsilon(
    screenOrientation(firstStart, firstEnd, secondEnd),
    epsilon,
  );
  const secondFirstStart = signWithEpsilon(
    screenOrientation(secondStart, secondEnd, firstStart),
    epsilon,
  );
  const secondFirstEnd = signWithEpsilon(
    screenOrientation(secondStart, secondEnd, firstEnd),
    epsilon,
  );

  if (
    firstSecondStart * firstSecondEnd < 0 &&
    secondFirstStart * secondFirstEnd < 0
  ) {
    return true;
  }
  if (
    firstSecondStart === 0 &&
    isPointOnScreenSegment(secondStart, firstStart, firstEnd, epsilon)
  ) {
    return true;
  }
  if (
    firstSecondEnd === 0 &&
    isPointOnScreenSegment(secondEnd, firstStart, firstEnd, epsilon)
  ) {
    return true;
  }
  if (
    secondFirstStart === 0 &&
    isPointOnScreenSegment(firstStart, secondStart, secondEnd, epsilon)
  ) {
    return true;
  }
  return (
    secondFirstEnd === 0 &&
    isPointOnScreenSegment(firstEnd, secondStart, secondEnd, epsilon)
  );
}

export function pointInScreenRing(
  point: ScreenPoint,
  points: readonly ScreenPoint[],
  epsilon = SCREEN_REGION_EPSILON,
): ScreenPointInRingResult {
  assertFiniteScreenPoint(point, "Point-in-ring point");
  assertNonNegativeFinite(epsilon, "Point-in-ring epsilon");
  const ring = normalizeOpenRing(points, epsilon);
  if (ring.length < 3) return "outside";

  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index]!;
    const end = ring[(index + 1) % ring.length]!;
    if (isPointOnScreenSegment(point, start, end, epsilon)) {
      return "boundary";
    }
  }

  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index]!;
    const previousPoint = ring[previous]!;
    const crosses =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside ? "inside" : "outside";
}

export function pointInScreenPolygonFill(
  point: ScreenPoint,
  rings: readonly (readonly ScreenPoint[])[],
  epsilon = SCREEN_REGION_EPSILON,
): boolean {
  const exterior = rings[0];
  if (exterior === undefined) return false;
  const exteriorResult = pointInScreenRing(point, exterior, epsilon);
  if (exteriorResult === "outside") return false;
  if (exteriorResult === "boundary") return true;

  for (let index = 1; index < rings.length; index += 1) {
    const hole = rings[index];
    if (hole === undefined) continue;
    const holeResult = pointInScreenRing(point, hole, epsilon);
    if (holeResult === "inside") return false;
    if (holeResult === "boundary") return true;
  }
  return true;
}

export function screenGeometryIntersectsRegion(
  geometry: ScreenGeometry,
  regionPoints: readonly ScreenPoint[],
  epsilon = SCREEN_REGION_EPSILON,
): boolean {
  const region = normalizeOpenRing(regionPoints, epsilon);
  if (region.length < 3) return false;

  switch (geometry.type) {
    case "Point":
      return pointInScreenRing(geometry.coordinates, region, epsilon) !== "outside";
    case "LineString":
      return screenLineIntersectsRegion(geometry.coordinates, region, epsilon);
    case "MultiLineString":
      return geometry.coordinates.some((line) =>
        screenLineIntersectsRegion(line, region, epsilon),
      );
    case "Polygon":
      return screenPolygonIntersectsRegion(
        geometry.coordinates,
        region,
        epsilon,
      );
    case "MultiPolygon":
      return geometry.coordinates.some((polygon) =>
        screenPolygonIntersectsRegion(polygon, region, epsilon),
      );
  }
}

export function screenLineIntersectsRegion(
  line: readonly ScreenPoint[],
  regionPoints: readonly ScreenPoint[],
  epsilon = SCREEN_REGION_EPSILON,
): boolean {
  const region = normalizeOpenRing(regionPoints, epsilon);
  for (const point of line) {
    assertFiniteScreenPoint(point, "Line screen point");
    if (pointInScreenRing(point, region, epsilon) !== "outside") return true;
  }
  for (let index = 0; index + 1 < line.length; index += 1) {
    const start = line[index]!;
    const end = line[index + 1]!;
    if (lineSegmentIntersectsRing(start, end, region, epsilon)) return true;
  }
  return false;
}

export function screenPolygonIntersectsRegion(
  polygonRings: readonly (readonly ScreenPoint[])[],
  regionPoints: readonly ScreenPoint[],
  epsilon = SCREEN_REGION_EPSILON,
): boolean {
  const region = normalizeOpenRing(regionPoints, epsilon);
  const exterior = polygonRings[0];
  if (region.length < 3 || exterior === undefined) return false;
  const normalizedRings = polygonRings.map((ring) =>
    normalizeOpenRing(ring, epsilon),
  );

  for (const ring of normalizedRings) {
    if (ringsBoundariesIntersect(ring, region, epsilon)) return true;
  }
  for (const point of region) {
    if (pointInScreenPolygonFill(point, normalizedRings, epsilon)) return true;
  }
  for (const point of normalizeOpenRing(exterior, epsilon)) {
    if (pointInScreenRing(point, region, epsilon) !== "outside") return true;
  }
  return false;
}

export function screenPointsBounds(
  points: readonly ScreenPoint[],
): ScreenBounds {
  if (points.length === 0) {
    throw new RangeError("Cannot derive screen bounds from an empty point set.");
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [index, point] of points.entries()) {
    assertFiniteScreenPoint(point, `Screen bounds point ${index}`);
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, maxX, maxY };
}

function minimumLassoIssue(
  points: readonly ScreenPoint[],
  minimumDistinctPoints: number,
  minimumArea: number,
): SelectionRegionRejection | undefined {
  if (points.length < minimumDistinctPoints) {
    return {
      code: "SELECTION_REGION_LASSO_TOO_FEW_POINTS",
      message: `Lasso requires at least ${minimumDistinctPoints} distinct screen points.`,
    };
  }
  if (Math.abs(signedScreenRingArea(points)) < minimumArea) {
    return {
      code: "SELECTION_REGION_TOO_SMALL",
      message: `Lasso area must be at least ${minimumArea} CSS px².`,
    };
  }
  return undefined;
}

function selfIntersectionIssue(): SelectionRegionRejection {
  return {
    code: "SELECTION_REGION_LASSO_SELF_INTERSECTS",
    message: "Lasso must be a simple ring without repeated, crossing, touching or overlapping non-adjacent edges.",
  };
}

function invalidLasso(
  points: readonly ScreenPoint[],
  rejection: SelectionRegionRejection,
): InvalidScreenLasso {
  return {
    valid: false,
    points: copyScreenPoints(points),
    rejection,
  };
}

function normalizeOpenRing(
  points: readonly ScreenPoint[],
  epsilon: number,
): ScreenPoint[] {
  const normalized = [
    ...removeConsecutiveDuplicateScreenPoints(points, epsilon),
  ];
  if (
    normalized.length > 1 &&
    sameScreenPoint(normalized[0]!, normalized.at(-1)!, epsilon)
  ) {
    normalized.pop();
  }
  return normalized;
}

function simplifyScreenPathRecursive(
  points: readonly ScreenPoint[],
  tolerance: number,
): ScreenPoint[] {
  if (points.length <= 2) return copyScreenPoints(points);
  const first = points[0]!;
  const last = points.at(-1)!;
  let maximumDistance = -1;
  let splitIndex = -1;

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = distanceToScreenSegment(points[index]!, first, last);
    if (distance > maximumDistance) {
      maximumDistance = distance;
      splitIndex = index;
    }
  }

  if (maximumDistance <= tolerance || splitIndex < 1) {
    return [{ ...first }, { ...last }];
  }

  const left = simplifyScreenPathRecursive(
    points.slice(0, splitIndex + 1),
    tolerance,
  );
  const right = simplifyScreenPathRecursive(
    points.slice(splitIndex),
    tolerance,
  );
  return [...left.slice(0, -1), ...right];
}

function distanceToScreenSegment(
  point: ScreenPoint,
  start: ScreenPoint,
  end: ScreenPoint,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.sqrt(screenDistanceSquared(point, start));
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );
  const projected = {
    x: start.x + projection * dx,
    y: start.y + projection * dy,
  };
  return Math.sqrt(screenDistanceSquared(point, projected));
}

function ringsBoundariesIntersect(
  left: readonly ScreenPoint[],
  right: readonly ScreenPoint[],
  epsilon: number,
): boolean {
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const leftStart = left[leftIndex]!;
    const leftEnd = left[(leftIndex + 1) % left.length]!;
    if (lineSegmentIntersectsRing(leftStart, leftEnd, right, epsilon)) {
      return true;
    }
  }
  return false;
}

function lineSegmentIntersectsRing(
  start: ScreenPoint,
  end: ScreenPoint,
  ring: readonly ScreenPoint[],
  epsilon: number,
): boolean {
  for (let index = 0; index < ring.length; index += 1) {
    const ringStart = ring[index]!;
    const ringEnd = ring[(index + 1) % ring.length]!;
    if (screenSegmentsIntersect(start, end, ringStart, ringEnd, epsilon)) {
      return true;
    }
  }
  return false;
}

function segmentsAreAdjacent(
  leftIndex: number,
  rightIndex: number,
  segmentCount: number,
): boolean {
  return (
    rightIndex === leftIndex + 1 ||
    (leftIndex === 0 && rightIndex === segmentCount - 1)
  );
}

function sameScreenPoint(
  left: ScreenPoint,
  right: ScreenPoint,
  epsilon: number,
): boolean {
  return (
    Math.abs(left.x - right.x) <= epsilon &&
    Math.abs(left.y - right.y) <= epsilon
  );
}

function signWithEpsilon(value: number, epsilon: number): -1 | 0 | 1 {
  if (Math.abs(value) <= epsilon) return 0;
  return value < 0 ? -1 : 1;
}

function assertFiniteScreenBounds(bounds: ScreenBounds): void {
  for (const [name, value] of Object.entries(bounds)) {
    if (!Number.isFinite(value)) {
      throw new RangeError(`Screen bounds ${name} must be finite.`);
    }
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number.`);
  }
}

function copyScreenPoints(points: readonly ScreenPoint[]): ScreenPoint[] {
  return points.map((point) => ({ ...point }));
}
