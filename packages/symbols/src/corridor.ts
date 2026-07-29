import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildCorridorRing,
  type CorridorParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const CORRIDOR_ARROW_TYPE = "arrow.corridor";

export const corridorArrowDefinition: PlotDefinition = {
  type: CORRIDOR_ARROW_TYPE,
  title: "Corridor",
  category: "arrow",
  version: "1.0.0",
  controlSchema: {
    minPoints: 2,
    maxPoints: 64,
    completeOnDoubleClick: true,
    allowPointInsertion: true,
    allowPointRemoval: true,
  },
  defaultParameters: {
    widthPathRatio: 0.06,
    minimumWidthMeters: 1,
    maximumWidthMeters: 100000,
    tension: 0.15,
    segmentsPerSpan: 16,
    miterLimit: 3,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateCorridor(feature);
  },
  validate({ feature }) {
    try {
      buildCorridorRing(
        feature.controlPoints,
        readParameters({
          ...corridorArrowDefinition.defaultParameters,
          ...feature.parameters,
        }),
      );
      return { valid: true, issues: [] };
    } catch (error) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_CORRIDOR_GEOMETRY",
            message:
              error instanceof Error
                ? error.message
                : "Corridor geometry is invalid.",
            severity: "error",
          },
        ],
      };
    }
  },
};

export function generateCorridor(feature: PlotFeature): RenderBundle {
  const parameters = readParameters({
    ...corridorArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildCorridorRing(feature.controlPoints, parameters);
  const geometry: PolygonGeometry = {
    type: "Polygon",
    coordinates: [ring],
  };
  return polygonBundle(feature, geometry);
}

function polygonBundle(
  feature: PlotFeature,
  geometry: PolygonGeometry,
): RenderBundle {
  return {
    fills: [
      {
        type: "Feature",
        id: `${feature.id}:fill`,
        geometry,
        properties: createRenderProperties(
          feature,
          "fill",
          corridorArrowDefinition.defaultStyle,
        ),
      },
    ],
    lines: [
      {
        type: "Feature",
        id: `${feature.id}:outline`,
        geometry,
        properties: createRenderProperties(
          feature,
          "outline",
          corridorArrowDefinition.defaultStyle,
        ),
      },
    ],
    points: [],
    labels: [],
    hitAreas: [
      {
        type: "Feature",
        id: `${feature.id}:hit-area`,
        geometry,
        properties: createRenderProperties(
          feature,
          "hit-area",
          corridorArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): CorridorParameters {
  return {
    widthPathRatio: readNumber(parameters, "widthPathRatio"),
    minimumWidthMeters: readNumber(parameters, "minimumWidthMeters"),
    maximumWidthMeters: readNumber(parameters, "maximumWidthMeters"),
    tension: readNumber(parameters, "tension"),
    segmentsPerSpan: readNumber(parameters, "segmentsPerSpan"),
    miterLimit: readNumber(parameters, "miterLimit"),
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Corridor parameter "${key}" must be finite.`);
  }
  return value;
}
