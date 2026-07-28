import type { Position } from "@plotlibre/core";

export const EARTH_RADIUS_METERS = 6_378_137;
const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export interface CoordinateModeOptions {
  readonly maximumLocalExtentMeters?: number;
  readonly maximumLocalLatitude?: number;
}

export interface CoordinateModeAnalysis {
  readonly mode: "local" | "geodesic";
  readonly crossesAntimeridian: boolean;
  readonly maximumAbsoluteLatitude: number;
  readonly extentMeters: number;
  readonly reasons: readonly string[];
}

export function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) {
    throw new RangeError("Longitude must be finite.");
  }
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

export function shortestLongitudeDelta(
  fromLongitude: number,
  toLongitude: number,
): number {
  return normalizeLongitude(toLongitude - fromLongitude);
}

export function crossesAntimeridian(positions: readonly Position[]): boolean {
  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1]!;
    const current = positions[index]!;
    assertPosition(previous, `positions[${index - 1}]`);
    assertPosition(current, `positions[${index}]`);
    if (Math.abs(current[0] - previous[0]) > 180) return true;
  }
  return false;
}

export function unwrapLongitudes(
  positions: readonly Position[],
): readonly Position[] {
  if (positions.length === 0) return [];
  assertPosition(positions[0]!, "positions[0]");
  const result: Position[] = [[positions[0]![0], positions[0]![1]]];

  for (let index = 1; index < positions.length; index += 1) {
    const previousOriginal = positions[index - 1]!;
    const current = positions[index]!;
    assertPosition(current, `positions[${index}]`);
    const previousUnwrapped = result[index - 1]!;
    result.push([
      previousUnwrapped[0] + shortestLongitudeDelta(previousOriginal[0], current[0]),
      current[1],
    ]);
  }
  return result;
}

export function haversineDistance(
  start: Position,
  end: Position,
): number {
  assertPosition(start, "start");
  assertPosition(end, "end");
  const startLatitude = start[1] * DEGREES_TO_RADIANS;
  const endLatitude = end[1] * DEGREES_TO_RADIANS;
  const latitudeDelta = (end[1] - start[1]) * DEGREES_TO_RADIANS;
  const longitudeDelta =
    shortestLongitudeDelta(start[0], end[0]) * DEGREES_TO_RADIANS;

  const sineLatitude = Math.sin(latitudeDelta / 2);
  const sineLongitude = Math.sin(longitudeDelta / 2);
  const a =
    sineLatitude * sineLatitude +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      sineLongitude *
      sineLongitude;
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_METERS * centralAngle;
}

export function initialBearingDegrees(
  start: Position,
  end: Position,
): number {
  assertPosition(start, "start");
  assertPosition(end, "end");
  if (start[0] === end[0] && start[1] === end[1]) {
    throw new RangeError("Initial bearing requires two distinct positions.");
  }

  const startLatitude = start[1] * DEGREES_TO_RADIANS;
  const endLatitude = end[1] * DEGREES_TO_RADIANS;
  const longitudeDelta =
    shortestLongitudeDelta(start[0], end[0]) * DEGREES_TO_RADIANS;
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta);
  return ((Math.atan2(y, x) * RADIANS_TO_DEGREES) % 360 + 360) % 360;
}

export function destinationPoint(
  start: Position,
  bearingDegrees: number,
  distanceMeters: number,
): Position {
  assertPosition(start, "start");
  if (!Number.isFinite(bearingDegrees)) {
    throw new RangeError("Bearing must be finite.");
  }
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw new RangeError("Distance must be finite and non-negative.");
  }

  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearing = bearingDegrees * DEGREES_TO_RADIANS;
  const startLatitude = start[1] * DEGREES_TO_RADIANS;
  const startLongitude = start[0] * DEGREES_TO_RADIANS;
  const endLatitude = Math.asin(
    Math.sin(startLatitude) * Math.cos(angularDistance) +
      Math.cos(startLatitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const endLongitude =
    startLongitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(startLatitude),
      Math.cos(angularDistance) - Math.sin(startLatitude) * Math.sin(endLatitude),
    );

  return [
    normalizeLongitude(endLongitude * RADIANS_TO_DEGREES),
    endLatitude * RADIANS_TO_DEGREES,
  ];
}

export function geodesicPath(
  start: Position,
  end: Position,
  segments = 32,
): readonly Position[] {
  if (!Number.isInteger(segments) || segments < 1 || segments > 10_000) {
    throw new RangeError("Geodesic segment count must be an integer between 1 and 10000.");
  }
  const totalDistance = haversineDistance(start, end);
  if (totalDistance === 0) return [[start[0], start[1]]];
  const bearing = initialBearingDegrees(start, end);
  const points: Position[] = [];
  for (let index = 0; index <= segments; index += 1) {
    points.push(destinationPoint(start, bearing, totalDistance * (index / segments)));
  }
  points[0] = [start[0], start[1]];
  points[points.length - 1] = [end[0], end[1]];
  return points;
}

export function analyzeCoordinateMode(
  positions: readonly Position[],
  options: CoordinateModeOptions = {},
): CoordinateModeAnalysis {
  if (positions.length === 0) {
    throw new RangeError("Coordinate-mode analysis requires at least one position.");
  }
  const maximumLocalExtentMeters = options.maximumLocalExtentMeters ?? 250_000;
  const maximumLocalLatitude = options.maximumLocalLatitude ?? 80;
  if (!Number.isFinite(maximumLocalExtentMeters) || maximumLocalExtentMeters <= 0) {
    throw new RangeError("maximumLocalExtentMeters must be positive and finite.");
  }
  if (
    !Number.isFinite(maximumLocalLatitude) ||
    maximumLocalLatitude <= 0 ||
    maximumLocalLatitude >= 90
  ) {
    throw new RangeError("maximumLocalLatitude must be between 0 and 90 degrees.");
  }

  const origin = positions[0]!;
  assertPosition(origin, "positions[0]");
  let extentMeters = 0;
  let maximumAbsoluteLatitude = Math.abs(origin[1]);
  for (let index = 1; index < positions.length; index += 1) {
    const position = positions[index]!;
    assertPosition(position, `positions[${index}]`);
    extentMeters = Math.max(extentMeters, haversineDistance(origin, position));
    maximumAbsoluteLatitude = Math.max(maximumAbsoluteLatitude, Math.abs(position[1]));
  }

  const antimeridian = crossesAntimeridian(positions);
  const reasons: string[] = [];
  if (antimeridian) reasons.push("path crosses the antimeridian");
  if (maximumAbsoluteLatitude > maximumLocalLatitude) {
    reasons.push(`latitude exceeds ${maximumLocalLatitude} degrees`);
  }
  if (extentMeters > maximumLocalExtentMeters) {
    reasons.push(`extent exceeds ${maximumLocalExtentMeters} meters`);
  }

  return {
    mode: reasons.length === 0 ? "local" : "geodesic",
    crossesAntimeridian: antimeridian,
    maximumAbsoluteLatitude,
    extentMeters,
    reasons,
  };
}

function assertPosition(position: Position, name: string): void {
  if (
    !Number.isFinite(position[0]) ||
    !Number.isFinite(position[1]) ||
    position[1] < -90 ||
    position[1] > 90
  ) {
    throw new RangeError(`${name} must be a finite WGS84 longitude/latitude position.`);
  }
}
