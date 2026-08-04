import type { PlotFeature, Position } from "@plotlibre/core";
import { createPlotFeature } from "@plotlibre/core";
import {
  createLocalProjection,
  normalizeLongitude,
  type Vec2,
} from "@plotlibre/geometry";

const DEFAULT_MAXIMUM_LOCAL_EXTENT_METERS = 250_000;
const DEFAULT_MAXIMUM_LOCAL_LATITUDE = 80;
const DEFAULT_DEGENERATE_EPSILON_METERS = 1e-9;
const LONGITUDE_INTERVAL_EPSILON_DEGREES = 1e-12;

export type SelectionTransformErrorCode =
  | "SELECTION_TRANSFORM_SELECTION_EMPTY"
  | "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED"
  | "SELECTION_TRANSFORM_FRAME_DEGENERATE"
  | "SELECTION_TRANSFORM_POINTER_INVALID"
  | "SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL"
  | "SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE";

export class SelectionTransformError extends Error {
  public readonly code: SelectionTransformErrorCode;
  public readonly featureIds: readonly string[];
  public readonly cause: unknown;

  public constructor(
    code: SelectionTransformErrorCode,
    message: string,
    options: {
      readonly featureIds?: readonly string[];
      readonly cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "SelectionTransformError";
    this.code = code;
    this.featureIds = Object.freeze([...(options.featureIds ?? [])]);
    this.cause = options.cause;
  }
}

export interface SelectionTransformFrameOptions {
  readonly maximumLocalExtentMeters?: number;
  readonly maximumLocalLatitude?: number;
  readonly degenerateEpsilonMeters?: number;
}

export interface SelectionTransformBoundsMeters {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface SelectionTransformFrame {
  readonly origin: Position;
  readonly pivotMeters: Readonly<Vec2>;
  readonly pivot: Position;
  readonly boundsMeters: SelectionTransformBoundsMeters;
}

/**
 * Derives one order-independent local-metre frame for a complete selection.
 *
 * The geographic seed uses the normalized longitude interval midpoint and the
 * latitude range midpoint. The canonical pivot is the local authored-control
 * AABB centre, never a rendered centroid or screen-space bounds centre.
 */
export function deriveSelectionTransformFrame(
  features: readonly PlotFeature[],
  options: SelectionTransformFrameOptions = {},
): SelectionTransformFrame {
  if (features.length === 0) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_SELECTION_EMPTY",
      "Selection transform requires at least one feature.",
    );
  }

  const policy = validateFrameOptions(options);
  const featureIds = features.map((feature) => feature.id);
  const positions = features.flatMap((feature) => feature.controlPoints);
  if (positions.length === 0) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_FRAME_DEGENERATE",
      "Selection transform requires at least one authored control point.",
      { featureIds },
    );
  }

  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  for (const [index, position] of positions.entries()) {
    const [longitude, latitude] = position;
    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new SelectionTransformError(
        "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
        `Authored control ${index} must be a finite WGS84 position.`,
        { featureIds },
      );
    }

    const normalizedLongitude = normalizeLongitude(longitude);
    minLongitude = Math.min(minLongitude, normalizedLongitude);
    maxLongitude = Math.max(maxLongitude, normalizedLongitude);
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  }

  const longitudeSpan = maxLongitude - minLongitude;
  if (longitudeSpan >= 180 - LONGITUDE_INTERVAL_EPSILON_DEGREES) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
      "Selection controls do not form one unambiguous non-antimeridian longitude interval.",
      { featureIds },
    );
  }

  const maximumAbsoluteLatitude = Math.max(
    Math.abs(minLatitude),
    Math.abs(maxLatitude),
  );
  if (maximumAbsoluteLatitude > policy.maximumLocalLatitude) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
      `Selection latitude exceeds the local transform limit of ${policy.maximumLocalLatitude} degrees.`,
      { featureIds },
    );
  }

  const origin = Object.freeze([
    normalizeLongitude((minLongitude + maxLongitude) / 2),
    (minLatitude + maxLatitude) / 2,
  ]) as Position;

  let projection: ReturnType<typeof createLocalProjection>;
  try {
    projection = createLocalProjection(origin);
  } catch (error) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
      "Selection local projection could not be created.",
      { featureIds, cause: error },
    );
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  try {
    for (const position of positions) {
      const point = projection.project(position);
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  } catch (error) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
      "Selection authored controls could not be projected into one local frame.",
      { featureIds, cause: error },
    );
  }

  const widthMeters = maxX - minX;
  const heightMeters = maxY - minY;
  const extentMeters = Math.hypot(widthMeters, heightMeters);
  if (
    !Number.isFinite(extentMeters) ||
    extentMeters > policy.maximumLocalExtentMeters
  ) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
      `Selection extent exceeds the local transform limit of ${policy.maximumLocalExtentMeters} metres.`,
      { featureIds },
    );
  }

  if (
    widthMeters <= policy.degenerateEpsilonMeters &&
    heightMeters <= policy.degenerateEpsilonMeters
  ) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_FRAME_DEGENERATE",
      "Selection transform frame is degenerate because every authored control is coincident.",
      { featureIds },
    );
  }

  const pivotMeters = Object.freeze({
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  });
  const pivot = validateUnprojectedPosition(
    projection.unproject(pivotMeters),
    featureIds,
  );

  return Object.freeze({
    origin,
    pivotMeters,
    pivot: Object.freeze([pivot[0], pivot[1]]) as Position,
    boundsMeters: Object.freeze({ minX, minY, maxX, maxY }),
  });
}

