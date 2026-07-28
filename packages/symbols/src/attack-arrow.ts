import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildAttackArrowRing,
  type AttackArrowParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const ATTACK_ARROW_TYPE = "arrow.attack";

export const attackArrowDefinition: PlotDefinition = {
  type: ATTACK_ARROW_TYPE,
  title: "Attack Arrow",
  category: "arrow",
  version: "1.0.0",
  controlSchema: {
    minPoints: 3,
    maxPoints: 64,
    completeOnDoubleClick: true,
    allowPointInsertion: true,
    allowPointRemoval: true,
  },
  defaultParameters: {
    headLengthRatio: 0.22,
    maximumHeadLengthTailRatio: 2.4,
    headHalfWidthTailRatio: 0.95,
    neckHalfWidthTailRatio: 0.32,
    bodyBulgeRatio: 1.08,
    bodyBulgePosition: 0.35,
    tension: 0.12,
    segmentsPerSpan: 16,
    miterLimit: 3,
    minimumTailWidthMeters: 1,
    maximumTailWidthMeters: 100000,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateAttackArrow(feature);
  },
};

export function generateAttackArrow(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length < 3) {
    throw new RangeError("Attack arrow requires at least three control points.");
  }

  const parameters = readParameters({
    ...attackArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildAttackArrowRing(feature.controlPoints, parameters);
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
          attackArrowDefinition.defaultStyle,
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
          attackArrowDefinition.defaultStyle,
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
          attackArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): AttackArrowParameters {
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
    bodyBulgeRatio: readNumber(parameters, "bodyBulgeRatio"),
    bodyBulgePosition: readNumber(parameters, "bodyBulgePosition"),
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
    throw new TypeError(`Attack arrow parameter "${key}" must be finite.`);
  }
  return value;
}
