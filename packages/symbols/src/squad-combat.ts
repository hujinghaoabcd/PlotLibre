import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  RenderBundle,
} from "@plotlibre/core";
import {
  buildSquadCombatRing,
  type SquadCombatParameters,
} from "@plotlibre/geometry";
import { createRenderProperties, DEFAULT_ARROW_STYLE } from "./style.js";

export const SQUAD_COMBAT_ARROW_TYPE = "arrow.squad-combat";

export const squadCombatArrowDefinition: PlotDefinition = {
  type: SQUAD_COMBAT_ARROW_TYPE,
  title: "Squad Combat Arrow",
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
    headLengthRatio: 0.18,
    maximumHeadLengthTailRatio: 2.2,
    headHalfWidthTailRatio: 0.82,
    neckHalfWidthTailRatio: 0.28,
    bodyBulgeRatio: 1.02,
    bodyBulgePosition: 0.32,
    tension: 0.12,
    segmentsPerSpan: 16,
    miterLimit: 3,
    minimumTailWidthMeters: 1,
    maximumTailWidthMeters: 100000,
    tailWidthPathRatio: 0.04,
  },
  defaultStyle: DEFAULT_ARROW_STYLE,
  generate({ feature }) {
    return generateSquadCombatArrow(feature);
  },
  validate({ feature }) {
    try {
      buildSquadCombatRing(
        feature.controlPoints,
        readParameters({
          ...squadCombatArrowDefinition.defaultParameters,
          ...feature.parameters,
        }),
      );
      return { valid: true, issues: [] };
    } catch (error) {
      return {
        valid: false,
        issues: [
          {
            code: "INVALID_SQUAD_COMBAT_GEOMETRY",
            message:
              error instanceof Error
                ? error.message
                : "Squad combat arrow geometry is invalid.",
            severity: "error",
          },
        ],
      };
    }
  },
};

export function generateSquadCombatArrow(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length < 2) {
    throw new RangeError(
      "Squad combat arrow requires at least two control points.",
    );
  }

  const parameters = readParameters({
    ...squadCombatArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  const ring = buildSquadCombatRing(feature.controlPoints, parameters);
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
          squadCombatArrowDefinition.defaultStyle,
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
          squadCombatArrowDefinition.defaultStyle,
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
          squadCombatArrowDefinition.defaultStyle,
        ),
      },
    ],
  };
}

function readParameters(
  parameters: Readonly<Record<string, JsonValue>>,
): SquadCombatParameters {
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
    tailWidthPathRatio: readNumber(parameters, "tailWidthPathRatio"),
  };
}

function readNumber(
  parameters: Readonly<Record<string, JsonValue>>,
  key: string,
): number {
  const value = parameters[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Squad combat parameter "${key}" must be finite.`);
  }
  return value;
}
