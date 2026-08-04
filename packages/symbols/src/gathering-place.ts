import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  Position,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildGatheringPlaceRing,
  canonicalizeGatheringPlaceControls,
  type GatheringPlaceParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_AREA_STYLE } from "./style.js";

export const GATHERING_PLACE_TYPE = "area.gathering-place";

export const gatheringPlaceDefinition: PlotDefinition = {
  type: GATHERING_PLACE_TYPE,
  title: "Gathering Place",
  category: "area",
  version: "1.0.0",
  controlSchema: {
    minPoints: 3,
    maxPoints: 3,
  },
  defaultParameters: {
    tension: 0.35,
    segmentsPerSpan: 16,
    rearDepthRatio: 0.65,
  },
  defaultStyle: DEFAULT_AREA_STYLE,
  canonicalizeControlPoints({ feature }) {
    return canonicalizeGatheringPlaceControls(feature.controlPoints);
  },
  generate({ feature }) {
    return generateGatheringPlace(feature);
  },
};

export function generateGatheringPlace(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length !== 3) {
    throw new RangeError("Gathering place requires exactly three control points.");
  }

  const parameters = readParameters({
    ...gatheringPlaceDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildGatheringPlaceRing(feature.controlPoints, parameters);
  return createAreaRenderBundle(feature, ring);
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): GatheringPlaceParameters {
  return {
    tension: readNumber(parameters, "tension"),
    segmentsPerSpan: readNumber(parameters, "segmentsPerSpan"),
    rearDepthRatio: readNumber(parameters, "rearDepthRatio"),
  };
}

function createAreaRenderBundle(
  feature: PlotFeature,
  ring: readonly Position[],
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
          gatheringPlaceDefinition.defaultStyle,
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
          gatheringPlaceDefinition.defaultStyle,
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
          gatheringPlaceDefinition.defaultStyle,
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
    throw new TypeError(`Gathering-place parameter "${key}" must be finite.`);
  }
  return value;
}
