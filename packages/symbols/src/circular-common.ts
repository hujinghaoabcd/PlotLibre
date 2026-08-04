import type {
  JsonValue,
  LineStringGeometry,
  PlotFeature,
  PlotStyle,
  PolygonGeometry,
  Position,
  RenderBundle,
} from "@plotlibre/core";
import type { CircularSweepDirection } from "@plotlibre/geometry";
import { createRenderProperties } from "./style.js";

export function readSegmentsPerCircle(
  parameters: Readonly<Record<string, JsonValue>>,
  label: string,
): number {
  const value = parameters.segmentsPerCircle;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} parameter "segmentsPerCircle" must be finite.`);
  }
  return value;
}

export function readSweepDirection(
  parameters: Readonly<Record<string, JsonValue>>,
): CircularSweepDirection {
  const value = parameters.sweepDirection;
  if (value !== "clockwise" && value !== "counterclockwise") {
    throw new TypeError(
      'Sector parameter "sweepDirection" must be "clockwise" or "counterclockwise".',
    );
  }
  return value;
}

export function createCircularLineBundle(
  feature: PlotFeature,
  coordinates: readonly Position[],
  defaultStyle: PlotStyle,
): RenderBundle {
  const geometry: LineStringGeometry = {
    type: "LineString",
    coordinates,
  };
  return {
    fills: [],
    lines: [
      {
        type: "Feature",
        id: `${feature.id}:line`,
        geometry,
        properties: createRenderProperties(feature, "line", defaultStyle),
      },
    ],
    points: [],
    labels: [],
    hitAreas: [
      {
        type: "Feature",
        id: `${feature.id}:hit-area`,
        geometry,
        properties: createRenderProperties(feature, "hit-area", defaultStyle),
      },
    ],
  };
}

export function createCircularAreaBundle(
  feature: PlotFeature,
  ring: readonly Position[],
  defaultStyle: PlotStyle,
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
        properties: createRenderProperties(feature, "fill", defaultStyle),
      },
    ],
    lines: [
      {
        type: "Feature",
        id: `${feature.id}:outline`,
        geometry,
        properties: createRenderProperties(feature, "outline", defaultStyle),
      },
    ],
    points: [],
    labels: [],
    hitAreas: [
      {
        type: "Feature",
        id: `${feature.id}:hit-area`,
        geometry,
        properties: createRenderProperties(feature, "hit-area", defaultStyle),
      },
    ],
  };
}
