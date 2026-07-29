import type { PlotFeatureInput, Position } from "@plotlibre/core";
import { evaluateCompletion } from "./completion-validation.js";
import type {
  DrawSession,
  DrawSessionRejection,
  DrawSessionSnapshot,
  DrawSessionStatus,
  TwoPointDrawSessionOptions,
} from "./types.js";

export class TwoPointDrawSession implements DrawSession {
  readonly #options: TwoPointDrawSessionOptions;
  #status: DrawSessionStatus = "ready";
  #start: Position | undefined;
  #cursor: Position | undefined;
  #completed: PlotFeatureInput | undefined;
  #rejection: DrawSessionRejection | undefined;

  public constructor(options: TwoPointDrawSessionOptions) {
    if (!options.id.trim()) {
      throw new TypeError("TwoPointDrawSession id must not be empty.");
    }
    if (!options.plotType.trim()) {
      throw new TypeError("TwoPointDrawSession plotType must not be empty.");
    }
    this.#options = options;
  }

  public get status(): DrawSessionStatus {
    return this.#status;
  }

  public snapshot(): DrawSessionSnapshot {
    if (this.#status === "completed" && this.#completed) {
      return { status: this.#status, completed: this.#completed };
    }

    const draft = this.#createDraft();
    return {
      status: this.#status,
      ...(draft ? { draft } : {}),
      ...(this.#rejection ? { rejection: this.#rejection } : {}),
    };
  }

  public click(position: Position): DrawSessionSnapshot {
    if (this.#isTerminal()) {
      return this.snapshot();
    }

    const point = clonePosition(position);
    if (!this.#start) {
      this.#start = point;
      this.#cursor = undefined;
      this.#rejection = undefined;
      this.#status = "drawing";
      return this.snapshot();
    }

    if (samePosition(this.#start, point)) {
      return this.snapshot();
    }

    this.#cursor = point;
    this.#rejection = undefined;
    return this.#tryComplete([this.#start, point]);
  }

  public doubleClick(position: Position): DrawSessionSnapshot {
    return this.click(position);
  }

  public pointerMove(position: Position): DrawSessionSnapshot {
    if (this.#isTerminal() || !this.#start) {
      return this.snapshot();
    }

    const point = clonePosition(position);
    this.#rejection = undefined;
    this.#cursor = samePosition(this.#start, point) ? undefined : point;
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
      this.#start = undefined;
      this.#cursor = undefined;
      this.#rejection = undefined;
      this.#status = "ready";
      return this.snapshot();
    }

    if (key === "Enter" && this.#start && this.#cursor) {
      this.#rejection = undefined;
      return this.#tryComplete([this.#start, this.#cursor]);
    }

    return this.snapshot();
  }

  public cancel(): DrawSessionSnapshot {
    if (this.#status !== "completed") {
      this.#status = "cancelled";
      this.#start = undefined;
      this.#cursor = undefined;
      this.#rejection = undefined;
    }
    return this.snapshot();
  }

  #createDraft(): PlotFeatureInput | undefined {
    if (!this.#start || !this.#cursor || this.#isTerminal()) {
      return undefined;
    }
    return this.#createFeature([this.#start, this.#cursor]);
  }

  #tryComplete(controlPoints: readonly Position[]): DrawSessionSnapshot {
    const candidate = this.#createFeature(controlPoints);
    const evaluation = evaluateCompletion(
      this.#options.validateCompletion,
      candidate,
    );
    if (!evaluation.valid) {
      this.#rejection = evaluation.rejection;
      this.#status = "drawing";
      return this.snapshot();
    }

    this.#completed = candidate;
    this.#rejection = undefined;
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

  #isTerminal(): boolean {
    return this.#status === "completed" || this.#status === "cancelled";
  }
}

function clonePosition([longitude, latitude]: Position): Position {
  return [longitude, latitude];
}

function samePosition(left: Position, right: Position): boolean {
  return left[0] === right[0] && left[1] === right[1];
}
