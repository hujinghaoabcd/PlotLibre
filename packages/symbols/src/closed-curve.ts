import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildClosedCurveRing,
  type ClosedAreaParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_AREA_STYLE } from "./style.js";

export const CLOSED_CURVE_TYPE = "area.closed-curve";

export const closedCurveDefinition: PlotDefinition = {
  type: CLOSED_CURVE_TYPE,
  title: "Closed Curve",
  category: "area",
  version: "1.0.0",
  controlSchema: {
    minPoints: 3,
    maxPoints: 64,
    completeOnDoubleClick: true,
    allowPointInsertion: true,
    allowPointRemoval: true,
  },
  defaultParameters: {
    tension: 0.2,
    segmentsPerSpan: 16,
  },
  defaultStyle: DEFAULT_AREA_STYLE,
  generate({ feature }) {
    return generateClosedCurve(feature);
  },
};

export function generateClosedCurve(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length < 3) {
    throw new RangeError("Closed curve requires at least three control points.");
  }

  const parameters = readParameters({
    ...closedCurveDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildClosedCurveRing(feature.controlPoints, parameters);
  return createAreaRenderBundle(feature, ring);
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): ClosedAreaParameters {
  return {
    tension: readNumber(parameters, "tension"),
    segmentsPerSpan: readNumber(parameters, "segmentsPerSpan"),
  };
}

function createAreaRenderBundle(
  feature: PlotFeature,
  ring: readonly (readonly [number, number])[],
): RenderBundle {
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
          closedCurveDefinition.defaultStyle,
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
          closedCurveDefinition.defaultStyle,
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
          closedCurveDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Closed curve parameter "${key}" must be finite.`);
  }
  return value;
}
