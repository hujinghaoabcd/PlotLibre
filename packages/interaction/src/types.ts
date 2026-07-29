import type {
  JsonValue,
  PlotFeatureInput,
  PlotStyle,
  Position,
  ValidationIssue,
  ValidationResult,
} from "@plotlibre/core";

export type DrawSessionStatus =
  | "ready"
  | "drawing"
  | "completed"
  | "cancelled";

export interface DrawSessionRejection {
  readonly kind: "completion-validation";
  readonly issues: readonly ValidationIssue[];
}

export interface DrawSessionSnapshot {
  readonly status: DrawSessionStatus;
  readonly draft?: PlotFeatureInput;
  readonly completed?: PlotFeatureInput;
  readonly rejection?: DrawSessionRejection;
}

export interface DrawSession {
  readonly status: DrawSessionStatus;
  snapshot(): DrawSessionSnapshot;
  click(position: Position): DrawSessionSnapshot;
  doubleClick(position: Position): DrawSessionSnapshot;
  pointerMove(position: Position): DrawSessionSnapshot;
  keyDown(key: string): DrawSessionSnapshot;
  cancel(): DrawSessionSnapshot;
}

export type DrawCompletionValidationResult = boolean | ValidationResult;

export interface DrawSessionFeatureOptions {
  readonly id: string;
  readonly plotType: string;
  readonly definitionVersion?: string;
  readonly parameters?: Readonly<Record<string, JsonValue>>;
  readonly style?: PlotStyle;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
  /**
   * Performs a full renderability preflight before a candidate becomes terminal.
   * Boolean callbacks remain supported. Returning a ValidationResult allows the
   * session and adapters to expose stable rejection details without committing
   * the invalid candidate.
   */
  readonly validateCompletion?:
    | ((candidate: PlotFeatureInput) => DrawCompletionValidationResult)
    | undefined;
}

export type TwoPointDrawSessionOptions = DrawSessionFeatureOptions;

export interface MultiPointDrawSessionOptions extends DrawSessionFeatureOptions {
  readonly minimumPoints: number;
  readonly maximumPoints?: number;
  /**
   * Enables a variable path whose minimum is exactly two controls. This remains
   * opt-in so existing multipoint callers keep the historical minimum of three.
   */
  readonly allowTwoPointMinimum?: boolean;
  /**
   * When true, reaching maximumPoints commits immediately after a click.
   * Defaults to true.
   */
  readonly completeAtMaximum?: boolean;
  /**
   * Produces a complete, transient draft control set from committed controls.
   * Derived controls are never used for completion or persisted state.
   */
  readonly deriveDraftControlPoints?:
    | ((
        controlPoints: readonly Position[],
      ) => readonly Position[] | undefined)
    | undefined;
}
