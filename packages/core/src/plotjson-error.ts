import { PlotLibreError } from "./errors.js";

export type PlotJsonErrorCode =
  | "PLOTJSON_SYNTAX_INVALID"
  | "PLOTJSON_VALUE_NOT_JSON"
  | "PLOTJSON_RESOURCE_LIMIT_EXCEEDED"
  | "PLOTJSON_ROOT_INVALID"
  | "PLOTJSON_DOCUMENT_TYPE_UNSUPPORTED"
  | "PLOTJSON_SCHEMA_VERSION_INVALID"
  | "PLOTJSON_SCHEMA_VERSION_UNSUPPORTED"
  | "PLOTJSON_MIGRATION_PATH_MISSING"
  | "PLOTJSON_MIGRATION_OUTPUT_INVALID"
  | "PLOTJSON_CURRENT_SCHEMA_INVALID"
  | "PLOTJSON_FEATURE_ID_DUPLICATE"
  | "PLOTJSON_DEFINITION_NOT_FOUND"
  | "PLOTJSON_DEFINITION_VERSION_INVALID"
  | "PLOTJSON_DEFINITION_VERSION_UNSUPPORTED"
  | "PLOTJSON_DEFINITION_MIGRATION_PATH_MISSING"
  | "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID"
  | "PLOTJSON_REFERENCE_INVALID"
  | "PLOTJSON_IMPORT_TRANSACTION_INVALID";

export interface PlotJsonErrorContext {
  readonly path?: string;
  readonly featureId?: string;
  readonly plotType?: string;
  readonly sourceVersion?: string;
  readonly targetVersion?: string;
  readonly limitName?: string;
  readonly limit?: number;
  readonly actual?: number;
  readonly cause?: unknown;
}

/**
 * Stable, path-aware PlotJSON failure surface.
 *
 * Context deliberately contains identifiers and scalar diagnostics only. It
 * must never retain the complete untrusted document or application metadata.
 */
export class PlotJsonError extends PlotLibreError {
  public readonly path: string | undefined;
  public readonly featureId: string | undefined;
  public readonly plotType: string | undefined;
  public readonly sourceVersion: string | undefined;
  public readonly targetVersion: string | undefined;
  public readonly limitName: string | undefined;
  public readonly limit: number | undefined;
  public readonly actual: number | undefined;
  public readonly cause: unknown;

  public constructor(
    code: PlotJsonErrorCode,
    message: string,
    context: PlotJsonErrorContext = {},
  ) {
    super(code, message);
    this.name = "PlotJsonError";
    this.path = context.path;
    this.featureId = context.featureId;
    this.plotType = context.plotType;
    this.sourceVersion = context.sourceVersion;
    this.targetVersion = context.targetVersion;
    this.limitName = context.limitName;
    this.limit = context.limit;
    this.actual = context.actual;
    this.cause = context.cause;
  }
}
