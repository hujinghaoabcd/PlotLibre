import {
  clonePlotFeature,
  type PlotFeature,
  type PlotRegistry,
} from "@plotlibre/core";
import type { Vec2 } from "@plotlibre/geometry";
import {
  deriveSelectionTransformFrame,
  normalizeClockwiseRadians,
  rotatePlotFeaturesLocal,
  scalePlotFeaturesLocal,
  SelectionTransformError,
  signedClockwiseAngleDelta,
  type SelectionTransformFrame,
  type SelectionTransformFrameOptions,
} from "./selection-local-transform.js";

const RADIANS_TO_DEGREES = 180 / Math.PI;
const DEFAULT_MINIMUM_POINTER_RADIUS_METERS = 1e-9;
const EFFECTIVE_ANGLE_EPSILON_RADIANS = 1e-9;
const EFFECTIVE_SCALE_EPSILON = 1e-9;
const EFFECTIVE_COORDINATE_EPSILON_DEGREES = 1e-12;

export type SelectionTransformKind = "rotate" | "scale";
export type SelectionTransformStatus = "armed" | "active" | "rejected";

export type SelectionTransformRejectionCode =
  | "SELECTION_TRANSFORM_SELECTION_EMPTY"
  | "SELECTION_TRANSFORM_FEATURE_MISSING"
  | "SELECTION_TRANSFORM_COORDINATE_FRAME_UNSUPPORTED"
  | "SELECTION_TRANSFORM_FRAME_DEGENERATE"
  | "SELECTION_TRANSFORM_POINTER_INVALID"
  | "SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL"
  | "SELECTION_TRANSFORM_SCALE_OUT_OF_RANGE"
  | "SELECTION_TRANSFORM_CANDIDATE_GENERATION_FAILED"
  | "SELECTION_TRANSFORM_TRANSACTION_INVALID";

export interface SelectionTransformRejection {
  readonly code: SelectionTransformRejectionCode;
  readonly message: string;
  readonly featureIds: readonly string[];
  readonly cause?: unknown;
}

export interface SelectionTransformSnapshot {
  readonly kind: SelectionTransformKind;
  readonly status: SelectionTransformStatus;
  readonly selectedIds: readonly string[];
  readonly frame: SelectionTransformFrame;
  readonly clockwiseRadians?: number;
  readonly clockwiseDegrees?: number;
  readonly scaleFactor?: number;
  readonly rejection?: SelectionTransformRejection;
  readonly revision: number;
}

export interface CompletedSelectionTransform {
  readonly completed: true;
  readonly kind: SelectionTransformKind;
  readonly originals: readonly PlotFeature[];
  readonly transformed: readonly PlotFeature[];
  readonly clockwiseRadians?: number;
  readonly scaleFactor?: number;
}

export interface NoopSelectionTransformCompletion {
  readonly completed: false;
  readonly noop: true;
}

export interface RejectedSelectionTransformCompletion {
  readonly completed: false;
  readonly noop: false;
  readonly rejection: SelectionTransformRejection;
}

export type SelectionTransformCompletion =
  | CompletedSelectionTransform
  | NoopSelectionTransformCompletion
  | RejectedSelectionTransformCompletion;

export interface SelectionTransformSessionOptions {
  readonly frame?: SelectionTransformFrameOptions;
  readonly minimumPointerRadiusMeters?: number;
}

type RegistryPreflight = Pick<PlotRegistry, "canonicalize" | "generate">;

/**
 * Engine-independent shared-pivot rotation/scale state.
 *
 * Pointer inputs are already expressed in the fixed local-metre frame. The
 * session never touches MapLibre, DOM, Store, SelectionController or History.
 */
export class SelectionTransformSession {
  readonly #kind: SelectionTransformKind;
  readonly #registry: RegistryPreflight;
  readonly #originals: readonly PlotFeature[];
  readonly #frame: SelectionTransformFrame;
  readonly #minimumPointerRadiusMeters: number;
  #preview: readonly PlotFeature[];
  #status: SelectionTransformStatus = "armed";
  #startVector: Vec2 | undefined;
  #previousVector: Vec2 | undefined;
  #cumulativeClockwiseRadians = 0;
  #scaleFactor = 1;
  #rejection: SelectionTransformRejection | undefined;
  #revision = 0;

