import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  RenderBundle,
} from "@plotlibre/core";
import { buildCircularSegmentRing } from "@plotlibre/geometry";
import {
  createCircularAreaBundle,
  readSegmentsPerCircle,
} from "./circular-common.js";
import { DEFAULT_AREA_STYLE } from "./style.js";

export const CIRCULAR_SEGMENT_TYPE = "area.circular-segment";

export const circularSegmentDefinition: PlotDefinition = {
  type: CIRCULAR_SEGMENT_TYPE,
  title: "Circular Segment",
  category: "area",
  version: "1.0.0",
  controlSchema: {
    minPoints: 3,
    maxPoints: 3,
  },
  defaultParameters: {
    segmentsPerCircle: 128,
  },
  defaultStyle: DEFAULT_AREA_STYLE,
  generate({ feature }) {
    return generateCircularSegment(feature);
  },
};

export function generateCircularSegment(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length !== 3) {
    throw new RangeError(
      "Circular segment requires exactly three control points.",
    );
  }
  const parameters = {
    ...circularSegmentDefinition.defaultParameters,
    ...feature.parameters,
  } satisfies Readonly<Record<string, JsonValue>>;
  const ring = buildCircularSegmentRing(feature.controlPoints, {
    segmentsPerCircle: readSegmentsPerCircle(parameters, "Circular segment"),
  });
  return createCircularAreaBundle(
    feature,
    ring,
    circularSegmentDefinition.defaultStyle,
  );
}
