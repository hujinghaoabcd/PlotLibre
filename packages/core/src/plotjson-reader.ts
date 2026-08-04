import { PlotJsonError } from "./plotjson-error.js";
import { PlotJsonMigrationRegistry } from "./plotjson-migration-registry.js";
import {
  createPlotJsonMigrationReport,
  type PlotJsonAppliedDefinitionStep,
  type PlotJsonAppliedDocumentStep,
  type PlotJsonFeatureMigrationRecord,
  type PlotJsonMigrationReport,
  type PlotJsonNormalizationCode,
  type PlotJsonNormalizationRecord,
  type PlotJsonWarning,
  type PlotJsonWarningCode,
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
import {
  createPlotFeature,
  type JsonValue,
  type PlotDocument,
  type PlotFeature,
  type PlotStyle,
  type Position,
} from "./types.js";

export interface ReadPlotDocumentOptions {
  /** Trusted application-installed migration history. */
  readonly migrations?: PlotJsonMigrationRegistry;
  /**
   * Explicit final Definition target keyed by the source plotType found after
   * document-schema decoding. Omitting this map preserves parser-only 1.0.0
   * compatibility and performs no Definition migration or equality check.
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

interface MutableReportFacts {
  readonly documentSteps: PlotJsonAppliedDocumentStep[];
  readonly featureSteps: PlotJsonFeatureMigrationRecord[];
  readonly normalizations: PlotJsonNormalizationRecord[];
  readonly warnings: PlotJsonWarning[];
}

interface DecodedDocument {
  readonly id: string;
  readonly name: string;
  readonly features: readonly PlotFeature[];
  readonly metadata: Readonly<Record<string, JsonValue>>;
}

const ROOT_FIELDS = Object.freeze(new Set([
  "type",
  "schemaVersion",
  "id",
  "name",
  "features",
  "metadata",
]));

const FEATURE_FIELDS = Object.freeze(new Set([
  "id",
  "plotType",
  "definitionVersion",
  "controlPoints",
  "parameters",
  "style",
  "metadata",
  "revision",
]));

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
  const facts: MutableReportFacts = {
    documentSteps: [],
    featureSteps: [],
    normalizations: [],
    warnings: [],
  };

  const parsed = parseInput(input, limits);
  let current = cloneJsonObject(
    parsed,
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
  const decoded = decodeCurrentDocument(current, facts);
  const migratedFeatures = decoded.features.map((feature, index) =>
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
    features: migratedFeatures,
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

function decodeCurrentDocument(
  root: PlotJsonObject,
  facts: MutableReportFacts,
): DecodedDocument {
  recordUnknownFields(root, ROOT_FIELDS, "$", facts);

  if (typeof root.id !== "string" || typeof root.name !== "string") {
    throw currentSchemaError(
      "$",
      "PlotJSON id and name must be strings.",
    );
  }
  if (!Array.isArray(root.features)) {
    throw currentSchemaError(
      "$.features",
      "PlotJSON features must be an array.",
    );
  }
  if (!isJsonObject(root.metadata)) {
    throw currentSchemaError(
      "$.metadata",
      "PlotJSON metadata must be an object.",
    );
  }

  const seenIds = new Set<string>();
  const features = root.features.map((value, index) => {
    const feature = decodeFeature(value, index, facts);
    if (seenIds.has(feature.id)) {
      throw new PlotJsonError(
        "PLOTJSON_FEATURE_ID_DUPLICATE",
        "PlotJSON feature ids must be unique.",
        {
          path: `$.features[${index}].id`,
          featureId: feature.id,
          plotType: feature.plotType,
        },
      );
    }
    seenIds.add(feature.id);
    return feature;
  });

  return {
    id: root.id,
    name: root.name,
    features,
    metadata: root.metadata,
  };
}

function decodeFeature(
  value: JsonValue,
  index: number,
  facts: MutableReportFacts,
): PlotFeature {
  const path = `$.features[${index}]`;
  if (!isJsonObject(value)) {
    throw currentSchemaError(path, "PlotJSON feature must be an object.");
  }
  const featureId = typeof value.id === "string" ? value.id : undefined;
  const plotType = typeof value.plotType === "string"
    ? value.plotType
    : undefined;
  recordUnknownFields(
    value,
    FEATURE_FIELDS,
    path,
    facts,
    featureId,
    plotType,
  );

  if (featureId === undefined || plotType === undefined) {
    throw currentSchemaError(
      path,
      "Feature id and plotType must be strings.",
      featureId,
      plotType,
    );
  }
  if (!Array.isArray(value.controlPoints)) {
    throw currentSchemaError(
      `${path}.controlPoints`,
      "Feature controlPoints must be an array.",
      featureId,
      plotType,
    );
  }

  const controlPoints = value.controlPoints.map((point, pointIndex) =>
    decodePosition(point, index, pointIndex, featureId, plotType),
  );
  const definitionVersion = decodeDefinitionVersion(
    value.definitionVersion,
    path,
    featureId,
    plotType,
    facts,
  );
  const parameters = decodeOptionalRecord(
    value.parameters,
    `${path}.parameters`,
    "PLOTJSON_PARAMETERS_DEFAULTED",
    featureId,
    plotType,
    facts,
  );
  const style = decodeOptionalRecord(
    value.style,
    `${path}.style`,
    "PLOTJSON_STYLE_DEFAULTED",
    featureId,
    plotType,
    facts,
  ) as PlotStyle;
  const metadata = decodeOptionalRecord(
    value.metadata,
    `${path}.metadata`,
    "PLOTJSON_FEATURE_METADATA_DEFAULTED",
    featureId,
    plotType,
    facts,
  );
  const revision = decodeRevision(
    value.revision,
    `${path}.revision`,
    featureId,
    plotType,
    facts,
  );

  return createPlotFeature({
    id: featureId,
    plotType,
    definitionVersion,
    controlPoints,
    parameters,
    style,
    metadata,
    revision,
  });
}

function decodePosition(
  value: JsonValue,
  featureIndex: number,
  pointIndex: number,
  featureId: string,
  plotType: string,
): Position {
  const path = `$.features[${featureIndex}].controlPoints[${pointIndex}]`;
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number"
  ) {
    throw currentSchemaError(
      path,
      "Control point must be [longitude, latitude].",
      featureId,
      plotType,
    );
  }
  if (value[1] < -90 || value[1] > 90) {
    throw currentSchemaError(
      path,
      "Control-point latitude must be within [-90, 90].",
      featureId,
      plotType,
    );
  }
  return Object.freeze([value[0], value[1]] as const);
}

function decodeDefinitionVersion(
  value: JsonValue | undefined,
  featurePath: string,
  featureId: string,
  plotType: string,
  facts: MutableReportFacts,
): string {
  const path = `${featurePath}.definitionVersion`;
  if (typeof value !== "string") {
    addNormalization(
      facts,
      "PLOTJSON_DEFINITION_VERSION_DEFAULTED",
      path,
      featureId,
      plotType,
    );
    if (value !== undefined) {
      addWarning(
        facts,
        "PLOTJSON_INVALID_RECORD_DEFAULTED",
        path,
        featureId,
        plotType,
      );
    }
    return "1.0.0";
  }
  try {
    return parsePlotJsonVersion(value).value;
  } catch (cause) {
    throw new PlotJsonError(
      "PLOTJSON_DEFINITION_VERSION_INVALID",
      "Feature definitionVersion must be a canonical numeric triple.",
      { path, featureId, plotType, cause },
    );
  }
}

function decodeOptionalRecord(
  value: JsonValue | undefined,
  path: string,
  code: PlotJsonNormalizationCode,
  featureId: string,
  plotType: string,
  facts: MutableReportFacts,
): Readonly<Record<string, JsonValue>> {
  if (isJsonObject(value)) return value;
  addNormalization(facts, code, path, featureId, plotType);
  if (value !== undefined) {
    addWarning(
      facts,
      "PLOTJSON_INVALID_RECORD_DEFAULTED",
      path,
      featureId,
      plotType,
    );
  }
  return Object.freeze({});
}

function decodeRevision(
  value: JsonValue | undefined,
  path: string,
  featureId: string,
  plotType: string,
  facts: MutableReportFacts,
): number {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return value;
  }
  addNormalization(
    facts,
    "PLOTJSON_REVISION_DEFAULTED",
    path,
    featureId,
    plotType,
  );
  if (value !== undefined) {
    addWarning(
      facts,
      "PLOTJSON_INVALID_REVISION_DEFAULTED",
      path,
      featureId,
      plotType,
    );
  }
  return 0;
}

function migrateDefinition(
  sourceFeature: PlotFeature,
  index: number,
  migrations: PlotJsonMigrationRegistry,
  targets: ReadPlotDocumentOptions["definitionTargets"],
  limits: Readonly<PlotJsonLimits>,
  facts: MutableReportFacts,
): PlotFeature {
  const source = Object.freeze({
    plotType: sourceFeature.plotType,
    definitionVersion: sourceFeature.definitionVersion,
  });
  if (!targets) return sourceFeature;
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

  const migrated = decodeFeature(current, index, facts);
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

  facts.featureSteps.push(Object.freeze({
    featureId: sourceFeature.id,
    source,
    target,
    steps: Object.freeze(applied),
  }));
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
    throw new PlotJsonError(
      code,
      "PlotJSON migration output is invalid.",
      {
        path,
        sourceVersion,
        targetVersion,
        ...(featureId === undefined ? {} : { featureId }),
        ...(plotType === undefined ? {} : { plotType }),
        cause,
      },
    );
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

function featureToJsonObject(feature: PlotFeature): PlotJsonObject {
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

function recordUnknownFields(
  object: PlotJsonObject,
  allowed: ReadonlySet<string>,
  basePath: string,
  facts: MutableReportFacts,
  featureId?: string,
  plotType?: string,
): void {
  for (const key of Object.keys(object).sort(compareStrings)) {
    if (allowed.has(key)) continue;
    const path = appendKey(basePath, key);
    addNormalization(
      facts,
      "PLOTJSON_UNKNOWN_FIELD_DROPPED",
      path,
      featureId,
      plotType,
    );
    addWarning(
      facts,
      "PLOTJSON_UNKNOWN_FIELD_DROPPED",
      path,
      featureId,
      plotType,
    );
  }
}

function addNormalization(
  facts: MutableReportFacts,
  code: PlotJsonNormalizationCode,
  path: string,
  featureId?: string,
  plotType?: string,
): void {
  facts.normalizations.push(Object.freeze({
    code,
    path,
    ...(featureId === undefined ? {} : { featureId }),
    ...(plotType === undefined ? {} : { plotType }),
  }));
}

function addWarning(
  facts: MutableReportFacts,
  code: PlotJsonWarningCode,
  path: string,
  featureId?: string,
  plotType?: string,
): void {
  facts.warnings.push(Object.freeze({
    code,
    path,
    ...(featureId === undefined ? {} : { featureId }),
    ...(plotType === undefined ? {} : { plotType }),
  }));
}

function currentSchemaError(
  path: string,
  message: string,
  featureId?: string,
  plotType?: string,
): PlotJsonError {
  return new PlotJsonError("PLOTJSON_CURRENT_SCHEMA_INVALID", message, {
    path,
    ...(featureId === undefined ? {} : { featureId }),
    ...(plotType === undefined ? {} : { plotType }),
  });
}

function isJsonObject(
  value: JsonValue | undefined,
): value is PlotJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function appendKey(path: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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