/** Applies one positive-clockwise local rotation to every authored control. */
export function rotatePlotFeaturesLocal(
  features: readonly PlotFeature[],
  frame: SelectionTransformFrame,
  clockwiseRadians: number,
): readonly PlotFeature[] {
  if (!Number.isFinite(clockwiseRadians)) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_POINTER_INVALID",
      "Clockwise rotation angle must be finite.",
      { featureIds: features.map((feature) => feature.id) },
    );
  }

  const cosine = Math.cos(clockwiseRadians);
  const sine = Math.sin(clockwiseRadians);
  return transformPlotFeaturesLocal(features, frame, ({ x, y }) => {
    const deltaX = x - frame.pivotMeters.x;
    const deltaY = y - frame.pivotMeters.y;
    return {
      x: frame.pivotMeters.x + cosine * deltaX + sine * deltaY,
      y: frame.pivotMeters.y - sine * deltaX + cosine * deltaY,
    };
  });
}

/** Applies one positive uniform local scale to every authored control. */
export function scalePlotFeaturesLocal(
  features: readonly PlotFeature[],
  frame: SelectionTransformFrame,
  scaleFactor: number,
): readonly PlotFeature[] {
  if (!Number.isFinite(scaleFactor) || scaleFactor < 0.01 || scaleFactor > 100) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE",
      "Selection scale factor must be finite and within [0.01, 100].",
      { featureIds: features.map((feature) => feature.id) },
    );
  }

  return transformPlotFeaturesLocal(features, frame, ({ x, y }) => ({
    x: frame.pivotMeters.x + scaleFactor * (x - frame.pivotMeters.x),
    y: frame.pivotMeters.y + scaleFactor * (y - frame.pivotMeters.y),
  }));
}

/** Returns the signed clockwise angle from one non-zero local vector to another. */
export function signedClockwiseAngleDelta(
  previous: Readonly<Vec2>,
  current: Readonly<Vec2>,
  minimumRadiusMeters = DEFAULT_DEGENERATE_EPSILON_METERS,
): number {
  if (
    !Number.isFinite(previous.x) ||
    !Number.isFinite(previous.y) ||
    !Number.isFinite(current.x) ||
    !Number.isFinite(current.y) ||
    !Number.isFinite(minimumRadiusMeters) ||
    minimumRadiusMeters <= 0
  ) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_POINTER_INVALID",
      "Selection transform pointer vectors and minimum radius must be finite.",
    );
  }

  if (
    Math.hypot(previous.x, previous.y) <= minimumRadiusMeters ||
    Math.hypot(current.x, current.y) <= minimumRadiusMeters
  ) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL",
      "Selection transform pointer radius is too small.",
    );
  }

  const cross = previous.x * current.y - previous.y * current.x;
  const dot = previous.x * current.x + previous.y * current.y;
  return -Math.atan2(cross, dot);
}

