import { PlotJsonError } from "./plotjson-error.js";
import type {
  PlotJsonFeatureMigrationRecord,
  PlotJsonNormalizationCode,
  PlotJsonNormalizationRecord,
  PlotJsonWarning,
  PlotJsonWarningCode,
  PlotJsonAppliedDocumentStep,
} from "./plotjson-migration-report.js";
import type { PlotJsonObject } from "./plotjson-migration-types.js";
import { parsePlotJsonVersion } from "./plotjson-version.js";
import {
  createPlotFeature,
  type JsonValue,
  type PlotFeature,
  type PlotStyle,
  type Position,
} from "./types.js";

export interface MutablePlotJsonReportFacts {
  readonly documentSteps: PlotJsonAppliedDocumentStep[];
  readonly featureSteps: PlotJsonFeatureMigrationRecord[];
  readonly normalizations: PlotJsonNormalizationRecord[];
  readonly warnings: PlotJsonWarning[];
}

export interface DecodedCurrentPlotJsonDocument {
  readonly id: string;
  readonly name: string;
  readonly features: readonly PlotFeature[];
  readonly metadata: Readonly<Record<string, JsonValue>>;
}

const ROOT_FIELDS = new Set([
  "type",
  "schemaVersion",
  "id",
  "name",
  "features",
  "metadata",
]);
const FEATURE_FIELDS = new Set([
  "id",
  "plotType",
  "definitionVersion",
  "controlPoints",
  "parameters",
  "style",
  "metadata",
  "revision",
]);

export function decodeCurrentPlotJsonDocument(
  root: PlotJsonObject,
  facts: MutablePlotJsonReportFacts,
): DecodedCurrentPlotJsonDocument {
  recordUnknownFields(root, ROOT_FIELDS, "$", facts);
  if (typeof root.id !== "string" || typeof root.name !== "string") {
    throw currentSchemaError("$", "PlotJSON id and name must be strings.");
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
    const feature = decodeCurrentPlotJsonFeature(value, index, facts);
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

export function decodeCurrentPlotJsonFeature(
  value: JsonValue,
  index: number,
  facts: MutablePlotJsonReportFacts,
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
  facts: MutablePlotJsonReportFacts,
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
  facts: MutablePlotJsonReportFacts,
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
  facts: MutablePlotJsonReportFacts,
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

function recordUnknownFields(
  object: PlotJsonObject,
  allowed: ReadonlySet<string>,
  basePath: string,
  facts: MutablePlotJsonReportFacts,
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
  facts: MutablePlotJsonReportFacts,
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
  facts: MutablePlotJsonReportFacts,
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
