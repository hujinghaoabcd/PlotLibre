import type {
  JsonValue,
  PlotFeatureInput,
  PlotStyle,
  Position,
} from "@plotlibre/core";

export type DrawSessionStatus =
  | "ready"
  | "drawing"
  | "completed"
  | "cancelled";

export interface DrawSessionSnapshot {
  readonly status: DrawSessionStatus;
  readonly draft?: PlotFeatureInput;
  readonly completed?: PlotFeatureInput;
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

export interface DrawSessionFeatureOptions {
  readonly id: string;
  readonly plotType: string;
  readonly definitionVersion?: string;
  readonly parameters?: Readonly<Record<string, JsonValue>>;
  readonly style?: PlotStyle;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

export type TwoPointDrawSessionOptions = DrawSessionFeatureOptions;

export interface MultiPointDrawSessionOptions extends DrawSessionFeatureOptions {
  readonly minimumPoints: number;
  readonly maximumPoints?: number;
  /**
   * When true, reaching maximumPoints commits immediately after a click.
   * Defaults to true.
   */
  readonly completeAtMaximum?: boolean;
  /**
   * Produces a complete, transient draft control set from committed controls.
   * Derived controls are never used for completion or persisted state.
   */
  readonly deriveDraftControlPoints?: (
    controlPoints: readonly Position[],
  ) => readonly Position[] | undefined;
}
