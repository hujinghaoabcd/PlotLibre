import type { JsonValue } from "./types.js";

/** A JSON object accepted and returned by trusted migration functions. */
export type PlotJsonObject = Readonly<Record<string, JsonValue>>;

export type PlotJsonMigrationScope = "document" | "definition";

export interface PlotJsonMigrationContext {
  readonly scope: PlotJsonMigrationScope;
  readonly sourceVersion: string;
  readonly targetVersion: string;
  readonly featureId?: string;
  readonly sourcePlotType?: string;
  readonly targetPlotType?: string;
}

/**
 * Trusted, synchronous migration code.
 *
 * Registration and planning never invoke this function. Execution and output
 * safety validation are introduced by later Milestone 008 slices.
 */
export type PlotJsonMigrationFunction = (
  input: PlotJsonObject,
  context: PlotJsonMigrationContext,
) => PlotJsonObject;

export interface PlotJsonDocumentMigration {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly migrate: PlotJsonMigrationFunction;
}

export interface PlotJsonDefinitionReference {
  readonly plotType: string;
  readonly definitionVersion: string;
}

/**
 * One explicit Definition migration edge.
 *
 * A plotType rename is represented by different from/to references rather
 * than by a Registry alias or an implicit lookup side effect.
 */
export interface PlotJsonDefinitionMigration {
  readonly from: PlotJsonDefinitionReference;
  readonly to: PlotJsonDefinitionReference;
  readonly migrate: PlotJsonMigrationFunction;
}

export interface PlotJsonPlannedDocumentStep
  extends PlotJsonDocumentMigration {
  readonly scope: "document";
}

export interface PlotJsonPlannedDefinitionStep
  extends PlotJsonDefinitionMigration {
  readonly scope: "definition";
}

export type PlotJsonPlannedStep =
  | PlotJsonPlannedDocumentStep
  | PlotJsonPlannedDefinitionStep;
