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
 * satisfy minimumPoints, so a renderer never receives an invalid semantic
 * feature solely for early guide feedback.
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

    this.#points.push(point);
    this.#cursor = undefined;
    this.#status = "drawing";

    if (
      this.#completeAtMaximum &&
      this.#maximumPoints !== undefined &&
      this.#points.length === this.#maximumPoints
    ) {
      return this.#complete(this.#points);
    }

    return this.snapshot();
  }

  public doubleClick(position: Position): DrawSessionSnapshot {
    if (this.#isTerminal()) {
      return this.snapshot();
    }

    const point = clonePosition(position);
    const last = this.#points.at(-1);
    if (!last || !samePosition(last, point)) {
      if (!this.#isAtMaximum()) {
        this.#points.push(point);
      }
    }
    this.#cursor = undefined;
    this.#status = this.#points.length > 0 ? "drawing" : "ready";

    if (this.#points.length >= this.#minimumPoints) {
      return this.#complete(this.#points);
    }
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
      this.#points.pop();
      this.#cursor = undefined;
      this.#status = this.#points.length === 0 ? "ready" : "drawing";
      return this.snapshot();
    }

    if (key === "Enter") {
      const candidate = this.#candidatePoints();
      if (candidate.length >= this.#minimumPoints) {
        return this.#complete(candidate);
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
    return candidate.length >= this.#minimumPoints
      ? this.#createFeature(candidate)
      : undefined;
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

  #complete(points: readonly Position[]): DrawSessionSnapshot {
    const limited =
      this.#maximumPoints === undefined
        ? points
        : points.slice(0, this.#maximumPoints);
    if (limited.length < this.#minimumPoints) {
      return this.snapshot();
    }

    this.#completed = this.#createFeature(limited);
    this.#points = limited.map(clonePosition);
    this.#cursor = undefined;
    this.#status = "completed";
    return this.snapshot();
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
