import {
  readPlotDocument,
  type ReadPlotDocumentOptions,
} from "./plotjson-reader.js";
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

/**
 * Compatibility wrapper for callers that need the current PlotDocument only.
 * Use readPlotDocument() when migration and normalization evidence is required.
 */
export function parsePlotDocument(
  value: string | unknown,
  options: ReadPlotDocumentOptions = {},
): PlotDocument {
  return readPlotDocument(value, options).document;
}
