import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildBidirectionalRouteRing,
  type RouteMultiHeadParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const BIDIRECTIONAL_ROUTE_ARROW_TYPE = "arrow.route.bidirectional";

export const bidirectionalRouteArrowDefinition: PlotDefinition = {
  type: BIDIRECTIONAL_ROUTE_ARROW_TYPE,
  title: "Bidirectional Route Arrow",
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
    widthPathRatio: 0.026,
    minimumWidthMeters: 1,
    maximumWidthMeters: 100000,
    tension: 0.15,
    segmentsPerSpan: 16,
    miterLimit: 3,
    headLengthPathRatio: 0.11,
    headHalfWidthRibbonRatio: 2.2,
    neckHalfWidthRibbonRatio: 1,
    secondaryHeadLengthPathRatio: 0.065,
    secondaryHeadGapPathRatio: 0.035,
    secondaryHeadHalfWidthRibbonRatio: 1.9,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateBidirectionalRouteArrow(feature);
  },
  validate({ feature }) {
    try {
      buildBidirectionalRouteRing(
        feature.controlPoints,
        readParameters({
          ...bidirectionalRouteArrowDefinition.defaultParameters,
          ...feature.parameters,
        }),
      );
      return { valid: true, issues: [] };
    } catch (error) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_BIDIRECTIONAL_ROUTE_GEOMETRY",
            message:
              error instanceof Error
                ? error.message
                : "Bidirectional route geometry is invalid.",
            severity: "error",
          },
        ],
      };
    }
  },
};

export function generateBidirectionalRouteArrow(
  feature: PlotFeature,
): RenderBundle {
  const parameters = readParameters({
    ...bidirectionalRouteArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const geometry: PolygonGeometry = {
    type: "Polygon",
    coordinates: [
      buildBidirectionalRouteRing(feature.controlPoints, parameters),
    ],
  };
  return {
    fills: [renderFeature(feature, geometry, "fill", "fill")],
    lines: [renderFeature(feature, geometry, "outline", "outline")],
    points: [],
    labels: [],
    hitAreas: [renderFeature(feature, geometry, "hit-area", "hit-area")],
  };
}

function renderFeature(
  feature: PlotFeature,
  geometry: PolygonGeometry,
  suffix: string,
  role: "fill" | "outline" | "hit-area",
) {
  return {
    type: "Feature" as const,
    id: `${feature.id}:${suffix}`,
    geometry,
    properties: createRenderProperties(
      feature,
      role,
      bidirectionalRouteArrowDefinition.defaultStyle,
    ),
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): RouteMultiHeadParameters {
  return {
    widthPathRatio: readNumber(parameters, "widthPathRatio"),
    minimumWidthMeters: readNumber(parameters, "minimumWidthMeters"),
    maximumWidthMeters: readNumber(parameters, "maximumWidthMeters"),
    tension: readNumber(parameters, "tension"),
    segmentsPerSpan: readNumber(parameters, "segmentsPerSpan"),
    miterLimit: readNumber(parameters, "miterLimit"),
    headLengthPathRatio: readNumber(parameters, "headLengthPathRatio"),
    headHalfWidthRibbonRatio: readNumber(
      parameters,
      "headHalfWidthRibbonRatio",
    ),
    neckHalfWidthRibbonRatio: readNumber(
      parameters,
      "neckHalfWidthRibbonRatio",
    ),
    secondaryHeadLengthPathRatio: readNumber(
      parameters,
      "secondaryHeadLengthPathRatio",
    ),
    secondaryHeadGapPathRatio: readNumber(
      parameters,
      "secondaryHeadGapPathRatio",
    ),
    secondaryHeadHalfWidthRibbonRatio: readNumber(
      parameters,
      "secondaryHeadHalfWidthRibbonRatio",
    ),
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Bidirectional route parameter "${key}" must be finite.`);
  }
  return value;
}
