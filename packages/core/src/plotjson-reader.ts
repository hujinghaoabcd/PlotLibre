import {
  decodeCurrentPlotJsonDocument,
  decodeCurrentPlotJsonFeature,
  type MutablePlotJsonReportFacts,
} from "./plotjson-current-decoder.js";
import { PlotJsonError } from "./plotjson-error.js";
import { PlotJsonMigrationRegistry } from "./plotjson-migration-registry.js";
import {
  createPlotJsonMigrationReport,
  type PlotJsonAppliedDefinitionStep,
  type PlotJsonFeatureMigrationRecord,
  type PlotJsonMigrationReport,
} from "./plotjson-migration-report.js";
import type {
  PlotJsonDefinitionReference,
  PlotJsonObject,
  PlotJsonPlannedDefinitionStep,
  PlotJsonPlannedDocumentStep,
} from "./plotjson-migration-types.js";
import {
  assertPlotJsonInputSize,
  clonePlotJsonValue,
  resolvePlotJsonLimits,
  type PlotJsonLimits,
} from "./plotjson-safety.js";
import {
  CURRENT_PLOTJSON_SCHEMA_VERSION,
  PLOTJSON_DOCUMENT_TYPE,
  parsePlotJsonVersion,
} from "./plotjson-version.js";
import type {
  JsonValue,
  PlotDocument,
  PlotFeature,
} from "./types.js";

export interface ReadPlotDocumentOptions {
  /** Trusted application-installed migration history. */
  readonly migrations?: PlotJsonMigrationRegistry;
  /**
   * Explicit final Definition target keyed by source plotType. Omitting this
   * map preserves parser-only 1.0.0 compatibility and performs no Definition
   * migration or equality check.
   */
  readonly definitionTargets?: Readonly<
    Record<string, PlotJsonDefinitionReference>
  >;
  readonly limits?: Partial<PlotJsonLimits>;
}

export interface ReadPlotDocumentResult {
  readonly document: PlotDocument;
  readonly report: PlotJsonMigrationReport;
}

/**
 * Safely reads, migrates and normalizes PlotJSON without mutating Store,
 * Registry, History, interactions or MapLibre.
 */
export function readPlotDocument(
  input: string | unknown,
  options: ReadPlotDocumentOptions = {},
): ReadPlotDocumentResult {
  const limits = resolvePlotJsonLimits(options.limits);
  const migrations = options.migrations ?? new PlotJsonMigrationRegistry();
  const facts: MutablePlotJsonReportFacts = {
    documentSteps: [],
    featureSteps: [],
    normalizations: [],
    warnings: [],
  };

  let current = cloneJsonObject(
    parseInput(input, limits),
    "$",
    limits,
    "PLOTJSON_ROOT_INVALID",
    "PlotJSON root must be an object.",
  );
  const sourceSchemaVersion = readDocumentEnvelope(current);
  const documentPlan = migrations.planDocument(
    sourceSchemaVersion,
    CURRENT_PLOTJSON_SCHEMA_VERSION,
  );
  for (const step of documentPlan) {
    current = executeDocumentStep(current, step, limits);
    facts.documentSteps.push(Object.freeze({
      scope: "document",
      sourceVersion: step.fromVersion,
      targetVersion: step.toVersion,
    }));
  }

  assertCurrentDocumentEnvelope(current);
  const decoded = decodeCurrentPlotJsonDocument(current, facts);
  const features = decoded.features.map((feature, index) =>
    migrateDefinition(
      feature,
      index,
      migrations,
      options.definitionTargets,
      limits,
      facts,
    ),
  );
  const document = deepFreeze({
    type: PLOTJSON_DOCUMENT_TYPE,
    schemaVersion: CURRENT_PLOTJSON_SCHEMA_VERSION,
    id: decoded.id,
    name: decoded.name,
    features,
    metadata: decoded.metadata,
  } satisfies PlotDocument);
  const report = createPlotJsonMigrationReport({
    sourceSchemaVersion,
    targetSchemaVersion: CURRENT_PLOTJSON_SCHEMA_VERSION,
    documentSteps: facts.documentSteps,
    featureSteps: facts.featureSteps,
    normalizations: facts.normalizations,
    warnings: facts.warnings,
  });
  return Object.freeze({ document, report });
}

function parseInput(
  input: string | unknown,
  limits: Readonly<PlotJsonLimits>,
): unknown {
  if (typeof input !== "string") return input;
  assertPlotJsonInputSize(input, limits);
  try {
    return JSON.parse(input) as unknown;
  } catch (cause) {
    throw new PlotJsonError(
      "PLOTJSON_SYNTAX_INVALID",
      "PlotJSON text is not valid JSON.",
      { path: "$", cause },
    );
  }
}

