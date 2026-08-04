import type {
  JsonValue,
  PlotDefinition,
  PlotFeature,
  RenderBundle,
} from "@plotlibre/core";
import { buildSectorRing } from "@plotlibre/geometry";
import {
  createCircularAreaBundle,
  readSegmentsPerCircle,
  readSweepDirection,
} from "./circular-common.js";
import { DEFAULT_AREA_STYLE } from "./style.js";

export const SECTOR_TYPE = "area.sector";

export const sectorDefinition: PlotDefinition = {
  type: SECTOR_TYPE,
  title: "Sector",
  category: "area",
  version: "1.0.0",
  controlSchema: {
    minPoints: 3,
    maxPoints: 3,
  },
  defaultParameters: {
    segmentsPerCircle: 128,
    sweepDirection: "clockwise",
  },
  defaultStyle: DEFAULT_AREA_STYLE,
  deriveSemanticGuidePaths(feature) {
    const center = feature.controlPoints[0];
    const bearingHandle = feature.controlPoints[2];
    return center && bearingHandle ? [[center, bearingHandle]] : [];
  },
  generate({ feature }) {
    return generateSector(feature);
  },
};

export function generateSector(feature: PlotFeature): RenderBundle {
  if (feature.controlPoints.length !== 3) {
    throw new RangeError("Sector requires exactly three control points.");
  }
  const parameters = {
    ...sectorDefinition.defaultParameters,
    ...feature.parameters,
  } satisfies Readonly<Record<string, JsonValue>>;
  const ring = buildSectorRing(feature.controlPoints, {
    segmentsPerCircle: readSegmentsPerCircle(parameters, "Sector"),
    sweepDirection: readSweepDirection(parameters),
  });
  return createCircularAreaBundle(feature, ring, sectorDefinition.defaultStyle);
}
