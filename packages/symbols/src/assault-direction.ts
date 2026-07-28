import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildAssaultDirectionRing,
  type AssaultDirectionParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const ASSAULT_DIRECTION_TYPE = "arrow.assault-direction";

export const assaultDirectionDefinition: PlotDefinition = {
  type: ASSAULT_DIRECTION_TYPE,
  title: "Assault Direction",
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
    bodyWidthRatio: 0.18,
    headLengthRatio: 0.3,
    headAngleDegrees: 42,
    neckWidthRatio: 0.72,
    minimumWidthMeters: 2,
    maximumWidthMeters: 100000,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateAssaultDirection(feature);
  },
};

export function generateAssaultDirection(feature: PlotFeature): RenderBundle {
  const [tail, tip] = feature.controlPoints;
  if (!tail || !tip) {
    throw new RangeError(
      "Assault direction requires exactly two control points.",
    );
  }

  const parameters = readParameters({
    ...assaultDirectionDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildAssaultDirectionRing(tail, tip, parameters);
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
          assaultDirectionDefinition.defaultStyle,
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
          assaultDirectionDefinition.defaultStyle,
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
          assaultDirectionDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): AssaultDirectionParameters {
  return {
    bodyWidthRatio: readNumber(parameters, "bodyWidthRatio"),
    headLengthRatio: readNumber(parameters, "headLengthRatio"),
    headAngleDegrees: readNumber(parameters, "headAngleDegrees"),
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
    throw new TypeError(
      `Assault direction parameter "${key}" must be finite.`,
    );
  }
  return value;
}
