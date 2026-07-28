import { InvalidPlotFeatureError } from "./errors.js";
import {
  createPlotFeature,
  type JsonValue,
  type PlotDocument,
  type PlotFeature,
} from "./types.js";

export interface CreatePlotDocumentOptions {
  readonly id: string;
  readonly name: string;
  readonly features?: readonly PlotFeature[];
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

export function createPlotDocument(
  options: CreatePlotDocumentOptions,
): PlotDocument {
  return {
    type: "PlotLibreDocument",
    schemaVersion: "1.0.0",
    id: options.id,
    name: options.name,
    features: (options.features ?? []).map(createPlotFeature),
    metadata: { ...(options.metadata ?? {}) },
  };
}

export function serializePlotDocument(document: PlotDocument): string {
  return JSON.stringify(document, null, 2);
}

export function parsePlotDocument(value: string | unknown): PlotDocument {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  if (!isRecord(parsed)) {
    throw new InvalidPlotFeatureError("PlotJSON root must be an object.");
  }
  if (parsed.type !== "PlotLibreDocument" || parsed.schemaVersion !== "1.0.0") {
    throw new InvalidPlotFeatureError(
      "Unsupported PlotJSON document type or schemaVersion.",
    );
  }
  if (typeof parsed.id !== "string" || typeof parsed.name !== "string") {
    throw new InvalidPlotFeatureError("PlotJSON id and name must be strings.");
  }
  if (!Array.isArray(parsed.features)) {
    throw new InvalidPlotFeatureError("PlotJSON features must be an array.");
  }
  if (!isRecord(parsed.metadata)) {
    throw new InvalidPlotFeatureError("PlotJSON metadata must be an object.");
  }

  const features = parsed.features.map((feature, index) =>
    parseFeature(feature, index),
  );

  return createPlotDocument({
    id: parsed.id,
    name: parsed.name,
    features,
    metadata: parsed.metadata as Record<string, JsonValue>,
  });
}

function parseFeature(value: unknown, index: number): PlotFeature {
  if (!isRecord(value)) {
    throw new InvalidPlotFeatureError(`Feature ${index} must be an object.`);
  }
  if (typeof value.id !== "string" || typeof value.plotType !== "string") {
    throw new InvalidPlotFeatureError(
      `Feature ${index} must contain string id and plotType fields.`,
    );
  }
  if (!Array.isArray(value.controlPoints)) {
    throw new InvalidPlotFeatureError(
      `Feature ${index} controlPoints must be an array.`,
    );
  }
  const controlPoints = value.controlPoints.map((point, pointIndex) => {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      typeof point[0] !== "number" ||
      typeof point[1] !== "number"
    ) {
      throw new InvalidPlotFeatureError(
        `Feature ${index} control point ${pointIndex} must be [longitude, latitude].`,
      );
    }
    return [point[0], point[1]] as const;
  });

  return createPlotFeature({
    id: value.id,
    plotType: value.plotType,
    definitionVersion:
      typeof value.definitionVersion === "string"
        ? value.definitionVersion
        : "1.0.0",
    controlPoints,
    parameters: isRecord(value.parameters)
      ? (value.parameters as Record<string, JsonValue>)
      : {},
    style: isRecord(value.style) ? value.style : {},
    metadata: isRecord(value.metadata)
      ? (value.metadata as Record<string, JsonValue>)
      : {},
    revision:
      typeof value.revision === "number" && Number.isInteger(value.revision)
        ? value.revision
        : 0,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
