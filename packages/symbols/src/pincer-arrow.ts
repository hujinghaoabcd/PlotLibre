import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildPincerArrowRing,
  type PincerArrowParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const PINCER_ARROW_TYPE = "arrow.pincer";

export const pincerArrowDefinition: PlotDefinition = {
  type: PINCER_ARROW_TYPE,
  title: "Pincer Arrow",
  category: "arrow",
  version: "1.0.0",
  controlSchema: {
    minPoints: 5,
    maxPoints: 5,
    completeOnDoubleClick: false,
    allowPointInsertion: false,
    allowPointRemoval: false,
  },
  defaultParameters: {
    headLengthRatio: 0.2,
    maximumHeadLengthTailRatio: 2.1,
    headHalfWidthTailRatio: 0.52,
    neckHalfWidthTailRatio: 0.16,
    armBulgeRatio: 1.05,
    outerTension: 0.18,
    innerTension: 0.36,
    junctionShoulderRatio: 0.38,
    segmentsPerSpan: 16,
    miterLimit: 3,
    minimumTailSpanMeters: 1,
    maximumTailSpanMeters: 100_000,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generatePincerArrow(feature);
  },
  validate({ feature }) {
    try {
      buildPincerArrowRing(
        feature.controlPoints,
        readParameters({
          ...pincerArrowDefinition.defaultParameters,
          ...feature.parameters,
        }),
      );
      return { valid: true, issues: [] };
    } catch (error) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_PINCER_ARROW_GEOMETRY",
            message:
              error instanceof Error
                ? error.message
                : "Pincer arrow geometry is invalid.",
            severity: "error",
          },
        ],
      };
    }
  },
};

export function generatePincerArrow(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length !== 5) {
    throw new RangeError("Pincer arrow requires exactly five control points.");
  }
  const parameters = readParameters({
    ...pincerArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildPincerArrowRing(feature.controlPoints, parameters);
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
          pincerArrowDefinition.defaultStyle,
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
          pincerArrowDefinition.defaultStyle,
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
          pincerArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): PincerArrowParameters {
  return {
    headLengthRatio: readNumber(parameters, "headLengthRatio"),
    maximumHeadLengthTailRatio: readNumber(
      parameters,
      "maximumHeadLengthTailRatio",
    ),
    headHalfWidthTailRatio: readNumber(
      parameters,
      "headHalfWidthTailRatio",
    ),
    neckHalfWidthTailRatio: readNumber(
      parameters,
      "neckHalfWidthTailRatio",
    ),
    armBulgeRatio: readNumber(parameters, "armBulgeRatio"),
    outerTension: readNumber(parameters, "outerTension"),
    innerTension: readNumber(parameters, "innerTension"),
    junctionShoulderRatio: readNumber(
      parameters,
      "junctionShoulderRatio",
    ),
    segmentsPerSpan: readNumber(parameters, "segmentsPerSpan"),
    miterLimit: readNumber(parameters, "miterLimit"),
    minimumTailSpanMeters: readNumber(
      parameters,
      "minimumTailSpanMeters",
    ),
    maximumTailSpanMeters: readNumber(
      parameters,
      "maximumTailSpanMeters",
    ),
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Pincer arrow parameter "${key}" must be finite.`);
  }
  return value;
}