/** Normalizes a finite angle to (-π, π], for presentation only. */
export function normalizeClockwiseRadians(radians: number): number {
  if (!Number.isFinite(radians)) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_POINTER_INVALID",
      "Selection transform angle must be finite.",
    );
  }
  const normalized = ((radians + Math.PI) % (2 * Math.PI) + 2 * Math.PI) %
    (2 * Math.PI) - Math.PI;
  return normalized <= -Math.PI ? Math.PI : normalized;
}

function transformPlotFeaturesLocal(
  features: readonly PlotFeature[],
  frame: SelectionTransformFrame,
  transform: (point: Readonly<Vec2>) => Vec2,
): readonly PlotFeature[] {
  validateFrame(frame, features.map((feature) => feature.id));
  const projection = createLocalProjection(frame.origin);

  return Object.freeze(
    features.map((feature) =>
      createPlotFeature({
        ...feature,
        controlPoints: feature.controlPoints.map((position) => {
          const local = projection.project(position);
          const transformed = transform(local);
          if (!Number.isFinite(transformed.x) || !Number.isFinite(transformed.y)) {
            throw new SelectionTransformError(
              "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
              `Selection transform produced a non-finite local coordinate for "${feature.id}".`,
              { featureIds: [feature.id] },
            );
          }
          return validateUnprojectedPosition(
            projection.unproject(transformed),
            [feature.id],
          );
        }),
        revision: feature.revision + 1,
      }),
    ),
  );
}

function validateFrameOptions(options: SelectionTransformFrameOptions): {
  readonly maximumLocalExtentMeters: number;
  readonly maximumLocalLatitude: number;
  readonly degenerateEpsilonMeters: number;
} {
  const maximumLocalExtentMeters =
    options.maximumLocalExtentMeters ?? DEFAULT_MAXIMUM_LOCAL_EXTENT_METERS;
  const maximumLocalLatitude =
    options.maximumLocalLatitude ?? DEFAULT_MAXIMUM_LOCAL_LATITUDE;
  const degenerateEpsilonMeters =
    options.degenerateEpsilonMeters ?? DEFAULT_DEGENERATE_EPSILON_METERS;

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
  if (!Number.isFinite(degenerateEpsilonMeters) || degenerateEpsilonMeters <= 0) {
    throw new RangeError("degenerateEpsilonMeters must be positive and finite.");
  }

  return {
    maximumLocalExtentMeters,
    maximumLocalLatitude,
    degenerateEpsilonMeters,
  };
}

function validateFrame(
  frame: SelectionTransformFrame,
  featureIds: readonly string[],
): void {
  const values = [
    frame.origin[0],
    frame.origin[1],
    frame.pivot[0],
    frame.pivot[1],
    frame.pivotMeters.x,
    frame.pivotMeters.y,
    frame.boundsMeters.minX,
    frame.boundsMeters.minY,
    frame.boundsMeters.maxX,
    frame.boundsMeters.maxY,
  ];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    frame.origin[1] < -90 ||
    frame.origin[1] > 90 ||
    frame.pivot[1] < -90 ||
    frame.pivot[1] > 90 ||
    frame.boundsMeters.maxX < frame.boundsMeters.minX ||
    frame.boundsMeters.maxY < frame.boundsMeters.minY
  ) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
      "Selection transform frame must contain finite ordered local bounds and valid WGS84 positions.",
      { featureIds },
    );
  }
}

function validateUnprojectedPosition(
  position: Position,
  featureIds: readonly string[],
): Position {
  if (
    !Number.isFinite(position[0]) ||
    !Number.isFinite(position[1]) ||
    position[1] < -90 ||
    position[1] > 90
  ) {
    throw new SelectionTransformError(
      "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED",
      "Selection transform produced a position outside valid WGS84 bounds.",
      { featureIds },
    );
  }
  return [position[0], position[1]];
}
