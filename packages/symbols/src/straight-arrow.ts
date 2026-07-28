import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildStraightArrowRing,
  type StraightArrowParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const STRAIGHT_ARROW_TYPE = "arrow.straight";

export const straightArrowDefinition: PlotDefinition = {
  type: STRAIGHT_ARROW_TYPE,
  title: "Straight Arrow",
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
    tailWidthRatio: 0.08,
    headLengthRatio: 0.28,
    headWidthRatio: 2.4,
    neckWidthRatio: 0.8,
    minimumWidthMeters: 1,
    maximumWidthMeters: 100000,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateStraightArrow(feature);
  },
};

export function generateStraightArrow(feature: PlotFeature): RenderBundle {
  const [start, end] = feature.controlPoints;
  if (!start || !end) {
    throw new RangeError("Straight arrow requires exactly two control points.");
  }

  const parameters = readStraightArrowParameters({
    ...straightArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildStraightArrowRing(start, end, parameters);
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
          straightArrowDefinition.defaultStyle,
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
          straightArrowDefinition.defaultStyle,
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
          straightArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readStraightArrowParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): StraightArrowParameters {
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
    throw new TypeError(`Straight arrow parameter "${key}" must be finite.`);
  }
  return value;
}
