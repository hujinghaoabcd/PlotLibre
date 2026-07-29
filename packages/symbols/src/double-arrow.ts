import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildDoubleArrowRing,
  type DoubleArrowParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const DOUBLE_ARROW_TYPE = "arrow.double";

export const doubleArrowDefinition: PlotDefinition = {
  type: DOUBLE_ARROW_TYPE,
  title: "Double Arrow",
  category: "arrow",
  version: "1.0.0",
  controlSchema: {
    minPoints: 4,
    maxPoints: 4,
    completeOnDoubleClick: false,
    allowPointInsertion: false,
    allowPointRemoval: false,
  },
  defaultParameters: {
    branchPositionRatio: 0.42,
    headLengthRatio: 0.22,
    maximumHeadLengthTailRatio: 2.2,
    headHalfWidthTailRatio: 0.58,
    neckHalfWidthTailRatio: 0.18,
    bodyBulgeRatio: 1.05,
    innerBridgeRatio: 0.55,
    tension: 0.18,
    segmentsPerSpan: 12,
    miterLimit: 3,
    minimumTailWidthMeters: 1,
    maximumTailWidthMeters: 100_000,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateDoubleArrow(feature);
  },
  validate({ feature }) {
    try {
      buildDoubleArrowRing(
        feature.controlPoints,
        readParameters({
          ...doubleArrowDefinition.defaultParameters,
          ...feature.parameters,
        }),
      );
      return { valid: true, issues: [] };
    } catch (error) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_DOUBLE_ARROW_GEOMETRY",
            message:
              error instanceof Error
                ? error.message
                : "Double arrow geometry is invalid.",
            severity: "error",
          },
        ],
      };
    }
  },
};

export function generateDoubleArrow(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length !== 4) {
    throw new RangeError("Double arrow requires exactly four control points.");
  }

  const parameters = readParameters({
    ...doubleArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildDoubleArrowRing(feature.controlPoints, parameters);
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
          doubleArrowDefinition.defaultStyle,
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
          doubleArrowDefinition.defaultStyle,
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
          doubleArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): DoubleArrowParameters {
  return {
    branchPositionRatio: readNumber(parameters, "branchPositionRatio"),
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
    bodyBulgeRatio: readNumber(parameters, "bodyBulgeRatio"),
    innerBridgeRatio: readNumber(parameters, "innerBridgeRatio"),
    tension: readNumber(parameters, "tension"),
    segmentsPerSpan: readNumber(parameters, "segmentsPerSpan"),
    miterLimit: readNumber(parameters, "miterLimit"),
    minimumTailWidthMeters: readNumber(
      parameters,
      "minimumTailWidthMeters",
    ),
    maximumTailWidthMeters: readNumber(
      parameters,
      "maximumTailWidthMeters",
    ),
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Double arrow parameter "${key}" must be finite.`);
  }
  return value;
}