function readDocumentEnvelope(root: PlotJsonObject): string {
  if (root.type !== PLOTJSON_DOCUMENT_TYPE) {
    throw new PlotJsonError(
      "PLOTJSON_DOCUMENT_TYPE_UNSUPPORTED",
      "PlotJSON document type is unsupported.",
      { path: "$.type" },
    );
  }
  try {
    return parsePlotJsonVersion(root.schemaVersion).value;
  } catch (cause) {
    throw new PlotJsonError(
      "PLOTJSON_SCHEMA_VERSION_INVALID",
      "PlotJSON schemaVersion must be a canonical numeric triple.",
      { path: "$.schemaVersion", cause },
    );
  }
}

function assertCurrentDocumentEnvelope(root: PlotJsonObject): void {
  if (
    root.type !== PLOTJSON_DOCUMENT_TYPE ||
    root.schemaVersion !== CURRENT_PLOTJSON_SCHEMA_VERSION
  ) {
    throw new PlotJsonError(
      "PLOTJSON_CURRENT_SCHEMA_INVALID",
      "Document migration did not produce the current PlotJSON envelope.",
      { path: "$" },
    );
  }
}

function executeDocumentStep(
  input: PlotJsonObject,
  step: PlotJsonPlannedDocumentStep,
  limits: Readonly<PlotJsonLimits>,
): PlotJsonObject {
  const frozenInput = deepFreeze(input);
  let output: unknown;
  try {
    output = step.migrate(
      frozenInput,
      Object.freeze({
        scope: "document",
        sourceVersion: step.fromVersion,
        targetVersion: step.toVersion,
      }),
    );
  } catch (cause) {
    throw documentMigrationOutputError(step, cause);
  }
  if (output === frozenInput) {
    throw documentMigrationOutputError(
      step,
      new TypeError("Migration returned its input object."),
    );
  }
  const cloned = cloneMigrationObject(
    output,
    "$",
    limits,
    "PLOTJSON_MIGRATION_OUTPUT_INVALID",
    step.fromVersion,
    step.toVersion,
  );
  if (
    cloned.type !== PLOTJSON_DOCUMENT_TYPE ||
    cloned.schemaVersion !== step.toVersion
  ) {
    throw documentMigrationOutputError(
      step,
      new TypeError("Migration output envelope does not match its target."),
    );
  }
  return cloned;
}

function migrateDefinition(
  sourceFeature: PlotFeature,
  index: number,
  migrations: PlotJsonMigrationRegistry,
  targets: ReadPlotDocumentOptions["definitionTargets"],
  limits: Readonly<PlotJsonLimits>,
  facts: MutablePlotJsonReportFacts,
): PlotFeature {
  if (!targets) return sourceFeature;
  const source = Object.freeze({
    plotType: sourceFeature.plotType,
    definitionVersion: sourceFeature.definitionVersion,
  });
  if (!Object.prototype.hasOwnProperty.call(targets, source.plotType)) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_NOT_FOUND",
      "No final Definition target is configured for this plotType.",
      {
        path: `$.features[${index}].plotType`,
        featureId: sourceFeature.id,
        plotType: source.plotType,
        sourceVersion: source.definitionVersion,
      },
    );
  }
  const target = targets[source.plotType]!;
  const plan = migrations.planDefinition(source, target);
  if (plan.length === 0) return sourceFeature;

  let current = cloneJsonObject(
    featureToJsonObject(sourceFeature),
    `$.features[${index}]`,
    limits,
    "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID",
    "Definition migration input must be a JSON object.",
    sourceFeature.id,
    source.plotType,
    source.definitionVersion,
    target.definitionVersion,
  );
  const applied: PlotJsonAppliedDefinitionStep[] = [];
  for (const step of plan) {
    current = executeDefinitionStep(
      current,
      step,
      index,
      sourceFeature.id,
      limits,
    );
    applied.push(Object.freeze({
      scope: "definition",
      featureId: sourceFeature.id,
      from: step.from,
      to: step.to,
    }));
  }

  const migrated = decodeCurrentPlotJsonFeature(current, index, facts);
  if (
    migrated.id !== sourceFeature.id ||
    migrated.plotType !== target.plotType ||
    migrated.definitionVersion !== target.definitionVersion
  ) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID",
      "Definition migration did not produce the requested final feature.",
      {
        path: `$.features[${index}]`,
        featureId: sourceFeature.id,
        plotType: source.plotType,
        sourceVersion: source.definitionVersion,
        targetVersion: target.definitionVersion,
      },
    );
  }
  const record: PlotJsonFeatureMigrationRecord = Object.freeze({
    featureId: sourceFeature.id,
    source,
    target,
    steps: Object.freeze(applied),
  });
  facts.featureSteps.push(record);
  return migrated;
}

