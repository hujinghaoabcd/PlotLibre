import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  PolygonGeometry,
  Position,
  RenderBundle,
  ValidationIssue,
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
  version: "1.1.0",
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
  canonicalizeControlPoints({ feature }) {
    return canonicalizePincerControlPoints(feature);
  },
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
        issues: [classifyPincerValidationError(error)],
      };
    }
  },
};

export function canonicalizePincerControlPoints(
  feature: PlotFeature,
): readonly Position[] {
  const direct = feature.controlPoints.map(clonePosition);
  if (direct.length !== 5) return direct;

  const parameters = readParameters({
    ...pincerArrowDefinition.defaultParameters,
    ...feature.parameters,
  });
  if (canBuildPincer(direct, parameters)) return direct;

  const swapped = [
    direct[0]!,
    direct[1]!,
    direct[3]!,
    direct[2]!,
    direct[4]!,
  ];
  return canBuildPincer(swapped, parameters) ? swapped : direct;
}

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

function canBuildPincer(
  controlPoints: readonly Position[],
  parameters: PincerArrowParameters,
): boolean {
  try {
    buildPincerArrowRing(controlPoints, parameters);
    return true;
  } catch {
    return false;
  }
}

function classifyPincerValidationError(error: unknown): ValidationIssue {
  const message =
    error instanceof Error ? error.message : "Pincer arrow geometry is invalid.";
  const rules: readonly (readonly [substring: string, code: string])[] = [
    ["requires exactly five control points", "PINCER_CONTROL_COUNT_INVALID"],
    ["must be distinct", "PINCER_CONTROL_POINTS_NOT_DISTINCT"],
    ["must define a forward direction", "PINCER_FORWARD_DIRECTION_UNDEFINED"],
    ["outer tails must lie on opposite sides", "PINCER_TAILS_SAME_SIDE"],
    ["junction must remain in the admissible", "PINCER_JUNCTION_OUTSIDE_ZONE"],
    ["junction is too far laterally", "PINCER_JUNCTION_TOO_FAR_LATERALLY"],
    ["tail span must be at least", "PINCER_TAIL_SPAN_TOO_SHORT"],
    ["tail span must not exceed", "PINCER_TAIL_SPAN_TOO_LONG"],
    ["arm is too short", "PINCER_ARM_TOO_SHORT"],
    ["objective must remain ahead", "PINCER_OBJECTIVE_NOT_AHEAD"],
    ["paired arm centerlines cross", "PINCER_ARM_PAIRING_CROSSES"],
    ["tail baseline does not span", "PINCER_TAIL_FRAME_INVALID"],
    ["authored inner junction exactly once", "PINCER_JUNCTION_TOPOLOGY_INVALID"],
    ["self-intersecting ring", "PINCER_SELF_INTERSECTION"],
    ["parameter", "PINCER_PARAMETERS_INVALID"],
  ];
  const code =
    rules.find(([substring]) => message.includes(substring))?.[1] ??
    "INVALID_PINCER_ARROW_GEOMETRY";
  return { code, message, severity: "error" };
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

function clonePosition([longitude, latitude]: Position): Position {
  return [longitude, latitude];
}
