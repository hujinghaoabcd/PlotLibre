import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildFineArrowRing,
  type FineArrowParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const FINE_ARROW_TYPE = "arrow.fine";

export const fineArrowDefinition: PlotDefinition = {
  type: FINE_ARROW_TYPE,
  title: "Fine Arrow",
  category: "arrow",
  version: "1.0.0",
  controlSchema: {
    minPoints: 2,
    maxPoints: 2,
    completeOnDoubleClick: false,
    allowPointInsertion: false,
    allowPointRemoval: false,
  },
  defaultParameters: {
    tailWidthRatio: 0.055,
    headLengthRatio: 0.22,
    headWidthRatio: 1.9,
    neckWidthRatio: 0.42,
    minimumWidthMeters: 1,
    maximumWidthMeters: 100000,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateFineArrow(feature);
  },
};

export function generateFineArrow(feature: PlotFeature): RenderBundle {
  const [tail, tip] = feature.controlPoints;
  if (!tail || !tip) {
    throw new RangeError("Fine arrow requires exactly two control points.");
  }

  const parameters = readFineArrowParameters({
    ...fineArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildFineArrowRing(tail, tip, parameters);
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
          fineArrowDefinition.defaultStyle,
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
          fineArrowDefinition.defaultStyle,
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
          fineArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readFineArrowParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): FineArrowParameters {
  return {
    tailWidthRatio: readNumber(parameters, "tailWidthRatio"),
    headLengthRatio: readNumber(parameters, "headLengthRatio"),
    headWidthRatio: readNumber(parameters, "headWidthRatio"),
    neckWidthRatio: readNumber(parameters, "neckWidthRatio"),
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
    throw new TypeError(`Fine arrow parameter "${key}" must be finite.`);
  }
  return value;
}
