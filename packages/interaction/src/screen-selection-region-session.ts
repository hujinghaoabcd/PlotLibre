import {
  appendLassoSample,
  isScreenDragActive,
  normalizeScreenBounds,
  screenBoundsHasPositiveArea,
  screenBoundsToRing,
  screenPointsBounds,
  validateAndSimplifyScreenLasso,
  type ScreenBounds,
  type ScreenPoint,
  type SelectionRegionRejection,
} from "./screen-region-selection.js";
import type { SelectionIntent } from "./selection-controller.js";

export type SelectionRegionKind = "box" | "lasso";
export type SelectionRegionStatus = "armed" | "active" | "rejected";

export interface SelectionRegionSnapshot {
  readonly kind: SelectionRegionKind;
  readonly status: SelectionRegionStatus;
  readonly intent: SelectionIntent;
  readonly points: readonly ScreenPoint[];
  readonly bounds?: ScreenBounds;
  readonly rejection?: SelectionRegionRejection;
  readonly revision: number;
}

export interface CompletedSelectionRegion {
  readonly completed: true;
  readonly kind: SelectionRegionKind;
  readonly intent: SelectionIntent;
  readonly points: readonly ScreenPoint[];
  readonly ring: readonly ScreenPoint[];
  readonly bounds: ScreenBounds;
}

export interface NoopSelectionRegionCompletion {
  readonly completed: false;
  readonly noop: true;
}

export interface RejectedSelectionRegionCompletion {
  readonly completed: false;
  readonly noop: false;
  readonly rejection: SelectionRegionRejection;
}

export type SelectionRegionCompletion =
  | CompletedSelectionRegion
  | NoopSelectionRegionCompletion
  | RejectedSelectionRegionCompletion;

export interface ScreenSelectionRegionSessionOptions {
  readonly boxActivationThreshold?: number;
  readonly lassoSampleSpacing?: number;
}

/**
 * Pure CSS-pixel region capture state.
 *
 * The session never touches MapLibre, Store, History or SelectionController.
 * Adapters own pointer capture, rendering, candidate resolution and selection
 * application.
 */
export class ScreenSelectionRegionSession {
  readonly #kind: SelectionRegionKind;
  readonly #intent: SelectionIntent;
  readonly #boxActivationThreshold: number;
  readonly #lassoSampleSpacing: number;
  #status: SelectionRegionStatus = "armed";
  #points: ScreenPoint[] = [];
  #rejection: SelectionRegionRejection | undefined;
  #revision = 0;

  public constructor(
    kind: SelectionRegionKind,
    intent: SelectionIntent,
    options: ScreenSelectionRegionSessionOptions = {},
  ) {
    this.#kind = kind;
    this.#intent = intent;
    this.#boxActivationThreshold = options.boxActivationThreshold ?? 4;
    this.#lassoSampleSpacing = options.lassoSampleSpacing ?? 2;
    if (
      !Number.isFinite(this.#boxActivationThreshold) ||
      this.#boxActivationThreshold < 0
    ) {
      throw new RangeError("Box activation threshold must be non-negative.");
    }
    if (
      !Number.isFinite(this.#lassoSampleSpacing) ||
      this.#lassoSampleSpacing < 0
    ) {
      throw new RangeError("Lasso sample spacing must be non-negative.");
    }
  }

  public snapshot(): SelectionRegionSnapshot {
    const points = Object.freeze(this.#points.map((point) => ({ ...point })));
    const bounds = points.length > 0 ? screenPointsBounds(points) : undefined;
    return Object.freeze({
      kind: this.#kind,
      status: this.#status,
      intent: this.#intent,
      points,
      ...(bounds !== undefined ? { bounds: Object.freeze({ ...bounds }) } : {}),
      ...(this.#rejection !== undefined
        ? { rejection: Object.freeze({ ...this.#rejection }) }
        : {}),
      revision: this.#revision,
    });
  }

  public get kind(): SelectionRegionKind {
    return this.#kind;
  }

  public get intent(): SelectionIntent {
    return this.#intent;
  }

  public get status(): SelectionRegionStatus {
    return this.#status;
  }

  public pointerDown(point: ScreenPoint): SelectionRegionSnapshot {
    this.#points = [{ ...point }];
    this.#rejection = undefined;
    this.#status = this.#kind === "lasso" ? "active" : "armed";
    this.#revision += 1;
    return this.snapshot();
  }

  public pointerMove(point: ScreenPoint): SelectionRegionSnapshot {
    if (this.#points.length === 0) return this.snapshot();
    if (this.#kind === "box") {
      const start = this.#points[0]!;
      this.#points = [{ ...start }, { ...point }];
      this.#status = isScreenDragActive(
        start,
        point,
        this.#boxActivationThreshold,
      )
        ? "active"
        : "armed";
    } else {
      this.#points = [
        ...appendLassoSample(
          this.#points,
          point,
          this.#lassoSampleSpacing,
        ),
      ];
      this.#status = "active";
    }
    this.#rejection = undefined;
    this.#revision += 1;
    return this.snapshot();
  }

  public pointerUp(point: ScreenPoint): SelectionRegionCompletion {
    if (this.#points.length === 0) {
      return Object.freeze({ completed: false, noop: true });
    }
    return this.#kind === "box"
      ? this.#completeBox(point)
      : this.#completeLasso(point);
  }

  public reset(): SelectionRegionSnapshot {
    this.#points = [];
    this.#rejection = undefined;
    this.#status = "armed";
    this.#revision += 1;
    return this.snapshot();
  }

  #completeBox(point: ScreenPoint): SelectionRegionCompletion {
    const start = this.#points[0]!;
    if (
      !isScreenDragActive(start, point, this.#boxActivationThreshold)
    ) {
      this.reset();
      return Object.freeze({ completed: false, noop: true });
    }
    const bounds = normalizeScreenBounds(start, point);
    if (!screenBoundsHasPositiveArea(bounds)) {
      this.reset();
      return Object.freeze({ completed: false, noop: true });
    }
    const ring = screenBoundsToRing(bounds);
    const completion: CompletedSelectionRegion = Object.freeze({
      completed: true,
      kind: "box",
      intent: this.#intent,
      points: Object.freeze([{ ...start }, { ...point }]),
      ring: Object.freeze(ring.map((candidate) => ({ ...candidate }))),
      bounds: Object.freeze({ ...bounds }),
    });
    this.reset();
    return completion;
  }

  #completeLasso(point: ScreenPoint): SelectionRegionCompletion {
    const points = [
      ...appendLassoSample(this.#points, point, Number.EPSILON),
    ];
    const result = validateAndSimplifyScreenLasso(points);
    if (!result.valid) {
      this.#points = result.points.map((candidate) => ({ ...candidate }));
      this.#rejection = result.rejection;
      this.#status = "rejected";
      this.#revision += 1;
      return Object.freeze({
        completed: false,
        noop: false,
        rejection: Object.freeze({ ...result.rejection }),
      });
    }

    const completion: CompletedSelectionRegion = Object.freeze({
      completed: true,
      kind: "lasso",
      intent: this.#intent,
      points: Object.freeze(result.points.map((candidate) => ({ ...candidate }))),
      ring: Object.freeze(result.ring.map((candidate) => ({ ...candidate }))),
      bounds: Object.freeze({ ...result.bounds }),
    });
    this.reset();
    return completion;
  }
}
