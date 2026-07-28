import type { Position } from "@plotlibre/core";
import type { Vec2 } from "./vector.js";

const EARTH_RADIUS_METERS = 6_378_137;
const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export interface LocalProjection {
  readonly origin: Position;
  project(position: Position): Vec2;
  unproject(point: Vec2): Position;
}

export function createLocalProjection(origin: Position): LocalProjection {
  const [originLongitude, originLatitude] = origin;
  const latitudeScale = EARTH_RADIUS_METERS * DEGREES_TO_RADIANS;
  const longitudeScale =
    EARTH_RADIUS_METERS *
    Math.cos(originLatitude * DEGREES_TO_RADIANS) *
    DEGREES_TO_RADIANS;

  if (Math.abs(longitudeScale) < 1e-9) {
    throw new RangeError(
      "Local projection is unstable at the geographic poles.",
    );
  }

  return {
    origin,
    project([longitude, latitude]) {
      return {
        x: (longitude - originLongitude) * longitudeScale,
        y: (latitude - originLatitude) * latitudeScale,
      };
    },
    unproject({ x, y }) {
      return [
        originLongitude + x / longitudeScale,
        originLatitude + y / latitudeScale,
      ];
    },
  };
}

export function metersBetween(start: Position, end: Position): number {
  const projection = createLocalProjection(start);
  const projected = projection.project(end);
  return Math.hypot(projected.x, projected.y);
}

export function radiansToDegrees(radians: number): number {
  return radians * RADIANS_TO_DEGREES;
}
