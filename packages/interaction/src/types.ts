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
  pointerMove(position: Position): DrawSessionSnapshot;
  keyDown(key: string): DrawSessionSnapshot;
  cancel(): DrawSessionSnapshot;
}

export interface TwoPointDrawSessionOptions {
  readonly id: string;
  readonly plotType: string;
  readonly definitionVersion?: string;
  readonly parameters?: Readonly<Record<string, JsonValue>>;
  readonly style?: PlotStyle;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}
