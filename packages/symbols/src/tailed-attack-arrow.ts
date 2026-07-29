import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildTailedAttackArrowRing,
  type TailedAttackArrowParameters,
} from "@plotlibre/geometry";
import { attackArrowDefinition } from "./attack-arrow.js";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const TAILED_ATTACK_ARROW_TYPE = "arrow.attack.tailed";

export const tailedAttackArrowDefinition: PlotDefinition = {
  type: TAILED_ATTACK_ARROW_TYPE,
  title: "Tailed Attack Arrow",
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
    ...attackArrowDefinition.defaultParameters,
    tailNotchDepthRatio: 0.75,
    tailNotchWidthRatio: 0.65,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateTailedAttackArrow(feature);
  },
  validate({ feature }) {
    try {
      buildTailedAttackArrowRing(
        feature.controlPoints,
        readParameters({
          ...tailedAttackArrowDefinition.defaultParameters,
          ...feature.parameters,
        }),
      );
      return { valid: true, issues: [] };
    } catch (error) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_TAILED_ATTACK_ARROW_GEOMETRY",
            message:
              error instanceof Error
                ? error.message
                : "Tailed attack arrow geometry is invalid.",
            severity: "error",
          },
        ],
      };
    }
  },
};

export function generateTailedAttackArrow(
  feature: PlotFeature,
): RenderBundle {
  if (feature.controlPoints.length < 3) {
    throw new RangeError(
      "Tailed attack arrow requires at least three control points.",
    );
  }

  const parameters = readParameters({
    ...tailedAttackArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildTailedAttackArrowRing(
    feature.controlPoints,
    parameters,
  );
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
          tailedAttackArrowDefinition.defaultStyle,
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
          tailedAttackArrowDefinition.defaultStyle,
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
          tailedAttackArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): TailedAttackArrowParameters {
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
    tailNotchDepthRatio: readNumber(
      parameters,
      "tailNotchDepthRatio",
    ),
    tailNotchWidthRatio: readNumber(
      parameters,
      "tailNotchWidthRatio",
    ),
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(
      `Tailed attack arrow parameter "${key}" must be finite.`,
    );
  }
  return value;
}