  public constructor(
    kind: SelectionTransformKind,
    features: readonly PlotFeature[],
    registry: RegistryPreflight,
    options: SelectionTransformSessionOptions = {},
  ) {
    this.#kind = kind;
    this.#registry = registry;
    this.#originals = freezeFeatures(features);
    this.#preview = freezeFeatures(features);
    this.#frame = deriveSelectionTransformFrame(features, options.frame);
    this.#minimumPointerRadiusMeters =
      options.minimumPointerRadiusMeters ?? DEFAULT_MINIMUM_POINTER_RADIUS_METERS;
    if (
      !Number.isFinite(this.#minimumPointerRadiusMeters) ||
      this.#minimumPointerRadiusMeters <= 0
    ) {
      throw new RangeError(
        "minimumPointerRadiusMeters must be positive and finite.",
      );
    }
  }

  public get kind(): SelectionTransformKind {
    return this.#kind;
  }

  public get status(): SelectionTransformStatus {
    return this.#status;
  }

  public get frame(): SelectionTransformFrame {
    return this.#frame;
  }

  public snapshot(): SelectionTransformSnapshot {
    const selectedIds = Object.freeze(
      this.#originals.map((feature) => feature.id),
    );
    const normalizedRadians = normalizeClockwiseRadians(
      this.#cumulativeClockwiseRadians,
    );
    return Object.freeze({
      kind: this.#kind,
      status: this.#status,
      selectedIds,
      frame: this.#frame,
      ...(this.#kind === "rotate"
        ? {
            clockwiseRadians: normalizedRadians,
            clockwiseDegrees: normalizedRadians * RADIANS_TO_DEGREES,
          }
        : { scaleFactor: this.#scaleFactor }),
      ...(this.#rejection === undefined
        ? {}
        : { rejection: cloneRejection(this.#rejection) }),
      revision: this.#revision,
    });
  }

  public previewFeatures(): readonly PlotFeature[] {
    return freezeFeatures(this.#preview);
  }

  public originalFeatures(): readonly PlotFeature[] {
    return freezeFeatures(this.#originals);
  }

  public pointerDown(point: Readonly<Vec2>): SelectionTransformSnapshot {
    const vector = this.#toPivotVector(point);
    const rejection = validatePointerVector(
      vector,
      this.#minimumPointerRadiusMeters,
    );
    if (rejection !== undefined) {
      this.#clearActivePointer();
      this.#rejection = rejection;
      this.#status = "rejected";
      this.#revision += 1;
      return this.snapshot();
    }

    this.#startVector = { ...vector };
    this.#previousVector = { ...vector };
    this.#cumulativeClockwiseRadians = 0;
    this.#scaleFactor = 1;
    this.#preview = freezeFeatures(this.#originals);
    this.#rejection = undefined;
    this.#status = "active";
    this.#revision += 1;
    return this.snapshot();
  }

  public pointerMove(point: Readonly<Vec2>): SelectionTransformSnapshot {
    if (this.#startVector === undefined || this.#previousVector === undefined) {
      return this.snapshot();
    }

    const currentVector = this.#toPivotVector(point);
    const pointerRejection = validatePointerVector(
      currentVector,
      this.#minimumPointerRadiusMeters,
    );
    if (pointerRejection !== undefined) {
      return this.#reject(pointerRejection);
    }

    try {
      let candidates: readonly PlotFeature[];
      if (this.#kind === "rotate") {
        const delta = signedClockwiseAngleDelta(
          this.#previousVector,
          currentVector,
          this.#minimumPointerRadiusMeters,
        );
        this.#cumulativeClockwiseRadians += delta;
        this.#previousVector = { ...currentVector };
        candidates = rotatePlotFeaturesLocal(
          this.#originals,
          this.#frame,
          this.#cumulativeClockwiseRadians,
        );
      } else {
        const startRadius = Math.hypot(
          this.#startVector.x,
          this.#startVector.y,
        );
        const currentRadius = Math.hypot(currentVector.x, currentVector.y);
        this.#scaleFactor = currentRadius / startRadius;
        this.#previousVector = { ...currentVector };
        candidates = scalePlotFeaturesLocal(
          this.#originals,
          this.#frame,
          this.#scaleFactor,
        );
      }

      this.#preview = this.#preflight(candidates);
      this.#rejection = undefined;
      this.#status = "active";
      this.#revision += 1;
      return this.snapshot();
    } catch (error) {
      return this.#reject(toRejection(error, this.#originals));
    }
  }

  public pointerUp(point: Readonly<Vec2>): SelectionTransformCompletion {
    if (this.#startVector === undefined) {
      return Object.freeze({ completed: false, noop: true });
    }

    this.pointerMove(point);
    if (this.#rejection !== undefined || this.#status === "rejected") {
      const rejection = cloneRejection(
        this.#rejection ?? createRejection(
          "SELECTION_TRANSFORM_POINTER_INVALID",
          "Selection transform completion was rejected.",
          this.#originals.map((feature) => feature.id),
        ),
      );
      this.#clearActivePointer();
      this.#status = "rejected";
      this.#revision += 1;
      return Object.freeze({
        completed: false,
        noop: false,
        rejection,
      });
    }

    const effective = this.#isEffective();
    if (!effective) {
      this.reset();
      return Object.freeze({ completed: false, noop: true });
    }

    const completion: CompletedSelectionTransform = Object.freeze({
      completed: true,
      kind: this.#kind,
      originals: freezeFeatures(this.#originals),
      transformed: freezeFeatures(this.#preview),
      ...(this.#kind === "rotate"
        ? { clockwiseRadians: this.#cumulativeClockwiseRadians }
        : { scaleFactor: this.#scaleFactor }),
    });
    this.reset();
    return completion;
  }

  public reset(): SelectionTransformSnapshot {
    this.#clearActivePointer();
    this.#preview = freezeFeatures(this.#originals);
    this.#cumulativeClockwiseRadians = 0;
    this.#scaleFactor = 1;
    this.#rejection = undefined;
    this.#status = "armed";
    this.#revision += 1;
    return this.snapshot();
  }

  #toPivotVector(point: Readonly<Vec2>): Vec2 {
    return {
      x: point.x - this.#frame.pivotMeters.x,
      y: point.y - this.#frame.pivotMeters.y,
    };
  }

  #preflight(candidates: readonly PlotFeature[]): readonly PlotFeature[] {
    const canonical: PlotFeature[] = [];
    for (const candidate of candidates) {
      try {
        const next = this.#registry.canonicalize(candidate);
        this.#registry.generate(next);
        canonical.push(clonePlotFeature(next));
      } catch (error) {
        throw createRejection(
          "SELECTION_TRANSFORM_CANDIDATE_GENERATION_FAILED",
          `Selection transform candidate "${candidate.id}" failed Registry preflight.`,
          [candidate.id],
          error,
        );
      }
    }
    return freezeFeatures(canonical);
  }

  #reject(rejection: SelectionTransformRejection): SelectionTransformSnapshot {
    this.#rejection = cloneRejection(rejection);
    this.#status = "rejected";
    this.#revision += 1;
    return this.snapshot();
  }

  #isEffective(): boolean {
    if (
      this.#kind === "rotate" &&
      Math.abs(this.#cumulativeClockwiseRadians) <=
        EFFECTIVE_ANGLE_EPSILON_RADIANS
    ) {
      return false;
    }
    if (
      this.#kind === "scale" &&
      Math.abs(this.#scaleFactor - 1) <= EFFECTIVE_SCALE_EPSILON
    ) {
      return false;
    }

    return this.#originals.some((original, featureIndex) => {
      const transformed = this.#preview[featureIndex];
      if (transformed === undefined) return true;
      if (original.controlPoints.length !== transformed.controlPoints.length) {
        return true;
      }
      return original.controlPoints.some((position, pointIndex) => {
        const next = transformed.controlPoints[pointIndex];
        return (
          next === undefined ||
          Math.abs(position[0] - next[0]) >
            EFFECTIVE_COORDINATE_EPSILON_DEGREES ||
          Math.abs(position[1] - next[1]) >
            EFFECTIVE_COORDINATE_EPSILON_DEGREES
        );
      });
    });
  }

  #clearActivePointer(): void {
    this.#startVector = undefined;
    this.#previousVector = undefined;
  }
}

function validatePointerVector(
  vector: Readonly<Vec2>,
  minimumRadiusMeters: number,
): SelectionTransformRejection | undefined {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
    return createRejection(
      "SELECTION_TRANSFORM_POINTER_INVALID",
      "Selection transform pointer must resolve to finite local coordinates.",
      [],
    );
  }
  if (Math.hypot(vector.x, vector.y) <= minimumRadiusMeters) {
    return createRejection(
      "SELECTION_TRANSFORM_POINTER_RADIUS_TOO_SMALL",
      "Selection transform pointer radius is too small.",
      [],
    );
  }
  return undefined;
}

function toRejection(
  error: unknown,
  features: readonly PlotFeature[],
): SelectionTransformRejection {
  if (isSelectionTransformRejection(error)) return cloneRejection(error);
  if (error instanceof SelectionTransformError) {
    return createRejection(
      error.code,
      error.message,
      error.featureIds.length > 0
        ? error.featureIds
        : features.map((feature) => feature.id),
      error.cause,
    );
  }
  return createRejection(
    "SELECTION_TRANSFORM_CANDIDATE_GENERATION_FAILED",
    error instanceof Error
      ? error.message
      : "Selection transform candidate generation failed.",
    features.map((feature) => feature.id),
    error,
  );
}

function createRejection(
  code: SelectionTransformRejectionCode,
  message: string,
  featureIds: readonly string[],
  cause?: unknown,
): SelectionTransformRejection {
  return Object.freeze({
    code,
    message,
    featureIds: Object.freeze([...featureIds]),
    ...(cause === undefined ? {} : { cause }),
  });
}

function cloneRejection(
  rejection: SelectionTransformRejection,
): SelectionTransformRejection {
  return createRejection(
    rejection.code,
    rejection.message,
    rejection.featureIds,
    rejection.cause,
  );
}

function isSelectionTransformRejection(
  value: unknown,
): value is SelectionTransformRejection {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SelectionTransformRejection>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    Array.isArray(candidate.featureIds)
  );
}

function freezeFeatures(
  features: readonly PlotFeature[],
): readonly PlotFeature[] {
  return Object.freeze(features.map(clonePlotFeature));
}
