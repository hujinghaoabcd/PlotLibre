import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildRouteArrowRing,
  type RouteArrowParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const ROUTE_ARROW_TYPE = "arrow.route";

export const routeArrowDefinition: PlotDefinition = {
  type: ROUTE_ARROW_TYPE,
  title: "Route Arrow",
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
    widthPathRatio: 0.028,
    minimumWidthMeters: 1,
    maximumWidthMeters: 100000,
    tension: 0.15,
    segmentsPerSpan: 16,
    miterLimit: 3,
    headLengthPathRatio: 0.12,
    headHalfWidthRibbonRatio: 2.2,
    neckHalfWidthRibbonRatio: 1,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateRouteArrow(feature);
  },
  validate({ feature }) {
    try {
      buildRouteArrowRing(
        feature.controlPoints,
        readParameters({
          ...routeArrowDefinition.defaultParameters,
          ...feature.parameters,
        }),
      );
      return { valid: true, issues: [] };
    } catch (error) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_ROUTE_ARROW_GEOMETRY",
            message:
              error instanceof Error
                ? error.message
                : "Route arrow geometry is invalid.",
            severity: "error",
          },
        ],
      };
    }
  },
};

export function generateRouteArrow(feature: PlotFeature): RenderBundle {
  const parameters = readParameters({
    ...routeArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildRouteArrowRing(feature.controlPoints, parameters);
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
          routeArrowDefinition.defaultStyle,
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
          routeArrowDefinition.defaultStyle,
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
          routeArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): RouteArrowParameters {
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
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Route arrow parameter "${key}" must be finite.`);
  }
  return value;
}