function executeDefinitionStep(
  input: PlotJsonObject,
  step: PlotJsonPlannedDefinitionStep,
  index: number,
  featureId: string,
  limits: Readonly<PlotJsonLimits>,
): PlotJsonObject {
  const path = `$.features[${index}]`;
  const frozenInput = deepFreeze(input);
  let output: unknown;
  try {
    output = step.migrate(
      frozenInput,
      Object.freeze({
        scope: "definition",
        sourceVersion: step.from.definitionVersion,
        targetVersion: step.to.definitionVersion,
        featureId,
        sourcePlotType: step.from.plotType,
        targetPlotType: step.to.plotType,
      }),
    );
  } catch (cause) {
    throw definitionMigrationOutputError(step, path, featureId, cause);
  }
  if (output === frozenInput) {
    throw definitionMigrationOutputError(
      step,
      path,
      featureId,
      new TypeError("Migration returned its input object."),
    );
  }
  const cloned = cloneMigrationObject(
    output,
    path,
    limits,
    "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID",
    step.from.definitionVersion,
    step.to.definitionVersion,
    featureId,
    step.from.plotType,
  );
  if (
    cloned.id !== featureId ||
    cloned.plotType !== step.to.plotType ||
    cloned.definitionVersion !== step.to.definitionVersion
  ) {
    throw definitionMigrationOutputError(
      step,
      path,
      featureId,
      new TypeError("Migration output identity does not match its target."),
    );
  }
  return cloned;
}

function featureToJsonObject(feature: PlotFeature): unknown {
  return {
    id: feature.id,
    plotType: feature.plotType,
    definitionVersion: feature.definitionVersion,
    controlPoints: feature.controlPoints,
    parameters: feature.parameters,
    style: feature.style,
    metadata: feature.metadata,
    revision: feature.revision,
  };
}

function cloneMigrationObject(
  input: unknown,
  path: string,
  limits: Readonly<PlotJsonLimits>,
  code:
    | "PLOTJSON_MIGRATION_OUTPUT_INVALID"
    | "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID",
  sourceVersion: string,
  targetVersion: string,
  featureId?: string,
  plotType?: string,
): PlotJsonObject {
  try {
    const cloned = clonePlotJsonValue(input, { limits, path }).value;
    if (!isJsonObject(cloned)) {
      throw new TypeError("Migration output must be a JSON object.");
    }
    return cloned;
  } catch (cause) {
    throw new PlotJsonError(code, "PlotJSON migration output is invalid.", {
      path,
      sourceVersion,
      targetVersion,
      ...(featureId === undefined ? {} : { featureId }),
      ...(plotType === undefined ? {} : { plotType }),
      cause,
    });
  }
}

function cloneJsonObject(
  input: unknown,
  path: string,
  limits: Readonly<PlotJsonLimits>,
  code:
    | "PLOTJSON_ROOT_INVALID"
    | "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID",
  message: string,
  featureId?: string,
  plotType?: string,
  sourceVersion?: string,
  targetVersion?: string,
): PlotJsonObject {
  const cloned = clonePlotJsonValue(input, { limits, path }).value;
  if (isJsonObject(cloned)) return cloned;
  throw new PlotJsonError(code, message, {
    path,
    ...(featureId === undefined ? {} : { featureId }),
    ...(plotType === undefined ? {} : { plotType }),
    ...(sourceVersion === undefined ? {} : { sourceVersion }),
    ...(targetVersion === undefined ? {} : { targetVersion }),
  });
}

function documentMigrationOutputError(
  step: PlotJsonPlannedDocumentStep,
  cause: unknown,
): PlotJsonError {
  return new PlotJsonError(
    "PLOTJSON_MIGRATION_OUTPUT_INVALID",
    "Document migration failed or produced an invalid result.",
    {
      path: "$",
      sourceVersion: step.fromVersion,
      targetVersion: step.toVersion,
      cause,
    },
  );
}

function definitionMigrationOutputError(
  step: PlotJsonPlannedDefinitionStep,
  path: string,
  featureId: string,
  cause: unknown,
): PlotJsonError {
  return new PlotJsonError(
    "PLOTJSON_DEFINITION_MIGRATION_OUTPUT_INVALID",
    "Definition migration failed or produced an invalid result.",
    {
      path,
      featureId,
      plotType: step.from.plotType,
      sourceVersion: step.from.definitionVersion,
      targetVersion: step.to.definitionVersion,
      cause,
    },
  );
}

function isJsonObject(value: JsonValue): value is PlotJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  const stack: object[] = [value];
  const visited = new Set<object>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const child of Object.values(current)) {
      if (typeof child === "object" && child !== null) stack.push(child);
    }
    Object.freeze(current);
  }
  return value;
}
