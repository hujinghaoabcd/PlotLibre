import type { PlotFeatureInput, Position } from "@plotlibre/core";
import type {
  DrawSession,
  DrawSessionSnapshot,
  DrawSessionStatus,
  MultiPointDrawSessionOptions,
} from "./types.js";

/**
 * Engine-independent click-to-append session for symbols whose semantic model
 * requires three or more control points.
 *
 * Draft output is emitted only when the committed points plus pointer preview
 * satisfy minimumPoints, or when the Definition supplies a complete transient
 * control set derived from the committed controls. Derived draft controls are
 * never used for completion or persisted state.
 */
export class MultiPointDrawSession implements DrawSession {
  readonly #options: MultiPointDrawSessionOptions;
  readonly #minimumPoints: number;
  readonly #maximumPoints: number | undefined;
  readonly #completeAtMaximum: boolean;
  #status: DrawSessionStatus = "ready";
  #points: Position[] = [];
  #cursor: Position | undefined;
  #completed: PlotFeatureInput | undefined;

  public constructor(options: MultiPointDrawSessionOptions) {
    validateFeatureOptions(options);
    if (!Number.isInteger(options.minimumPoints) || options.minimumPoints < 3) {
      throw new RangeError(
        "MultiPointDrawSession minimumPoints must be an integer >= 3.",
      );
    }
    if (
      options.maximumPoints !== undefined &&
      (!Number.isInteger(options.maximumPoints) ||
        options.maximumPoints < options.minimumPoints)
    ) {
      throw new RangeError(
        "MultiPointDrawSession maximumPoints must be an integer >= minimumPoints.",
      );
    }

    this.#options = options;
    this.#minimumPoints = options.minimumPoints;
    this.#maximumPoints = options.maximumPoints;
    this.#completeAtMaximum = options.completeAtMaximum ?? true;
  }

  public get status(): DrawSessionStatus {
    return this.#status;
  }

