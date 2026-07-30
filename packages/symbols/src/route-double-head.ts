import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildDoubleHeadRouteRings,
  type RouteMultiHeadParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const DOUBLE_HEAD_ROUTE_ARROW_TYPE = "arrow.route.double-head";

export const doubleHeadRouteArrowDefinition: PlotDefinition = {
  type: DOUBLE_HEAD_ROUTE_ARROW_TYPE,
  title: "Double-Head Route Arrow",
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
    return generateDoubleHeadRouteArrow(feature);
  },
  validate({ feature }) {
    try {
      buildDoubleHeadRouteRings(
        feature.controlPoints,
        readParameters({
          ...doubleHeadRouteArrowDefinition.defaultParameters,
          ...feature.parameters,
        }),
      );
      return { valid: true, issues: [] };
    } catch (error) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_DOUBLE_HEAD_ROUTE_GEOMETRY",
            message:
              error instanceof Error
                ? error.message
                : "Double-head route geometry is invalid.",
            severity: "error",
          },
        ],
      };
    }
  },
};

export function generateDoubleHeadRouteArrow(
  feature: PlotFeature,
): RenderBundle {
  const parameters = readParameters({
    ...doubleHeadRouteArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const rings = buildDoubleHeadRouteRings(feature.controlPoints, parameters);
  const geometries: readonly PolygonGeometry[] = [
    { type: "Polygon", coordinates: [rings.primary] },
    { type: "Polygon", coordinates: [rings.secondary] },
  ];
  return {
    fills: geometries.map((geometry, index) =>
      renderFeature(feature, geometry, `fill-${index}`, "fill"),
    ),
    lines: geometries.map((geometry, index) =>
      renderFeature(feature, geometry, `outline-${index}`, "outline"),
    ),
    points: [],
    labels: [],
    hitAreas: geometries.map((geometry, index) =>
      renderFeature(feature, geometry, `hit-area-${index}`, "hit-area"),
    ),
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
      doubleHeadRouteArrowDefinition.defaultStyle,
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
    throw new TypeError(`Double-head route parameter "${key}" must be finite.`);
  }
  return value;
}
