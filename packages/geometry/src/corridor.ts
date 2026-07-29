import type { Position } from "@plotlibre/core";
import {
  buildPathRibbonFrame,
  resolvePathRibbonParameters,
  type PathRibbonParameters,
  type ResolvedPathRibbonParameters,
} from "./path-ribbon.js";
import { ensureRingWinding, isSimpleRing } from "./ring.js";

/**
 * Corridor controls are an authored center path. The public geometry is an
 * undirected constant-width ribbon with flat end caps and no arrow head.
 */
export interface CorridorParameters extends PathRibbonParameters {}

export type ResolvedCorridorParameters = ResolvedPathRibbonParameters;

export const DEFAULT_CORRIDOR_PARAMETERS: ResolvedCorridorParameters = {
  widthPathRatio: 0.06,
  minimumWidthMeters: 1,
  maximumWidthMeters: 100_000,
  tension: 0.15,
  segmentsPerSpan: 16,
  miterLimit: 3,
};

export function resolveCorridorParameters(
  parameters: CorridorParameters = {},
): ResolvedCorridorParameters {
  return resolvePathRibbonParameters({
    ...DEFAULT_CORRIDOR_PARAMETERS,
    ...parameters,
  });
}

export function buildCorridorRing(
  controlPoints: readonly Position[],
  parameters: CorridorParameters = {},
): readonly Position[] {
  const resolved = resolveCorridorParameters(parameters);
  const frame = buildPathRibbonFrame(controlPoints, resolved);
  const ring = ensureRingWinding(
    [...frame.left, ...frame.right.slice().reverse()],
    "counterclockwise",
  );
  if (!isSimpleRing(ring, 1e-6)) {
    throw new RangeError(
      "Corridor produced a self-intersecting ring; narrow the corridor or simplify the path.",
    );
  }
  return ring.map((point) => frame.projection.unproject(point));
}
