import type { Position } from "@plotlibre/core";
import {
  EARTH_RADIUS_METERS,
  normalizeLongitude,
  shortestLongitudeDelta,
} from "./geodesic.js";
import type { Vec2 } from "./vector.js";

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export interface LocalProjection {
  readonly origin: Position;
  project(position: Position): Vec2;
  unproject(point: Vec2): Position;
}

export function createLocalProjection(origin: Position): LocalProjection {
  const [originLongitude, originLatitude] = origin;
  if (
    !Number.isFinite(originLongitude) ||
    !Number.isFinite(originLatitude) ||
    originLatitude < -90 ||
    originLatitude > 90
  ) {
    throw new RangeError("Local projection origin must be a finite WGS84 position.");
  }

  const latitudeScale = EARTH_RADIUS_METERS * DEGREES_TO_RADIANS;
  const longitudeScale =
    EARTH_RADIUS_METERS *
    Math.cos(originLatitude * DEGREES_TO_RADIANS) *
    DEGREES_TO_RADIANS;

  if (Math.abs(longitudeScale) < 1e-9) {
    throw new RangeError(
      "Local projection is unstable at the geographic poles; use geodesic mode.",
    );
  }

  return {
    origin,
    project([longitude, latitude]) {
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        throw new RangeError("Projected position must contain finite coordinates.");
      }
      return {
        x: shortestLongitudeDelta(originLongitude, longitude) * longitudeScale,
        y: (latitude - originLatitude) * latitudeScale,
      };
    },
    unproject({ x, y }) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new RangeError("Local point must contain finite coordinates.");
      }
      return [
        normalizeLongitude(originLongitude + x / longitudeScale),
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
  if (!Number.isFinite(radians)) {
    throw new RangeError("Radians must be finite.");
  }
  return radians * RADIANS_TO_DEGREES;
}
