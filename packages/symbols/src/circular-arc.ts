import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  RenderBundle,
} from "@plotlibre/core";
import { buildCircularArcLine } from "@plotlibre/geometry";
import {
  createCircularLineBundle,
  readSegmentsPerCircle,
} from "./circular-common.js";
import { DEFAULT_LINE_STYLE } from "./style.js";

export const CIRCULAR_ARC_TYPE = "line.circular-arc";

export const circularArcDefinition: PlotDefinition = {
  type: CIRCULAR_ARC_TYPE,
  title: "Circular Arc",
  category: "line",
  version: "1.0.0",
  controlSchema: {
    minPoints: 3,
    maxPoints: 3,
  },
  defaultParameters: {
    segmentsPerCircle: 128,
  },
  defaultStyle: DEFAULT_LINE_STYLE,
  generate({ feature }) {
    return generateCircularArc(feature);
  },
};

export function generateCircularArc(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length !== 3) {
    throw new RangeError("Circular arc requires exactly three control points.");
  }
  const parameters = {
    ...circularArcDefinition.defaultParameters,
    ...feature.parameters,
  } satisfies Readonly<Record<string, JsonValue>>;
  const coordinates = buildCircularArcLine(feature.controlPoints, {
    segmentsPerCircle: readSegmentsPerCircle(parameters, "Circular arc"),
  });
  return createCircularLineBundle(
    feature,
    coordinates,
    circularArcDefinition.defaultStyle,
  );
}
