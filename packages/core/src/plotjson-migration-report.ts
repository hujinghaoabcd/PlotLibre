import type { PlotJsonDefinitionReference } from "./plotjson-migration-types.js";

export interface PlotJsonAppliedDocumentStep {
  readonly scope: "document";
  readonly sourceVersion: string;
  readonly targetVersion: string;
}

export interface PlotJsonAppliedDefinitionStep {
  readonly scope: "definition";
  readonly featureId: string;
  readonly from: PlotJsonDefinitionReference;
  readonly to: PlotJsonDefinitionReference;
}

export type PlotJsonAppliedStep =
  | PlotJsonAppliedDocumentStep
  | PlotJsonAppliedDefinitionStep;

export interface PlotJsonFeatureMigrationRecord {
  readonly featureId: string;
  readonly source: PlotJsonDefinitionReference;
  readonly target: PlotJsonDefinitionReference;
  readonly steps: readonly PlotJsonAppliedDefinitionStep[];
}

export type PlotJsonNormalizationCode =
  | "PLOTJSON_DEFINITION_VERSION_DEFAULTED"
  | "PLOTJSON_PARAMETERS_DEFAULTED"
  | "PLOTJSON_STYLE_DEFAULTED"
  | "PLOTJSON_FEATURE_METADATA_DEFAULTED"
  | "PLOTJSON_REVISION_DEFAULTED"
  | "PLOTJSON_UNKNOWN_FIELD_DROPPED";

export interface PlotJsonNormalizationRecord {
  readonly code: PlotJsonNormalizationCode;
  readonly path: string;
  readonly featureId?: string;
  readonly plotType?: string;
}

export type PlotJsonWarningCode =
  | "PLOTJSON_INVALID_RECORD_DEFAULTED"
  | "PLOTJSON_INVALID_REVISION_DEFAULTED"
  | "PLOTJSON_UNKNOWN_FIELD_DROPPED";

export interface PlotJsonWarning {
  readonly code: PlotJsonWarningCode;
  readonly path: string;
  readonly featureId?: string;
  readonly plotType?: string;
}

export interface PlotJsonMigrationReport {
  readonly sourceSchemaVersion: string;
  readonly targetSchemaVersion: string;
  readonly documentSteps: readonly PlotJsonAppliedDocumentStep[];
  readonly featureSteps: readonly PlotJsonFeatureMigrationRecord[];
  readonly normalizations: readonly PlotJsonNormalizationRecord[];
  readonly warnings: readonly PlotJsonWarning[];
}

/**
 * Copies and deeply freezes the structural report envelope.
 *
 * Report records contain scalar facts and references only; migration functions,
 * complete documents and metadata are deliberately excluded.
 */
export function createPlotJsonMigrationReport(
  input: PlotJsonMigrationReport,
): PlotJsonMigrationReport {
  return Object.freeze({
    sourceSchemaVersion: input.sourceSchemaVersion,
    targetSchemaVersion: input.targetSchemaVersion,
    documentSteps: Object.freeze(
      input.documentSteps.map(freezeDocumentStep),
    ),
    featureSteps: Object.freeze(
      input.featureSteps.map(freezeFeatureRecord),
    ),
    normalizations: Object.freeze(
      input.normalizations.map(freezeNormalization),
    ),
    warnings: Object.freeze(input.warnings.map(freezeWarning)),
  });
}

function freezeDocumentStep(
  input: PlotJsonAppliedDocumentStep,
): PlotJsonAppliedDocumentStep {
  return Object.freeze({
    scope: "document",
    sourceVersion: input.sourceVersion,
    targetVersion: input.targetVersion,
  });
}

function freezeDefinitionStep(
  input: PlotJsonAppliedDefinitionStep,
): PlotJsonAppliedDefinitionStep {
  return Object.freeze({
    scope: "definition",
    featureId: input.featureId,
    from: freezeReference(input.from),
    to: freezeReference(input.to),
  });
}

function freezeFeatureRecord(
  input: PlotJsonFeatureMigrationRecord,
): PlotJsonFeatureMigrationRecord {
  return Object.freeze({
    featureId: input.featureId,
    source: freezeReference(input.source),
    target: freezeReference(input.target),
    steps: Object.freeze(input.steps.map(freezeDefinitionStep)),
  });
}

function freezeNormalization(
  input: PlotJsonNormalizationRecord,
): PlotJsonNormalizationRecord {
  return Object.freeze({
    code: input.code,
    path: input.path,
    ...(input.featureId === undefined
      ? {}
      : { featureId: input.featureId }),
    ...(input.plotType === undefined ? {} : { plotType: input.plotType }),
  });
}

function freezeWarning(input: PlotJsonWarning): PlotJsonWarning {
  return Object.freeze({
    code: input.code,
    path: input.path,
    ...(input.featureId === undefined
      ? {}
      : { featureId: input.featureId }),
    ...(input.plotType === undefined ? {} : { plotType: input.plotType }),
  });
}

function freezeReference(
  input: PlotJsonDefinitionReference,
): PlotJsonDefinitionReference {
  return Object.freeze({
    plotType: input.plotType,
    definitionVersion: input.definitionVersion,
  });
}