  public snapshot(): DrawSessionSnapshot {
    if (this.#status === "completed" && this.#completed) {
      return { status: this.#status, completed: this.#completed };
    }

    const draft = this.#createDraft();
    return draft ? { status: this.#status, draft } : { status: this.#status };
  }

  public click(position: Position): DrawSessionSnapshot {
    if (this.#isTerminal() || this.#isAtMaximum()) {
      return this.snapshot();
    }

    const point = clonePosition(position);
    const last = this.#points.at(-1);
    if (last && samePosition(last, point)) {
      return this.snapshot();
    }

    const candidate = [...this.#points, point];
    if (
      this.#completeAtMaximum &&
      this.#maximumPoints !== undefined &&
      candidate.length === this.#maximumPoints
    ) {
      const completed = this.#tryComplete(candidate);
      if (completed) return completed;

      // Keep the rejected final point as a live pointer candidate instead of
      // filling the fixed-count session and trapping it at maximumPoints.
      this.#cursor = point;
      this.#status = "drawing";
      return this.snapshot();
    }

    this.#points = candidate;
    this.#cursor = undefined;
    this.#status = "drawing";
    return this.snapshot();
  }

  public doubleClick(position: Position): DrawSessionSnapshot {
    if (this.#isTerminal()) {
      return this.snapshot();
    }

    const point = clonePosition(position);
    const last = this.#points.at(-1);
    const candidate =
      last && samePosition(last, point)
        ? [...this.#points]
        : this.#isAtMaximum()
          ? [...this.#points]
          : [...this.#points, point];

    this.#cursor = undefined;
    if (candidate.length >= this.#minimumPoints) {
      const completed = this.#tryComplete(candidate);
      if (completed) return completed;
    }

    if (
      this.#maximumPoints !== undefined &&
      candidate.length >= this.#maximumPoints &&
      !(last && samePosition(last, point))
    ) {
      this.#points = candidate.slice(0, this.#maximumPoints - 1).map(clonePosition);
      this.#cursor = point;
    } else {
      this.#points = candidate.map(clonePosition);
    }
    this.#status = this.#points.length > 0 ? "drawing" : "ready";
    return this.snapshot();
  }

  public pointerMove(position: Position): DrawSessionSnapshot {
    if (this.#isTerminal() || this.#points.length === 0) {
      return this.snapshot();
    }

    const point = clonePosition(position);
    const last = this.#points.at(-1);
    this.#cursor =
      !last || samePosition(last, point) || this.#isAtMaximum()
        ? undefined
        : point;
    return this.snapshot();
  }

  public keyDown(key: string): DrawSessionSnapshot {
    if (this.#isTerminal()) {
      return this.snapshot();
    }

    if (key === "Escape") {
      return this.cancel();
    }

    if (key === "Backspace" || key === "Delete") {
      this.#points = this.#points.slice(0, -1);
      this.#cursor = undefined;
      this.#status = this.#points.length === 0 ? "ready" : "drawing";
      return this.snapshot();
    }

    if (key === "Enter") {
      const candidate = this.#candidatePoints();
      if (candidate.length >= this.#minimumPoints) {
        const completed = this.#tryComplete(candidate);
        if (completed) return completed;
      }
    }

    return this.snapshot();
  }

  public cancel(): DrawSessionSnapshot {
    if (this.#status !== "completed") {
      this.#status = "cancelled";
      this.#points = [];
      this.#cursor = undefined;
    }
    return this.snapshot();
  }

  #createDraft(): PlotFeatureInput | undefined {
    if (this.#isTerminal()) {
      return undefined;
    }

    const candidate = this.#candidatePoints();
    if (candidate.length >= this.#minimumPoints) {
      return this.#createFeature(candidate);
    }

    if (this.#cursor || !this.#options.deriveDraftControlPoints) {
      return undefined;
    }

    try {
      const derived = this.#options.deriveDraftControlPoints(
        this.#points.map(clonePosition),
      );
      if (!derived || derived.length < this.#minimumPoints) {
        return undefined;
      }
      if (
        this.#maximumPoints !== undefined &&
        derived.length > this.#maximumPoints
      ) {
        return undefined;
      }
      return this.#createFeature(derived.map(clonePosition));
    } catch {
      return undefined;
    }
  }

  #candidatePoints(): readonly Position[] {
    if (!this.#cursor || this.#isAtMaximum()) {
      return this.#points;
    }
    const last = this.#points.at(-1);
    return last && samePosition(last, this.#cursor)
      ? this.#points
      : [...this.#points, this.#cursor];
  }

  #tryComplete(points: readonly Position[]): DrawSessionSnapshot | undefined {
    const limited =
      this.#maximumPoints === undefined
        ? [...points]
        : points.slice(0, this.#maximumPoints);
    if (limited.length < this.#minimumPoints) {
      return undefined;
    }

    const candidate = this.#createFeature(limited);
    if (!this.#canComplete(candidate)) {
      return undefined;
    }

    this.#completed = candidate;
    this.#points = limited.map(clonePosition);
    this.#cursor = undefined;
    this.#status = "completed";
    return this.snapshot();
  }

  #canComplete(candidate: PlotFeatureInput): boolean {
    const validate = this.#options.validateCompletion;
    if (!validate) return true;
    try {
      return validate(candidate);
    } catch {
      return false;
    }
  }

  #createFeature(controlPoints: readonly Position[]): PlotFeatureInput {
    const input: PlotFeatureInput = {
      id: this.#options.id,
      plotType: this.#options.plotType,
      controlPoints: controlPoints.map(clonePosition),
    };

    return {
      ...input,
      ...(this.#options.definitionVersion !== undefined
        ? { definitionVersion: this.#options.definitionVersion }
        : {}),
      ...(this.#options.parameters !== undefined
        ? { parameters: { ...this.#options.parameters } }
        : {}),
      ...(this.#options.style !== undefined
        ? { style: { ...this.#options.style } }
        : {}),
      ...(this.#options.metadata !== undefined
        ? { metadata: { ...this.#options.metadata } }
        : {}),
    };
  }

  #isAtMaximum(): boolean {
    return (
      this.#maximumPoints !== undefined &&
      this.#points.length >= this.#maximumPoints
    );
  }

  #isTerminal(): boolean {
    return this.#status === "completed" || this.#status === "cancelled";
  }
}

function validateFeatureOptions(options: MultiPointDrawSessionOptions): void {
  if (!options.id.trim()) {
    throw new TypeError("MultiPointDrawSession id must not be empty.");
  }
  if (!options.plotType.trim()) {
    throw new TypeError("MultiPointDrawSession plotType must not be empty.");
  }
}

function clonePosition([longitude, latitude]: Position): Position {
  return [longitude, latitude];
}

function samePosition(left: Position, right: Position): boolean {
  return left[0] === right[0] && left[1] === right[1];
}
