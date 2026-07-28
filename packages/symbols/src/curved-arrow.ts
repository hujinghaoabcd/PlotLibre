import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildCurvedArrowRing,
  type CurvedArrowParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const CURVED_ARROW_TYPE = "arrow.curved";

export const curvedArrowDefinition: PlotDefinition = {
  type: CURVED_ARROW_TYPE,
  title: "Curved Arrow",
  category: "arrow",
  version: "1.0.0",
  controlSchema: {
    minPoints: 3,
    maxPoints: 64,
    completeOnDoubleClick: true,
    allowPointInsertion: true,
    allowPointRemoval: true,
  },
  defaultParameters: {
    tailWidthRatio: 0.065,
    headLengthRatio: 0.22,
    headWidthRatio: 2.3,
    neckWidthRatio: 0.55,
    tension: 0.15,
    segmentsPerSpan: 16,
    miterLimit: 3,
    minimumWidthMeters: 1,
    maximumWidthMeters: 100000,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateCurvedArrow(feature);
  },
};

export function generateCurvedArrow(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length < 3) {
    throw new RangeError("Curved arrow requires at least three control points.");
  }

  const parameters = readParameters({
    ...curvedArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildCurvedArrowRing(feature.controlPoints, parameters);
  const geometry: PolygonGeometry = {
    type: "Polygon",
    coordinates: [ring],
  };

  return {
    fills: [
      {
        type: "Feature",
        id: `${feature.id}:fill`,
        geometry,
        properties: createRenderProperties(
          feature,
          "fill",
          curvedArrowDefinition.defaultStyle,
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
          curvedArrowDefinition.defaultStyle,
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
          curvedArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): CurvedArrowParameters {
  return {
    tailWidthRatio: readNumber(parameters, "tailWidthRatio"),
    headLengthRatio: readNumber(parameters, "headLengthRatio"),
    headWidthRatio: readNumber(parameters, "headWidthRatio"),
    neckWidthRatio: readNumber(parameters, "neckWidthRatio"),
    tension: readNumber(parameters, "tension"),
    segmentsPerSpan: readNumber(parameters, "segmentsPerSpan"),
    miterLimit: readNumber(parameters, "miterLimit"),
    minimumWidthMeters: readNumber(parameters, "minimumWidthMeters"),
    maximumWidthMeters: readNumber(parameters, "maximumWidthMeters"),
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Curved arrow parameter "${key}" must be finite.`);
  }
  return value;
}
